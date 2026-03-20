import { getConfig, hasWooCommerceCart } from "@/lib/config";
import type { CartDraftItem } from "@/lib/types";

async function wooRequest(path: string) {
  const config = getConfig();
  const base = config.wcBaseUrl.replace(/\/$/, "");
  const separator = path.includes("?") ? "&" : "?";
  const url =
    `${base}${path}${separator}consumer_key=${encodeURIComponent(config.wcConsumerKey)}` +
    `&consumer_secret=${encodeURIComponent(config.wcConsumerSecret)}`;
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Woo request failed: ${response.status}`);
  }
  return response.json();
}

export async function createExternalCart(items: CartDraftItem[]) {
  if (!items.length) {
    return {
      ok: false,
      data: null,
      error: { code: "empty_cart", message: "Carrinho vazio." },
      meta: {}
    };
  }

  if (!hasWooCommerceCart()) {
    return {
      ok: true,
      data: {
        cart_url: "/dashboard?previewCart=true",
        preview_only: true,
        resolved_items: items
      },
      error: null,
      meta: {
        provider: "mock",
        note: "Defina WC_BASE_URL, WC_CONSUMER_KEY, WC_CONSUMER_SECRET e CARTQL_KEY para criação real."
      }
    };
  }

  const config = getConfig();
  const resolvedItems: Array<{
    product_id: number;
    variation_id: number;
    qty: number;
    sku: string;
  }> = [];

  for (const item of items) {
    const products = await wooRequest(`/wp-json/wc/v3/products?sku=${encodeURIComponent(item.sku)}`);
    const parent = Array.isArray(products) ? products[0] : null;
    if (!parent?.id) {
      return {
        ok: false,
        data: null,
        error: {
          code: "parent_product_not_found",
          message: `Produto pai não encontrado para ${item.sku}.`
        },
        meta: {}
      };
    }

    const variations = await wooRequest(`/wp-json/wc/v3/products/${parent.id}/variations?per_page=100`);
    const variation = Array.isArray(variations)
      ? variations.find((v) => String(v.sku || "").trim().toUpperCase() === item.sku.trim().toUpperCase())
      : null;

    if (!variation?.id) {
      return {
        ok: false,
        data: null,
        error: {
          code: "variation_not_found",
          message: `Variação não encontrada para ${item.sku}.`
        },
        meta: {}
      };
    }

    resolvedItems.push({
      product_id: Number(parent.id),
      variation_id: Number(variation.id),
      qty: item.quantidade,
      sku: item.sku
    });
  }

  const endpoint = `${config.wcBaseUrl.replace(/\/$/, "")}/wp-json/cartql/v1/create`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cartql-key": config.cartQlKey
    },
    body: JSON.stringify({
      items: resolvedItems.map((item) => ({
        product_id: item.product_id,
        variation_id: item.variation_id,
        qty: item.qty
      }))
    })
  });

  if (!response.ok) {
    return {
      ok: false,
      data: null,
      error: {
        code: "cart_provider_error",
        message: `CartQL respondeu ${response.status}.`
      },
      meta: {}
    };
  }

  const payload = await response.json();
  return {
    ok: true,
    data: {
      cart_url:
        payload?.cart_url ||
        payload?.url ||
        payload?.data?.cart_url ||
        payload?.data?.url ||
        null,
      resolved_items: resolvedItems
    },
    error: null,
    meta: {
      provider: "cartql"
    }
  };
}
