# PRD — Marina MVP Interno

**Versão:** 0.1  
**Status:** Draft para construção  
**Tipo:** MVP interno, operação de uma única loja  
**Canal principal:** WhatsApp

---

## 1. Visão geral

A Marina é uma atendente virtual de vendas para WhatsApp, desenhada para conduzir clientes por uma jornada curta e objetiva:

**modelo → cor → quantidade → confirmação → carrinho**

O MVP será construído para uso interno de uma única loja, com foco em confiabilidade operacional, velocidade de resposta e preservação de contexto entre mensagens fragmentadas.

A arquitetura funcional já pressupõe:

- entrada de mensagens via webhook;
- classificação de intenção;
- extração estruturada de entidades;
- estado conversacional persistido em Redis;
- busca de produtos e imagens no Supabase;
- consulta de estoque e preço no Bling;
- criação de carrinho externo via WooCommerce.

---

## 2. Problema

O atendimento de vendas exige agilidade, memória de contexto e precisão comercial. Em conversas reais, a cliente frequentemente responde de forma fragmentada, por exemplo:

- “tem nina?”
- “quero a 27”
- “me manda foto”
- “2 unidades”

O problema central é garantir que o sistema:

1. entenda a intenção real da mensagem;
2. extraia corretamente modelo, cor e quantidade;
3. mantenha o contexto entre mensagens curtas;
4. não invente preço, estoque, imagem ou link;
5. consiga levar a conversa até o checkout.

---

## 3. Objetivo do produto

Criar um software operacional interno que permita à Marina:

- receber mensagens de clientes no WhatsApp;
- entender intenção e extrair entidades da conversa;
- preservar contexto entre mensagens;
- sugerir modelos válidos;
- consultar preço e disponibilidade por SKU;
- buscar foto correta por modelo + cor;
- confirmar quantidade;
- gerar link de carrinho externo;
- responder de forma curta, natural e comercial.

---

## 4. Objetivo do MVP

Entregar uma operação funcional para uma única loja que:

- reduza atendimento manual repetitivo;
- aumente velocidade de resposta;
- evite perda de contexto em conversas quebradas;
- transforme intenção em link de carrinho sem intervenção humana na maioria dos casos simples.

---

## 5. Escopo do MVP

O MVP inclui:

- atendimento inbound via WhatsApp webhook;
- cadastro e identificação de cliente;
- buffer de mensagens;
- tratamento de texto, áudio, imagem e PDF;
- classificação de intenção;
- extração estruturada de modelo, cor, quantidade e sinais de compra;
- armazenamento e merge de estado em Redis;
- busca vetorial no Supabase para produtos e imagens;
- consulta de preço/estoque no Bling;
- montagem de draft de carrinho;
- geração de carrinho externo via WooCommerce + endpoint de carrinho;
- respostas automáticas da Marina em linguagem comercial curta.

---

## 6. Fora de escopo

Fica fora do MVP:

- multi-loja;
- painel SaaS para clientes;
- billing interno;
- onboarding self-service;
- catálogo multi-ERP;
- dashboard executivo completo;
- handoff omnichannel avançado;
- motor de recomendação sofisticado;
- reconhecimento confiável de produto externo por imagem;
- app mobile dedicado.

---

## 7. Usuários

### Usuário primário
Equipe interna da loja, que acompanhará a operação e intervirá quando necessário.

### Usuário final indireto
Cliente da loja, interagindo com a Marina no WhatsApp.

---

## 8. Jornada principal

1. Cliente envia mensagem no WhatsApp.
2. Sistema identifica telefone/nome e busca ou cria cliente.
3. Mensagens são consolidadas via buffer.
4. Sistema classifica a intenção.
5. O extrator estruturado retorna campos úteis.
6. O estado anterior é lido do Redis.
7. O novo estado é calculado por merge, sem apagar campos válidos anteriores.
8. Dependendo da etapa, o sistema:
   - lista modelos;
   - consulta variantes/cores;
   - consulta preço e saldo;
   - busca imagem;
   - pergunta quantidade;
   - pede confirmação;
   - cria carrinho.
9. Marina responde com texto curto e natural.
10. Quando confirmado, o sistema gera o link de carrinho externo.

