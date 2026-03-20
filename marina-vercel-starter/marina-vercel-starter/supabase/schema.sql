-- Marina MVP Interno
-- Estrutura minima para Supabase/Postgres.
-- O estado vivo continua em Redis; estas tabelas guardam fatos, auditoria e operacao.

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

create index if not exists idx_clientes_ultima_interacao
  on clientes (ultima_interacao_at desc);

create table if not exists conversas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
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

create index if not exists idx_conversas_cliente on conversas (cliente_id);
create index if not exists idx_conversas_status_ultima
  on conversas (status, ultima_mensagem_at desc);

create table if not exists mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references conversas(id) on delete cascade,
  direction text not null,
  provider text not null default 'manual',
  provider_message_id text,
  media_type text not null default 'text',
  body_raw text,
  body_normalized text,
  payload_json jsonb,
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now()
);

alter table mensagens
  add column if not exists provider text not null default 'manual';

create index if not exists idx_mensagens_conversa_created
  on mensagens (conversa_id, created_at);
create index if not exists idx_mensagens_provider on mensagens (provider, provider_message_id);
drop index if exists uq_mensagens_provider_message_id;
create unique index if not exists uq_mensagens_provider_message_id
  on mensagens (provider, provider_message_id)
  where provider_message_id is not null;
create index if not exists idx_mensagens_payload_gin on mensagens using gin (payload_json);

create table if not exists conversation_events (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references conversas(id) on delete cascade,
  mensagem_id uuid references mensagens(id) on delete set null,
  event_type text not null,
  event_status text not null,
  event_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_events_conversa_created
  on conversation_events (conversa_id, created_at);
create index if not exists idx_events_type_created
  on conversation_events (event_type, created_at);
create index if not exists idx_events_data_gin on conversation_events using gin (event_data);

create table if not exists carrinhos (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references conversas(id) on delete cascade,
  session_id text not null,
  status text not null default 'building',
  currency text not null default 'BRL',
  items_json jsonb not null default '[]'::jsonb,
  external_cart_url text,
  external_payload jsonb,
  error_reason text,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_carrinhos_conversa on carrinhos (conversa_id);
create index if not exists idx_carrinhos_session on carrinhos (session_id);
create index if not exists idx_carrinhos_status_updated
  on carrinhos (status, updated_at desc);

create table if not exists integracoes (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique,
  status text not null default 'active',
  access_token text,
  refresh_token text,
  token_type text,
  expires_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_integracoes_status on integracoes (status);
create index if not exists idx_integracoes_expires_at on integracoes (expires_at);

-- Opcional: estrutura minima para documentos de catalogo se voce optar por persistir snapshots no Postgres.
create table if not exists catalog_documents (
  id uuid primary key default gen_random_uuid(),
  external_id text,
  doc_type text not null,
  product_name text not null,
  color text,
  sku text,
  content text,
  metadata jsonb not null default '{}'::jsonb,
  image_urls text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_catalog_documents_type on catalog_documents (doc_type);
create index if not exists idx_catalog_documents_name on catalog_documents (product_name);
create index if not exists idx_catalog_documents_metadata_gin on catalog_documents using gin (metadata);
