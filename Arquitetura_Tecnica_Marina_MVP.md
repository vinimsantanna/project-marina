# Arquitetura Técnica — Marina MVP Interno

**Versão:** 0.1  
**Base:** PRD + UX + Design System + fluxos n8n anexados  
**Escopo:** operação interna de uma única loja  
**Canal principal:** WhatsApp

---

## 1. Objetivo

Definir a arquitetura técnica do MVP da Marina para suportar atendimento conversacional de vendas no WhatsApp, com preservação de contexto, busca de catálogo, consulta de estoque/preço, envio de foto e geração de carrinho externo.

A arquitetura proposta parte dos assets já existentes e assume uma estratégia pragmática:

- **reaproveitar o backbone atual em n8n**;
- **fortalecer as fronteiras entre módulos**;
- **reduzir acoplamento do LLM com estado**;
- **operar com Redis como fonte de verdade da conversa**;
- **manter o MVP simples, estável e auditável**.

---

## 2. Princípios arquiteturais

### 2.1 Estado fora do LLM
O LLM interpreta e extrai. Ele não gerencia estado.

### 2.2 Merge determinístico
Novas informações atualizam apenas os campos válidos. `null` nunca apaga contexto útil.

### 2.3 Fluxo modular
O workflow principal orquestra. Estoque, foto e carrinho rodam como subfluxos isolados.

### 2.4 Falha segura
Em caso de incerteza, o sistema pede confirmação, oferece opções ou retorna fallback. Não inventa produto, preço ou imagem.

### 2.5 Observabilidade mínima obrigatória
Toda execução precisa deixar rastros suficientes para diagnóstico operacional.

### 2.6 Parametrização
Credenciais, endpoints e identificadores externos não devem ficar hardcoded além do necessário para o protótipo.

---

## 3. Arquitetura de alto nível

```text
WhatsApp API
   ↓
Webhook n8n (workflow principal)
   ↓
Normalização + buffer + identificação de cliente
   ↓
Classificação de intenção + extração estruturada
   ↓
Redis Get Estado
   ↓
Merge determinístico de estado
   ↓
Roteamento por etapa
   ├── Busca de produtos / contexto comercial (Supabase)
   ├── Busca de foto (subworkflow)
   ├── Consulta de estoque/preço (subworkflow Bling)
   └── Construção de carrinho (subworkflow WooCommerce)
   ↓
Montagem da resposta
   ↓
Envio via WhatsApp API
   ↓
Persistência de estado / cart / eventos
```

---

## 4. Componentes do sistema

## 4.1 Canal de entrada e saída
**Responsabilidade:** receber mensagens e enviar respostas.

### Entradas suportadas
- texto
- áudio
- imagem
- PDF

### Saídas suportadas
- mensagem de texto
- imagem do produto
- link de carrinho

### Observações
O workflow principal já contempla tratamento específico por tipo de mídia, inclusive transcrição de áudio, análise de imagem e extração de PDF.

---

## 4.2 Orquestrador principal (n8n)
**Responsabilidade:** coordenar toda a jornada.

### Funções centrais
- disparar via webhook;
- filtrar mensagens inválidas ou enviadas pela própria instância;
- identificar lead/cliente;
- consolidar mensagem via buffer Redis;
- classificar intenção;
- extrair entidades estruturadas;
- ler e atualizar estado conversacional;
- decidir próxima etapa;
- acionar subworkflows;
- montar resposta da Marina;
- enviar resposta;
- registrar estados auxiliares.

### Observação arquitetural
O n8n é o backbone do MVP. A recomendação é mantê-lo como **orquestrador de integração**, sem deixar lógica crítica de negócio espalhada em excesso.

---

## 4.3 LLM Layer
**Responsabilidade:** compreensão semântica e geração controlada de resposta.

### Usos no MVP
- classificador de intenção;
- extração estruturada;
- análise de mídia;
- redação final da mensagem.

### Regras técnicas
- não escrever estado definitivo;
- não inventar preço, estoque, imagem ou link;
- usar apenas contexto fornecido pelo sistema;
- operar com prompts curtos e restritivos.

### Risco conhecido
O material-base mostra que a classificação ainda é sensível a mensagens curtas demais. Portanto, o fluxo precisa de fallback conservador.