---

## 9. Requisitos funcionais

### RF-01 — Entrada de mensagens
O sistema deve receber mensagens via webhook do WhatsApp e ignorar mensagens enviadas pela própria instância.

### RF-02 — Cadastro/identificação de cliente
O sistema deve localizar cliente por número de WhatsApp na tabela `clientes` e criar registro caso não exista.

### RF-03 — Normalização de entrada
O sistema deve normalizar texto, modelo, cor e quantidade, incluindo variações como cor por código e números escritos por extenso.

### RF-04 — Classificação de intenção
O sistema deve classificar a mensagem em uma categoria única entre, no mínimo:

- `ver_preco`
- `ver_produto`
- `escolher_cor`
- `comprar`
- `duvida`
- `pediu_foto`

Com fallback para `other/duvida`.

### RF-05 — Extração estruturada
O sistema deve extrair, quando existirem:

- `modelo`
- `cor`
- `quantidade`
- `pediu_foto`
- `pediu_checkout`
- `observacao`

O sistema não deve inventar informação ausente.

### RF-06 — Estado conversacional
O sistema deve armazenar o estado em Redis na chave `state:{session_id}` e recalcular a etapa com base em intenção + dados já conhecidos. Campos nulos não podem apagar valores válidos anteriores.

### RF-07 — Etapas da conversa
O sistema deve operar com etapas mínimas:

- `ver_produto`
- `escolher_cor`
- `escolher_quantidade`
- `ver_preco`
- `pediu_foto`
- `checkout`
- `duvida`

### RF-08 — Busca de produtos
Quando houver modelo ou contexto suficiente, o sistema deve consultar o Supabase Vector Store e retornar produtos válidos para o fluxo.

### RF-09 — Consulta de estoque/preço
Quando modelo e cor permitirem, o sistema deve derivar SKUs candidatos e consultar o Bling para obter preço e saldo por variação.

### RF-10 — Busca de foto
Quando a cliente pedir foto e houver `modelo + cor`, o sistema deve consultar o Supabase e selecionar a melhor imagem entre documentos `sku_variant` com imagens disponíveis.

### RF-11 — Tratamento de imagem enviada pela cliente
O sistema deve analisar a imagem recebida e registrar contexto visual mínimo, mas deve operar de forma conservadora: não reconhecer automaticamente produto externo como se fosse item da loja.

### RF-12 — Carrinho
O sistema deve manter um `cart:{session_id}` no Redis, salvar o item atual como draft, consolidar itens aprovados e enviar o array final para o criador de carrinho externo.

### RF-13 — Criação de link de carrinho
O sistema deve:

- identificar produto pai por SKU;
- localizar a variação correta;
- montar `product_id`, `variation_id`, `qty`;
- chamar o endpoint externo de criação de carrinho.

### RF-14 — Resposta da assistente
A Marina deve responder com mensagens curtas, naturais e comerciais, usando apenas:

- estado atual;
- modelos sugeridos;
- contexto de produtos retornado pelo sistema.

Ela não pode inventar preço, cor, disponibilidade, link ou modelo.

---

## 10. Regras de negócio

1. O LLM não é a fonte da verdade para estado.
2. Redis é a fonte da verdade do contexto conversacional.
3. Campos nulos nunca apagam estado anterior.
4. Foto só deve ser enviada quando houver correspondência segura.
5. Cor sem modelo deve aproveitar modelo anterior salvo, se existir.
6. Checkout só deve avançar quando modelo, cor e quantidade estiverem claros.
7. Link de carrinho só deve ser criado após confirmação da cliente.
8. O sistema deve ser conservador com imagem de produto externo.

---

## 11. Arquitetura do MVP

### Orquestração
n8n como orquestrador principal.

### Inteligência
LLM para:

- classificar intenção;
- extrair campos estruturados;
- redigir a resposta final.

### Estado
Redis para:

- `state:{session_id}`
- `cart:{session_id}`
- buffers temporários
- contexto visual/eventos de saída

### Dados
Supabase para:

- tabela de clientes;
- catálogo/index vetorial de produtos e imagens.

### Estoque e preço
Bling como fonte operacional de preço e saldo.

