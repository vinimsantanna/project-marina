# Contratos de API — Marina MVP Interno

**Versão:** 0.1  
**Escopo:** MVP interno, uma única loja  
**Objetivo:** padronizar payloads entre canal, orquestração, estado, catálogo, estoque, imagem e carrinho

---

## 1. Objetivo

Definir contratos mínimos para a Marina operar com previsibilidade.

Neste MVP, “API” inclui três camadas:

1. **entrada e saída de canal**;
2. **contratos internos entre módulos/workflows**;
3. **integrações externas críticas**.

A meta não é burocracia. É impedir que cada node do n8n invente um JSON novo a cada terça-feira.

---

## 2. Convenções gerais

## 2.1 Padrão de resposta interna
Todo contrato interno deve preferir este envelope:

```json
{
  "ok": true,
  "data": {},
  "error": null,
  "meta": {}
}
```

Em caso de erro:

```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "variation_not_found",
    "message": "Variação não encontrada para o SKU informado"
  },
  "meta": {}
}
```

---

## 2.2 Convenções de naming
- `session_id`: identificador operacional da conversa
- `cliente_id`: UUID persistente do cliente
- `conversa_id`: UUID persistente da conversa
- `mensagem_id`: UUID persistente da mensagem
- `modelo`, `cor`, `quantidade`: nomes padrão de entidade
- `sku`: variante operacional
- `items`: lista de itens do carrinho

---

## 2.3 Convenções de tempo
Todos os timestamps em ISO 8601 UTC.

Exemplo:

```json
"updated_at": "2026-03-20T18:30:00.000Z"
```

---

## 3. Contrato de entrada — webhook normalizado

## 3.1 `InboundMessage`
Payload interno já normalizado a partir do webhook do canal.

```json
{
  "session_id": "5511999999999",
  "channel": "whatsapp",
  "provider": "evolution",
  "provider_message_id": "ABCD1234",
  "from": "5511999999999",
  "from_name": "Maria",
  "direction": "inbound",
  "message_type": "text",
  "message_text": "tem nina?",
  "media": null,
  "received_at": "2026-03-20T18:30:00.000Z",
  "raw": {}
}
```

### Regras
- `session_id` deve ser estável por cliente/canal;
- `message_type` deve ser um entre `text`, `audio`, `image`, `pdf`, `other`;
- `raw` pode manter o payload original para auditoria.

---

## 4. Contrato de classificação de intenção

## 4.1 `IntentClassificationInput`
```json
{
  "session_id": "5511999999999",
  "message_text": "quero a 27",
  "conversation_state": {
    "modelo": "nina",
    "cor": null,
    "quantidade": null,
    "etapa": "escolher_cor"
  }
}
```

## 4.2 `IntentClassificationOutput`
```json
{
  "ok": true,
  "data": {
    "intent": "escolher_cor",
    "confidence": 0.93,
    "reason": "Cliente informou apenas a cor desejada"
  },
  "error": null,
  "meta": {
    "model": "gpt-5.x"
  }
}
```

### Intents mínimas
- `ver_produto`
- `ver_preco`
- `escolher_cor`
- `escolher_quantidade`
- `pediu_foto`
- `checkout`
- `duvida`
- `fallback`

---

## 5. Contrato de extração estruturada

## 5.1 `StructuredExtractionInput`
```json
{
  "session_id": "5511999999999",
  "message_text": "quero 2 da nina 27",
  "intent": "checkout",
  "conversation_state": {
    "modelo": "nina",
    "cor": null,
    "quantidade": null
  }
}
```

## 5.2 `StructuredExtractionOutput`
```json
{
  "ok": true,
  "data": {
    "modelo": "nina",
    "cor": "27",
    "quantidade": 2,
    "pediu_foto": false,
    "pediu_checkout": true,
    "observacao": null
  },
  "error": null,
  "meta": {
    "normalized": true
  }
}
```

### Regra
Campos ausentes devem vir como `null` ou simplesmente não vir. Eles **não podem** apagar valor anterior no merge.

---

## 6. Contrato de merge de estado

