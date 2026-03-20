# Roadmap de Build — Marina MVP Interno

**Versão:** 0.1  
**Base:** PRD + UX + Design System + arquitetura técnica  
**Escopo:** MVP interno para uma única loja  
**Estratégia:** estabilizar primeiro, embelezar depois

---

## 1. Objetivo do roadmap

Definir a ordem ideal de construção da Marina sem desperdiçar esforço em camadas prematuras.

A prioridade correta para este MVP é:

1. garantir operação confiável;
2. preservar contexto;
3. acertar catálogo, foto, preço e carrinho;
4. só então subir camada visual e operacional complementar.

---

## 2. Princípios de priorização

### 2.1 Core antes de painel
Se o fluxo principal falhar, dashboard vira televisão de problema.

### 2.2 Estado antes de sofisticação
Sem state engine confiável, qualquer UX fica cosmético.

### 2.3 ERP antes de copy
Preço e estoque corretos valem mais que mensagem bonita.

### 2.4 Checkout antes de escala
Só faz sentido otimizar volume depois que o carrinho fecha bem.

### 2.5 Logs desde cedo
Bug sem rastreio é espiritualidade, não engenharia.

---

## 3. Macrofases

- **Fase 0 — Auditoria e saneamento dos assets atuais**
- **Fase 1 — Núcleo conversacional estável**
- **Fase 2 — Catálogo, imagem e preço confiáveis**
- **Fase 3 — Carrinho operacional de ponta a ponta**
- **Fase 4 — Operação assistida e observabilidade**
- **Fase 5 — Hardening e go-live controlado**

---

## 4. Fase 0 — Auditoria e saneamento dos assets atuais

### Objetivo
Transformar os templates existentes em base confiável de construção.

### Entregas
- mapear todos os workflows e subworkflows;
- validar credenciais e dependências externas;
- levantar hardcodes de domínio, token, tabela e endpoint;
- revisar nodes críticos de merge, cart e imagem;
- definir nomenclatura oficial de estados, intents e payloads;
- congelar uma versão-base do workflow principal.

### Checklist
- [ ] workflow principal identificado e versionado
- [ ] subworkflow de estoque validado
- [ ] subworkflow de foto validado
- [ ] subworkflow de carrinho validado
- [ ] contratos mínimos documentados
- [ ] variáveis e credenciais catalogadas

### Critério de saída
Existe uma baseline técnica clara do que entra em produção de teste.

---

## 5. Fase 1 — Núcleo conversacional estável

### Objetivo
Fazer o atendimento básico funcionar com memória de contexto confiável.

### Escopo
- webhook WhatsApp;
- identificação/criação de cliente;
- buffer de mensagens;
- classificador de intenção;
- extração estruturada;
- Redis Get/Set estado;
- merge determinístico;
- recalcular etapa;
- responder texto simples.

### Tarefas
#### 5.1 Ingestão
- [ ] validar payload de entrada
- [ ] ignorar mensagens da própria instância
- [ ] padronizar `session_id`
- [ ] centralizar parsing de mídia

#### 5.2 Cliente
- [ ] buscar por telefone
- [ ] criar se não existir
- [ ] garantir retorno consistente do cadastro

#### 5.3 Estado
- [ ] consolidar estrutura `state:{session_id}`
- [ ] padronizar merge
- [ ] impedir que `null` apague contexto
- [ ] padronizar cálculo de `etapa`

#### 5.4 Intent + extraction
- [ ] revisar categorias finais
- [ ] reforçar fallback para mensagens curtas
- [ ] garantir preservação do payload original

#### 5.5 Resposta base
- [ ] template de resposta curta
- [ ] sem preço inventado
- [ ] sem imagem inventada
- [ ] condução para próximo passo

### Critério de aceite
Conversas simples como “tem nina?” → “quero a 27” → “2 unidades” não perdem contexto.

---

## 6. Fase 2 — Catálogo, imagem e preço confiáveis

### Objetivo
Fazer a Marina encontrar o que vende e provar isso com imagem e preço corretos.

### Escopo
- Supabase vector store;
- validação de `product_base` e `sku_variant`;
- busca de imagem;
- consulta de preço/estoque no Bling;
- regras de fallback.

### Tarefas
#### 6.1 Catálogo
- [ ] revisar indexação do catálogo
- [ ] garantir metadados mínimos
- [ ] remover registros órfãos ou inconsistentes
- [ ] validar match por modelo

#### 6.2 Imagem
- [ ] exigir `modelo + cor`
- [ ] validar score mínimo para retorno positivo
- [ ] implementar fallback elegante sem imagem
- [ ] registrar evento `last_bot_event`

#### 6.3 Preço e estoque
- [ ] gerar SKUs candidatos corretamente
- [ ] confirmar preço via Bling
- [ ] confirmar saldo via Bling
- [ ] agrupar variantes utilizáveis

### Critério de aceite
Quando a cliente pedir foto ou preço de uma combinação válida, a Marina responde com dado operacionalmente confiável.

---

## 7. Fase 3 — Carrinho operacional de ponta a ponta

### Objetivo
Levar a cliente do interesse ao link de compra sem intervenção manual em casos simples.

### Escopo
- `cart:{session_id}`;
- draft do item atual;
- confirmação final;
- resolução de produto pai e variação;
- chamada do endpoint `cartql`.

### Tarefas
#### 7.1 Cart state
- [ ] consolidar estrutura do cart
- [ ] salvar draft do item atual
- [ ] consolidar lista de itens aprovados