### Carrinho
WooCommerce + endpoint de carrinho como backend do link de checkout.

---

## 12. Dados mínimos

### Estado da conversa
Campos mínimos:

- `modelo`
- `cor`
- `quantidade`
- `pediu_foto`
- `pediu_checkout`
- `etapa`
- `updated_at`

Campos úteis adicionais:

- `shown_models`
- `last_bot_event`
- `last_user_visual_context`

### Estado do carrinho
Campos mínimos:

- `session_id`
- `status`
- `currency`
- `current_item_draft`
- `items`
- `updated_at`

---

## 13. Integrações do MVP

- WhatsApp API para entrada/saída de mensagens;
- OpenAI para classificação, extração e resposta;
- Supabase para clientes e vector store;
- Redis para estado e carrinho;
- Bling para consulta de produto, preço e estoque;
- WooCommerce para produto pai e variações;
- endpoint de carrinho para geração do link final.

---

## 14. Requisitos não funcionais

### RNF-01 — Confiabilidade
O fluxo deve tolerar mensagens incompletas sem perder contexto.

### RNF-02 — Rastreabilidade
Cada execução deve permitir identificar:

- mensagem recebida;
- intenção;
- estado antes;
- estado depois;
- chamada externa relevante;
- resposta enviada.

### RNF-03 — Segurança
Credenciais e chaves devem ser externalizadas para variáveis de ambiente ou armazenadas em credenciais seguras.

### RNF-04 — Manutenibilidade
O fluxo deve ser modularizado em:

- workflow principal;
- workflow de estoque;
- workflow de foto;
- workflow de carrinho.

### RNF-05 — Performance
A resposta média deve ser suficientemente rápida para sensação de conversa contínua, mesmo com chamadas externas.

---

## 15. Métricas de sucesso

Medir no MVP:

- taxa de conversas que chegam até `modelo definido`;
- taxa de conversas que chegam até `modelo + cor`;
- taxa de conversas que chegam até `modelo + cor + quantidade`;
- taxa de confirmação de carrinho;
- taxa de criação de link com sucesso;
- taxa de fallback por imagem não encontrada;
- taxa de erro por SKU/variação não encontrada;
- tempo médio de resposta.

---

## 16. Critérios de aceite

O MVP será considerado aceito quando:

1. Cliente envia mensagem e o sistema responde sem intervenção manual.
2. O contexto não se perde quando a cliente responde apenas com cor ou quantidade.
3. O sistema consegue listar modelos válidos sem inventar catálogo.
4. O sistema consegue retornar preço e variantes quando houver SKU correspondente.
5. O sistema consegue enviar foto correta quando houver `modelo + cor` válidos.
6. O sistema consegue criar link de carrinho após confirmação.
7. Em casos de incerteza, o sistema falha de forma segura e conduz a conversa sem inventar dado.
8. Logs mínimos permitem diagnosticar por que um fluxo falhou.

---

## 17. Dependências e riscos

### Dependências

- qualidade do catálogo indexado no Supabase;
- padronização dos metadados `product_base` e `sku_variant`;
- qualidade do token e da integração com Bling;
- disponibilidade do WooCommerce e do endpoint de carrinho;
- qualidade da classificação de intenção.

### Riscos

- intent classifier errar mensagens curtas demais;
- produto existir no catálogo vetorial mas não casar com SKU real;
- variação existir no WooCommerce e divergir do ERP;
- cliente enviar foto sem contexto suficiente;
- prompt funcionar bem, mas depender demais de dados de contexto incompletos.

---

## 18. Backlog pós-MVP

Próximas evoluções recomendadas:

- state engine centralizado;
- melhoria do classificador de intenção;
- painel interno de monitoramento;
- métricas visuais de conversão;
- fallback melhor para modelos não encontrados;
- revisão de hardcodes e parametrização total por ambiente.

---

## 19. Resumo executivo

A Marina MVP Interno é um software conversacional de vendas para uma única loja, com foco em WhatsApp, contexto persistente, consulta real de estoque/preço, busca de imagem e geração de carrinho. O objetivo não é criar uma plataforma complexa neste estágio, mas uma operação confiável que resolva a jornada comercial essencial com precisão, velocidade e segurança.