## 6.1 `MergeStateInput`
```json
{
  "session_id": "5511999999999",
  "old_state": {
    "modelo": "nina",
    "cor": null,
    "quantidade": null,
    "etapa": "escolher_cor",
    "updated_at": "2026-03-20T18:28:00.000Z"
  },
  "intent": "escolher_cor",
  "extracted": {
    "modelo": null,
    "cor": "27",
    "quantidade": null,
    "pediu_foto": false,
    "pediu_checkout": false
  }
}
```

## 6.2 `MergeStateOutput`
```json
{
  "ok": true,
  "data": {
    "new_state": {
      "modelo": "nina",
      "cor": "27",
      "quantidade": null,
      "pediu_foto": false,
      "pediu_checkout": false,
      "etapa": "escolher_quantidade",
      "updated_at": "2026-03-20T18:30:00.000Z"
    }
  },
  "error": null,
  "meta": {
    "fields_updated": ["cor", "etapa"]
  }
}
```

### Regras obrigatórias
- `null` não sobrescreve valor válido;
- `etapa` deve ser recalculada;
- merge é determinístico;
- LLM não decide payload final de estado.

---

## 7. Contrato de busca de catálogo

## 7.1 `CatalogSearchInput`
```json
{
  "session_id": "5511999999999",
  "modelo": "nina",
  "cor": "27",
  "input": "tem foto da nina 27?",
  "intent": "pediu_foto",
  "max_produtos": 6,
  "max_cores": 6
}
```

## 7.2 `CatalogSearchOutput`
```json
{
  "ok": true,
  "data": {
    "produtos": [
      {
        "nome": "Nina",
        "preco": 199.9,
        "variantes": [
          {
            "cor": "27",
            "sku": "NINA27",
            "saldoFisico": 8,
            "preco": 199.9
          }
        ]
      }
    ]
  },
  "error": null,
  "meta": {
    "source": "supabase+bling"
  }
}
```

### Regra
`produtos` deve retornar apenas resultados utilizáveis, não qualquer coisa semanticamente parecida e comercialmente inútil.

---

## 8. Contrato de busca de imagem

## 8.1 `PhotoSearchInput`
```json
{
  "session_id": "5511999999999",
  "modelo": "nina",
  "cor": "27"
}
```

## 8.2 `PhotoSearchOutput`
```json
{
  "ok": true,
  "data": {
    "found": true,
    "image_url": "https://cdn.exemplo.com/nina-27.jpg",
    "images": [
      "https://cdn.exemplo.com/nina-27.jpg"
    ],
    "modelo": "Nina",
    "cor": "27",
    "motivo": "ok"
  },
  "error": null,
  "meta": {
    "doc_type": "sku_variant"
  }
}
```

### Falha esperada
```json
{
  "ok": false,
  "data": {
    "found": false,
    "image_url": null,
    "modelo": "nina",
    "cor": "27",
    "motivo": "imagem_nao_encontrada"
  },
  "error": {
    "code": "image_not_found",
    "message": "Imagem não encontrada para o modelo/cor"
  },
  "meta": {}
}
```

---

## 9. Contrato de carrinho em memória

## 9.1 `CartState`
```json
{
  "session_id": "5511999999999",
  "status": "building",
  "currency": "BRL",
  "current_item_draft": {
    "sku": "NINA27",
    "produto_nome": "Nina",
    "cor": "27",
    "quantidade": 2,
    "preco_unitario": 199.9,
    "saldo_fisico": 8
  },
  "items": [],
  "updated_at": "2026-03-20T18:30:00.000Z"
}
```

---

## 10. Contrato para confirmação do item

## 10.1 `CartDraftConfirmInput`
```json
{
  "session_id": "5511999999999",
  "cart": {
    "current_item_draft": {
      "sku": "NINA27",
      "produto_nome": "Nina",
      "cor": "27",
      "quantidade": 2,
      "preco_unitario": 199.9,
      "saldo_fisico": 8
    },
    "items": []
  }
}
```

## 10.2 `CartDraftConfirmOutput`
```json
{
  "ok": true,
  "data": {
    "cart": {
      "items": [
        {
          "sku": "NINA27",
          "produto_nome": "Nina",
          "cor": "27",
          "quantidade": 2,
          "preco_unitario": 199.9,
          "saldo_fisico": 8
        }
      ],
      "current_item_draft": null,
      "status": "confirmed"
    }
  },
  "error": null,
  "meta": {}
}
```

