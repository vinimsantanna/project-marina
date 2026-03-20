"use client";

import { useMemo, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";

type Message = {
  role: "user" | "assistant";
  text: string;
  image_url?: string | null;
};

type SimulatorState = {
  modelo: string | null;
  cor: string | null;
  quantidade: number | null;
  etapa: string;
  updated_at: string;
};

type SimulatorIntent = {
  intent: string;
  confidence: number;
  reason: string;
};

type SimulatorCart = {
  status: string;
  items: Array<{
    sku: string;
    produto_nome: string;
    cor: string;
    quantidade: number;
  }>;
  current_item_draft: {
    sku: string;
    produto_nome: string;
    cor: string;
    quantidade: number;
  } | null;
} | null;

type WorkflowResponse = {
  ok: boolean;
  data?: {
    state: SimulatorState;
    outbound: {
      text: string;
      image_url: string | null;
    };
    intent: SimulatorIntent;
    cart: SimulatorCart;
  };
};

export function ChatSimulator() {
  const [sessionId] = useState(() => `55${Math.floor(Math.random() * 90000000000 + 10000000000)}`);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Oi, eu sou a Marina. Me diz o modelo ou a cor que você quer ver."
    }
  ]);
  const [state, setState] = useState<SimulatorState | null>(null);
  const [intent, setIntent] = useState<SimulatorIntent | null>(null);
  const [cart, setCart] = useState<SimulatorCart>(null);
  const [loading, setLoading] = useState(false);

  const hint = useMemo(
    () => "Exemplos: “tem nina?”, “quero a 27”, “2 unidades”, “pode montar meu carrinho”",
    []
  );

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;

    const userText = text.trim();
    setMessages((current) => [...current, { role: "user", text: userText }]);
    setText("");
    setLoading(true);

    const response = await fetch("/api/webhooks/whatsapp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        session_id: sessionId,
        from: sessionId,
        from_name: "Cliente Teste",
        message_type: "text",
        message_text: userText,
        provider: "simulator",
        conversation_state: state
      })
    });

    const payload = (await response.json()) as WorkflowResponse;

    if (payload.ok && payload.data) {
      setState(payload.data.state);
      setIntent(payload.data.intent);
      setCart(payload.data.cart);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: payload.data?.outbound.text || "Sem resposta.",
          image_url: payload.data?.outbound.image_url
        }
      ]);
    } else {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: "Deu ruim no simulador. Confere o payload e as variáveis de ambiente."
        }
      ]);
    }

    setLoading(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <SectionCard
        title="Simulador da Marina"
        subtitle="Testa a jornada completa sem depender do provedor de WhatsApp."
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <StatusBadge tone="brand">Sessão {sessionId}</StatusBadge>
          <StatusBadge tone="gold">Starter pronto para Vercel</StatusBadge>
        </div>

        <div className="space-y-4 rounded-[24px] border border-[--border-soft] bg-[--canvas] p-4">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`max-w-[85%] rounded-[20px] px-4 py-3 text-sm shadow-sm ${
                message.role === "assistant"
                  ? "bg-[--surface-soft] text-[--text-primary]"
                  : "ml-auto bg-[--brand] text-white"
              }`}
            >
              <p>{message.text}</p>
              {message.image_url ? (
                <img
                  src={message.image_url}
                  alt="Imagem do produto"
                  className="mt-3 h-44 w-full rounded-[16px] object-cover"
                />
              ) : null}
            </div>
          ))}
        </div>

        <form onSubmit={onSubmit} className="mt-4">
          <label className="mb-2 block text-sm text-[--text-secondary]">{hint}</label>
          <div className="flex gap-3">
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Digite uma mensagem como se fosse a cliente..."
              className="min-h-14 flex-1 rounded-[18px] border border-[--border-soft] bg-white px-4 text-sm text-[--text-primary] outline-none ring-0 placeholder:text-[--text-muted] focus:border-[--accent] focus:shadow-[0_0_0_3px_rgba(200,169,107,0.18)]"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-14 items-center justify-center rounded-[18px] bg-[--brand] px-5 text-sm font-medium text-white transition hover:bg-[--brand-deep] disabled:opacity-60"
            >
              <SendHorizontal className="size-4" />
            </button>
          </div>
        </form>
      </SectionCard>

      <div className="space-y-6">
        <SectionCard
          title="Estado da conversa"
          subtitle="Espelho do estado em Redis. No simulador, ele também volta no payload."
        >
          <div className="space-y-3 text-sm">
            <Line label="Modelo" value={state?.modelo ?? "—"} />
            <Line label="Cor" value={state?.cor ?? "—"} />
            <Line label="Quantidade" value={state?.quantidade ? String(state.quantidade) : "—"} />
            <Line label="Etapa" value={state?.etapa ?? "—"} />
          </div>
        </SectionCard>

        <SectionCard
          title="Classificação"
          subtitle="Intent e confiança retornadas pelo pipeline."
        >
          <div className="space-y-3 text-sm">
            <Line label="Intent" value={intent?.intent ?? "—"} />
            <Line
              label="Confiança"
              value={intent ? `${Math.round(intent.confidence * 100)}%` : "—"}
            />
            <Line label="Motivo" value={intent?.reason ?? "—"} />
          </div>
        </SectionCard>

        <SectionCard
          title="Carrinho"
          subtitle="Prévia do cart state usado antes do CartQL."
        >
          <div className="space-y-3 text-sm">
            <Line label="Status" value={cart?.status ?? "—"} />
            <Line
              label="Draft atual"
              value={cart?.current_item_draft ? `${cart.current_item_draft.produto_nome} / ${cart.current_item_draft.cor}` : "—"}
            />
            <Line label="Itens confirmados" value={cart?.items?.length ? String(cart.items.length) : "0"} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-dashed border-[--border-soft] pb-3 last:border-none last:pb-0">
      <span className="text-[--text-muted]">{label}</span>
      <span className="max-w-[60%] text-right text-[--text-primary]">{value}</span>
    </div>
  );
}
