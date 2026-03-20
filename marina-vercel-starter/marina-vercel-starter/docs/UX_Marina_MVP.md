# UX — Marina MVP Interno

**Versão:** 0.1  
**Status:** Draft para produto e design  
**Escopo:** operação interna de uma única loja  
**Canal principal:** WhatsApp  
**Base estratégica:** PRD + Design System da Marina

---

## 1. Objetivo do UX

Definir a experiência de uso da Marina sob duas perspectivas:

1. **Cliente final**, que conversa com a assistente no WhatsApp para descobrir produto, validar cor, pedir foto, consultar preço e gerar carrinho.
2. **Operação interna**, que monitora conversas, entende o estado da jornada e intervém apenas quando necessário.

O UX da Marina deve reduzir fricção, preservar contexto entre mensagens fragmentadas e manter a percepção de atendimento humano, elegante e seguro.

---

## 2. Princípios de experiência

### 2.1 Clareza antes de inteligência
A usuária precisa entender o próximo passo sem esforço. A IA deve parecer útil, não misteriosa.

### 2.2 Memória sem repetição
Se a cliente já informou modelo, cor ou quantidade, a interface e a resposta não devem fazê-la repetir informação.

### 2.3 Condução progressiva
A Marina deve sempre puxar a conversa para a próxima decisão natural:

**modelo → cor → quantidade → confirmação → carrinho**

### 2.4 Elegância operacional
A experiência deve parecer premium, mas sem sacrificar velocidade, legibilidade ou previsibilidade.

### 2.5 Segurança comercial
Quando houver incerteza, o sistema deve pedir confirmação ou oferecer opções, nunca inventar dado.

### 2.6 Baixa carga cognitiva
Cada mensagem, tela ou card deve responder a uma única pergunta por vez.

---

## 3. Problema de UX

No contexto real da Marina, a cliente tende a mandar mensagens curtas e quebradas, como:

- “tem nina?”
- “27”
- “me manda foto”
- “2 unidades”
- “quero link”

O principal desafio de UX é fazer essa conversa parecer contínua e inteligente, mesmo quando a entrada da usuária é incompleta. A experiência deve absorver fragmentação sem parecer perdida.

---

## 4. Perfis de usuário

## 4.1 Cliente final

### Perfil
Consumidora que quer resposta rápida, foto confiável, preço claro e checkout simples.

### Motivação
Comprar sem ficar esperando atendimento humano a cada passo.

### Expectativas
- agilidade
- respostas objetivas
- entender variações
- foto certa
- não repetir contexto
- link de compra sem complicação

### Dor principal
Ter que explicar de novo o produto toda vez.

---

## 4.2 Operadora interna

### Perfil
Pessoa da equipe que acompanha conversas, valida exceções e assume casos fora do padrão.

### Motivação
Ter previsibilidade operacional e intervir só quando realmente necessário.

### Expectativas
- entender rapidamente em que etapa a conversa está
- ver modelo/cor/quantidade já identificados
- enxergar falhas sem ler tudo manualmente
- conseguir assumir o atendimento com contexto pronto

### Dor principal
Automação parecer que entendeu, mas ter entendido errado.

---

## 5. Jobs to Be Done

### Cliente final
- “Quero saber se vocês têm esse modelo.”
- “Quero ver as cores disponíveis.”
- “Quero ver a foto certa antes de comprar.”
- “Quero saber o valor.”
- “Quero comprar sem complicação.”

### Operação interna
- “Quero saber em segundos por que a conversa travou.”
- “Quero ver o que a cliente já definiu.”
- “Quero decidir rapidamente se preciso assumir.”
- “Quero corrigir o rumo sem recomeçar o atendimento.”

---

## 6. Proposta de experiência

A Marina deve operar como uma **vendedora premium assistida por sistema**.

Na percepção da cliente, a experiência precisa ser:
- rápida
- gentil
- objetiva
- segura
- visualmente coerente

Na percepção interna, a experiência precisa ser:
- auditável
- interpretável
- orientada por estado
- fácil de operar

---

## 7. Arquitetura da experiência

O UX do MVP é dividido em dois ambientes:

## 7.1 Camada conversacional
Onde a cliente interage via WhatsApp.

Elementos principais:
- mensagens de texto
- envio de imagem
- envio de áudio
- respostas da Marina
- foto de produto
- link de carrinho

