import { quoteVariantBySku } from "@/lib/services/bling";
import { findVariant } from "@/lib/services/catalog";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();

  const resolved = body.sku
    ? {
        product: null,
        variant: {
          sku: String(body.sku),
          cor: body.cor || null,
          image_url: null
        }
      }
    : await findVariant({
        modelo: body.modelo,
        cor: body.cor
      });

  if (!resolved?.variant?.sku) {
    return Response.json(
      {
        ok: false,
        data: null,
        error: {
          code: "variant_not_found",
          message: "Nao encontrei variante para o modelo/cor informados."
        },
        meta: {
          source: "supabase_catalog"
        }
      },
      { status: 404 }
    );
  }

  const quote = await quoteVariantBySku({
    sku: resolved.variant.sku,
    fallbackImageUrl: resolved.variant.image_url || null
  });

  if (!quote.found) {
    return Response.json(
      {
        ok: false,
        data: null,
        error: {
          code: "stock_quote_not_found",
          message: "Nao encontrei preco/estoque no Bling para o SKU informado."
        },
        meta: {
          source: "bling"
        }
      },
      { status: 404 }
    );
  }

  return Response.json({
    ok: true,
    data: {
      produto: resolved.product,
      variante: resolved.variant,
      quote
    },
    error: null,
    meta: {
      source: "bling"
    }
  });
}
