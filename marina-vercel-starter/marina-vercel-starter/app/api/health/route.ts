import {
  getConfig,
  hasBling,
  hasEvolutionApi,
  hasMetaWhatsAppSend,
  hasMetaWhatsAppWebhook,
  hasOpenAI,
  hasRedis,
  hasSupabaseCatalog,
  hasSupabase,
  hasWooCommerceCart
} from "@/lib/config";

export const runtime = "nodejs";

export async function GET() {
  const config = getConfig();

  return Response.json({
    ok: true,
    data: {
      app: config.appName,
      mock_mode: config.mockMode,
      services: {
        openai: hasOpenAI(),
        redis: hasRedis(),
        woo_cart: hasWooCommerceCart(),
        supabase: hasSupabase(),
        supabase_catalog: hasSupabaseCatalog(),
        bling: hasBling(),
        evolution: hasEvolutionApi(),
        meta_whatsapp_webhook: hasMetaWhatsAppWebhook(),
        meta_whatsapp_send: hasMetaWhatsAppSend()
      }
    },
    error: null,
    meta: {
      timestamp: new Date().toISOString()
    }
  });
}
