import "server-only";
import { getConfig, hasEvolutionApi } from "@/lib/config";
import { inferMessageType, nowIso, toSessionId } from "@/lib/normalization";
import type {
  MessageType,
  OutboundMessage,
  ProviderOutboundDelivery,
  ProviderStatusEvent
} from "@/lib/types";

type EvolutionWebhookPayload = {
  event?: string;
  instance?: string;
  data?: Record<string, unknown> | null;
  date_time?: string;
  sender?: string;
  destination?: string;
  apikey?: string;
};

type EvolutionMessageKey = {
  remoteJid?: string;
  fromMe?: boolean;
  id?: string;
};

type EvolutionMessageData = {
  key?: EvolutionMessageKey;
  pushName?: string;
  messageType?: string;
  message?: Record<string, unknown> | null;
  status?: string;
  instanceId?: string;
  connected?: boolean;
  state?: string;
  connection?: string;
  number?: string;
  qrcode?: string;
};

function upperEventName(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .replace(/[.\s-]+/g, "_")
    .toUpperCase();
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function objectRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function booleanValue(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function textFromMessage(message: Record<string, unknown> | null) {
  if (!message) return "";

  const conversation = stringValue(message.conversation);
  if (conversation) return conversation;

  const extendedText = stringValue(objectRecord(message.extendedTextMessage)?.text);
  if (extendedText) return extendedText;

  const imageCaption = stringValue(objectRecord(message.imageMessage)?.caption);
  if (imageCaption) return imageCaption;

  const documentCaption = stringValue(objectRecord(message.documentMessage)?.caption);
  if (documentCaption) return documentCaption;

  const videoCaption = stringValue(objectRecord(message.videoMessage)?.caption);
  if (videoCaption) return videoCaption;

  const buttonsText = stringValue(objectRecord(message.buttonsResponseMessage)?.selectedDisplayText);
  if (buttonsText) return buttonsText;

  const templateText = stringValue(
    objectRecord(message.templateButtonReplyMessage)?.selectedDisplayText
  );
  if (templateText) return templateText;

  const listTitle = stringValue(objectRecord(message.listResponseMessage)?.title);
  if (listTitle) return listTitle;

  return "";
}

function mediaFromMessage(message: Record<string, unknown> | null) {
  if (!message) return null;

  const image = objectRecord(message.imageMessage);
  if (image) {
    return {
      url: stringValue(image.url),
      mime_type: stringValue(image.mimetype),
      file_name: null
    };
  }

  const document = objectRecord(message.documentMessage);
  if (document) {
    return {
      url: stringValue(document.url),
      mime_type: stringValue(document.mimetype),
      file_name: stringValue(document.fileName)
    };
  }

  const audio = objectRecord(message.audioMessage);
  if (audio) {
    return {
      url: stringValue(audio.url),
      mime_type: stringValue(audio.mimetype),
      file_name: null
    };
  }

  const video = objectRecord(message.videoMessage);
  if (video) {
    return {
      url: stringValue(video.url),
      mime_type: stringValue(video.mimetype),
      file_name: stringValue(video.fileName)
    };
  }

  return null;
}

function detectMessageType(input: {
  explicitType?: string | null;
  message?: Record<string, unknown> | null;
}) {
  const explicit = upperEventName(input.explicitType);
  if (explicit.includes("IMAGE")) return "image";
  if (explicit.includes("AUDIO")) return "audio";
  if (explicit.includes("DOCUMENT")) {
    const mime = stringValue(objectRecord(input.message?.documentMessage)?.mimetype) || "";
    return mime.toLowerCase().includes("pdf") ? "pdf" : "other";
  }
  if (explicit.includes("VIDEO")) return "other";
  if (explicit.includes("TEXT") || explicit.includes("CONVERSATION")) return "text";

  const message = input.message;
  if (!message) return "text";
  if (objectRecord(message.imageMessage)) return "image";
  if (objectRecord(message.audioMessage)) return "audio";
  if (objectRecord(message.documentMessage)) {
    const mime = stringValue(objectRecord(message.documentMessage)?.mimetype) || "";
    return mime.toLowerCase().includes("pdf") ? "pdf" : "other";
  }
  if (stringValue(message.conversation) || objectRecord(message.extendedTextMessage)) return "text";

  return inferMessageType(input.explicitType || "text");
}

function isInboundMessageEvent(eventName: string) {
  return eventName === "MESSAGES_UPSERT" || eventName === "MESSAGE_UPSERT";
}

function isStatusEvent(eventName: string) {
  return eventName === "MESSAGES_UPDATE" || eventName === "SEND_MESSAGE";
}

function inferRecipientId(data: EvolutionMessageData | null) {
  const remoteJid = data?.key?.remoteJid || stringValue((data as Record<string, unknown> | null)?.remoteJid);
  if (remoteJid) return toSessionId(remoteJid);

  const number = stringValue((data as Record<string, unknown> | null)?.number);
  if (number) return toSessionId(number);

  return null;
}

function buildStatusEvent(input: {
  eventName: string;
  data: EvolutionMessageData | null;
  payload: EvolutionWebhookPayload;
}): ProviderStatusEvent | null {
  const providerMessageId =
    input.data?.key?.id || stringValue((input.data as Record<string, unknown> | null)?.id) || null;
  const recipientId = inferRecipientId(input.data);

  if (!providerMessageId && !recipientId) return null;

  const eventStatus =
    stringValue((input.data as Record<string, unknown> | null)?.status) ||
    stringValue((input.data as Record<string, unknown> | null)?.state) ||
    input.eventName.toLowerCase();

  return {
    provider: "evolution",
    provider_message_id: providerMessageId,
    recipient_id: recipientId,
    status: eventStatus,
    occurred_at: input.payload.date_time || nowIso(),
    conversation_id: null,
    raw: input.payload
  };
}

function inferImageMimeType(url: string | null) {
  const normalized = String(url || "").toLowerCase();
  if (normalized.endsWith(".png")) return "image/png";
  if (normalized.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function extractResponseMessageId(raw: unknown) {
  return stringValue(objectRecord(objectRecord(raw)?.key)?.id) || null;
}

async function postToEvolution(path: string, body: Record<string, unknown>) {
  const config = getConfig();
  const endpoint = `${normalizeBaseUrl(config.evolutionApiBaseUrl)}${path}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: config.evolutionApiKey
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  const rawText = await response.text();
  let parsed: unknown = null;

  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = rawText;
  }

  if (!response.ok) {
    return {
      ok: false,
      data: null,
      error: {
        code: "evolution_api_error",
        message: `Evolution respondeu ${response.status}.`,
        raw: parsed
      }
    } as const;
  }

  return {
    ok: true,
    data: parsed,
    error: null
  } as const;
}

export function isEvolutionWebhookPayload(payload: unknown): payload is EvolutionWebhookPayload {
  if (!payload || typeof payload !== "object") return false;
  const record = payload as Record<string, unknown>;
  if (typeof record.event === "string") return true;

  const data = objectRecord(record.data);
  if (!data) return false;

  return Boolean(
    data.key ||
      data.message ||
      typeof data.status === "string" ||
      typeof data.state === "string" ||
      typeof data.connected === "boolean"
  );
}

export function verifyEvolutionSecret(input: {
  payload: EvolutionWebhookPayload;
  headerSecret: string | null;
}) {
  const config = getConfig();
  if (!config.evolutionWebhookSecret) {
    return {
      ok: true,
      reason: "secret_skipped"
    } as const;
  }

  const candidate = input.headerSecret || input.payload.apikey || null;
  return {
    ok: candidate === config.evolutionWebhookSecret,
    reason: candidate ? "verified" : "secret_missing"
  } as const;
}

export function normalizeEvolutionWebhookPayload(payload: EvolutionWebhookPayload) {
  const inboundMessages = [];
  const statuses: ProviderStatusEvent[] = [];

  const eventName = upperEventName(payload.event);
  const data = (objectRecord(payload.data) as EvolutionMessageData | null) || null;

  if (isInboundMessageEvent(eventName)) {
    const key = data?.key || null;
    const remoteJid =
      key?.remoteJid || stringValue((data as Record<string, unknown> | null)?.remoteJid) || "";
    const from = toSessionId(remoteJid);
    const fromMe =
      key?.fromMe === true ||
      booleanValue((data as Record<string, unknown> | null)?.fromMe) === true ||
      remoteJid.endsWith("@g.us");

    if (!fromMe && from) {
      const message = objectRecord(data?.message) || null;
      const messageType = detectMessageType({
        explicitType: data?.messageType || null,
        message
      }) as MessageType;

      inboundMessages.push({
        session_id: from,
        from,
        from_name: data?.pushName || null,
        provider: "evolution" as const,
        provider_message_id: key?.id || null,
        message_type: messageType,
        message_text: textFromMessage(message),
        media: mediaFromMessage(message),
        received_at: payload.date_time || nowIso(),
        raw: payload
      });
    }
  }

  if (isStatusEvent(eventName)) {
    const statusEvent = buildStatusEvent({
      eventName,
      data,
      payload
    });

    if (statusEvent) {
      statuses.push(statusEvent);
    }
  }

  return {
    inboundMessages,
    statuses
  };
}

export async function sendEvolutionOutboundMessage(input: {
  to: string;
  outbound: OutboundMessage;
  replyToMessageId?: string | null;
}): Promise<ProviderOutboundDelivery> {
  if (!hasEvolutionApi()) {
    return {
      ok: false,
      data: null,
      error: {
        code: "evolution_not_configured",
        message: "Configure EVOLUTION_API_BASE_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE_NAME."
      }
    };
  }

  const config = getConfig();
  const sentAt = nowIso();
  const quoted = input.replyToMessageId
    ? {
        quoted: {
          key: {
            id: input.replyToMessageId
          }
        }
      }
    : {};

  if (input.outbound.message_type === "image" && input.outbound.image_url) {
    const imageAttempt = await postToEvolution(
      `/message/sendMedia/${encodeURIComponent(config.evolutionInstanceName)}`,
      {
        number: input.to,
        mediaMessage: {
          mediaType: "image",
          fileName: `marina-${Date.now()}.${inferImageMimeType(input.outbound.image_url).split("/")[1]}`,
          caption: input.outbound.text,
          media: input.outbound.image_url,
          mimetype: inferImageMimeType(input.outbound.image_url)
        },
        ...quoted
      }
    );

    if (imageAttempt.ok) {
      const raw = imageAttempt.data;
      const messageId = extractResponseMessageId(raw);

      return {
        ok: true,
        data: {
          provider: "evolution",
          message_id: messageId,
          message_type: "image",
          sent_at: sentAt,
          raw
        },
        error: null
      };
    }
  }

  const textAttempt = await postToEvolution(
    `/message/sendText/${encodeURIComponent(config.evolutionInstanceName)}`,
    {
      number: input.to,
      text: input.outbound.text,
      ...quoted
    }
  );

  if (!textAttempt.ok) {
    return {
      ok: false,
      data: null,
      error: textAttempt.error
    };
  }

  const raw = textAttempt.data;
  const messageId = extractResponseMessageId(raw);

  return {
    ok: true,
    data: {
      provider: "evolution",
      message_id: messageId,
      message_type: "text",
      sent_at: sentAt,
      raw
    },
    error: null
  };
}
