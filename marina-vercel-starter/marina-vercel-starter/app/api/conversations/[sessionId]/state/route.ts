import { sessionParamSchema } from "@/lib/routes";
import { defaultState, getCart, getState } from "@/lib/state";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  const params = await context.params;
  const parsed = sessionParamSchema.safeParse(params);

  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        data: null,
        error: { code: "invalid_session_id", message: "Session inválida." },
        meta: {}
      },
      { status: 400 }
    );
  }

  const state = (await getState(parsed.data.sessionId)) ?? defaultState();
  const cart = await getCart(parsed.data.sessionId);

  return Response.json({
    ok: true,
    data: { state, cart },
    error: null,
    meta: {}
  });
}
