import crypto from "node:crypto";
import { getConfig, hasMetaWhatsAppSend } from "@/lib/config";
import { inferMessageType, nowIso, toSessionId } from "@/lib/normalization";
import type { MessageType, OutboundMessage, ProviderOutboundDelivery, ProviderStatusEvent } from "@/lib/types";

type MetaWebhookPayload = {
  object?: string;
  entry?: MetaEntry[];
};

type MetaContact = {
  wa_id?: string;
  profile?: {
    name?: string;
  };
};

type MetaMessage = {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: {
    body?: string;
  };
  image?: {
    id?: string;
    mime_type?: string;
    caption?: string;
  };
  document?: {
    id?: string;
    mime_type?: string;
    filename?: string;
    caption?: string;
  };
  audio?: {
    id?: string;
    mime_type?: string;
  };
  video?: {
    id?: string;
    mime_type?: string;
    caption?: string;
  };
  button?: {
    text?: string;
  };
  interactive?: {
    button_reply?: {
      title?: string;
    };
    list_reply?: {
      title?: string;
      description?: string;
    };
  };
};

type MetaStatus = {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
  conversation?: {
    id?: string;
    expiration_timestamp?: string;
    origin?: {
      type?: string;
    };
  };
  pricing?: {
    billable?: boolean;
    category?: string;
    pricing_model?: string;
  };
};

type MetaChangeValue = {
  messaging_product?: string;
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  contacts?: MetaContact[];
  messages?: MetaMessage[];
  statuses?: MetaStatus[];
};

type MetaChange = {
  field?: string;
  value?: MetaChangeValue;
};

type MetaEntry = {
  id?: string;
  changes?: MetaChange[];
};

export type NormalizedMetaInboundMessage = {
  session_id: string;
  from: string;
  from_name: string | null;
  provider: "meta";
  provider_message_id: string | null;
  message_type: MessageType;
  message_text: string;
  media: {
    url?: string | null;
    mime_type?: string | null;
    file_name?: string | null;
  } | null;
  received_at: string;
  raw: unknown;
};

function unixToIso(value?: string | null) {
  if (!value) return nowIso();
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return nowIso();
  return new Date(numeric * 1000).toISOString();
}

function extractMessageText(message: MetaMessage) {
  if (message.text?.body) return message.text.body;
  if (message.button?.text) return message.button.text;
  if (message.interactive?.button_reply?.title) {
    return message.interactive.button_reply.title;
  }
  if (message.interactive?.list_reply?.title) {
    const description = message.interactive.list_reply.description;
    return description
      ? `${message.interactive.list_reply.title} - ${description}`
      : message.interactive.list_reply.title;
  }
  if (message.image?.caption) return message.image.caption;
  if (message.document?.caption) return message.document.caption;
  if (message.video?.caption) return message.video.caption;
  return "";
}

function extractMedia(message: MetaMessage) {
  if (message.image) {
    return {
      url: null,
      mime_type: message.image.mime_type || null,
      file_name: null
    };
  }

  if (message.document) {
    return {
      url: null,
      mime_type: message.document.mime_type || null,
      file_name: message.document.filename || null
    };
  }

  if (message.audio) {
    return {
      url: null,
      mime_type: message.audio.mime_type || null,
      file_name: null
    };
  }

  if (message.video) {
    return {
      url: null,
      mime_type: message.video.mime_type || null,
      file_name: null
    };
  }

  return null;
}

function postBody<T>(body: T) {
  return JSON.stringify(body);
}