## 7.2 Camada operacional interna
Onde a equipe acompanha e atua.

Elementos principais:
- inbox de conversas
- painel de contexto
- status da etapa
- item atual
- histórico de ações
- fallback/manual override

---

## 8. Fluxos principais

## 8.1 Fluxo 1 — Descoberta de produto

### Cenário
A cliente chega sem contexto anterior e pergunta por um modelo.

### Entrada típica
“Tem nina?”

### Resposta esperada
A Marina confirma entendimento do modelo e conduz para cor ou lista opções relevantes.

### Objetivo de UX
Fazer a cliente sentir que o sistema entendeu a intenção sem exigir estrutura formal.

### Fricções a evitar
- resposta genérica demais
- repetir pergunta já respondida
- oferecer produto aleatório

---

## 8.2 Fluxo 2 — Escolha de cor

### Cenário
A cliente informa apenas a cor após já ter citado um modelo antes.

### Entrada típica
“Quero a 27”

### Resposta esperada
A Marina reaproveita o modelo anterior e confirma a variação correta.

### Objetivo de UX
A sensação deve ser: “ela lembrou do que eu estava vendo”.

---

## 8.3 Fluxo 3 — Pedido de foto

### Cenário
A cliente pede foto depois de modelo e cor estarem claros.

### Entrada típica
“Me manda foto”

### Resposta esperada
A Marina envia a imagem correta e pergunta se a cliente quer seguir com quantidade ou carrinho.

### Objetivo de UX
Reduzir insegurança visual e acelerar a decisão.

### Regra de experiência
Foto só entra quando houver correspondência segura.

---

## 8.4 Fluxo 4 — Preço e quantidade

### Cenário
A cliente quer preço, disponibilidade e quantidade.

### Entrada típica
“Quanto fica 2 unidades?”

### Resposta esperada
A Marina informa preço e confirma quantidade ou disponibilidade antes do checkout.

### Objetivo de UX
Evitar conversa circular. Depois do preço, o próximo passo deve ficar óbvio.

---

## 8.5 Fluxo 5 — Checkout

### Cenário
A cliente já decidiu produto, cor e quantidade.

### Entrada típica
“Pode gerar o link”

### Resposta esperada
A Marina confirma o resumo e envia o link de carrinho.

### Objetivo de UX
Fechar a jornada com confiança e sem ambiguidade.

---

## 8.6 Fluxo 6 — Dúvida ou incerteza

### Cenário
A intenção está confusa ou os dados não bastam.

### Resposta esperada
A Marina faz uma pergunta curta, orientada e contextual.

### Exemplo
Em vez de “não entendi”, usar:
- “Você quer esse modelo em qual cor?”
- “Posso te mostrar as cores disponíveis desse modelo.”
- “Quer que eu te envie a foto antes?”

### Objetivo de UX
A falha precisa parecer assistência, não erro.

---

## 9. Mapa de estados da conversa

A experiência deve refletir estados simples e legíveis.

### Estados principais
- sem contexto
- modelo identificado
- cor pendente
- cor identificada
- quantidade pendente
- pronto para preço
- pronto para checkout
- carrinho gerado
- revisão manual

### Regra de UX
Cada estado deve ter:
- um próximo passo claro
- uma mensagem curta associada
- uma visualização clara no painel interno

---

## 10. Arquitetura da informação

## 10.1 Cliente final
A arquitetura é conversacional. A ordem de informação deve ser:

1. confirmação do que foi entendido
2. próximo passo
3. apoio opcional

### Exemplo ideal
“Tenho sim o modelo Nina. Você quer em qual cor?”

Não ideal:
“Olá! Ficarei feliz em te ajudar com esse produto. No momento, preciso que você me informe qual variação deseja.”

Isso é atendimento; o outro é burocracia com perfume.

## 10.2 Operação interna
A arquitetura do painel deve priorizar:

1. conversa ativa
2. estado atual
3. item em construção
4. alertas/falhas
5. histórico técnico

---

## 11. Inventário de telas do MVP

## 11.1 Login

### Objetivo
Dar acesso rápido à operação.

### Conteúdo
- logo Marina
- título simples
- campos de acesso
- estado de erro claro

### Critério de UX
Sem distração. Não é landing page; é porta de operação.

