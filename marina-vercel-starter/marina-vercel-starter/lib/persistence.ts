import "server-only";
import {
  hasEvolutionApi,
  hasMetaWhatsAppSend,
  hasMetaWhatsAppWebhook,
  hasSupabase
} from "@/lib/config";
import { normalize, nowIso } from "@/lib/normalization";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type {
  CartState,
  ConversationState,
  DashboardSnapshot,
  InboundMessage,
  IntentClassificationOutput,
  OutboundMessage,
  ProviderOutboundDelivery,
  ProviderStatusEvent,
  WorkflowResult
} from "@/lib/types";

type PersistedReference = {
  clientId: string | null;
  conversationId: string | null;
  inboundMessageId: string | null;
};

function emptyDashboardSnapshot(): DashboardSnapshot {
  return {
    openConversations: 0,
    criticalStage: "Sem dados",
    modeLabel: hasSupabase()
      ? hasMetaWhatsAppSend() || hasMetaWhatsAppWebhook() || hasEvolutionApi()
        ? "WhatsApp + banco"
        : "Banco ativo"
      : "Starter",
    totalMessages: 0,
    rows: []
  };
}

function formatRelativeTime(value: string | null | undefined) {
  if (!value) return "agora";

  const deltaMs = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(deltaMs) || deltaMs < 60_000) return "agora";

  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;

  const days = Math.floor(hours / 24);
  return `${days} d`;
}

async function insertConversationEvent(input: {
  conversationId: string;
  messageId?: string | null;
  eventType: string;
  eventStatus: string;
  eventData: unknown;
}) {
  const db = getSupabaseAdmin();
  if (!db) return;

  const { error } = await db.from("conversation_events").insert({
    conversa_id: input.conversationId,
    mensagem_id: input.messageId || null,
    event_type: input.eventType,
    event_status: input.eventStatus,
    event_data: input.eventData
  });

  if (error) {
    console.error("conversation_events insert failed", error);
  }
}

async function upsertClient(input: {
  whatsapp: string;
  nome?: string | null;
  origemCanal?: string;
  ultimaInteracaoAt: string;
}) {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const payload: Record<string, unknown> = {
    whatsapp: input.whatsapp,
    origem_canal: input.origemCanal || "whatsapp",
    ultima_interacao_at: input.ultimaInteracaoAt,
    updated_at: nowIso()
  };

  if (input.nome) {
    payload.nome = input.nome;
    payload.nome_normalizado = normalize(input.nome);
  }

  const { data, error } = await db
    .from("clientes")
    .upsert(payload, { onConflict: "whatsapp" })
    .select("id, whatsapp, nome")
    .single();

  if (error) {
    console.error("clientes upsert failed", error);
    return null;
  }

  return data as { id: string; whatsapp: string; nome: string | null };
}

async function upsertConversation(input: {
  clientId: string;
  sessionId: string;
  state: WorkflowResult["data"]["state"];
  intent: IntentClassificationOutput;
  ultimaMensagemAt: string;
}) {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data, error } = await db
    .from("conversas")
    .upsert(
      {
        cliente_id: input.clientId,
        session_id: input.sessionId,
        canal: "whatsapp",
        status: "open",
        etapa_atual: input.state.etapa,
        intent_atual: input.intent.intent,
        modelo_atual: input.state.modelo,
        cor_atual: input.state.cor,
        quantidade_atual: input.state.quantidade,
        ultima_mensagem_at: input.ultimaMensagemAt,
        updated_at: nowIso()
      },
      { onConflict: "session_id" }
    )
    .select("id, session_id")
    .single();

  if (error) {
    console.error("conversas upsert failed", error);
    return null;
  }

  return data as { id: string; session_id: string };
}

async function insertMessage(input: {
  conversationId: string;
  direction: "inbound" | "outbound";
  provider: string;
  providerMessageId?: string | null;
  mediaType: string;
  bodyRaw?: string | null;
  bodyNormalized?: string | null;
  payload: unknown;
  receivedAt?: string | null;
  sentAt?: string | null;
}) {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data, error } = await db
    .from("mensagens")
    .insert({
      conversa_id: input.conversationId,
      direction: input.direction,
      provider: input.provider,
      provider_message_id: input.providerMessageId || null,
      media_type: input.mediaType,
      body_raw: input.bodyRaw || null,
      body_normalized: input.bodyNormalized || null,
      payload_json: input.payload,
      received_at: input.receivedAt || null,
      sent_at: input.sentAt || null
    })
    .select("id, provider_message_id, conversa_id")
    .single();

  if (error) {
    console.error("mensagens insert failed", error);
    return null;
  }

  return data as {
    id: string;
    provider_message_id: string | null;
    conversa_id: string;
  };
}

