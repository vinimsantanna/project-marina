# Design System — Marina

**Versão:** 0.1  
**Contexto:** MVP interno de assistente conversacional de vendas  
**Direção criativa:** claro premium + marçala + dourado

---

## 1. Essência da marca

A Marina deve transmitir:

- sofisticação
- confiança
- fluidez operacional
- acolhimento elegante
- venda assistida com precisão

### Arquétipo visual
**Concierge premium + boutique digital**

### Sensação principal
**acolhimento elegante**

### Personalidade visual
- clara
- sofisticada
- precisa
- humana
- premium

### Palavras-chave
- premium claro
- calor sofisticado
- confiança silenciosa
- feminilidade madura
- luxo discreto
- venda assistida

### O que evitar
- visual escuro pesado
- dourado exagerado
- aparência de ERP genérico
- excesso de elementos decorativos
- interfaces frias demais

---

## 2. Conceito visual

A Marina deve parecer uma marca que **organiza a compra com delicadeza**.

Ela não deve ter cara de automação fria. O ideal é uma interface que combine:

- elegância leve;
- clareza operacional;
- luxo discreto;
- sensação de atendimento humano bem estruturado.

### Metáfora estética
**“Atendimento de luxo com operação limpa por trás.”**

---

## 3. Paleta de cores

## Cores primárias

### Ivory Silk — base principal
Fundo claro premium, quente e sofisticado.

- `#F8F4EF`

### Champagne Mist — superfície suave
Para cards, blocos, inputs e áreas secundárias.

- `#F2EAE2`

### Marsala Royale — cor de assinatura
Profundidade, autoridade e identidade.

- `#7A2E3A`

### Marsala Deep — hover / contraste / títulos nobres
Versão mais densa da cor principal.

- `#5E1F2B`

### Gold Veil — destaque premium
Uso pontual em bordas, ícones, selos e estados especiais.

- `#C8A96B`

### Antique Gold — dourado de contraste
Para hover e microdetalhes.

- `#A88443`

---

## Neutros de apoio

### Porcelain
- `#FCFAF7`

### Warm Sand
- `#E8DDD2`

### Stone Taupe
- `#B9A99A`

### Cocoa Mist
- `#8C766D`

### Graphite Brown
- `#463A36`

### Ink Soft
- `#241C1A`

---

## Cores semânticas

### Success
- `#3F7A5C`

### Success Soft
- `#E8F3EC`

### Warning
- `#B8842F`

### Warning Soft
- `#FBF3E3`

### Error
- `#A34747`

### Error Soft
- `#F8E7E7`

### Info
- `#6C7A92`

### Info Soft
- `#EEF2F7`

---

## Proporção de uso

- **70%** claros premium
- **20%** neutros quentes
- **8%** marçala
- **2%** dourado

### Regra de ouro
**O dourado entra como joia, não como parede.**

---

## 4. Gradientes

### Gradiente institucional

```css
linear-gradient(135deg, #F8F4EF 0%, #F2EAE2 45%, #E8DDD2 100%)
```

### Gradiente premium de assinatura

```css
linear-gradient(135deg, #7A2E3A 0%, #A88443 100%)
```

### Glow suave

```css
radial-gradient(circle, rgba(200,169,107,0.18) 0%, rgba(200,169,107,0) 70%)
```

---

## 5. Tipografia

A tipografia deve equilibrar **editorial premium** com **legibilidade operacional**.

## Combinação ideal

### Display / Headlines
**Cormorant Garamond**

Uso:
- títulos
- hero
- headers sofisticados
- selos premium

### UI / Corpo / Sistema
**Inter**

Uso:
- botões
- inputs
- labels
- textos corridos
- tabelas
- navegação

### Alternativa secundária
- Display: **Playfair Display**
- UI: **Manrope**

---

## Escala tipográfica

### Display XL
- 56 / 64
- peso 600

### H1
- 40 / 48
- peso 600

### H2
- 32 / 40
- peso 600

### H3
- 24 / 32
- peso 600

### H4
- 20 / 28
- peso 600

