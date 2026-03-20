import "server-only";
import { getConfig, hasBling } from "@/lib/config";
import { nowIso } from "@/lib/normalization";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { VariantQuote } from "@/lib/types";

type BlingTokenPayload = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
};

type BlingIntegrationRow = {
  provider: string;
  status: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_type: string | null;
  expires_at: string | null;
  metadata_json: Record<string, unknown> | null;
};

type BlingProductPayload = {
  data?: Array<{
    id?: number;
    idProdutoPai?: number;
    nome?: string;
    codigo?: string;
    preco?: number;
    situacao?: string;
    imagemURL?: string;
    estoque?: {
      saldoVirtualTotal?: number;
    };
  }>;
};

let blingTokenCache: {
  accessToken: string | null;
  refreshToken: string | null;
  tokenType: string | null;
  expiresAt: string | null;
} | null = null;

function isTokenFresh(expiresAt: string | null | undefined) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() - Date.now() > 120_000;
}

function toExpiryIso(expiresIn: number | null | undefined) {
  if (!expiresIn || !Number.isFinite(expiresIn)) return null;
  return new Date(Date.now() + expiresIn * 1000).toISOString();
}

function syncTokenCache(input: {
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenType?: string | null;
  expiresAt?: string | null;
}) {
  blingTokenCache = {
    accessToken: input.accessToken ?? blingTokenCache?.accessToken ?? null,
    refreshToken: input.refreshToken ?? blingTokenCache?.refreshToken ?? null,
    tokenType: input.tokenType ?? blingTokenCache?.tokenType ?? null,
    expiresAt: input.expiresAt ?? blingTokenCache?.expiresAt ?? null
  };
}

async function getStoredBlingIntegration() {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data, error } = await db
    .from("integracoes")
    .select("provider, status, access_token, refresh_token, token_type, expires_at, metadata_json")
    .eq("provider", "bling")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("integracoes lookup failed", error);
    return null;
  }

  if (data) {
    syncTokenCache({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type,
      expiresAt: data.expires_at
    });
  }

  return (data as BlingIntegrationRow | null) ?? null;
}

async function upsertBlingIntegration(payload: {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresAt: string | null;
  metadata?: Record<string, unknown>;
}) {
  const db = getSupabaseAdmin();
  if (!db) return;

  const { error } = await db.from("integracoes").upsert(
    {
      provider: "bling",
      status: "active",
      access_token: payload.accessToken,
      refresh_token: payload.refreshToken,
      token_type: payload.tokenType,
      expires_at: payload.expiresAt,
      metadata_json: payload.metadata || {},
      updated_at: nowIso()
    },
    { onConflict: "provider" }
  );

  if (error) {
    console.error("integracoes upsert failed", error);
  }
}

async function requestBlingTokenRefresh(refreshToken: string) {
  const config = getConfig();
  const basic = Buffer.from(`${config.blingClientId}:${config.blingClientSecret}`).toString(
    "base64"
  );
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });

  const response = await fetch("https://www.bling.com.br/Api/v3/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "enable-jwt": "1"
    },
    body: body.toString(),
    cache: "no-store"
  });

  const rawText = await response.text();
  let parsed: unknown = null;

  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = rawText;
  }

  if (!response.ok) {
    throw new Error(
      `Bling token refresh falhou com ${response.status}: ${
        typeof parsed === "string" ? parsed : JSON.stringify(parsed)
      }`
    );
  }

  return parsed as BlingTokenPayload;
}

async function ensureBlingAccessToken() {
  if (!hasBling()) return null;

  if (blingTokenCache?.accessToken && isTokenFresh(blingTokenCache.expiresAt)) {
    return blingTokenCache.accessToken;
  }

  const config = getConfig();
  const stored = await getStoredBlingIntegration();

  if (stored?.access_token && isTokenFresh(stored.expires_at)) {
    syncTokenCache({
      accessToken: stored.access_token,
      refreshToken: stored.refresh_token,
      tokenType: stored.token_type,
      expiresAt: stored.expires_at
    });
    return stored.access_token;
  }

  const refreshToken =
    blingTokenCache?.refreshToken || stored?.refresh_token || config.blingRefreshToken;

  if (refreshToken) {
    const refreshed = await requestBlingTokenRefresh(refreshToken);
    const expiresAt = toExpiryIso(refreshed.expires_in);

    syncTokenCache({
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token,
      tokenType: refreshed.token_type,
      expiresAt
    });

    await upsertBlingIntegration({
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token,
      tokenType: refreshed.token_type,
      expiresAt,
      metadata: refreshed.scope ? { scope: refreshed.scope } : {}
    });

    return refreshed.access_token;
  }

  const accessToken =
    blingTokenCache?.accessToken || stored?.access_token || config.blingAccessToken;

  if (accessToken) {
    syncTokenCache({
      accessToken,
      refreshToken,
      tokenType: stored?.token_type || blingTokenCache?.tokenType || "Bearer",
      expiresAt: stored?.expires_at || blingTokenCache?.expiresAt || null
    });
  }

  return accessToken || null;
}