---

## 11. Contrato de criação do carrinho externo

## 11.1 `ExternalCartCreateInput`
Payload interno para o subworkflow de carrinho.

```json
{
  "session_id": "5511999999999",
  "items": [
    {
      "sku": "NINA27",
      "quantidade": 2
    }
  ]
}
```

## 11.2 `ResolvedCartItems`
Saída intermediária após resolver WooCommerce.

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "product_id": 123,
        "variation_id": 456,
        "qty": 2,
        "sku": "NINA27"
      }
    ]
  },
  "error": null,
  "meta": {}
}
```

## 11.3 `CartQLRequest`
Payload enviado ao endpoint externo.

```json
{
  "items": [
    {
      "product_id": 123,
      "variation_id": 456,
      "qty": 2
    }
  ]
}
```

## 11.4 `CartQLResponse`
```json
{
  "ok": true,
  "data": {
    "cart_url": "https://loja.com/cart/?ql=abc123"
  },
  "error": null,
  "meta": {
    "provider": "cartql"
  }
}
```

### Falhas previstas
- `missing_sku_target`
- `empty_response`
- `variation_not_found`
- `cart_provider_error`

---

## 12. Contrato de resposta outbound

## 12.1 `OutboundMessage`
```json
{
  "session_id": "5511999999999",
  "message_type": "text",
  "text": "Tenho sim. Qual cor você quer da Nina?",
  "image_url": null,
  "reply_to": null,
  "meta": {
    "intent": "ver_produto",
    "etapa": "escolher_cor"
  }
}
```

### Variação com imagem
```json
{
  "session_id": "5511999999999",
  "message_type": "image",
  "text": "Achei essa foto da Nina na cor 27.",
  "image_url": "https://cdn.exemplo.com/nina-27.jpg",
  "reply_to": null,
  "meta": {
    "intent": "pediu_foto",
    "etapa": "escolher_quantidade"
  }
}
```

---

## 13. Contrato de erro padrão

## 13.1 `ErrorObject`
```json
{
  "code": "product_not_found",
  "message": "Nenhum produto utilizável foi encontrado para o contexto atual",
  "details": {
    "modelo": "nina",
    "cor": "27"
  }
}
```

### Regras
- `code` deve ser estável e curto;
- `message` deve ser útil para log e debug;
- `details` deve ser serializável.

---

## 14. Catálogo de códigos de erro sugeridos

### Estado / conversa
- `invalid_inbound_payload`
- `session_not_found`
- `state_parse_error`
- `state_merge_error`
- `intent_fallback`

### Catálogo / imagem
- `product_not_found`
- `image_not_found`
- `invalid_variant_metadata`
- `vector_query_error`

### Estoque / preço
- `bling_token_missing`
- `bling_request_error`
- `sku_not_resolved`
- `stock_unavailable`

### Carrinho
- `missing_sku_target`
- `parent_product_not_found`
- `variation_not_found`
- `cart_provider_error`
- `cart_url_missing`

### Canal
- `outbound_send_error`
- `unsupported_media_type`

---

## 15. Versionamento de contratos

### Estratégia recomendada
- prefixar contratos externos com `/v1/`
- manter compatibilidade retroativa no MVP
- registrar breaking changes em changelog interno

Exemplo:

- `/api/v1/messages/inbound`
- `/api/v1/cart/create`
- `/api/v1/photo/search`

Mesmo que hoje a implementação esteja em n8n, documentar como API evita acoplamento mental ao template.

---

## 16. Decisão final

Os contratos da Marina precisam refletir a arquitetura real do produto:

- o canal entrega evento bruto;
- a orquestração normaliza;
- o LLM classifica e extrai;
- o merge atualiza estado;
- catálogo/estoque/imagem enriquecem a resposta;
- carrinho resolve a venda.

Sem contrato, qualquer ajuste vira adivinhação distribuída. A IA até tenta ajudar. Mas JSON sem padrão costuma ter mais criatividade do que o projeto precisa.
