import { extractStructured } from "@/lib/services/ai";
import { defaultState } from "@/lib/state";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const result = await extractStructured({
    messageText: String(body.message_text || ""),
    state: body.conversation_state || defaultState()
  });

  return Response.json({
    ok: true,
    data: result,
    error: null,
    meta: {}
  });
}
