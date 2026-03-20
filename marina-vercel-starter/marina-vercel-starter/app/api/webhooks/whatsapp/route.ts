import { getConfig } from "@/lib/config";
import { processInboundMessage } from "@/lib/orchestration";
import {
  hasProcessedProviderMessage,
  persistProviderStatusEvents,
  persistOutboundDelivery,
  persistWorkflowRun
} from "@/lib/persistence";
import { inboundSchema } from "@/lib/routes";
import {
  isEvolutionWebhookPayload,
  normalizeEvolutionWebhookPayload,
  sendEvolutionOutboundMessage,
  verifyEvolutionSecret
} from "@/lib/services/evolution-whatsapp";
import {
  isMetaWebhookPayload,
  normalizeMetaWebhookPayload,
  sendMetaOutboundMessage,
  verifyMetaSignature
} from "@/lib/services/meta-whatsapp";

export const runtime = "nodejs";

function jsonError(code: string, message: unknown, status: number) {
  return Response.json(
    {
      ok: false,
      data: null,
      error: {
        code,
        message
      },
      meta: {}
    },
    { status }
  );
}

type RouteConversationState = {
  modelo: string | null;
  cor: string | null;
  quantidade: number | null;
  pediu_foto: boolean;
  pediu_checkout: boolean;
  etapa:
    | "ver_produto"
    | "ver_preco"
    | "escolher_cor"
    | "escolher_quantidade"
    | "pediu_foto"
    | "checkout"
    | "duvida"
    | "fallback";
  updated_at: string;
};

type RouteInbound = {
  session_id?: string;
  from: string;
  from_name?: string | null;
  provider?: string;
  provider_message_id?: string | null;
  message_type?: "text" | "audio" | "image" | "pdf" | "other";
  message_text: string | null;
  media?: {
    url?: string | null;
    mime_type?: string | null;
    file_name?: string | null;
  } | null;
  received_at?: string;
  raw?: unknown;
};

export async function GET(request: Request) {
  const config = getConfig();
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const verifyToken = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !challenge) {
    return jsonError("invalid_meta_challenge", "Parâmetros de verificação inválidos.", 400);
  }

  if (!config.whatsappMetaVerifyToken) {
    return jsonError(
      "meta_verify_token_not_configured",
      "Defina WHATSAPP_META_VERIFY_TOKEN para validar o webhook da Meta.",
      500
    );
  }

  if (verifyToken !== config.whatsappMetaVerifyToken) {
    return jsonError("invalid_meta_verify_token", "Verify token inválido.", 403);
  }

  return new Response(challenge, {
    status: 200,
    headers: {
      "Content-Type": "text/plain"
    }
  });
}

async function processNormalizedInboundMessage(input: {
  inbound: RouteInbound;
  conversation_state?: RouteConversationState | null;
}) {
  const result = await processInboundMessage(input);
  const persisted = await persistWorkflowRun({
    inbound: result.data.inbound,
    workflow: result
  });

  if (result.data.inbound.provider === "meta" && persisted.conversationId) {
    const delivery = await sendMetaOutboundMessage({
      to: result.data.inbound.from,
      outbound: result.data.outbound,
      replyToMessageId: result.data.inbound.provider_message_id || null
    });

    await persistOutboundDelivery({
      conversationId: persisted.conversationId,
      outbound: result.data.outbound,
      delivery
    });
  } else if (result.data.inbound.provider === "evolution" && persisted.conversationId) {
    const delivery = await sendEvolutionOutboundMessage({
      to: result.data.inbound.from,
      outbound: result.data.outbound,
      replyToMessageId: result.data.inbound.provider_message_id || null
    });

    await persistOutboundDelivery({
      conversationId: persisted.conversationId,
      outbound: result.data.outbound,
      delivery
    });
  }

  return result;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  let body: unknown;

  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return jsonError("invalid_json", "Body JSON inválido.", 400);
  }

  if (isMetaWebhookPayload(body)) {
    const signature = request.headers.get("x-hub-signature-256");
    const verified = verifyMetaSignature({
      rawBody,
      signatureHeader: signature
    });

    if (!verified.ok) {
      return jsonError("invalid_meta_signature", "Assinatura da Meta inválida.", 401);
    }

    const normalized = normalizeMetaWebhookPayload(body);
    await persistProviderStatusEvents(normalized.statuses);

    let processed = 0;
    let duplicates = 0;

    for (const inbound of normalized.inboundMessages) {
      if (
        inbound.provider_message_id &&
        (await hasProcessedProviderMessage({
          provider: inbound.provider,
          providerMessageId: inbound.provider_message_id
        }))
      ) {
        duplicates += 1;
        continue;
      }

      await processNormalizedInboundMessage({
        inbound
      });
      processed += 1;
    }

    return Response.json({
      ok: true,
      data: {
        processed_inbound: processed,
        status_events: normalized.statuses.length,
        duplicates_ignored: duplicates
      },
      error: null,
      meta: {
        provider: "meta"
      }
    });
  }

  if (isEvolutionWebhookPayload(body)) {
    const verified = verifyEvolutionSecret({
      payload: body,
      headerSecret: request.headers.get("x-evolution-secret")
    });

    if (!verified.ok) {
      return jsonError("invalid_evolution_secret", "Secret da Evolution invalido.", 401);
    }

    const normalized = normalizeEvolutionWebhookPayload(body);
    await persistProviderStatusEvents(normalized.statuses);

    let processed = 0;
    let duplicates = 0;

    for (const inbound of normalized.inboundMessages) {
      if (
        inbound.provider_message_id &&
        (await hasProcessedProviderMessage({
          provider: inbound.provider,
          providerMessageId: inbound.provider_message_id
        }))
      ) {
        duplicates += 1;
        continue;
      }

      await processNormalizedInboundMessage({
        inbound
      });
      processed += 1;
    }

    return Response.json({
      ok: true,
      data: {
        processed_inbound: processed,
        status_events: normalized.statuses.length,
        duplicates_ignored: duplicates
      },
      error: null,
      meta: {
        provider: "evolution"
      }
    });
  }

  const parsed = inboundSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("invalid_payload", parsed.error.flatten(), 400);
  }

  const secret = request.headers.get("x-webhook-secret");
  const expected = getConfig().whatsappWebhookSecret;
  const provider = parsed.data.provider || "manual";

  if (expected && provider !== "simulator" && secret !== expected) {
    return jsonError("unauthorized", "Webhook secret inválido.", 401);
  }

  const result = await processNormalizedInboundMessage({
    inbound: {
      session_id: parsed.data.session_id,
      from: parsed.data.from,
      from_name: parsed.data.from_name ?? null,
      provider: parsed.data.provider,
      provider_message_id: parsed.data.provider_message_id ?? null,
      message_type: parsed.data.message_type,
      message_text: parsed.data.message_text ?? "",
      media: parsed.data.media ?? null,
      received_at: parsed.data.received_at,
      raw: parsed.data.raw
    },
    conversation_state: parsed.data.conversation_state ?? null
  });

  return Response.json(result);
}