### Body L
- 18 / 28
- peso 400

### Body M
- 16 / 24
- peso 400

### Body S
- 14 / 22
- peso 400

### Label
- 12 / 18
- peso 500
- letter spacing: 0.04em

---

## 6. Grid, espaçamento e ritmo

A interface da Marina deve respirar.

### Grid
- Desktop: 12 colunas
- Tablet: 8 colunas
- Mobile: 4 colunas

### Espaçamento base
Escala 4:
- 4
- 8
- 12
- 16
- 24
- 32
- 40
- 48
- 64
- 80

### Regras visuais
- telas principais com bom respiro vertical;
- cards com padding generoso;
- formulários e chats com leitura limpa;
- CTAs e status nunca devem competir no mesmo nível de atenção.

---

## 7. Bordas, radius e sombras

## Radius
- XS: 8
- SM: 12
- MD: 16
- LG: 20
- XL: 28

### Uso recomendado
- botões: 14–16
- cards: 20
- modais: 24
- chips: 999

## Sombras

### Shadow 1
```css
0 4px 18px rgba(54, 35, 29, 0.06)
```

### Shadow 2
```css
0 10px 30px rgba(54, 35, 29, 0.10)
```

### Shadow 3
```css
0 18px 50px rgba(54, 35, 29, 0.12)
```

### Gold focus ring
```css
0 0 0 3px rgba(200, 169, 107, 0.18)
```

---

## 8. Componentes principais

## Botões

### Primary
- fundo: `Marsala Royale`
- texto: `#FFFFFF`
- hover: `Marsala Deep`
- radius: 16

**Uso:** ação principal, continuar, gerar carrinho.

### Secondary
- fundo: `Champagne Mist`
- texto: `Marsala Deep`
- borda: `Warm Sand`

**Uso:** ação secundária, ver mais, voltar.

### Accent
- fundo: `Gold Veil`
- texto: `Ink Soft`
- hover: `Antique Gold`

**Uso:** destaques muito pontuais.

### Ghost
- fundo transparente
- texto: `Marsala Royale`
- hover: `Champagne Mist`

---

## Inputs

### Padrão
- fundo: `#FFFFFF`
- borda: `#E8DDD2`
- label: `Graphite Brown`
- placeholder: `Stone Taupe`
- focus: borda `Gold Veil` + glow suave
- radius: 16

### Estados
- default
- focus
- success
- error
- disabled

---

## Cards

### Product Card
- imagem ampla
- nome em destaque
- cor/variante abaixo
- preço com hierarquia clara
- CTA curto

### Conversation Card
- fundo claro
- borda sutil
- badge de etapa

### Insight Card
- métrica ou status
- visual limpo com ícone fino
- número com destaque
- subtítulo menor

---

## Badges e chips

### Exemplos de status
- `Identificando modelo`
- `Aguardando cor`
- `Aguardando quantidade`
- `Pronto para checkout`
- `Imagem encontrada`
- `Revisão manual`

### Estilo
- fundo suave
- borda quase invisível
- tipografia pequena
- ícone linear

---

## 9. Tokens de interface

## Backgrounds
- `bg.canvas = #FCFAF7`
- `bg.surface = #F8F4EF`
- `bg.elevated = #FFFFFF`
- `bg.soft = #F2EAE2`
- `bg.brand = #7A2E3A`

## Text
- `text.primary = #241C1A`
- `text.secondary = #463A36`
- `text.muted = #8C766D`
- `text.inverse = #FFFFFF`
- `text.brand = #7A2E3A`

## Border
- `border.soft = #E8DDD2`
- `border.medium = #D8C7B8`
- `border.brand = #7A2E3A`
- `border.accent = #C8A96B`

## Accent
- `accent.gold = #C8A96B`
- `accent.marsala = #7A2E3A`
- `accent.soft = #F2EAE2`

---

## 10. Estilo de ícones e ilustrações

### Ícones
- finos
- lineares
- elegantes
- sem excesso de preenchimento
- cantos arredondados

### Ilustrações
- abstratas
- femininas maduras
- luxo editorial
- sem excesso de cartoon
- detalhes orgânicos e curvas suaves

