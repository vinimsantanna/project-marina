import type { CartState, ConversationState } from "@/lib/types";

const stateStore = new Map<string, ConversationState>();
const cartStore = new Map<string, CartState>();

export function getMemoryState(sessionId: string) {
  return stateStore.get(sessionId) ?? null;
}

export function setMemoryState(sessionId: string, state: ConversationState) {
  stateStore.set(sessionId, state);
}

export function getMemoryCart(sessionId: string) {
  return cartStore.get(sessionId) ?? null;
}

export function setMemoryCart(sessionId: string, cart: CartState) {
  cartStore.set(sessionId, cart);
}
