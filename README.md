# Project Marina

Repositorio principal do projeto Marina.

## Estrutura

- `marina-vercel-starter/marina-vercel-starter/`: app Next.js que deve ser usado como Root Directory na Vercel
- `schema.sql`: schema raiz de banco para Supabase/Postgres
- `PRD_Marina_MVP.md`, `Arquitetura_Tecnica_Marina_MVP.md`, `UX_Marina_MVP.md` e demais arquivos `.md`: contexto funcional e tecnico do projeto

## App principal

O codigo da aplicacao esta em:

```txt
marina-vercel-starter/marina-vercel-starter
```

Esse app ja contem:

- webhook oficial da Meta
- suporte alternativo via Evolution API
- persistencia em Supabase/Postgres
- catalogo real via tabela `produtos`
- preco e estoque reais via Bling
- dashboard inicial e simulador

## Deploy na Vercel

Ao importar este repositorio na Vercel, configure o Root Directory para:

```txt
marina-vercel-starter/marina-vercel-starter
```

Depois configure as variaveis de ambiente do app e rode o schema SQL no Supabase.