---

## 11.2 Dashboard

### Objetivo
Visão rápida da operação do dia.

### Blocos sugeridos
- conversas ativas
- conversas aguardando revisão
- carrinhos gerados
- tempo médio de resposta
- taxa de automação sem intervenção

### Critério de UX
Leitura em 5 segundos.

---

## 11.3 Inbox de conversas

### Objetivo
Ser o centro operacional do produto.

### Estrutura ideal
#### Coluna 1 — Lista de conversas
- nome ou telefone
- última mensagem
- badge de etapa
- horário
- indicador de revisão manual

#### Coluna 2 — Conversa
- bubbles cliente x Marina
- imagens enviadas
- eventos de sistema discretos
- ações rápidas

#### Coluna 3 — Contexto
- modelo atual
- cor atual
- quantidade
- status de preço/estoque
- imagem encontrada
- status do carrinho
- ações: assumir, reenviar, resetar etapa

### Critério de UX
A operadora deve entender a situação sem precisar interpretar logs brutos.

---

## 11.4 Tela de catálogo interno

### Objetivo
Permitir validação visual e operacional dos produtos.

### Conteúdo
- busca por modelo
- filtros por cor
- card com foto
- SKU
- preço
- saldo

### Critério de UX
Não precisa ser e-commerce bonito; precisa ser útil e consistente com a conversa.

---

## 11.5 Tela de revisão manual

### Objetivo
Resolver exceções.

### Casos típicos
- intenção ambígua
- foto não encontrada
- SKU divergente
- carrinho não gerado
- estoque inconsistente

### Conteúdo
- resumo do problema
- conversa resumida
- estado atual
- ação sugerida
- resposta manual rápida

### Critério de UX
Toda exceção deve parecer tratável, não um buraco negro.

---

## 12. Componentes UX-chave

## 12.1 Badge de etapa
Representa a fase atual da conversa.

Exemplos:
- Identificando modelo
- Aguardando cor
- Aguardando quantidade
- Pronto para checkout
- Revisão manual

### Papel de UX
Traduzir complexidade técnica em leitura operacional instantânea.

---

## 12.2 Card de item atual
Resumo visual do produto em construção.

### Campos
- modelo
- cor
- quantidade
- preço
- foto
- disponibilidade

### Papel de UX
Ser a fonte rápida de verdade operacional.

---

## 12.3 Bubble de resposta da Marina
Deve parecer humana, curta e segura.

### Regras
- 1 ideia por mensagem
- no máximo 2 microblocos por resposta
- evitar parágrafos longos
- evitar texto excessivamente formal
- evitar “robotiquês”

---

## 12.4 Preview de foto

### Objetivo
Dar segurança visual na decisão.

### Comportamento
- exibir imagem com margem generosa
- manter legenda curta
- abaixo da imagem, sempre sugerir o próximo passo

Exemplo:
“Essa é a cor 27 desse modelo. Quer que eu já te passe o valor?”

---

## 12.5 CTA de ação rápida
Para operação interna.

### Exemplos
- Assumir conversa
- Reenviar resposta
- Resetar etapa
- Gerar carrinho manual
- Marcar para revisão

### Critério de UX
Ação rápida, irreversibilidade visível e feedback imediato.

---

## 13. UX Writing

## 13.1 Diretrizes
A escrita da Marina deve ser:
- curta
- cordial
- objetiva
- comercial sem agressividade
- contextual

## 13.2 O que fazer
- confirmar o que foi entendido
- conduzir com pergunta única
- usar linguagem simples
- encerrar mensagens com próximo passo claro

## 13.3 O que evitar
- texto longo demais
- desculpas excessivas
- frases burocráticas
- repetir contexto já conhecido
- parecer script engessado

## 13.4 Estrutura ideal de resposta
1. Confirmação breve  
2. Próxima pergunta ou ação  
3. Apoio opcional

### Exemplo
“Tenho sim a Nina. Você quer em qual cor?”

### Exemplo com foto
“Encontrei a foto da Nina na cor 27. Quer que eu te passe o valor?”

### Exemplo com checkout
“Perfeito: Nina, cor 27, 2 unidades. Vou te enviar o link.”

---

## 14. Tratamento de erro e fallback

## 14.1 Falha de entendimento
Em vez de informar erro técnico, a Marina deve reapresentar o próximo passo.

