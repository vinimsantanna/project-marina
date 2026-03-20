# Backlog Técnico em Tickets — Marina MVP Interno

**Versão:** 0.1  
**Escopo:** MVP interno, uma única loja  
**Base:** PRD + UX + arquitetura técnica + workflows atuais

---

## 1. Objetivo

Transformar a estratégia da Marina em backlog executável.

Este documento organiza o build em:

- **épicos**;
- **tickets técnicos**;
- **prioridade**;
- **dependências**;
- **critério de aceite**.

A intenção é sair do “já temos o fluxo” para “sabemos exatamente o que precisa ser construído e validado”. Milagre operacional raramente passa no QA.

---

## 2. Escala de prioridade

- **P0** — bloqueia operação do MVP
- **P1** — muito importante para confiabilidade
- **P2** — importante, mas pode entrar após o core
- **P3** — melhoria ou hardening posterior

---

## 3. Épico A — Fundamentos e saneamento

## A-01 — Congelar baseline técnica dos workflows
**Prioridade:** P0  
**Dependências:** nenhuma

### Descrição
Versionar e registrar a baseline do workflow principal e dos subworkflows: estoque, imagem e carrinho.

### Entregas
- snapshot exportado dos JSONs
- mapa de dependências entre workflows
- lista de credenciais e integrações

### Critério de aceite
Existe uma baseline oficial de trabalho e ninguém mexe em produção “só pra testar rapidinho”.

---

## A-02 — Mapear hardcodes e credenciais sensíveis
**Prioridade:** P0  
**Dependências:** A-01

### Descrição
Levantar URLs, tokens, nomes de credenciais, nomes de tabela e endpoints fixos.

### Critério de aceite
Todos os hardcodes sensíveis estão catalogados com plano de parametrização.

---

## A-03 — Definir glossário canônico de intents, etapas e campos
**Prioridade:** P0  
**Dependências:** A-01

### Descrição
Padronizar nomenclatura de:
- intents
- etapas
- campos de estado
- erros principais

### Critério de aceite
Existe um glossário único e os nodes críticos usam os mesmos nomes.

---

## 4. Épico B — Ingestão e sessão

## B-01 — Normalizar payload de entrada do WhatsApp
**Prioridade:** P0  
**Dependências:** A-03

### Descrição
Criar um normalizador único do webhook para produzir um contrato `InboundMessage` estável.

### Critério de aceite
Todo evento inbound chega ao fluxo principal com os mesmos campos mínimos.

---

## B-02 — Ignorar mensagens da própria instância
**Prioridade:** P0  
**Dependências:** B-01

### Descrição
Impedir auto-trigger e loops de resposta.

### Critério de aceite
Mensagens outbound da Marina não reentram como inbound processável.

---

## B-03 — Padronizar `session_id`
**Prioridade:** P0  
**Dependências:** B-01

### Descrição
Garantir que a chave operacional da conversa seja estável e reutilizável em Redis, banco e logs.

### Critério de aceite
Uma mesma cliente no mesmo canal mantém o mesmo `session_id` operacional.

---

## B-04 — Bufferizar mensagens fragmentadas
**Prioridade:** P1  
**Dependências:** B-03

### Descrição
Consolidar mensagens curtas sequenciais antes de classificar intenção.

### Critério de aceite
A sequência “nina” + “27” + “2 unidades” não gera três respostas descoordenadas.

---

## 5. Épico C — Clientes, conversas e persistência

## C-01 — Buscar ou criar cliente por WhatsApp
**Prioridade:** P0  
**Dependências:** B-03

### Descrição
Usar a tabela `clientes` como cadastro base.

### Critério de aceite
Toda mensagem inbound fica associada a um `cliente_id`.

---

## C-02 — Criar/atualizar conversa persistente
**Prioridade:** P1  
**Dependências:** C-01

### Descrição
Persistir sessão lógica em `conversas`, espelhando status e últimos campos úteis.

### Critério de aceite
Cada `session_id` possui uma conversa identificável para operação.

---

