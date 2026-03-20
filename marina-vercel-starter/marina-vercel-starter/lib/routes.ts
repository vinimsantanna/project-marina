import { z } from "zod";

export const inboundSchema = z.object({
  session_id: z.string().optional(),
  from: z.string(),
  from_name: z.string().nullish(),
  provider: z.string().optional(),
  provider_message_id: z.string().nullish(),
  message_type: z.enum(["text", "audio", "image", "pdf", "other"]).optional(),
  message_text: z.string().nullish(),
  media: z
    .object({
      url: z.string().nullish(),
      mime_type: z.string().nullish(),
      file_name: z.string().nullish()
    })
    .nullish(),
  received_at: z.string().optional(),
  raw: z.unknown().optional(),
  conversation_state: z
    .object({
      modelo: z.string().nullable(),
      cor: z.string().nullable(),
      quantidade: z.number().nullable(),
      pediu_foto: z.boolean(),
      pediu_checkout: z.boolean(),
      etapa: z.enum([
        "ver_produto",
        "ver_preco",
        "escolher_cor",
        "escolher_quantidade",
        "pediu_foto",
        "checkout",
        "duvida",
        "fallback"
      ]),
      updated_at: z.string()
    })
    .nullable()
    .optional()
});

export const sessionParamSchema = z.object({
  sessionId: z.string().min(3)
});
