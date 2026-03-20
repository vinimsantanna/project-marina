# Marina Starter - Vercel Ready

Starter kit do MVP interno da Marina em formato compativel com deploy na Vercel.

## O que este pacote entrega

- Next.js full-stack com App Router
- Route Handlers para webhook, intencao, extracao, catalogo, foto, cotacao e carrinho
- UI inicial com identidade visual da Marina
- simulador de conversa no navegador
- persistencia operacional em Supabase/Postgres
- inbox inicial lendo conversas reais do banco
- busca real no catalogo `produtos` do Supabase
- cotacao real de preco e estoque no Bling
- suporte duplo de WhatsApp: Meta oficial e Evolution API
- pasta `docs/` com PRD, UX, design system, arquitetura, roadmap, banco, contratos e backlog

## Stack sugerida

- Next.js App Router para UI + APIs
- Vercel para deploy
- WhatsApp Cloud API da Meta para canal oficial
- Evolution API v2 como alternativa de provedor WhatsApp
- Upstash Redis para estado conversacional
- Supabase/Postgres para auditoria e operacao
- Bling para preco e estoque
- WooCommerce + CartQL para checkout real
- OpenAI opcional para classificacao/extracao; sem chave, o starter usa heuristicas

## Estrutura do projeto

```txt
app/
  api/
  dashboard/
components/
docs/
lib/
supabase/
```

## Rotas ja prontas

- `GET /api/health`
- `GET /api/webhooks/whatsapp`
- `POST /api/webhooks/whatsapp`
- `POST /api/intents/classify`
- `POST /api/extract`
- `POST /api/catalog/search`
- `POST /api/photos/search`
- `POST /api/stock/quote`
- `POST /api/cart/create`
- `GET /api/conversations/:sessionId/state`

## Como rodar localmente

```bash
npm install
npm run dev
```

Depois acesse a rota inicial e use o simulador da Marina.

## Como subir na Vercel

1. Suba esta pasta para um repositorio Git.
2. Importe o repositorio na Vercel.
3. Configure as variaveis de ambiente usando `.env.example`.
4. Rode o schema SQL no seu projeto Supabase.
5. Configure o webhook da Meta e/ou da Evolution apontando para `/api/webhooks/whatsapp`.
6. Valide `GET /api/health`.

## Variaveis minimas

### Para deploy demonstravel

```env
NEXT_PUBLIC_MOCK_MODE=true
```

### Para webhook oficial da Meta

```env
WHATSAPP_META_ENABLED=true
WHATSAPP_META_VERIFY_TOKEN=
WHATSAPP_META_ACCESS_TOKEN=
WHATSAPP_META_PHONE_NUMBER_ID=
WHATSAPP_META_API_VERSION=v22.0
META_APP_SECRET=
```

### Para Evolution API

```env
WHATSAPP_EVOLUTION_ENABLED=true
EVOLUTION_API_VERSION=v2
EVOLUTION_API_BASE_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE_NAME=
EVOLUTION_INSTANCE_TOKEN=
EVOLUTION_INSTANCE_ENGINE=WHATSAPP-BAILEYS
EVOLUTION_WEBHOOK_SECRET=
```

### Para persistencia real

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_CATALOG_TABLE=produtos
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

### Para catalogo real + Bling

```env
BLING_CLIENT_ID=
BLING_CLIENT_SECRET=
BLING_ACCESS_TOKEN=
BLING_REFRESH_TOKEN=
```

### Para checkout real

```env
WC_BASE_URL=
WC_CONSUMER_KEY=
WC_CONSUMER_SECRET=
CARTQL_KEY=
```

### Para classificacao/extracao com LLM

```env
OPENAI_API_KEY=
```

## O que esta mockado por padrao

- se `produtos` no Supabase nao estiver disponivel, o app cai para uma seed local;
- se o Bling nao estiver configurado, a cotacao de preco/estoque cai para fallback sem integracao;
- se WooCommerce + CartQL nao estiverem configurados, o carrinho retorna preview em vez de link real.

## O que ja esta pronto para producao

- estrutura de projeto adequada a Vercel
- rota do webhook preparada para verificacao da Meta e ingestao da Evolution
- assinatura HMAC da Meta quando `META_APP_SECRET` estiver configurado
- envio outbound por Meta oficial ou Evolution, conforme o provider da conversa
- persistencia de clientes, conversas, mensagens, eventos e carrinho em Supabase/Postgres
- dashboard inicial lendo conversas reais do banco
- leitura do catalogo oficial em `SUPABASE_CATALOG_TABLE` com foco em `produtos`
- consulta real de preco/estoque por SKU no Bling
- refresh de token do Bling com persistencia em `integracoes`
- deduplicacao de mensagens por `provider + provider_message_id`
- separacao entre estado, catalogo, IA, reply, persistencia e carrinho

## O que voce ainda precisa integrar

- logs mais profundos e operacao assistida
- handoff humano e autenticacao do painel
- checkout real de ponta a ponta
- automacao opcional de setup de instancia/webhook da Evolution, se voce quiser trazer isso para dentro do app

## Tabelas esperadas no Supabase

- `clientes`, `conversas`, `mensagens`, `conversation_events` e `carrinhos` para operacao
- `integracoes` para guardar o token ativo do Bling
- `produtos` como fonte oficial do catalogo documental

## Contrato minimo da tabela `produtos`

O app assume documentos com `content` e `metadata`, onde `metadata.metadata` pode conter:

- `doc_type`: `product_base` ou `sku_variant`
- `product_name`
- `product_slug`
- `sku`
- `color`
- `images`
- `keywords`

## Fluxo do token Bling

- Se existir uma linha `provider = 'bling'` em `integracoes`, ela vira a fonte primaria do token.
- Se a tabela estiver vazia, o app usa `BLING_REFRESH_TOKEN` e `BLING_ACCESS_TOKEN` das envs como bootstrap.
- Quando o refresh acontece, o app grava o novo `access_token`, `refresh_token` e `expires_at` em `integracoes`.
- Se voce ja renova isso no n8n, mantenha o fluxo; basta continuar atualizando a mesma linha `provider = 'bling'`.

## Payload exemplo para simulador interno

```json
{
  "session_id": "5573999999999",
  "from": "5573999999999",
  "from_name": "Maria",
  "provider": "simulator",
  "message_type": "text",
  "message_text": "tem nina?"
}
```

## Observacao importante

O fluxo de checkout real depende de o SKU existir no WooCommerce e de as credenciais do CartQL estarem validas. O starter resolve o caminho tecnico e a persistencia basica, mas nao inventa dados de loja.
