# Estrutura de Banco — Marina MVP Interno

**Versão:** 0.1  
**Escopo:** MVP interno, uma única loja  
**Base:** workflows atuais + PRD + arquitetura técnica

---

## 1. Objetivo

Definir a estrutura de dados da Marina para suportar o MVP interno com separação clara entre:

1. **dados transacionais e persistentes** em Supabase/Postgres;
2. **estado operacional efêmero** em Redis;
3. **catálogo vetorial** em Supabase Vector Store.

A decisão central é simples:

- **Redis** guarda o contexto vivo da conversa e do carrinho;
- **Postgres/Supabase** guarda entidades persistentes, auditoria e operação;
- **Vector Store** resolve descoberta de produto e imagem.

---

## 2. Princípios de modelagem

### 2.1 Estado conversacional não deve viver só em tabela relacional
O estado atual da conversa muda a cada mensagem e precisa de leitura/escrita rápida. Por isso, o estado principal deve continuar em Redis.

### 2.2 Banco relacional deve guardar fatos, não adivinhações
Tabelas persistentes devem registrar clientes, sessões, mensagens, eventos, tentativas de checkout e logs operacionais.

### 2.3 Catálogo de busca e catálogo operacional têm papéis diferentes
- o **vector store** ajuda a encontrar produtos e imagens;
- o **ERP / WooCommerce** confirmam preço, estoque e carrinho.

### 2.4 O banco do MVP deve ser pequeno, legível e rastreável
Nada de 27 tabelas para parecer enterprise. MVP bom é o que a equipe consegue entender sem arqueologia.

---

## 3. Mapa de storage

## 3.1 Redis
### Chaves principais
- `state:{session_id}`
- `cart:{session_id}`
- `shown_models:{session_id}`
- buffers temporários por mídia/mensagem
- estado visual auxiliar

### Finalidade
- contexto vivo da conversa;
- estágio da jornada;
- item atual do carrinho;
- controle de repetição de sugestões;
- buffers de consolidação.

---

## 3.2 Supabase / Postgres
### Finalidade
- entidades persistentes;
- auditoria;
- operação;
- histórico;
- integrações e configuração mínima;
- apoio a relatórios do MVP.

---

## 3.3 Supabase Vector Store
### Finalidade
- documentos de catálogo;
- documentos de variantes com imagem;
- busca semântica por modelo, cor e contexto.

---

## 4. Tabelas persistentes do MVP

## 4.1 `clientes`
Cadastro básico da cliente.

### Finalidade
Identificar quem está falando, consolidar histórico e permitir rastreio por número.

### Campos
| Campo | Tipo | Obrigatório | Descrição |
|---|---|---:|---|
| id | uuid pk | sim | Identificador interno |
| whatsapp | text unique | sim | Número em formato canônico |
| nome | text | não | Nome da cliente |
| nome_normalizado | text | não | Apoio para busca |
| origem_canal | text | sim | Ex.: whatsapp |
| primeira_interacao_at | timestamptz | sim | Primeira vez vista |
| ultima_interacao_at | timestamptz | sim | Última mensagem recebida |
| status | text | sim | active, blocked, archived |
| created_at | timestamptz | sim | Auditoria |
| updated_at | timestamptz | sim | Auditoria |

### Índices
- `unique(whatsapp)`
- índice em `ultima_interacao_at desc`

---

## 4.2 `conversas`
Sessão lógica por cliente/canal.

### Finalidade
Permitir separar cliente de sessão conversacional e manter histórico operacional.

### Campos
| Campo | Tipo | Obrigatório | Descrição |
|---|---|---:|---|
| id | uuid pk | sim | Identificador da conversa |
| cliente_id | uuid fk clientes(id) | sim | Dona da conversa |
| session_id | text unique | sim | Chave operacional usada no Redis |
| canal | text | sim | whatsapp |
| status | text | sim | open, waiting_customer, handoff, closed |
| etapa_atual | text | não | espelho do Redis para analytics |
| intent_atual | text | não | espelho do Redis para analytics |
| modelo_atual | text | não | espelho do Redis |
| cor_atual | text | não | espelho do Redis |
| quantidade_atual | integer | não | espelho do Redis |
| ultima_mensagem_at | timestamptz | sim | Ordenação operacional |
| handoff_required | boolean | sim | default false |
| handoff_reason | text | não | motivo da intervenção |
| created_at | timestamptz | sim | Auditoria |
| updated_at | timestamptz | sim | Auditoria |

### Índices
- `unique(session_id)`
- índice em `cliente_id`
- índice em `status, ultima_mensagem_at desc`

### Observação
Esta tabela **não substitui** o estado em Redis. Ela funciona como espelho útil para operação e relatórios.

---

## 4.3 `mensagens`
Registro bruto e normalizado das mensagens.

### Finalidade
Auditar o que entrou e saiu da Marina.