## C-03 — Persistir mensagens inbound e outbound
**Prioridade:** P1  
**Dependências:** C-02

### Descrição
Salvar mensagens em `mensagens` com `direction`, `media_type`, corpo e payload bruto.

### Critério de aceite
Existe trilha mínima do que entrou e do que saiu.

---

## C-04 — Persistir eventos estruturados do fluxo
**Prioridade:** P1  
**Dependências:** C-02

### Descrição
Registrar eventos como `intent_classified`, `state_merged`, `image_found`, `cart_created`.

### Critério de aceite
A equipe consegue diagnosticar uma conversa sem abrir todos os nodes do n8n.

---

## 6. Épico D — Estado conversacional

## D-01 — Consolidar schema do `state:{session_id}`
**Prioridade:** P0  
**Dependências:** A-03, B-03

### Descrição
Definir schema único do estado em Redis.

### Critério de aceite
O estado possui forma previsível e é reaproveitável por todos os módulos.

---

## D-02 — Implementar merge determinístico
**Prioridade:** P0  
**Dependências:** D-01

### Descrição
Atualizar apenas campos válidos extraídos, sem permitir que `null` apague valores anteriores.

### Critério de aceite
Quando a cliente informa só a cor, o modelo anterior permanece intacto.

---

## D-03 — Recalcular `etapa` de forma centralizada
**Prioridade:** P0  
**Dependências:** D-02

### Descrição
Transformar regras de jornada em função única de estágio.

### Critério de aceite
`modelo + cor + quantidade` sempre resultam em `checkout`, sem variação imprevisível.

---

## D-04 — Manter `shown_models` por sessão
**Prioridade:** P2  
**Dependências:** D-01

### Descrição
Evitar repetição de modelos já sugeridos.

### Critério de aceite
A Marina não recicla a mesma lista o tempo todo na mesma conversa.

---

## 7. Épico E — Intent e extração

## E-01 — Revisar categorias finais de intent
**Prioridade:** P0  
**Dependências:** A-03

### Descrição
Fechar conjunto final de intents usadas no MVP.

### Critério de aceite
Os branches do fluxo usam as mesmas categorias oficiais.

---

## E-02 — Reforçar classificador para mensagens curtas
**Prioridade:** P0  
**Dependências:** E-01, D-01

### Descrição
Ajustar prompt e fallback para entradas como “em?”, “27”, “tem?” ou “quero”.

### Critério de aceite
Mensagens curtas não viram intent aleatória com confiança teatral.

---

## E-03 — Padronizar extração estruturada
**Prioridade:** P0  
**Dependências:** E-01

### Descrição
Garantir saída consistente para `modelo`, `cor`, `quantidade`, `pediu_foto`, `pediu_checkout`.

### Critério de aceite
A extração não derruba o payload principal do item nem quebra o merge.

---

## E-04 — Centralizar normalização de modelo/cor/quantidade
**Prioridade:** P1  
**Dependências:** E-03

### Descrição
Consolidar funções de normalização e alias.

### Critério de aceite
Cor por código, nome ou variação textual convergem para o mesmo valor canônico.

---

## 8. Épico F — Catálogo e busca vetorial

## F-01 — Auditar metadados do catálogo vetorial
**Prioridade:** P0  
**Dependências:** A-01

### Descrição
Validar presença de `doc_type`, `product_name`, `sku`, `color`, `images`, `keywords`.

### Critério de aceite
O catálogo possui metadados mínimos para produto base e variante.

---

## F-02 — Revisar consulta `match_produtos_slim`
**Prioridade:** P1  
**Dependências:** F-01

### Descrição
Ajustar recall/precision da busca vetorial para o contexto do MVP.

### Critério de aceite
A busca retorna candidatos utilizáveis, não só semanticamente parecidos.

---

## F-03 — Tratar registros órfãos de imagem
**Prioridade:** P1  
**Dependências:** F-01

### Descrição
Identificar variantes sem imagem e imagens sem produto utilizável.

### Critério de aceite
O fluxo de foto deixa de depender de documentos quebrados.

---

## 9. Épico G — Foto do produto

