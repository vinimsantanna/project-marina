import Link from "next/link";
import { ArrowRight, MessageCircleMore, ShoppingBag, SwatchBook } from "lucide-react";
import { ChatSimulator } from "@/components/chat-simulator";
import { MetricCard } from "@/components/metric-card";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";

export default function HomePage() {
  return (
    <main className="space-y-8">
      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[34px] border border-[--border-soft] bg-[rgba(255,255,255,0.82)] p-8 shadow-[0_18px_50px_rgba(54,35,29,0.12)]">
          <StatusBadge tone="gold">Starter kit pronto para deploy</StatusBadge>
          <h1 className="mt-5 font-display text-5xl leading-none text-[--text-primary] md:text-6xl">
            Marina, em formato que a Vercel gosta.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[--text-secondary]">
            Este projeto converte o núcleo do MVP em um app Next.js full-stack com
            Route Handlers, UI inicial, simulador de conversa, estado compatível com
            Redis e contratos alinhados ao PRD já produzido.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-[18px] bg-[--brand] px-5 py-3 text-sm font-medium text-white hover:bg-[--brand-deep]"
            >
              Abrir dashboard
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="/api/health"
              className="inline-flex items-center gap-2 rounded-[18px] border border-[--border-soft] bg-white px-5 py-3 text-sm font-medium text-[--text-primary] hover:border-[--accent]"
            >
              Ver status da API
            </a>
          </div>
        </div>

        <div className="grid gap-4">
          <MetricCard
            label="Arquitetura"
            value="Next + API"
            detail="App Router, Route Handlers e deploy direto na Vercel."
          />
          <MetricCard
            label="Estado"
            value="Redis"
            detail="Upstash opcional; fallback controlado para testes."
          />
          <MetricCard
            label="Starter"
            value="1 loja"
            detail="Escopo alinhado ao MVP interno da Marina."
          />
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <SectionCard title="Canal" subtitle="Recebe mensagem, normaliza e processa.">
          <div className="flex items-start gap-3">
            <MessageCircleMore className="mt-1 size-5 text-[--brand]" />
            <p className="text-sm leading-6 text-[--text-secondary]">
              Webhook de WhatsApp pronto para receber payload normalizado e devolver
              resposta outbound em JSON.
            </p>
          </div>
        </SectionCard>
        <SectionCard title="Catálogo" subtitle="Busca base para modelo, cor e foto.">
          <div className="flex items-start gap-3">
            <SwatchBook className="mt-1 size-5 text-[--brand]" />
            <p className="text-sm leading-6 text-[--text-secondary]">
              Mock baseado no CSV anexado, com estrutura preparada para trocar por
              Supabase vector store depois.
            </p>
          </div>
        </SectionCard>
        <SectionCard title="Checkout" subtitle="Compatível com CartQL e WooCommerce.">
          <div className="flex items-start gap-3">
            <ShoppingBag className="mt-1 size-5 text-[--brand]" />
            <p className="text-sm leading-6 text-[--text-secondary]">
              Rota pronta para resolver variações por SKU e criar carrinho real
              quando as credenciais existirem.
            </p>
          </div>
        </SectionCard>
      </section>

      <ChatSimulator />
    </main>
  );
}