### Campos
| Campo | Tipo | Obrigatório | Descrição |
|---|---|---:|---|
| id | uuid pk | sim | Identificador da mensagem |
| conversa_id | uuid fk conversas(id) | sim | Vínculo da sessão |
| direction | text | sim | inbound, outbound, system |
| provider_message_id | text | não | ID do provedor |
| media_type | text | sim | text, audio, image, pdf, other |
| body_raw | text | não | payload bruto útil |
| body_normalized | text | não | texto consolidado/normalizado |
| payload_json | jsonb | não | payload completo do canal |
| sent_at | timestamptz | não | saída efetiva |
| received_at | timestamptz | não | entrada efetiva |
| created_at | timestamptz | sim | Auditoria |

### Índices
- índice em `conversa_id, created_at`
- índice em `provider_message_id`
- gin em `payload_json`

---

## 4.4 `conversation_events`
Log estruturado de eventos do fluxo.

### Finalidade
Registrar decisões do sistema sem depender de abrir o n8n inteiro.

### Campos
| Campo | Tipo | Obrigatório | Descrição |
|---|---|---:|---|
| id | uuid pk | sim | Identificador do evento |
| conversa_id | uuid fk conversas(id) | sim | Contexto da sessão |
| mensagem_id | uuid fk mensagens(id) | não | Mensagem relacionada |
| event_type | text | sim | intent_classified, state_merged, image_found, cart_created etc. |
| event_status | text | sim | success, warning, error |
| event_data | jsonb | não | dados do evento |
| created_at | timestamptz | sim | Auditoria |

### Índices
- índice em `conversa_id, created_at`
- índice em `event_type, created_at`
- gin em `event_data`

---

## 4.5 `carrinhos`
Registro persistente de tentativas de checkout.

### Finalidade
Auditar o que foi montado e enviado para o endpoint externo.

### Campos
| Campo | Tipo | Obrigatório | Descrição |
|---|---|---:|---|
| id | uuid pk | sim | Identificador do carrinho interno |
| conversa_id | uuid fk conversas(id) | sim | Conversa de origem |
| session_id | text | sim | Chave operacional |
| status | text | sim | building, confirmed, sent, failed, abandoned |
| currency | text | sim | BRL |
| items_json | jsonb | sim | snapshot do carrinho |
| external_cart_url | text | não | URL gerada |
| external_payload | jsonb | não | payload enviado |
| error_reason | text | não | motivo de falha |
| confirmed_at | timestamptz | não | confirmação da cliente |
| created_at | timestamptz | sim | Auditoria |
| updated_at | timestamptz | sim | Auditoria |

### Índices
- índice em `conversa_id`
- índice em `session_id`
- índice em `status, updated_at desc`

### Observação
O carrinho vivo continua em Redis. Esta tabela é o **snapshot persistente** para operação.

---

## 4.6 `carrinho_itens`
Itens normalizados do snapshot do carrinho.

### Finalidade
Relatórios simples e leitura operacional sem parse de JSON.

### Campos
| Campo | Tipo | Obrigatório | Descrição |
|---|---|---:|---|
| id | uuid pk | sim | Identificador do item |
| carrinho_id | uuid fk carrinhos(id) | sim | Pai do item |
| sku | text | sim | SKU da variante |
| produto_nome | text | não | Nome amigável |
| cor | text | não | Cor amigável |
| quantidade | integer | sim | Qtd |
| preco_unitario | numeric(12,2) | não | Preço unitário |
| saldo_fisico | integer | não | Saldo no momento |
| product_id | bigint | não | Produto pai Woo |
| variation_id | bigint | não | Variação Woo |
| created_at | timestamptz | sim | Auditoria |

### Índices
- índice em `carrinho_id`
- índice em `sku`

---

## 4.7 `integracoes`
Tabela de integrações e segredos rotativos mínimos.

### Finalidade
Guardar referências operacionais como refresh token, configuração ou status de integração.

### Campos
| Campo | Tipo | Obrigatório | Descrição |
|---|---|---:|---|
| id | uuid pk | sim | Identificador |
| integracao | text unique | sim | bling, whatsapp, woo, cartql |
| status | text | sim | active, inactive, error |
| config_json | jsonb | não | Configuração não sensível |
| secret_ref | text | não | referência a segredo externo |
| updated_at | timestamptz | sim | Auditoria |
| created_at | timestamptz | sim | Auditoria |

### Observação
No MVP, pode existir dado operacional nesta tabela. O ideal é mover segredo real para vault/env.

---

## 4.8 `workflow_runs` *(opcional, recomendada)*
Auditoria macro das execuções importantes.

### Finalidade
Registrar início/fim de subworkflows críticos.

### Campos
| Campo | Tipo | Obrigatório | Descrição |
|---|---|---:|---|
| id | uuid pk | sim | Identificador |
| conversa_id | uuid fk conversas(id) | não | sessão relacionada |
| workflow_name | text | sim | main, stock_agent, photo_agent, cart_link |
| status | text | sim | started, success, error |
| input_json | jsonb | não | snapshot de entrada |
| output_json | jsonb | não | snapshot de saída |
| error_json | jsonb | não | snapshot do erro |
| duration_ms | integer | não | tempo total |
| created_at | timestamptz | sim | Auditoria |

---

## 5. Estruturas Redis

