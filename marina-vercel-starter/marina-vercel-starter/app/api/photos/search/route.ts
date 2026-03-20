import { findPhoto } from "@/lib/services/catalog";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const result = await findPhoto({
    modelo: body.modelo,
    cor: body.cor
  });

  return Response.json({
    ok: result.found,
    data: result,
    error: result.found
      ? null
      : {
          code: "image_not_found",
          message: "Imagem nao encontrada para o modelo/cor."
        },
    meta: {
      source: "catalog_service"
    }
  });
}