### Motivos gráficos
- linhas curvas discretas
- molduras finas douradas
- shapes orgânicos translúcidos
- textura leve de papel premium
- brilhos sutis

---

## 11. Motion

A animação deve parecer elegante e controlada.

### Princípios
- transições suaves
- microinterações curtas
- sem bounce exagerado
- elegância acima de espetáculo

### Timing
- quick: 140ms
- default: 220ms
- smooth: 320ms

### Easing
```css
cubic-bezier(0.22, 1, 0.36, 1)
```

### Motion patterns
- fade-up leve
- shimmer sutil em carregamento
- scale 0.98 → 1 em interação
- highlight suave em confirmação de etapa

---

## 12. Sistema de páginas

## 1. Login / Acesso
Visual editorial limpo:
- fundo claro texturizado;
- título sofisticado;
- formulário central;
- selo discreto dourado ou marca d’água orgânica.

## 2. Dashboard
- KPIs em cards claros;
- bloco principal com conversas ativas;
- bloco lateral com métricas rápidas;
- badges por etapa.

## 3. Inbox / Conversas
Tela principal da operação.

### Estrutura
- coluna de conversas;
- painel central com mensagens;
- painel lateral com contexto:
  - modelo
  - cor
  - quantidade
  - imagem encontrada
  - item selecionado
  - status do carrinho

## 4. Catálogo / Produtos
- cards grandes;
- filtros refinados;
- miniaturas elegantes;
- cor em chip;
- estoque/preço em bloco discreto.

## 5. Checkout interno / Confirmar carrinho
- resumo visual limpo;
- foto do item;
- modelo;
- cor;
- quantidade;
- preço;
- CTA primário `Gerar carrinho`.

---

## 13. Componentes específicos da Marina

## Bubble de conversa

### Cliente
- fundo branco
- texto escuro
- borda suave

### Marina
- fundo `Champagne Mist`
- borda sutil em `Warm Sand`
- detalhes em `Marsala Royale`

### Mensagem de sistema
- fundo quase transparente
- tipografia menor
- tom neutro

---

## 14. Linguagem visual por etapa

### Ver produto
- mais aberta
- cards de sugestão
- sensação de descoberta

### Escolher cor
- chips maiores
- foco visual em variantes
- miniaturas e swatches

### Escolher quantidade
- layout mais objetivo
- stepper limpo
- confirmação clara

### Checkout
- contraste mais forte
- CTA primário evidente
- resumo elegante

### Foto encontrada
- visual mais emocional
- imagem maior
- CTA simples abaixo

---

## 15. Direção para marca e logo

### Logo ideal
- wordmark elegante;
- serif refinada ou combinação serif + sans;
- símbolo opcional com monograma `M`;
- aplicação principal em marsala;
- aplicação premium em dourado sobre fundo claro;
- versão clara para fundos escuros ocasionais.

### Assinatura visual
- moldura fina;
- detalhe curvo;
- filete dourado;
- selo pequeno `assistente de vendas`.

---

## 16. Naming interno para tokens

Sugestão de naming do sistema visual:

- **Silk** → fundos
- **Velvet** → superfícies
- **Reserve** → tons de marsala
- **Goldline** → destaques
- **Pearl** → neutros claros
- **Ink** → textos

---

## 17. Mini guia de uso

### Faça
- use muito espaço em branco;
- trate o dourado como detalhe valioso;
- mantenha a tipografia refinada;
- deixe o CTA principal sempre inequívoco;
- use badges operacionais com clareza.

### Não faça
- use dourado saturado em blocos grandes;
- misture muitos tons quentes concorrentes;
- use sombras pesadas;
- transforme tudo em cartão;
- deixe o painel parecer CRM genérico.

---

## 18. Assinatura visual final

A Marina deve parecer:

**“uma vendedora premium assistida por tecnologia invisível.”**

### Resumo da direção
- claro premium como base;
- marsala como assinatura e autoridade;
- dourado como detalhe de valor;
- visual leve, elegante e seguro.
