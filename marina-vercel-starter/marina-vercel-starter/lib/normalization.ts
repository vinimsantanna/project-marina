const STOP_WORDS = new Set([
  "tem",
  "quero",
  "a",
  "o",
  "as",
  "os",
  "de",
  "da",
  "do",
  "das",
  "dos",
  "na",
  "no",
  "pra",
  "para",
  "com",
  "cor",
  "cores",
  "modelo",
  "foto",
  "imagem",
  "valor",
  "preco",
  "preço",
  "quanto",
  "custa",
  "essa",
  "esse",
  "oi",
  "ola",
  "olá",
  "bom",
  "boa",
  "dia",
  "tarde",
  "noite",
  "me",
  "mostra",
  "ver",
  "quais",
  "modelos",
  "disponiveis",
  "disponíveis",
  "sim",
  "não",
  "nao",
  "pode"
]);

const COLOR_MAP: Record<string, string> = {
  loiro: "27",
  loira: "27",
  preto: "1",
  castanho: "2",
  mel: "27/613",
  borgonha: "BUG",
  ruivo: "350"
};

const QTY_WORDS: Record<string, number> = {
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  três: 3,
  quatro: 4,
  cinco: 5,
  seis: 6
};

export function normalize(text: string | null | undefined) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function normalizeCor(text: string | null | undefined) {
  const cleaned = String(text || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  if (!cleaned) return null;
  const lower = normalize(cleaned);
  if (COLOR_MAP[lower]) return COLOR_MAP[lower];
  const direct = cleaned.match(/\b(T?[\dA-Z]+(?:\/[\dA-Z]+)*)\b/);
  return direct ? direct[1] : cleaned;
}

export function normalizeQuantidade(text: string | null | undefined) {
  const value = String(text || "");
  const numeric = value.match(/\b(\d{1,2})\b/);
  if (numeric) return Number(numeric[1]);
  const lower = normalize(value);
  for (const [word, qty] of Object.entries(QTY_WORDS)) {
    if (lower.includes(word)) return qty;
  }
  return null;
}

export function cleanModel(
  text: string | null | undefined,
  knownModels: string[] = []
) {
  const raw = normalize(text);
  if (!raw) return null;
  const compact = raw.replace(/[^\p{L}\p{N}\s/.-]/gu, " ");
  const tokens = compact
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !STOP_WORDS.has(token));
  const joined = tokens.join(" ").trim();
  if (!joined) return null;
  const modelMatch = knownModels.find((model) => {
    const base = normalize(model);
    return joined.includes(base) || base.includes(joined);
  });
  return modelMatch || joined;
}

export function inferMessageType(rawType: string | null | undefined) {
  const value = normalize(rawType);
  if (value.includes("audio")) return "audio";
  if (value.includes("image") || value.includes("foto")) return "image";
  if (value.includes("pdf") || value.includes("document")) return "pdf";
  if (value.includes("text")) return "text";
  return "other";
}

export function nowIso() {
  return new Date().toISOString();
}

export function toSessionId(phone: string) {
  return phone.replace(/\D/g, "");
}