async function upsertCartSnapshot(input: {
  conversationId: string;
  sessionId: string;
  cart: CartState | null;
  cartUrl?: string | null;
  payload?: unknown;
  errorReason?: string | null;
}) {
  const db = getSupabaseAdmin();
  if (!db || !input.cart) return;

  const { data: existing, error: selectError } = await db
    .from("carrinhos")
    .select("id")
    .eq("conversa_id", input.conversationId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    console.error("carrinhos select failed", selectError);
    return;
  }

  const payload = {
    conversa_id: input.conversationId,
    session_id: input.sessionId,
    status: input.cart.status,
    currency: input.cart.currency,
    items_json: input.cart.items,
    external_cart_url: input.cartUrl || null,
    external_payload: input.payload || null,
    error_reason: input.errorReason || null,
    confirmed_at:
      input.cart.status === "confirmed" || input.cart.status === "sent" ? nowIso() : null,
    updated_at: nowIso()
  };

  if (existing?.id) {
    const { error } = await db.from("carrinhos").update(payload).eq("id", existing.id);
    if (error) {
      console.error("carrinhos update failed", error);
    }
    return;
  }

  const { error } = await db.from("carrinhos").insert(payload);
  if (error) {
    console.error("carrinhos insert failed", error);
  }
}

export async function hasProcessedProviderMessage(input: {
  provider: string;
  providerMessageId: string;
}) {
  const db = getSupabaseAdmin();
  if (!db) return false;

  const { data, error } = await db
    .from("mensagens")
    .select("id")
    .eq("provider", input.provider)
    .eq("provider_message_id", input.providerMessageId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("mensagens lookup failed", error);
    return false;
  }

  return Boolean(data?.id);
}

export async function persistWorkflowRun(input: {
  inbound: InboundMessage;
  workflow: WorkflowResult;
}): Promise<PersistedReference> {
  const db = getSupabaseAdmin();
  if (!db) {
    return {
      clientId: null,
      conversationId: null,
      inboundMessageId: null
    };
  }

  const client = await upsertClient({
    whatsapp: input.inbound.from,
    nome: input.inbound.from_name || null,
    origemCanal:
      input.inbound.provider === "meta"
        ? "whatsapp_meta"
        : input.inbound.provider === "evolution"
          ? "whatsapp_evolution"
          : "whatsapp",
    ultimaInteracaoAt: input.inbound.received_at
  });

  if (!client) {
    return {
      clientId: null,
      conversationId: null,
      inboundMessageId: null
    };
  }

  const conversation = await upsertConversation({
    clientId: client.id,
    sessionId: input.inbound.session_id,
    state: input.workflow.data.state,
    intent: input.workflow.data.intent,
    ultimaMensagemAt: input.inbound.received_at
  });

  if (!conversation) {
    return {
      clientId: client.id,
      conversationId: null,
      inboundMessageId: null
    };
  }

  const inboundMessage = await insertMessage({
    conversationId: conversation.id,
    direction: "inbound",
    provider: input.inbound.provider,
    providerMessageId: input.inbound.provider_message_id || null,
    mediaType: input.inbound.message_type,
    bodyRaw: input.inbound.message_text,
    bodyNormalized: normalize(input.inbound.message_text),
    payload: {
      inbound: input.inbound,
      workflow_meta: input.workflow.meta
    },
    receivedAt: input.inbound.received_at
  });

  if (inboundMessage?.id) {
    await insertConversationEvent({
      conversationId: conversation.id,
      messageId: inboundMessage.id,
      eventType: "inbound_received",
      eventStatus: "processed",
      eventData: {
        provider: input.inbound.provider,
        message_type: input.inbound.message_type,
        provider_message_id: input.inbound.provider_message_id || null
      }
    });
  }

  await insertConversationEvent({
    conversationId: conversation.id,
    messageId: inboundMessage?.id || null,
    eventType: "intent_classified",
    eventStatus: input.workflow.data.intent.intent,
    eventData: input.workflow.data.intent
  });

  await insertConversationEvent({
    conversationId: conversation.id,
    messageId: inboundMessage?.id || null,
    eventType: "state_updated",
    eventStatus: input.workflow.data.state.etapa,
    eventData: input.workflow.data.state
  });

  await upsertCartSnapshot({
    conversationId: conversation.id,
    sessionId: input.inbound.session_id,
    cart: input.workflow.data.cart
  });

  if (input.workflow.data.cart) {
    await insertConversationEvent({
      conversationId: conversation.id,
      messageId: inboundMessage?.id || null,
      eventType: "cart_snapshot",
      eventStatus: input.workflow.data.cart.status,
      eventData: input.workflow.data.cart
    });
  }

  await insertConversationEvent({
    conversationId: conversation.id,
    messageId: inboundMessage?.id || null,
    eventType: "reply_prepared",
    eventStatus: input.workflow.data.outbound.message_type,
    eventData: input.workflow.data.outbound
  });

  return {
    clientId: client.id,
    conversationId: conversation.id,
    inboundMessageId: inboundMessage?.id || null
  };
}