### Exemplo
“Posso te ajudar melhor se você me disser o modelo ou a cor que deseja.”

## 14.2 Foto não encontrada
- não inventar
- oferecer continuidade sem travar a compra

### Exemplo
“Não achei a foto exata dessa variação agora, mas posso te passar as cores disponíveis ou seguir com o valor.”

## 14.3 Carrinho falhou
- reconhecer sem dramatizar
- dar alternativa imediata

### Exemplo
“Não consegui gerar o link agora. Já posso tentar novamente ou te encaminhar para atendimento.”

## 14.4 Estoque incerto
- não confirmar disponibilidade sem segurança
- oferecer opções de variação

---

## 15. Heurísticas aplicadas

### Visibilidade do status
A operadora deve ver a etapa atual da conversa sempre.

### Compatibilidade com o mundo real
A cliente não fala em campos estruturados; o sistema precisa traduzir isso internamente.

### Controle e liberdade
A equipe interna deve poder assumir, corrigir e resetar sem quebrar a conversa.

### Consistência
A mesma etapa deve gerar padrões previsíveis de resposta e visualização.

### Prevenção de erro
O UX deve impedir avanço para checkout com dados incompletos.

### Reconhecimento em vez de memória
O painel deve mostrar claramente modelo, cor e quantidade já identificados.

---

## 16. Acessibilidade

Mesmo sendo MVP interno, o produto deve respeitar mínimos aceitáveis de acessibilidade.

### Requisitos
- contraste suficiente entre fundo claro e texto
- foco visível em todos os elementos interativos
- labels reais em inputs
- navegação por teclado nas ações principais
- estados não dependerem só de cor
- tamanho mínimo confortável para clique em desktop e tablet

### Conteúdo conversacional
- evitar blocos longos
- manter leitura escaneável
- usar hierarquia consistente

---

## 17. Responsividade

## 17.1 Desktop
Ambiente principal da operação.

### Prioridade
Inbox com 3 colunas.

## 17.2 Tablet
Versão intermediária.

### Prioridade
Lista + conversa, com contexto recolhível.

## 17.3 Mobile interno
Não é foco principal do MVP.

### Prioridade
Apenas leitura e intervenção básica.

---

## 18. Métricas de UX

O sucesso da experiência deve ser medido por comportamento, não só por estética.

### Cliente final
- tempo médio até definição de modelo
- tempo médio até definição de cor
- tempo médio até carrinho
- taxa de conversas concluídas sem intervenção humana
- taxa de abandono por etapa

### Operação interna
- tempo para diagnosticar uma conversa travada
- taxa de intervenção manual
- taxa de reset de etapa
- taxa de erro de interpretação corrigida manualmente

### Qualidade percebida
- taxa de mensagens repetidas pela cliente
- taxa de “não entendi”
- taxa de falhas por contexto perdido

---

## 19. Roteiro de testes de usabilidade

## 19.1 Testes com fluxo cliente
Cenários mínimos:
- descobrir produto por nome
- responder apenas com cor
- pedir foto
- perguntar preço
- gerar link

### Critério
A cliente deve chegar ao próximo passo sem confusão.

## 19.2 Testes com operação interna
Cenários mínimos:
- identificar por que uma conversa travou
- localizar modelo/cor/quantidade em menos de 10 segundos
- assumir o atendimento sem reler tudo
- corrigir uma etapa errada

---

## 20. Requisitos UX para handoff UI

A camada visual deve implementar:
- badges de etapa consistentes
- hierarquia clara entre conversa e contexto
- card de item atual sempre visível
- respostas da Marina visualmente diferenciadas
- alertas discretos, mas visíveis
- CTA principal inequívoco

A UI deve seguir o Design System Marina:
- base clara premium
- profundidade em marsala
- dourado apenas como destaque pontual
- tipografia elegante com alta legibilidade

---

## 21. Decisão final de UX

A experiência da Marina não deve parecer um bot tentando vender.  
Ela deve parecer uma **vendedora premium com memória, contexto e condução segura**.

O núcleo do UX é este:

**diminuir atrito, preservar contexto e manter a compra fluindo com elegância.**

Se a cliente sentir que a Marina “lembra”, “entende” e “conduz”, o UX cumpriu seu papel.