---

## 4.4 Redis
**Responsabilidade:** memória operacional do atendimento.

### Chaves principais
- `state:{session_id}`
- `cart:{session_id}`
- buffers temporários por tipo de mensagem
- estruturas auxiliares como `shown_models`

### Estado mínimo da conversa
```json
{
  "intent": "ver_produto",
  "etapa": "escolher_cor",
  "modelo": "nina",
  "cor": "27",
  "quantidade": 2,
  "pediu_foto": false,
  "pediu_checkout": false,
  "shown_models": [],
  "updated_at": "2026-03-20T00:00:00.000Z"
}
```

### Estado mínimo do carrinho
```json
{
  "session_id": "5511999999999",
  "status": "building",
  "currency": "BRL",
  "current_item_draft": {},
  "items": [],
  "updated_at": "2026-03-20T00:00:00.000Z"
}
```

### Decisão ideal
Redis é a fonte de verdade do contexto conversacional do MVP.

---

## 4.5 Supabase
**Responsabilidade:** dados persistentes e busca vetorial.

### Uso no MVP
- tabela `clientes`;
- documentos vetoriais de catálogo;
- documentos vetoriais de imagens/variantes;
- função ou consulta de similaridade para produtos.

### Tipos de documento relevantes
- `product_base`
- `sku_variant`

### Requisito operacional
A qualidade do MVP depende diretamente da qualidade dos metadados indexados:
- `product_name`
- `product_base_code`
- `sku`
- `color`
- `images`
- `keywords`

---

## 4.6 Bling
**Responsabilidade:** preço e estoque operacional.

### Uso no MVP
- consulta por SKU;
- leitura de preço;
- leitura de saldo;
- derivação de variantes disponíveis.

### Regra
Bling é a fonte operacional de preço e estoque. O catálogo vetorial ajuda a encontrar; o Bling confirma o que é vendável.

---

## 4.7 WooCommerce + CartQuick
**Responsabilidade:** criação do link de compra.

### Processo
1. receber itens com SKU e quantidade;
2. localizar produto pai;
3. localizar variação por SKU;
4. montar payload final de carrinho;
5. chamar endpoint `cartql`;
6. retornar URL de carrinho.

### Regra
Checkout só pode avançar após confirmação da cliente e com modelo, cor e quantidade claros.

---

## 5. Módulos do MVP

## 5.1 Módulo de ingestão
### Entradas
- webhook do WhatsApp

### Saídas
- mensagem normalizada
- metadados básicos de sessão

### Responsabilidades
- filtrar eventos inválidos;
- identificar remetente;
- classificar tipo de mídia;
- encaminhar para buffer.

---

## 5.2 Módulo de buffer e consolidação
### Responsabilidades
- agrupar mensagens fragmentadas;
- evitar corrida entre mensagens sequenciais;
- consolidar texto final para classificação.

### Decisão
Manter buffer em Redis no MVP. Simples, rápido e suficiente.

---

## 5.3 Módulo de cliente
### Responsabilidades
- buscar cliente por telefone;
- criar cliente se não existir;
- anexar contexto básico à execução.

### Persistência
Supabase.

---

## 5.4 Módulo de intent + extraction
### Responsabilidades
- classificar a mensagem;
- extrair `modelo`, `cor`, `quantidade`, `pediu_foto`, `pediu_checkout`;
- devolver payload estruturado sem destruir o payload original.

### Regra de ouro
Sempre preservar `session_id`, estado anterior e contexto relevante.

---

## 5.5 Módulo de state engine
### Responsabilidades
- ler estado anterior;
- aplicar merge determinístico;
- recalcular etapa;
- persistir novo estado.

### Etapas do MVP
- `ver_produto`
- `escolher_cor`
- `escolher_quantidade`
- `ver_preco`
- `pediu_foto`
- `checkout`
- `duvida`

### Regra de negócio
Se a cliente disser só a cor, o modelo anterior deve ser preservado.

---

## 5.6 Módulo de busca de catálogo
### Responsabilidades
- localizar modelos relevantes;
- filtrar documentos válidos;
- retornar produtos usáveis para a resposta e para o fluxo seguinte.