async function blingGet(path: string, retry = true) {
  const token = await ensureBlingAccessToken();
  if (!token) {
    throw new Error("Bling nao configurado com token de acesso ou refresh token.");
  }

  const response = await fetch(`https://api.bling.com.br${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    },
    cache: "no-store"
  });

  const rawText = await response.text();
  let parsed: unknown = null;

  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = rawText;
  }

  if (response.status === 401 && retry) {
    const stored = await getStoredBlingIntegration();
    const refreshToken =
      blingTokenCache?.refreshToken || stored?.refresh_token || getConfig().blingRefreshToken;
    if (refreshToken) {
      const refreshed = await requestBlingTokenRefresh(refreshToken);
      const expiresAt = toExpiryIso(refreshed.expires_in);
      syncTokenCache({
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token,
        tokenType: refreshed.token_type,
        expiresAt
      });
      await upsertBlingIntegration({
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token,
        tokenType: refreshed.token_type,
        expiresAt,
        metadata: refreshed.scope ? { scope: refreshed.scope } : {}
      });
      return blingGet(path, false);
    }
  }

  if (!response.ok) {
    throw new Error(
      `Bling respondeu ${response.status}: ${
        typeof parsed === "string" ? parsed : JSON.stringify(parsed)
      }`
    );
  }

  return parsed;
}

function normalizeQuote(input: {
  sku: string;
  payload: BlingProductPayload;
  fallbackImageUrl?: string | null;
}): VariantQuote {
  const item = Array.isArray(input.payload.data) ? input.payload.data[0] : null;

  if (!item?.codigo) {
    return {
      found: false,
      sku: input.sku,
      nome: null,
      preco: null,
      saldo_disponivel: null,
      situacao: null,
      produto_id: null,
      produto_pai_id: null,
      image_url: input.fallbackImageUrl || null,
      source: "bling"
    };
  }

  return {
    found: true,
    sku: item.codigo,
    nome: item.nome || null,
    preco: typeof item.preco === "number" ? item.preco : null,
    saldo_disponivel:
      typeof item.estoque?.saldoVirtualTotal === "number" ? item.estoque.saldoVirtualTotal : null,
    situacao: item.situacao || null,
    produto_id: typeof item.id === "number" ? item.id : null,
    produto_pai_id: typeof item.idProdutoPai === "number" ? item.idProdutoPai : null,
    image_url: item.imagemURL || input.fallbackImageUrl || null,
    source: "bling"
  };
}

export async function quoteVariantBySku(input: {
  sku: string;
  fallbackImageUrl?: string | null;
}): Promise<VariantQuote> {
  if (!hasBling()) {
    return {
      found: false,
      sku: input.sku,
      nome: null,
      preco: null,
      saldo_disponivel: null,
      situacao: null,
      produto_id: null,
      produto_pai_id: null,
      image_url: input.fallbackImageUrl || null,
      source: "mock"
    };
  }

  try {
    const payload = (await blingGet(
      `/Api/v3/produtos?pagina=1&limite=1&codigo=${encodeURIComponent(input.sku)}`
    )) as BlingProductPayload;

    return normalizeQuote({
      sku: input.sku,
      payload,
      fallbackImageUrl: input.fallbackImageUrl || null
    });
  } catch (error) {
    console.error("bling quote failed", error);
    return {
      found: false,
      sku: input.sku,
      nome: null,
      preco: null,
      saldo_disponivel: null,
      situacao: null,
      produto_id: null,
      produto_pai_id: null,
      image_url: input.fallbackImageUrl || null,
      source: "bling"
    };
  }
}
