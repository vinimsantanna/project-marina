export type Intent =
  | "ver_produto"
  | "ver_preco"
  | "escolher_cor"
  | "escolher_quantidade"
  | "pediu_foto"
  | "checkout"
  | "duvida"
  | "fallback";

export type MessageType = "text" | "audio" | "image" | "pdf" | "other";
export type WhatsAppProvider = "meta" | "evolution" | "manual" | "simulator";

export interface ConversationState {
  modelo: string | null;
  cor: string | null;
  quantidade: number | null;
  pediu_foto: boolean;
  pediu_checkout: boolean;
  etapa: Intent;
  updated_at: string;
}

export interface InboundMessage {
  session_id: string;
  channel: "whatsapp";
  provider: WhatsAppProvider | string;
  provider_message_id?: string | null;
  from: string;
  from_name?: string | null;
  direction: "inbound";
  message_type: MessageType;
  message_text: string | null;
  media?: {
    url?: string | null;
    mime_type?: string | null;
    file_name?: string | null;
  } | null;
  received_at: string;
  raw?: unknown;
}

export interface IntentClassificationOutput {
  intent: Intent;
  confidence: number;
  reason: string;
}

export interface StructuredExtractionOutput {
  modelo: string | null;
  cor: string | null;
  quantidade: number | null;
  pediu_foto: boolean;
  pediu_checkout: boolean;
  observacao: string | null;
}

export interface CatalogVariant {
  cor: string;
  sku: string;
  saldoFisico: number;
  preco: number;
  image_url?: string | null;
}

export interface CatalogProduct {
  nome: string;
  slug: string;
  resumo: string;
  preco: number;
  variantes: CatalogVariant[];
  image_url?: string | null;
}

export interface CartDraftItem {
  sku: string;
  produto_nome: string;
  cor: string;
  quantidade: number;
  preco_unitario: number;
  saldo_fisico: number;
}

export interface CartState {
  session_id: string;
  status: "building" | "confirmed" | "sent" | "failed";
  currency: "BRL";
  current_item_draft: CartDraftItem | null;
  items: CartDraftItem[];
  updated_at: string;
}

export interface OutboundMessage {
  session_id: string;
  message_type: "text" | "image";
  text: string;
  image_url: string | null;
  reply_to: string | null;
  meta: {
    intent: Intent;
    etapa: Intent;
  };
}

export interface WorkflowResult {
  ok: boolean;
  data: {
    inbound: InboundMessage;
    intent: IntentClassificationOutput;
    extracted: StructuredExtractionOutput;
    state: ConversationState;
    cart: CartState | null;
    catalog: CatalogProduct[];
    outbound: OutboundMessage;
  };
  error: null | {
    code: string;
    message: string;
  };
  meta: Record<string, unknown>;
}

export interface VariantQuote {
  found: boolean;
  sku: string;
  nome: string | null;
  preco: number | null;
  saldo_disponivel: number | null;
  situacao: string | null;
  produto_id: number | null;
  produto_pai_id: number | null;
  image_url: string | null;
  source: "bling" | "mock";
}

export interface ProviderStatusEvent {
  provider: string;
  provider_message_id: string | null;
  recipient_id: string | null;
  status: string;
  occurred_at: string;
  conversation_id: string | null;
  raw: unknown;
}

export interface ProviderOutboundDelivery {
  ok: boolean;
  data: {
    provider: string;
    message_id: string | null;
    message_type: "text" | "image";
    sent_at: string;
    raw: unknown;
  } | null;
  error: {
    code: string;
    message: string;
    raw?: unknown;
  } | null;
}

export interface DashboardConversationRow {
  conversation_id: string;
  session_id: string;
  nome: string;
  whatsapp: string;
  etapa: string;
  status: string;
  ultima_mensagem: string;
  updated_at: string;
  tempo_relativo: string;
}

export interface DashboardSnapshot {
  openConversations: number;
  criticalStage: string;
  modeLabel: string;
  totalMessages: number;
  rows: DashboardConversationRow[];
}