### Fonte
Supabase Vector Store.

---

## 5.7 Módulo de imagem
### Responsabilidades
- receber `modelo + cor`;
- buscar documentos `sku_variant`;
- filtrar itens com imagens;
- ranquear por aderência;
- retornar melhor imagem.

### Regras
- só responder `found = true` com correspondência segura;
- fallback elegante quando não houver imagem.

---

## 5.8 Módulo de estoque/preço
### Responsabilidades
- transformar produto encontrado em SKUs candidatos;
- consultar Bling;
- agrupar variantes;
- devolver preço, saldo e cor amigável.

### Regras
- catálogo vetorial não substitui ERP;
- nunca vender baseado apenas em similaridade vetorial.

---

## 5.9 Módulo de carrinho
### Responsabilidades
- manter draft do item atual;
- consolidar itens aprovados;
- gerar payload final de cart;
- chamar subworkflow de criação do link.

### Persistência
Redis.

---

## 5.10 Módulo de resposta
### Responsabilidades
- montar contexto final;
- redigir mensagem curta e comercial;
- decidir entre texto, imagem ou link;
- atualizar eventos auxiliares no estado.

### Regras
- linguagem natural curta;
- sem robótica;
- sem inventar dados.

---

## 6. Fluxo técnico detalhado

## 6.1 Texto
1. webhook recebe mensagem;
2. cliente é identificado;
3. texto entra no buffer;
4. mensagem consolidada é enviada ao classificador;
5. extração estruturada retorna entidades;
6. Redis entrega estado anterior;
7. merge recalcula etapa;
8. roteamento chama catálogo, imagem, preço ou carrinho;
9. resposta é enviada;
10. estado e cart são atualizados.

## 6.2 Áudio
1. webhook recebe áudio;
2. mídia é convertida;
3. áudio é transcrito;
4. texto transcrito entra no mesmo pipeline de texto.

## 6.3 Imagem
1. webhook recebe imagem;
2. imagem é convertida;
3. análise visual extrai contexto mínimo;
4. contexto visual é salvo em Redis;
5. resposta segue política conservadora.

## 6.4 PDF
1. webhook recebe PDF;
2. arquivo é convertido;
3. texto é extraído;
4. conteúdo entra no pipeline de interpretação, se aplicável.

---

## 7. Contratos mínimos entre módulos

## 7.1 Contract — Intent/Extraction → State Engine
```json
{
  "session_id": "5511999999999",
  "mensagem_cliente": "quero a 27",
  "intent": "escolher_cor",
  "modelo": null,
  "cor": "27",
  "quantidade": null,
  "pediu_foto": false,
  "pediu_checkout": false
}
```

## 7.2 Contract — State Engine → Busca de Foto
```json
{
  "session_id": "5511999999999",
  "modelo": "nina",
  "cor": "27",
  "mensagem_cliente": "me manda foto"
}
```

## 7.3 Contract — State Engine → Stock/Bling
```json
{
  "session_id": "5511999999999",
  "mensagem_cliente": "quanto fica 2 unidades",
  "intent": "ver_preco",
  "modelo": "nina",
  "cor": "27",
  "max_produtos": 5,
  "max_cores": 10
}
```

## 7.4 Contract — Cart Draft → Cart Link
```json
{
  "session_id": "5511999999999",
  "items": [
    {
      "sku": "NINA27",
      "qty": 2
    }
  ]
}
```

---

## 8. Modelo de dados mínimo

## 8.1 Cliente
```json
{
  "id": "uuid",
  "nome": "Cliente",
  "telefone": "5511999999999",
  "created_at": "timestamp"
}
```

## 8.2 Documento vetorial — product_base
```json
{
  "doc_type": "product_base",
  "product_name": "Nina",
  "product_base_code": "NINA",
  "keywords": ["nina", "modelo nina"]
}
```

## 8.3 Documento vetorial — sku_variant
```json
{
  "doc_type": "sku_variant",
  "product_name": "Nina",
  "sku": "NINA27",
  "color": "27",
  "images": ["https://..."]
}
```

---

## 9. Segurança e configuração

