function envFlag(value: string | undefined, defaultValue: boolean) {
  if (value === undefined || value === "") return defaultValue;
  return value === "true";
}

export function getConfig() {
  return {
    appName: process.env.NEXT_PUBLIC_APP_NAME || "Marina",
    mockMode: process.env.NEXT_PUBLIC_MOCK_MODE === "true",
    openAiApiKey: process.env.OPENAI_API_KEY || "",
    upstashUrl: process.env.UPSTASH_REDIS_REST_URL || "",
    upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN || "",
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    supabaseCatalogTable: process.env.SUPABASE_CATALOG_TABLE || "produtos",
    blingClientId: process.env.BLING_CLIENT_ID || "",
    blingClientSecret: process.env.BLING_CLIENT_SECRET || "",
    blingAccessToken: process.env.BLING_ACCESS_TOKEN || "",
    blingRefreshToken: process.env.BLING_REFRESH_TOKEN || "",
    whatsappMetaEnabled: envFlag(process.env.WHATSAPP_META_ENABLED, true),
    whatsappEvolutionEnabled: envFlag(process.env.WHATSAPP_EVOLUTION_ENABLED, false),
    metaAppSecret: process.env.META_APP_SECRET || "",
    whatsappMetaVerifyToken: process.env.WHATSAPP_META_VERIFY_TOKEN || "",
    whatsappMetaAccessToken: process.env.WHATSAPP_META_ACCESS_TOKEN || "",
    whatsappMetaPhoneNumberId: process.env.WHATSAPP_META_PHONE_NUMBER_ID || "",
    whatsappMetaApiVersion: process.env.WHATSAPP_META_API_VERSION || "v22.0",
    evolutionApiVersion: process.env.EVOLUTION_API_VERSION || "v2",
    evolutionApiBaseUrl: process.env.EVOLUTION_API_BASE_URL || "",
    evolutionApiKey: process.env.EVOLUTION_API_KEY || "",
    evolutionInstanceName: process.env.EVOLUTION_INSTANCE_NAME || "",
    evolutionInstanceToken: process.env.EVOLUTION_INSTANCE_TOKEN || "",
    evolutionInstanceEngine: process.env.EVOLUTION_INSTANCE_ENGINE || "WHATSAPP-BAILEYS",
    evolutionWebhookSecret: process.env.EVOLUTION_WEBHOOK_SECRET || "",
    wcBaseUrl: process.env.WC_BASE_URL || "",
    wcConsumerKey: process.env.WC_CONSUMER_KEY || "",
    wcConsumerSecret: process.env.WC_CONSUMER_SECRET || "",
    cartQlKey: process.env.CARTQL_KEY || "",
    whatsappWebhookSecret: process.env.WHATSAPP_WEBHOOK_SECRET || ""
  };
}

export function hasRedis() {
  const config = getConfig();
  return Boolean(config.upstashUrl && config.upstashToken);
}

export function hasSupabase() {
  const config = getConfig();
  return Boolean(config.supabaseUrl && config.supabaseServiceRoleKey);
}

export function hasSupabaseCatalog() {
  const config = getConfig();
  return Boolean(config.supabaseUrl && config.supabaseServiceRoleKey && config.supabaseCatalogTable);
}

export function hasOpenAI() {
  return Boolean(getConfig().openAiApiKey);
}

export function hasBling() {
  const config = getConfig();
  return Boolean(
    config.blingClientId &&
      config.blingClientSecret &&
      (config.blingRefreshToken || config.blingAccessToken)
  );
}

export function hasMetaWhatsAppWebhook() {
  const config = getConfig();
  return Boolean(config.whatsappMetaEnabled && config.whatsappMetaVerifyToken);
}

export function hasMetaWhatsAppSend() {
  const config = getConfig();
  return Boolean(
    config.whatsappMetaEnabled &&
      config.whatsappMetaAccessToken &&
      config.whatsappMetaPhoneNumberId
  );
}

export function hasEvolutionApi() {
  const config = getConfig();
  return Boolean(
    config.whatsappEvolutionEnabled &&
      config.evolutionApiBaseUrl &&
      config.evolutionApiKey &&
      config.evolutionInstanceName
  );
}

export function hasWooCommerceCart() {
  const config = getConfig();
  return Boolean(
    config.wcBaseUrl &&
      config.wcConsumerKey &&
      config.wcConsumerSecret &&
      config.cartQlKey
  );
}
