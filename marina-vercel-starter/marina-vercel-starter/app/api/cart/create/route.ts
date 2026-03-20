import { createExternalCart } from "@/lib/services/cart";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const items = Array.isArray(body.items) ? body.items : [];
  const result = await createExternalCart(items);

  return Response.json(result, { status: result.ok ? 200 : 400 });
}