## Variáveis mínimas de ambiente
- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` ou service role conforme uso
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `BLING_CLIENT_ID`
- `BLING_CLIENT_SECRET`
- `BLING_REFRESH_TOKEN`
- `WC_BASE_URL`
- `WC_CONSUMER_KEY`
- `WC_CONSUMER_SECRET`
- `CARTQL_KEY`
- `WHATSAPP_API_URL`
- `WHATSAPP_API_TOKEN`

## Diretriz
Tirar do workflow tudo que hoje está fixo e promover para credenciais ou env vars. Hardcode é ótimo para demo; para operação, é só dívida técnica com maquiagem.

---

## 10. Observabilidade mínima

## Logs por execução
Registrar:
- `session_id`
- mensagem recebida
- tipo de mídia
- intenção classificada
- estado antes
- estado depois
- etapa calculada
- subworkflow acionado
- resposta enviada
- erro externo, quando houver

## Eventos úteis
- imagem enviada
- fallback sem imagem
- cart draft atualizado
- link de carrinho gerado
- falha de variação
- produto não encontrado

## Recomendação
No MVP, pode começar com logs no próprio n8n + Supabase. Em seguida, subir para um event log dedicado se a operação crescer.

---

## 11. Decisões técnicas recomendadas

### Decisão 1
**Manter n8n como backbone do MVP.**

Motivo: já existe fluxo funcional e a prioridade é estabilizar operação, não reescrever tudo cedo demais.

### Decisão 2
**Tratar Redis como state engine operacional.**

Motivo: já existe desenho validado, resolve o principal problema do atendimento fragmentado e reduz dependência do LLM.

### Decisão 3
**Manter subworkflows separados para estoque, imagem e carrinho.**

Motivo: melhor manutenção, menor blast radius e testes mais simples.

### Decisão 4
**Desacoplar gradualmente o Postgres Chat Memory da lógica crítica.**

Motivo: para esse caso, memória conversacional persistente não deve competir com o estado oficial do fluxo.

### Decisão 5
**Criar um painel operacional só depois da estabilidade do core.**

Motivo: sem core confiável, dashboard só serve para observar problemas em HD.

---

## 12. Limitações aceitáveis no MVP

- operação de uma única loja;
- canal único de atendimento;
- sem multiusuário sofisticado;
- sem billing interno;
- sem recomendação avançada;
- sem reconhecimento visual ambicioso;
- sem engine de métricas avançada.

---

## 13. Riscos técnicos

### Risco 1 — Classificação fraca em mensagens curtas
Mitigação: fallback conservador + reforço de regras no classificador + reaproveitamento de contexto anterior.

### Risco 2 — Divergência entre catálogo vetorial e ERP
Mitigação: vetor encontra, Bling confirma.

### Risco 3 — Imagem incorreta
Mitigação: threshold de confiança + `modelo + cor` obrigatórios.

### Risco 4 — Hardcodes externos
Mitigação: parametrização por ambiente.

### Risco 5 — Workflow principal inflado demais
Mitigação: modularização contínua e code nodes mais previsíveis.

---

## 14. Arquitetura-alvo do MVP

### Núcleo
- n8n
- Redis
- Supabase
- OpenAI
- Bling
- WooCommerce
- CartQuick
- WhatsApp API

### Organização técnica
- `workflow_main_marina`
- `workflow_stock_bling`
- `workflow_busca_foto`
- `workflow_cart_link`
- `catalog_indexer` (job opcional)
- `monitoring/logs` (camada simples no MVP)

---

## 15. Critério de arquitetura pronta

A arquitetura do MVP será considerada pronta quando:

1. o fluxo principal operar com estabilidade em mensagens fragmentadas;
2. o estado não se perder entre mensagens curtas;
3. preço e estoque dependerem do Bling, não de inferência;
4. imagem só for enviada com correspondência segura;
5. carrinho for criado via fluxo externo com payload consistente;
6. erros puderem ser diagnosticados sem engenharia reversa arqueológica.

---

## 16. Próximo passo natural

Após a arquitetura estabilizada, a evolução correta é:

1. painel interno de operação;
2. métricas por etapa;
3. melhoria do classificador;
4. state engine mais centralizado;
5. hardening de integrações;
6. eventual migração de partes críticas para backend em código, se o volume justificar.

