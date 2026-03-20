import { brl } from "@/lib/format";
import type {
  CatalogProduct,
  CartState,
  ConversationState,
  IntentClassificationOutput,
  OutboundMessage,
  VariantQuote
} from "@/lib/types";

function topColors(product: CatalogProduct) {
  return product.variantes
    .slice(0, 4)
    .map((variant) => variant.cor)
    .join(", ");
}

export function buildReply(params: {
  sessionId: string;
  state: ConversationState;
  intent: IntentClassificationOutput;
  catalog: CatalogProduct[];
  cart: CartState | null;
  imageUrl?: string | null;
  cartUrl?: string | null;
  photoFound?: boolean | null;
  variantQuote?: VariantQuote | null;
}): OutboundMessage {
  const { sessionId, state, intent, catalog, cart, imageUrl, cartUrl, photoFound, variantQuote } =
    params;
  const first = catalog[0];

  let text = "Me diz o modelo que voce quer que eu sigo com voce por aqui.";
  let messageType: "text" | "image" = "text";
  let outboundImage: string | null = null;

  const quotePrice = typeof variantQuote?.preco === "number" ? variantQuote.preco : null;
  const quoteStock =
    typeof variantQuote?.saldo_disponivel === "number" ? variantQuote.saldo_disponivel : null;

  if (!state.modelo && catalog.length) {
    text = `Tenho esses modelos para te mostrar agora: ${catalog
      .slice(0, 3)
      .map((item) => item.nome)
      .join(", ")}. Qual voce quer ver primeiro?`;
  } else if (state.modelo && !state.cor) {
    text = first
      ? `Tenho ${first.nome}. As cores mais comuns sao ${topColors(first)}. Qual cor voce quer?`
      : `Perfeito. Qual cor voce quer para ${state.modelo}?`;
  } else if (state.modelo && state.cor && photoFound && imageUrl) {
    text = `Achei uma foto de ${state.modelo} na cor ${state.cor}. Se quiser, eu ja sigo para quantidade.`;
    messageType = "image";
    outboundImage = imageUrl;
  } else if (state.modelo && state.cor && quoteStock !== null && quoteStock <= 0) {
    text = `No momento eu nao tenho estoque de ${state.modelo} na cor ${state.cor}. Se quiser, eu posso te mostrar outra cor parecida.`;
  } else if (state.modelo && state.cor && photoFound === false) {
    text = `Eu nao tenho a foto de ${state.modelo} na cor ${state.cor} aqui agora, mas posso seguir com preco e disponibilidade se voce quiser.`;
  } else if (state.modelo && state.cor && !state.quantidade) {
    if (quotePrice !== null && quoteStock !== null) {
      text = `${state.modelo} na cor ${state.cor} esta saindo por ${brl(
        quotePrice
      )}. Eu tenho ${quoteStock} unidade(s) disponivel(is) agora. Quantas voce quer?`;
    } else if (quotePrice !== null) {
      text = `${state.modelo} na cor ${state.cor} esta saindo por ${brl(
        quotePrice
      )}. Quantas unidades voce quer?`;
    } else {
      text = `Perfeito. Quantas unidades de ${state.modelo} na cor ${state.cor} voce quer?`;
    }
  } else if (
    state.modelo &&
    state.cor &&
    state.quantidade &&
    quoteStock !== null &&
    quoteStock < state.quantidade
  ) {
    text = `No momento eu tenho ${quoteStock} unidade(s) de ${state.modelo} na cor ${state.cor}. Se quiser, eu monto com essa quantidade ou te mostro outra cor.`;
  } else if (state.modelo && state.cor && state.quantidade && !state.pediu_checkout) {
    text = `Fechado: ${state.quantidade}x ${state.modelo} na cor ${state.cor}. Posso montar seu carrinho?`;
  } else if (state.modelo && state.cor && state.quantidade && state.pediu_checkout && cartUrl) {
    text = `Carrinho montado. Segue o link: ${cartUrl}`;
  } else if (
    state.modelo &&
    state.cor &&
    state.quantidade &&
    state.pediu_checkout &&
    cart?.items.length
  ) {
    text = `Carrinho em previa montado com ${cart.items.length} item(ns). Para gerar o link real na loja, configure WooCommerce + CartQL nas variaveis de ambiente.`;
  } else if (intent.intent === "duvida") {
    text = "Posso te ajudar com modelo, cor, preco, foto ou montar o carrinho. Me diz por onde voce quer comecar.";
  }

  return {
    session_id: sessionId,
    message_type: messageType,
    text,
    image_url: outboundImage,
    reply_to: null,
    meta: {
      intent: intent.intent,
      etapa: state.etapa
    }
  };
}