## G-01 — Padronizar contrato do workflow de foto
**Prioridade:** P1  
**Dependências:** F-01

### Descrição
Definir input/ output estável para `modelo`, `cor`, `found`, `image_url`, `motivo`.

### Critério de aceite
O workflow de foto responde com payload previsível em caso de sucesso e falha.

---

## G-02 — Ajustar score mínimo da imagem
**Prioridade:** P1  
**Dependências:** G-01

### Descrição
Revisar score de correspondência para reduzir falso positivo.

### Critério de aceite
Imagem só é enviada quando o match for comercialmente seguro.

---

## G-03 — Criar fallback elegante para imagem não encontrada
**Prioridade:** P1  
**Dependências:** G-01

### Descrição
Responder sem inventar imagem e conduzir a cliente para próximo passo útil.

### Critério de aceite
A ausência de imagem não quebra a conversa nem deixa a cliente no vácuo.

---

## 10. Épico H — Preço e estoque

## H-01 — Padronizar normalizador para consulta ao Bling
**Prioridade:** P0  
**Dependências:** F-01

### Descrição
Garantir que os SKUs candidatos sejam gerados de forma consistente a partir do catálogo vetorial.

### Critério de aceite
O subworkflow do Bling sempre recebe SKUs válidos ou falha de forma explícita.

---

## H-02 — Garantir leitura correta de preço e saldo
**Prioridade:** P0  
**Dependências:** H-01

### Descrição
Validar parse de `preco` e `saldoVirtualTotal`.

### Critério de aceite
O retorno de preço/estoque vem estruturado por variante.

---

## H-03 — Consolidar resposta de variantes por produto
**Prioridade:** P1  
**Dependências:** H-02

### Descrição
Agrupar nome, preço e variantes utilizáveis em contrato único para a resposta final.

### Critério de aceite
A Marina recebe contexto limpo para responder preço e disponibilidade.

---

## 11. Épico I — Carrinho e checkout

## I-01 — Consolidar schema do `cart:{session_id}`
**Prioridade:** P0  
**Dependências:** B-03

### Descrição
Definir estrutura única para draft, itens confirmados e status.

### Critério de aceite
Todos os branches de carrinho leem e escrevem no mesmo formato.

---

## I-02 — Salvar draft do item atual
**Prioridade:** P0  
**Dependências:** I-01, H-03

### Descrição
Quando modelo/cor/quantidade estiverem claros, salvar draft aguardando confirmação.

### Critério de aceite
Existe um draft consistente antes da criação do carrinho externo.

---

## I-03 — Confirmar draft e consolidar em `items`
**Prioridade:** P0  
**Dependências:** I-02

### Descrição
Mover item do draft para a lista aprovada do carrinho.

### Critério de aceite
Item confirmado entra em `items` e `current_item_draft` é limpo.

---

## I-04 — Resolver produto pai no WooCommerce
**Prioridade:** P0  
**Dependências:** I-03

### Descrição
Buscar produto pai por SKU/base para posterior resolução de variação.

### Critério de aceite
O fluxo encontra `parent_id` utilizável ou retorna erro explícito.

---

## I-05 — Resolver variação por SKU
**Prioridade:** P0  
**Dependências:** I-04

### Descrição
Buscar `variation_id` correto para o SKU confirmado.

### Critério de aceite
O fluxo retorna `variation_id` correto ou `variation_not_found`.

---

## I-06 — Montar payload final `product_id + variation_id + qty`
**Prioridade:** P0  
**Dependências:** I-05

### Descrição
Transformar o carrinho interno no payload aceito pelo endpoint cartql.

### Critério de aceite
O payload final é válido e serializável.

---

## I-07 — Persistir tentativa de carrinho em banco
**Prioridade:** P1  
**Dependências:** I-06, C-02

### Descrição
Salvar snapshot do carrinho criado ou falhado em `carrinhos` e `carrinho_itens`.

### Critério de aceite
Toda tentativa de checkout fica auditável.

---

## 12. Épico J — Resposta e canal de saída

## J-01 — Padronizar contrato outbound
**Prioridade:** P0  
**Dependências:** B-01