## 5.1 `state:{session_id}`
```json
{
  "intent": "ver_produto",
  "etapa": "escolher_cor",
  "modelo": "nina",
  "cor": "27",
  "quantidade": 2,
  "pediu_foto": false,
  "pediu_checkout": false,
  "shown_models": ["nina", "maya"],
  "last_bot_event": "price_informed",
  "updated_at": "2026-03-20T00:00:00.000Z"
}
```

### Regras
- `null` nunca apaga valor anterior válido;
- `etapa` é recalculada, não arbitrada pelo LLM;
- `modelo`, `cor` e `quantidade` são os campos críticos.

---

## 5.2 `cart:{session_id}`
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
  "updated_at": "2026-03-20T00:00:00.000Z"
}
```

### Regras
- draft é temporário até confirmação;
- item confirmado vai para `items`;
- link externo só nasce após confirmação.

---

## 5.3 `shown_models:{session_id}`
```json
["nina", "maya", "bianca"]
```

### Finalidade
Evitar repetição de sugestões na mesma conversa.

---

## 6. Estrutura vetorial do catálogo

## 6.1 Documentos `product_base`
Representam o produto base encontrado sem necessariamente definir a cor final.

### Metadados mínimos
```json
{
  "doc_type": "product_base",
  "product_name": "Nina",
  "product_base_code": "NINA",
  "keywords": ["nina", "nina 27", "nina t1b/27"]
}
```

---

## 6.2 Documentos `sku_variant`
Representam a variação vendável e fotografável.

### Metadados mínimos
```json
{
  "doc_type": "sku_variant",
  "product_name": "Nina",
  "sku": "NINA27",
  "color": "27",
  "images": ["https://.../foto1.jpg"],
  "keywords": ["nina", "27", "nina 27"]
}
```

### Regra
Busca de imagem deve priorizar `sku_variant` com `images.length > 0`.

---

## 7. Relacionamentos principais

```text
clientes 1---N conversas
conversas 1---N mensagens
conversas 1---N conversation_events
conversas 1---N carrinhos
carrinhos 1---N carrinho_itens
```

Redis se relaciona com `conversas.session_id`.

---

## 8. Políticas e retenção

## 8.1 Dados transacionais
- `clientes`: retenção longa
- `conversas`: retenção longa
- `mensagens`: retenção longa com possibilidade de arquivamento
- `conversation_events`: retenção longa ou rotação semestral
- `workflow_runs`: retenção curta ou média

## 8.2 Redis
- estado e buffers com TTL operacional quando fizer sentido
- carrinho com TTL maior que o buffer
- shown_models com TTL alinhado à conversa

---

## 9. Índices recomendados adicionais

### Busca operacional
- `conversas(status, ultima_mensagem_at desc)`
- `mensagens(conversa_id, created_at)`
- `conversation_events(conversa_id, created_at)`
- `carrinhos(status, updated_at desc)`

### Busca textual opcional
- trigram em `clientes.nome`
- trigram em `clientes.whatsapp`
- trigram em `carrinho_itens.sku`

---

## 10. SQL inicial sugerido

```sql
create extension if not exists pgcrypto;

create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  whatsapp text not null unique,
  nome text,
  nome_normalizado text,
  origem_canal text not null default 'whatsapp',
  primeira_interacao_at timestamptz not null default now(),
  ultima_interacao_at timestamptz not null default now(),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists conversas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id),
  session_id text not null unique,
  canal text not null default 'whatsapp',
  status text not null default 'open',
  etapa_atual text,
  intent_atual text,
  modelo_atual text,
  cor_atual text,
  quantidade_atual integer,
  ultima_mensagem_at timestamptz not null default now(),
  handoff_required boolean not null default false,
  handoff_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references conversas(id),
  direction text not null,
  provider_message_id text,
  media_type text not null,
  body_raw text,
  body_normalized text,
  payload_json jsonb,
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists conversation_events (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references conversas(id),
  mensagem_id uuid references mensagens(id),
  event_type text not null,
  event_status text not null,
  event_data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists carrinhos (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references conversas(id),
  session_id text not null,
  status text not null,
  currency text not null default 'BRL',
  items_json jsonb not null default '[]'::jsonb,
  external_cart_url text,
  external_payload jsonb,
  error_reason text,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists carrinho_itens (
  id uuid primary key default gen_random_uuid(),
  carrinho_id uuid not null references carrinhos(id) on delete cascade,
  sku text not null,
  produto_nome text,
  cor text,
  quantidade integer not null default 1,
  preco_unitario numeric(12,2),
  saldo_fisico integer,
  product_id bigint,
  variation_id bigint,
  created_at timestamptz not null default now()
);
```

---

## 11. Decisão final

Para este MVP, a estrutura ideal é:

- **Redis** como estado vivo;
- **Supabase/Postgres** como base persistente e operacional;
- **Vector Store** como catálogo semântico;
- **ERP/WooCommerce** como verdade operacional de preço, estoque e checkout.

Essa separação evita dois erros clássicos:

1. tentar enfiar tudo no banco relacional;
2. fingir que Redis sozinho é histórico de negócio.

Os dois dão trabalho. O segundo dá trabalho mais rápido.
