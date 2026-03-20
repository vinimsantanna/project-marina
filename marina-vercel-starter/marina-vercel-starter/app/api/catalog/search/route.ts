import { searchCatalog } from "@/lib/services/catalog";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const products = await searchCatalog({
    modelo: body.modelo,
    cor: body.cor,
    text: body.input,
    maxProdutos: Number(body.max_produtos || 6)
  });

  return Response.json({
    ok: true,
    data: {
      produtos: products
    },
    error: null,
    meta: {
      source: "catalog_service"
    }
  });
}