export async function persistOutboundDelivery(input: {
  conversationId: string;
  outbound: OutboundMessage;
  delivery: ProviderOutboundDelivery;
}) {
  if (!input.conversationId) return;

  if (!input.delivery.ok || !input.delivery.data) {
    await insertConversationEvent({
      conversationId: input.conversationId,
      eventType: "outbound_dispatch",
      eventStatus: "failed",
      eventData: input.delivery.error
    });
    return;
  }

  const outboundMessage = await insertMessage({
    conversationId: input.conversationId,
    direction: "outbound",
    provider: input.delivery.data.provider,
    providerMessageId: input.delivery.data.message_id,
    mediaType: input.delivery.data.message_type,
    bodyRaw: input.outbound.text,
    bodyNormalized: normalize(input.outbound.text),
    payload: {
      outbound: input.outbound,
      provider: input.delivery.data.provider,
      delivery: input.delivery.data.raw
    },
    sentAt: input.delivery.data.sent_at
  });

  await insertConversationEvent({
    conversationId: input.conversationId,
    messageId: outboundMessage?.id || null,
    eventType: "outbound_dispatch",
    eventStatus: "sent",
    eventData: {
      provider_message_id: input.delivery.data.message_id,
      provider: input.delivery.data.provider,
      message_type: input.delivery.data.message_type,
      sent_at: input.delivery.data.sent_at
    }
  });
}