#### 7.2 Build do payload
- [ ] garantir `sku` e `qty`
- [ ] localizar produto pai
- [ ] localizar variação correta
- [ ] montar `product_id`, `variation_id`, `qty`

#### 7.3 Confirmação
- [ ] pedir confirmação antes do link
- [ ] impedir checkout com dados incompletos
- [ ] responder com resumo do item

#### 7.4 Integração final
- [ ] validar endpoint de cart
- [ ] validar URL gerada
- [ ] testar erros de variação não encontrada

### Critério de aceite
A jornada `modelo + cor + quantidade + confirmação` resulta em link de carrinho válido.

---

## 8. Fase 4 — Operação assistida e observabilidade

### Objetivo
Dar visibilidade operacional para acompanhar, depurar e intervir.

### Escopo
- logs estruturados;
- eventos principais;
- monitoramento básico;
- trilha de execução por conversa;
- visão mínima para operação interna.

### Tarefas
#### 8.1 Logging
- [ ] registrar entrada, intenção, etapa e saída
- [ ] registrar erros externos
- [ ] registrar subworkflow acionado

#### 8.2 Eventos
- [ ] imagem enviada
- [ ] fallback sem imagem
- [ ] cart draft atualizado
- [ ] checkout criado
- [ ] produto não encontrado

#### 8.3 Operação
- [ ] definir critério de handoff manual
- [ ] definir protocolo de revisão de falhas
- [ ] organizar debug por `session_id`

### Critério de aceite
A equipe interna consegue entender por que uma conversa falhou sem abrir 17 nodes e rezar.

---

## 9. Fase 5 — Hardening e go-live controlado

### Objetivo
Preparar o MVP para operar com mais previsibilidade e menos susto criativo em produção.

### Escopo
- parametrização;
- revisão de segurança;
- saneamento de credenciais;
- QA final;
- piloto controlado.

### Tarefas
#### 9.1 Parametrização
- [ ] mover URLs e chaves para credenciais/env vars
- [ ] remover hardcodes sensíveis
- [ ] nomear ambientes

#### 9.2 QA
- [ ] casos felizes
- [ ] casos quebrados
- [ ] mensagens curtas
- [ ] mudança de assunto
- [ ] imagem sem contexto
- [ ] checkout sem quantidade

#### 9.3 Go-live
- [ ] ativar com volume controlado
- [ ] acompanhar primeiras conversas
- [ ] registrar ajustes de prompt e regras

### Critério de aceite
O MVP roda em produção controlada com taxa aceitável de sucesso e fallback seguro.

---

## 10. Ordem prática de implementação

### Bloco 1 — Obrigatório imediato
- merge de estado
- cálculo de etapa
- classificação
- extração
- Redis
- resposta textual coerente

### Bloco 2 — Fechamento comercial
- catálogo vetorial
- imagem
- preço/estoque no Bling

### Bloco 3 — Conversão
- cart draft
- confirmação
- criação de carrinho

### Bloco 4 — Operação
- logs
- eventos
- handoff manual

### Bloco 5 — Evolução
- painel interno
- métricas
- refinamento de prompts

---

## 11. Backlog técnico priorizado

## Prioridade P0
- [ ] estado confiável em Redis
- [ ] merge determinístico
- [ ] classificador estável
- [ ] extração estruturada segura
- [ ] busca básica de catálogo
- [ ] resposta coerente por etapa

## Prioridade P1
- [ ] busca de imagem robusta
- [ ] preço/estoque via Bling
- [ ] cart draft estável
- [ ] link de carrinho funcional

## Prioridade P2
- [ ] logs estruturados
- [ ] eventos operacionais
- [ ] fallback mais inteligente
- [ ] melhoria de prompts

## Prioridade P3
- [ ] dashboard interno
- [ ] métricas por etapa
- [ ] melhorias de UX operacional

---

## 12. Matriz de testes recomendada

## Cenários essenciais
- [ ] cliente pergunta por modelo existente
- [ ] cliente responde só com cor
- [ ] cliente responde só com quantidade
- [ ] cliente pede foto após definir modelo e cor
- [ ] cliente pede foto sem contexto suficiente
- [ ] cliente pede preço com combinação válida
- [ ] cliente pede checkout sem quantidade
- [ ] cliente envia imagem de produto externo
- [ ] produto existe no vetor mas não no Bling
- [ ] SKU existe no Bling mas falha no WooCommerce

---

## 13. Definição de pronto por fase

### Fase 1 pronta quando
- contexto sobrevive a mensagens fragmentadas
- etapa é recalculada corretamente
- resposta conversa com o estado

### Fase 2 pronta quando
- foto e preço vêm de fontes corretas
- fallback não inventa dado

### Fase 3 pronta quando
- cart draft fecha
- link de compra é criado com consistência

### Fase 4 pronta quando
- operação enxerga o que aconteceu

### Fase 5 pronta quando
- o MVP pode operar sob supervisão com risco controlado

---

## 14. Riscos de execução

### Risco 1
Tentar construir painel cedo demais.

### Risco 2
Gastar tempo refinando copy com core instável.

### Risco 3
Confiar demais no vetor sem confirmação do Bling.

### Risco 4
Deixar hardcodes passarem para produção.

### Risco 5
Subestimar mensagens ambíguas e entradas curtas.

---

## 15. Próximo pacote após este roadmap

Quando este roadmap estiver executado, a evolução lógica é:

1. **Painel interno da Marina**  
2. **Métricas de funil por etapa**  
3. **Handoff humano com contexto pronto**  
4. **Camada de administração**  
5. **Eventual extração de partes críticas para backend em código**