### Descrição
Criar envelope padrão para texto, imagem e metadados da resposta.

### Critério de aceite
Todos os branches de saída produzem o mesmo formato base.

---

## J-02 — Criar resposta curta por etapa
**Prioridade:** P1  
**Dependências:** D-03, J-01

### Descrição
Ajustar prompts e templates de resposta conforme etapa.

### Critério de aceite
A Marina sempre conduz para o próximo passo sem resposta prolixa ou robótica.

---

## J-03 — Tratar erro de envio outbound
**Prioridade:** P1  
**Dependências:** J-01

### Descrição
Registrar falhas do canal e permitir retry controlado.

### Critério de aceite
Falha de envio não some silenciosamente.

---

## 13. Épico K — Observabilidade e operação

## K-01 — Registrar logs estruturados por `session_id`
**Prioridade:** P1  
**Dependências:** C-04

### Descrição
Centralizar logging mínimo para depuração.

### Critério de aceite
Qualquer conversa pode ser rastreada por `session_id`.

---

## K-02 — Criar critérios de handoff manual
**Prioridade:** P2  
**Dependências:** C-02, D-03

### Descrição
Definir quando a operação interna deve assumir a conversa.

### Critério de aceite
Há gatilhos claros para intervenção humana.

---

## K-03 — Criar visão operacional mínima
**Prioridade:** P2  
**Dependências:** C-02, C-03, C-04

### Descrição
Criar consulta ou painel simples para listar conversas, etapa atual, último evento e status do carrinho.

### Critério de aceite
A equipe consegue ver o que está acontecendo sem depender do n8n editor.

---

## 14. Épico L — Segurança e hardening

## L-01 — Externalizar credenciais e URLs sensíveis
**Prioridade:** P1  
**Dependências:** A-02

### Descrição
Mover tokens, chaves e endpoints para credenciais/env vars.

### Critério de aceite
Não há segredo sensível hardcoded no workflow de produção.

---

## L-02 — Padronizar tratamento de erro externo
**Prioridade:** P1  
**Dependências:** H-02, I-06, J-03

### Descrição
Normalizar erros de Bling, WooCommerce, cartql e canal.

### Critério de aceite
Erros externos chegam em contrato consistente.

---

## L-03 — Rodar suíte de testes de regressão do fluxo
**Prioridade:** P1  
**Dependências:** épicos B a J

### Descrição
Montar checklist de casos felizes e quebrados.

### Critério de aceite
Mudanças no fluxo podem ser validadas sem teste improvisado de produção.

---

## 15. Sequência ideal de execução

### Sprint 1
- A-01
- A-02
- A-03
- B-01
- B-02
- B-03
- C-01
- D-01
- D-02
- D-03

### Sprint 2
- B-04
- C-02
- C-03
- C-04
- E-01
- E-02
- E-03
- E-04

### Sprint 3
- F-01
- F-02
- F-03
- G-01
- G-02
- G-03
- H-01
- H-02
- H-03

### Sprint 4
- I-01
- I-02
- I-03
- I-04
- I-05
- I-06
- I-07
- J-01
- J-02

### Sprint 5
- J-03
- K-01
- K-02
- K-03
- L-01
- L-02
- L-03

---

## 16. Definição de pronto do MVP

O MVP pode ser considerado pronto quando:

1. a conversa não perde contexto;
2. modelo, cor e quantidade são mantidos corretamente;
3. foto só é enviada quando há correspondência segura;
4. preço e saldo vêm do Bling de forma confiável;
5. carrinho externo é criado com link válido;
6. erros ficam rastreáveis por sessão;
7. a equipe interna consegue entender falhas sem desmontar o fluxo inteiro.

---

## 17. Decisão final

O backlog ideal da Marina não começa pelo painel bonito. Começa por:

- contrato;
- estado;
- catálogo;
- carrinho;
- rastreabilidade.

Quando isso estiver sólido, o resto deixa de ser drama técnico e vira produto. O que, convenhamos, já é uma promoção generosa para qualquer MVP.