export async function persistProviderStatusEvents(events: ProviderStatusEvent[]) {
  const db = getSupabaseAdmin();
  if (!db || !events.length) return;

  for (const event of events) {
    let conversationId: string | null = null;
    let messageId: string | null = null;

    if (event.provider_message_id) {
      const { data: messageData, error: messageError } = await db
        .from("mensagens")
        .select("id, conversa_id")
        .eq("provider", event.provider)
        .eq("provider_message_id", event.provider_message_id)
        .limit(1)
        .maybeSingle();

      if (messageError) {
        console.error("mensagens status lookup failed", messageError);
      } else {
        messageId = messageData?.id || null;
        conversationId = messageData?.conversa_id || null;
      }
    }

    if (!conversationId && event.recipient_id) {
      const { data: conversationData, error: conversationError } = await db
        .from("conversas")
        .select("id")
        .eq("session_id", event.recipient_id)
        .limit(1)
        .maybeSingle();

      if (conversationError) {
        console.error("conversas status fallback lookup failed", conversationError);
      } else {
        conversationId = conversationData?.id || null;
      }
    }

    if (!conversationId) continue;

    if (messageId && event.status === "sent") {
      const { error } = await db
        .from("mensagens")
        .update({ sent_at: event.occurred_at })
        .eq("id", messageId);

      if (error) {
        console.error("mensagens sent_at update failed", error);
      }
    }

    await insertConversationEvent({
      conversationId,
      messageId,
      eventType: "whatsapp_status",
      eventStatus: event.status,
      eventData: event.raw
    });
  }
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const db = getSupabaseAdmin();
  if (!db) return emptyDashboardSnapshot();

  const snapshot = emptyDashboardSnapshot();

  const { count: totalMessages, error: totalMessagesError } = await db
    .from("mensagens")
    .select("*", { count: "exact", head: true });

  if (!totalMessagesError && typeof totalMessages === "number") {
    snapshot.totalMessages = totalMessages;
  }

  const { data: conversations, error: conversationsError } = await db
    .from("conversas")
    .select("id, cliente_id, session_id, status, etapa_atual, ultima_mensagem_at")
    .order("ultima_mensagem_at", { ascending: false })
    .limit(8);

  if (conversationsError) {
    console.error("dashboard conversas lookup failed", conversationsError);
    return snapshot;
  }

  const rows = conversations || [];
  snapshot.openConversations = rows.filter((item) => item.status !== "closed").length;

  const stageCounts = new Map<string, number>();
  for (const row of rows) {
    const key = row.etapa_atual || "sem_etapa";
    stageCounts.set(key, (stageCounts.get(key) || 0) + 1);
  }

  const dominantStage = [...stageCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (dominantStage) snapshot.criticalStage = dominantStage;

  const clientIds = [...new Set(rows.map((item) => item.cliente_id).filter(Boolean))];
  const conversationIds = rows.map((item) => item.id);

  const clientsById = new Map<string, { nome: string | null; whatsapp: string }>();
  if (clientIds.length) {
    const { data: clients, error: clientsError } = await db
      .from("clientes")
      .select("id, nome, whatsapp")
      .in("id", clientIds);

    if (clientsError) {
      console.error("dashboard clientes lookup failed", clientsError);
    } else {
      for (const client of clients || []) {
        clientsById.set(client.id, {
          nome: client.nome || null,
          whatsapp: client.whatsapp
        });
      }
    }
  }

  const latestMessageByConversation = new Map<string, { body: string; created_at: string }>();
  if (conversationIds.length) {
    const { data: messages, error: messagesError } = await db
      .from("mensagens")
      .select("conversa_id, body_raw, body_normalized, created_at")
      .in("conversa_id", conversationIds)
      .order("created_at", { ascending: false });

    if (messagesError) {
      console.error("dashboard mensagens lookup failed", messagesError);
    } else {
      for (const message of messages || []) {
        if (!latestMessageByConversation.has(message.conversa_id)) {
          latestMessageByConversation.set(message.conversa_id, {
            body: message.body_raw || message.body_normalized || "Sem conteúdo",
            created_at: message.created_at
          });
        }
      }
    }
  }

  snapshot.rows = rows.map((row) => {
    const client = clientsById.get(row.cliente_id);
    const latestMessage = latestMessageByConversation.get(row.id);
    return {
      conversation_id: row.id,
      session_id: row.session_id,
      nome: client?.nome || client?.whatsapp || "Cliente sem nome",
      whatsapp: client?.whatsapp || row.session_id,
      etapa: row.etapa_atual || "sem_etapa",
      status: row.status,
      ultima_mensagem: latestMessage?.body || "Sem mensagens",
      updated_at: row.ultima_mensagem_at,
      tempo_relativo: formatRelativeTime(row.ultima_mensagem_at)
    };
  });

  return snapshot;
}

export async function getPersistedConversationState(
  sessionId: string
): Promise<ConversationState | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data: conversation, error: conversationError } = await db
    .from("conversas")
    .select("id")
    .eq("session_id", sessionId)
    .limit(1)
    .maybeSingle();

  if (conversationError) {
    console.error("persisted conversation lookup failed", conversationError);
    return null;
  }

  if (!conversation?.id) return null;

  const { data: event, error: eventError } = await db
    .from("conversation_events")
    .select("event_data")
    .eq("conversa_id", conversation.id)
    .eq("event_type", "state_updated")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (eventError) {
    console.error("persisted state event lookup failed", eventError);
    return null;
  }

  const payload = event?.event_data;
  if (!payload || typeof payload !== "object") return null;

  const state = payload as Partial<ConversationState>;
  if (!state.etapa || !state.updated_at) return null;

  return {
    modelo: state.modelo ?? null,
    cor: state.cor ?? null,
    quantidade: typeof state.quantidade === "number" ? state.quantidade : null,
    pediu_foto: Boolean(state.pediu_foto),
    pediu_checkout: Boolean(state.pediu_checkout),
    etapa: state.etapa,
    updated_at: state.updated_at
  };
}

export async function getPersistedCart(sessionId: string): Promise<CartState | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data: cart, error } = await db
    .from("carrinhos")
    .select("session_id, status, currency, items_json, updated_at")
    .eq("session_id", sessionId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("persisted cart lookup failed", error);
    return null;
  }

  if (!cart) return null;

  return {
    session_id: cart.session_id,
    status: cart.status,
    currency: cart.currency,
    current_item_draft: null,
    items: Array.isArray(cart.items_json) ? cart.items_json : [],
    updated_at: cart.updated_at
  } as CartState;
}
