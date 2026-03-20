import { nowIso, toSessionId } from "@/lib/normalization";
import { classifyIntent, extractStructured } from "@/lib/services/ai";
import { quoteVariantBySku } from "@/lib/services/bling";
import { findPhoto, findVariant, searchCatalog } from "@/lib/services/catalog";
import { createExternalCart } from "@/lib/services/cart";
import { buildReply } from "@/lib/services/reply";
import { defaultCart, getCart, getState, mergeState, setCart, setState } from "@/lib/state";
import type {
  CartDraftItem,
  ConversationState,
  InboundMessage,
  WorkflowResult
} from "@/lib/types";

export async function processInboundMessage(input: {
  inbound: Partial<InboundMessage> & Pick<InboundMessage, "from" | "message_text">;
  conversation_state?: ConversationState | null;
}): Promise<WorkflowResult> {
  const sessionId = toSessionId(input.inbound.session_id || input.inbound.from);
  const inbound: InboundMessage = {
    session_id: sessionId,
    channel: "whatsapp",
    provider: input.inbound.provider || "manual",
    provider_message_id: input.inbound.provider_message_id || null,
    from: toSessionId(input.inbound.from),
    from_name: input.inbound.from_name || null,
    direction: "inbound",
    message_type: input.inbound.message_type || "text",
    message_text: input.inbound.message_text || "",
    media: input.inbound.media || null,
    received_at: input.inbound.received_at || nowIso(),
    raw: input.inbound.raw || null
  };

  const oldState = await getState(sessionId, input.conversation_state || null);
  const intent = await classifyIntent({
    messageText: inbound.message_text || "",
    state: oldState
  });

  const extracted = await extractStructured({
    messageText: inbound.message_text || "",
    state: oldState
  });

  const state = mergeState(oldState, extracted, intent.intent);
  const catalog = await searchCatalog({
    modelo: state.modelo,
    cor: state.cor,
    text: inbound.message_text,
    maxProdutos: 6
  });

  let cart = await getCart(sessionId);
  if (!cart) cart = defaultCart(sessionId);

  let imageUrl: string | null = null;
  let photoFound: boolean | null = null;
  if (state.modelo && state.cor && state.pediu_foto) {
    const photo = await findPhoto({
      modelo: state.modelo,
      cor: state.cor
    });
    imageUrl = photo.image_url;
    photoFound = photo.found;
    state.pediu_foto = false;
  }

  const resolvedVariant = state.modelo && state.cor
    ? await findVariant({ modelo: state.modelo, cor: state.cor })
    : null;
  const variantQuote = resolvedVariant
    ? await quoteVariantBySku({
        sku: resolvedVariant.variant.sku,
        fallbackImageUrl: resolvedVariant.variant.image_url || resolvedVariant.product.image_url || null
      })
    : null;

  if (resolvedVariant && variantQuote?.found) {
    if (typeof variantQuote.preco === "number") {
      resolvedVariant.variant.preco = variantQuote.preco;
      resolvedVariant.product.preco = variantQuote.preco;
    }
    if (typeof variantQuote.saldo_disponivel === "number") {
      resolvedVariant.variant.saldoFisico = variantQuote.saldo_disponivel;
    }
    if (!resolvedVariant.variant.image_url && variantQuote.image_url) {
      resolvedVariant.variant.image_url = variantQuote.image_url;
    }
    if (!resolvedVariant.product.image_url && variantQuote.image_url) {
      resolvedVariant.product.image_url = variantQuote.image_url;
    }
  }

  const insufficientStock =
    typeof variantQuote?.saldo_disponivel === "number" &&
    state.quantidade !== null &&
    variantQuote.saldo_disponivel < state.quantidade;
  const outOfStock =
    typeof variantQuote?.saldo_disponivel === "number" && variantQuote.saldo_disponivel <= 0;

  if (resolvedVariant && state.quantidade && !insufficientStock && !outOfStock) {
    const item: CartDraftItem = {
      sku: resolvedVariant.variant.sku,
      produto_nome: resolvedVariant.product.nome,
      cor: resolvedVariant.variant.cor,
      quantidade: state.quantidade,
      preco_unitario: resolvedVariant.variant.preco,
      saldo_fisico: resolvedVariant.variant.saldoFisico
    };
    cart.current_item_draft = item;
    cart.updated_at = nowIso();

    const confirmationLike = /(sim|pode|quero|fecha|monta|finaliza)/i.test(
      inbound.message_text || ""
    );
    if (state.pediu_checkout || confirmationLike) {
      cart.items = [item];
      cart.current_item_draft = null;
      cart.status = "confirmed";
      state.pediu_checkout = true;
    }
  }

  if (insufficientStock || outOfStock) {
    cart.current_item_draft = null;
    cart.items = [];
    cart.status = "building";
    state.pediu_checkout = false;
  }

  let cartUrl: string | null = null;
  if (cart.items.length && state.pediu_checkout) {
    const cartResponse = await createExternalCart(cart.items);
    if (cartResponse.ok) {
      cartUrl = cartResponse.data?.cart_url || null;
      cart.status = cartResponse.data?.preview_only ? "confirmed" : "sent";
    } else {
      cart.status = "failed";
    }
  }

  const outbound = buildReply({
    sessionId,
    state,
    intent,
    catalog,
    cart,
    imageUrl,
    cartUrl,
    photoFound,
    variantQuote
  });

  await setState(sessionId, state);
  await setCart(sessionId, cart);

  return {
    ok: true,
    data: {
      inbound,
      intent,
      extracted,
      state,
      cart,
      catalog,
      outbound
    },
    error: null,
    meta: {
      mode: "integrated",
      session_id: sessionId
    }
  };
}
