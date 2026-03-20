import "server-only";
import { getConfig, hasSupabaseCatalog } from "@/lib/config";
import { mockCatalogSeed } from "@/lib/mock-catalog";
import { normalize } from "@/lib/normalization";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { CatalogProduct, CatalogVariant } from "@/lib/types";

type ProdutoDocRow = {
  id: number | string;
  content: string | null;
  metadata: {
    metadata?: {
      doc_type?: string;
      keywords?: string[];
      product_name?: string;
      product_slug?: string;
      product_base_code?: string;
      sku?: string;
      color?: string;
      images?: string[];
      bling_product_id?: number;
      bling_variant_id?: number;
      available_now_assumed?: boolean;
    };
  } | null;
};

type RankedCatalogProduct = {
  product: CatalogProduct;
  keywords: string[];
  content: string;
  score: number;
};

const CATALOG_PAGE_SIZE = 500;
const CATALOG_MAX_ROWS = 5000;

function safeArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function buildSlug(value: string) {
  return normalize(value)
    .replace(/[^\p{L}\p{N}\s/-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/\/+/g, "-")
    .replace(/^-|-$/g, "");
}

function isExactColorMatch(a: string | null | undefined, b: string | null | undefined) {
  return normalize(a) === normalize(b);
}

function scoreProduct(input: {
  product: CatalogProduct;
  keywords: string[];
  content: string;
  modelo: string;
  cor: string;
}) {
  let score = 0;
  const name = normalize(input.product.nome);

  if (input.modelo) {
    if (name.includes(input.modelo)) score += 12;
    if (input.modelo.includes(name)) score += 9;
    for (const keyword of input.keywords) {
      const normalizedKeyword = normalize(keyword);
      if (normalizedKeyword === input.modelo) score += 10;
      if (normalizedKeyword.includes(input.modelo)) score += 5;
    }
    if (normalize(input.content).includes(input.modelo)) score += 4;
  } else {
    score += 1;
  }

  if (input.cor) {
    const exactVariant = input.product.variantes.some((variant) =>
      isExactColorMatch(variant.cor, input.cor)
    );
    if (exactVariant) score += 14;
  }

  return score;
}

async function fetchSupabaseCatalogRows() {
  const db = getSupabaseAdmin();
  if (!db || !hasSupabaseCatalog()) return [];

  const config = getConfig();
  const rows: ProdutoDocRow[] = [];

  for (let from = 0; from < CATALOG_MAX_ROWS; from += CATALOG_PAGE_SIZE) {
    const to = from + CATALOG_PAGE_SIZE - 1;
    const { data, error } = await db
      .from(config.supabaseCatalogTable)
      .select("id, content, metadata")
      .range(from, to);

    if (error) {
      console.error("supabase catalog lookup failed", error);
      return [];
    }

    const page = (data as ProdutoDocRow[] | null) ?? [];
    rows.push(...page);

    if (page.length < CATALOG_PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

function rowsToCatalogProducts(rows: ProdutoDocRow[]): CatalogProduct[] {
  const products = new Map<
    string,
    {
      product: CatalogProduct;
      keywords: string[];
      content: string;
    }
  >();

  for (const row of rows) {
    const meta = row.metadata?.metadata;
    if (!meta?.product_name) continue;

    const key = normalize(meta.product_name);
    const current =
      products.get(key) ||
      {
        product: {
          nome: meta.product_name,
          slug: meta.product_slug || buildSlug(meta.product_name),
          resumo: row.content || "Documento de catalogo importado do Supabase.",
          preco: 0,
          variantes: [],
          image_url: null
        },
        keywords: [],
        content: row.content || ""
      };

    current.keywords = Array.from(new Set([...current.keywords, ...safeArray(meta.keywords)]));

    if (meta.doc_type === "sku_variant" && meta.sku && meta.color) {
      const existingVariant = current.product.variantes.find((variant) => variant.sku === meta.sku);
      const imageUrl = safeArray(meta.images)[0] || null;

      if (!existingVariant) {
        const variant: CatalogVariant = {
          cor: meta.color,
          sku: meta.sku,
          saldoFisico: 0,
          preco: 0,
          image_url: imageUrl
        };
        current.product.variantes.push(variant);
      }

      if (!current.product.image_url && imageUrl) {
        current.product.image_url = imageUrl;
      }
    }

    if (meta.doc_type === "product_base" && !current.product.image_url) {
      current.product.image_url =
        safeArray(meta.images)[0] || current.product.variantes[0]?.image_url || null;
    }

    products.set(key, current);
  }

  return [...products.values()].map((entry) => entry.product);
}

async function getCatalogProducts() {
  const rows = await fetchSupabaseCatalogRows();
  const supabaseProducts = rowsToCatalogProducts(rows);
  if (supabaseProducts.length) {
    return supabaseProducts;
  }
  return mockCatalogSeed;
}

export async function searchCatalog(input: {
  modelo?: string | null;
  cor?: string | null;
  text?: string | null;
  maxProdutos?: number;
}): Promise<CatalogProduct[]> {
  const products = await getCatalogProducts();
  const modelo = normalize(input.modelo || input.text || "");
  const cor = normalize(input.cor);

  const ranked: RankedCatalogProduct[] = products.map((product) => ({
    product,
    keywords: [
      product.nome,
      product.slug,
      ...product.variantes.map((variant) => variant.sku),
      ...product.variantes.map((variant) => variant.cor)
    ],
    content: `${product.nome} ${product.resumo} ${product.variantes
      .map((variant) => `${variant.cor} ${variant.sku}`)
      .join(" ")}`,
    score: 0
  }));

  for (const entry of ranked) {
    entry.score = scoreProduct({
      product: entry.product,
      keywords: entry.keywords,
      content: entry.content,
      modelo,
      cor
    });
  }

  return ranked
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, input.maxProdutos ?? 6)
    .map((entry) => entry.product);
}

export async function findPhoto(input: {
  modelo?: string | null;
  cor?: string | null;
}) {
  const resolved = await findVariant({
    modelo: input.modelo,
    cor: input.cor
  });

  if (!resolved) {
    return {
      found: false,
      image_url: null,
      modelo: input.modelo || null,
      cor: input.cor || null,
      motivo: "produto_nao_encontrado"
    };
  }

  const imageUrl = resolved.variant.image_url || resolved.product.image_url || null;

  if (!imageUrl) {
    return {
      found: false,
      image_url: null,
      modelo: resolved.product.nome,
      cor: resolved.variant.cor,
      motivo: "imagem_nao_encontrada"
    };
  }

  return {
    found: true,
    image_url: imageUrl,
    modelo: resolved.product.nome,
    cor: resolved.variant.cor,
    motivo: "ok"
  };
}

export async function findVariant(input: {
  modelo?: string | null;
  cor?: string | null;
}) {
  const products = await searchCatalog({
    modelo: input.modelo,
    cor: input.cor,
    maxProdutos: 1
  });

  const product = products[0];
  if (!product) return null;

  const variant =
    product.variantes.find((item) => isExactColorMatch(item.cor, input.cor)) ?? product.variantes[0];

  if (!variant) return null;
  return { product, variant };
}