async function postToMeta(body: Record<string, unknown>) {
  const config = getConfig();
  const endpoint = `https://graph.facebook.com/${config.whatsappMetaApiVersion}/${config.whatsappMetaPhoneNumberId}/messages`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.whatsappMetaAccessToken}`,
      "Content-Type": "application/json"
    },
    body: postBody(body),
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
        code: "meta_api_error",
        message: `Meta respondeu ${response.status}.`,
        raw: parsed
      }
    } as const;
  }

  const messageId =
    typeof parsed === "object" &&
    parsed !== null &&
    "messages" in parsed &&
    Array.isArray((parsed as { messages?: Array<{ id?: string }> }).messages)
      ? (parsed as { messages?: Array<{ id?: string }> }).messages?.[0]?.id || null
      : null;

  return {
    ok: true,
    data: {
      message_id: messageId,
      raw: parsed
    },
    error: null
  } as const;
}

export function isMetaWebhookPayload(payload: unknown): payload is MetaWebhookPayload {
  if (!payload || typeof payload !== "object") return false;
  const maybePayload = payload as MetaWebhookPayload;
  return maybePayload.object === "whatsapp_business_account" && Array.isArray(maybePayload.entry);
}

export function verifyMetaSignature(input: {
  rawBody: string;
  signatureHeader: string | null;
}) {
  const config = getConfig();
  if (!config.metaAppSecret) {
    return {
      ok: true,
      reason: "signature_skipped"
    } as const;
  }

  if (!input.signatureHeader?.startsWith("sha256=")) {
    return {
      ok: false,
      reason: "signature_missing"
    } as const;
  }

  const expected = crypto
    .createHmac("sha256", config.metaAppSecret)
    .update(input.rawBody)
    .digest("hex");

  const provided = input.signatureHeader.slice("sha256=".length);
  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");

  if (expectedBuffer.length !== providedBuffer.length) {
    return {
      ok: false,
      reason: "signature_length_mismatch"
    } as const;
  }

  return {
    ok: crypto.timingSafeEqual(expectedBuffer, providedBuffer),
    reason: "verified"
  } as const;
}

export function normalizeMetaWebhookPayload(payload: MetaWebhookPayload) {
  const inboundMessages: NormalizedMetaInboundMessage[] = [];
  const statuses: ProviderStatusEvent[] = [];

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value) continue;

      for (const message of value.messages || []) {
        const profile = (value.contacts || []).find(
          (contact) => toSessionId(contact.wa_id || "") === toSessionId(message.from || "")
        );
        const messageType = inferMessageType(message.type || "text");
        const text = extractMessageText(message);

        inboundMessages.push({
          session_id: toSessionId(message.from || ""),
          from: toSessionId(message.from || ""),
          from_name: profile?.profile?.name || null,
          provider: "meta",
          provider_message_id: message.id || null,
          message_type: messageType,
          message_text: text,
          media: extractMedia(message),
          received_at: unixToIso(message.timestamp),
          raw: {
            source: "meta_webhook",
            entry_id: entry.id || null,
            field: change.field || null,
            metadata: value.metadata || null,
            contacts: value.contacts || [],
            message
          }
        });
      }

      for (const status of value.statuses || []) {
        statuses.push({
          provider: "meta",
          provider_message_id: status.id || null,
          recipient_id: status.recipient_id ? toSessionId(status.recipient_id) : null,
          status: status.status || "unknown",
          occurred_at: unixToIso(status.timestamp),
          conversation_id: status.conversation?.id || null,
          raw: {
            source: "meta_webhook",
            entry_id: entry.id || null,
            field: change.field || null,
            metadata: value.metadata || null,
            status
          }
        });
      }
    }
  }

  return {
    inboundMessages,
    statuses
  };
}

export async function sendMetaOutboundMessage(input: {
  to: string;
  outbound: OutboundMessage;
  replyToMessageId?: string | null;
}): Promise<ProviderOutboundDelivery> {
  if (!hasMetaWhatsAppSend()) {
    return {
      ok: false,
      data: null,
      error: {
        code: "meta_not_configured",
        message: "Configure WHATSAPP_META_ACCESS_TOKEN e WHATSAPP_META_PHONE_NUMBER_ID."
      }
    };
  }

  const sentAt = nowIso();
  const context = input.replyToMessageId
    ? {
        context: {
          message_id: input.replyToMessageId
        }
      }
    : {};

  if (input.outbound.message_type === "image" && input.outbound.image_url) {
    const imageAttempt = await postToMeta({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: input.to,
      type: "image",
      ...context,
      image: {
        link: input.outbound.image_url,
        ...(input.outbound.text ? { caption: input.outbound.text } : {})
      }
    });

    if (imageAttempt.ok) {
      return {
        ok: true,
        data: {
          provider: "meta",
          message_id: imageAttempt.data.message_id,
          message_type: "image",
          sent_at: sentAt,
          raw: imageAttempt.data.raw
        },
        error: null
      };
    }
  }

  const textAttempt = await postToMeta({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: input.to,
    type: "text",
    ...context,
    text: {
      preview_url: false,
      body: input.outbound.text
    }
  });

  if (!textAttempt.ok) {
    return {
      ok: false,
      data: null,
      error: textAttempt.error
    };
  }

  return {
    ok: true,
    data: {
      provider: "meta",
      message_id: textAttempt.data.message_id,
      message_type: "text",
      sent_at: sentAt,
      raw: textAttempt.data.raw
    },
    error: null
  };
}
