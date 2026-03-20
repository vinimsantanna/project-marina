import { nowIso } from "@/lib/normalization";
import type {
  CartState,
  ConversationState,
  Intent,
  StructuredExtractionOutput
} from "@/lib/types";
import { getPersistedCart, getPersistedConversationState } from "@/lib/persistence";
import { getRedisClient } from "@/lib/storage/redis";
import {
  getMemoryCart,
  getMemoryState,
  setMemoryCart,
  setMemoryState
} from "@/lib/storage/memory";

export const defaultState = (): ConversationState => ({
  modelo: null,
  cor: null,
  quantidade: null,
  pediu_foto: false,
  pediu_checkout: false,
  etapa: "ver_produto",
  updated_at: nowIso()
});

export const defaultCart = (session_id: string): CartState => ({
  session_id,
  status: "building",
  currency: "BRL",
  current_item_draft: null,
  items: [],
  updated_at: nowIso()
});

function recalculateStage(
  intent: Intent,
  state: Pick<
    ConversationState,
    "modelo" | "cor" | "quantidade" | "pediu_foto" | "pediu_checkout"
  >
): Intent {
  if (!state.modelo) return intent === "duvida" ? "duvida" : "ver_produto";
  if (state.pediu_foto) return "pediu_foto";
  if (!state.cor) return "escolher_cor";
  if (!state.quantidade) return "escolher_quantidade";
  if (state.pediu_checkout || intent === "checkout") return "checkout";
  if (intent === "ver_preco") return "ver_preco";
  return "checkout";
}

export function mergeState(
  oldState: ConversationState | null,
  extracted: StructuredExtractionOutput,
  intent: Intent
): ConversationState {
  const state = oldState ?? defaultState();
  const merged: ConversationState = {
    modelo: extracted.modelo ?? state.modelo,
    cor: extracted.cor ?? state.cor,
    quantidade: extracted.quantidade ?? state.quantidade,
    pediu_foto: extracted.pediu_foto || state.pediu_foto,
    pediu_checkout: extracted.pediu_checkout || state.pediu_checkout,
    etapa: state.etapa,
    updated_at: nowIso()
  };
  merged.etapa = recalculateStage(intent, merged);
  return merged;
}

export async function getState(
  sessionId: string,
  fallback?: ConversationState | null
): Promise<ConversationState | null> {
  const redis = getRedisClient();
  if (redis) {
    const value = await redis.get<ConversationState>(`state:${sessionId}`);
    return value ?? fallback ?? null;
  }
  return fallback ?? getMemoryState(sessionId) ?? (await getPersistedConversationState(sessionId));
}

export async function setState(sessionId: string, state: ConversationState) {
  const redis = getRedisClient();
  if (redis) {
    await redis.set(`state:${sessionId}`, state);
    return;
  }
  setMemoryState(sessionId, state);
}

export async function getCart(sessionId: string): Promise<CartState | null> {
  const redis = getRedisClient();
  if (redis) {
    return (await redis.get<CartState>(`cart:${sessionId}`)) ?? null;
  }
  return getMemoryCart(sessionId) ?? (await getPersistedCart(sessionId));
}

export async function setCart(sessionId: string, cart: CartState) {
  const redis = getRedisClient();
  if (redis) {
    await redis.set(`cart:${sessionId}`, cart);
    return;
  }
  setMemoryCart(sessionId, cart);
}
