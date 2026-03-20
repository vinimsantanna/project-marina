import OpenAI from "openai";
import { hasOpenAI, getConfig } from "@/lib/config";
import {
  cleanModel,
  normalize,
  normalizeCor,
  normalizeQuantidade
} from "@/lib/normalization";
import { mockCatalogSeed } from "@/lib/mock-catalog";
import type {
  ConversationState,
  Intent,
  IntentClassificationOutput,
  StructuredExtractionOutput
} from "@/lib/types";

function heuristicIntent(
  messageText: string,
  state: ConversationState | null
): IntentClassificationOutput {
  const text = normalize(messageText);
  if (!text) {
    return { intent: "fallback", confidence: 0.4, reason: "Mensagem vazia." };
  }

  if (/\b(foto|imagem|mostra|ver)\b/.test(text)) {
    return {
      intent: "pediu_foto",
      confidence: 0.91,
      reason: "Cliente pediu imagem ou visualização."
    };
  }

  if (/\b(preco|preço|valor|quanto)\b/.test(text)) {
    return {
      intent: "ver_preco",
      confidence: 0.9,
      reason: "Cliente quer preço."
    };
  }

  if (/\b(carrinho|checkout|finalizar|monta|pode montar)\b/.test(text)) {
    return {
      intent: "checkout",
      confidence: 0.89,
      reason: "Cliente quer avançar para compra."
    };
  }

  if (normalizeQuantidade(text) && state?.modelo && state?.cor) {
    return {
      intent: "escolher_quantidade",
      confidence: 0.88,
      reason: "Cliente informou quantidade."
    };
  }

  if (normalizeCor(text) && state?.modelo && !state?.cor) {
    return {
      intent: "escolher_cor",
      confidence: 0.86,
      reason: "Cliente informou cor sobre um modelo já conhecido."
    };
  }

  const knownModels = mockCatalogSeed.map((item) => item.nome);
  if (cleanModel(text, knownModels)) {
    return {
      intent: "ver_produto",
      confidence: 0.75,
      reason: "Mensagem parece citar produto ou modelo."
    };
  }

  return {
    intent: "duvida",
    confidence: 0.62,
    reason: "Mensagem geral sem entidade forte."
  };
}

function heuristicExtraction(
  messageText: string,
  state: ConversationState | null
): StructuredExtractionOutput {
  const knownModels = mockCatalogSeed.map((item) => item.nome);
  const modelCandidate = cleanModel(messageText, knownModels);
  const model = modelCandidate ? knownModels.find((item) => normalize(item) === normalize(modelCandidate)) ?? modelCandidate : null;
  return {
    modelo: model && normalize(model).length > 1 ? model : null,
    cor: normalizeCor(messageText),
    quantidade: normalizeQuantidade(messageText),
    pediu_foto: /\b(foto|imagem|mostra|ver)\b/.test(normalize(messageText)),
    pediu_checkout:
      /\b(carrinho|checkout|finalizar|fechar|pode montar|quero levar)\b/.test(
        normalize(messageText)
      ) || Boolean(state?.quantidade && /\b(sim|pode|quero)\b/.test(normalize(messageText))),
    observacao: null
  };
}

export async function classifyIntent(input: {
  messageText: string;
  state: ConversationState | null;
}): Promise<IntentClassificationOutput> {
  if (!hasOpenAI()) {
    return heuristicIntent(input.messageText, input.state);
  }

  const client = new OpenAI({ apiKey: getConfig().openAiApiKey });
  const prompt = `
Classifique a intenção da mensagem da cliente da Marina.
Retorne JSON com: intent, confidence, reason.
Intents válidas:
ver_produto, ver_preco, escolher_cor, escolher_quantidade, pediu_foto, checkout, duvida, fallback.

Estado atual:
${JSON.stringify(input.state)}

Mensagem:
${input.messageText}
`;

  try {
    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "intent_classification",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              intent: {
                type: "string",
                enum: [
                  "ver_produto",
                  "ver_preco",
                  "escolher_cor",
                  "escolher_quantidade",
                  "pediu_foto",
                  "checkout",
                  "duvida",
                  "fallback"
                ]
              },
              confidence: { type: "number" },
              reason: { type: "string" }
            },
            required: ["intent", "confidence", "reason"]
          }
        }
      }
    });

    const output = JSON.parse(response.output_text) as IntentClassificationOutput;
    return output;
  } catch {
    return heuristicIntent(input.messageText, input.state);
  }
}

export async function extractStructured(input: {
  messageText: string;
  state: ConversationState | null;
}): Promise<StructuredExtractionOutput> {
  if (!hasOpenAI()) {
    return heuristicExtraction(input.messageText, input.state);
  }

  const client = new OpenAI({ apiKey: getConfig().openAiApiKey });
  const prompt = `
Extraia dados estruturados da mensagem da cliente da Marina.
Retorne JSON com:
modelo, cor, quantidade, pediu_foto, pediu_checkout, observacao.

Estado atual:
${JSON.stringify(input.state)}

Mensagem:
${input.messageText}
`;

  try {
    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "structured_extraction",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              modelo: { type: ["string", "null"] },
              cor: { type: ["string", "null"] },
              quantidade: { type: ["number", "null"] },
              pediu_foto: { type: "boolean" },
              pediu_checkout: { type: "boolean" },
              observacao: { type: ["string", "null"] }
            },
            required: [
              "modelo",
              "cor",
              "quantidade",
              "pediu_foto",
              "pediu_checkout",
              "observacao"
            ]
          }
        }
      }
    });

    const output = JSON.parse(response.output_text) as StructuredExtractionOutput;
    return output;
  } catch {
    return heuristicExtraction(input.messageText, input.state);
  }
}
