import { Database, FileText, MessageCircleMore, ShieldCheck } from "lucide-react";
import { ConversationPreview } from "@/components/conversation-preview";
import { MetricCard } from "@/components/metric-card";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { getDashboardSnapshot } from "@/lib/persistence";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const snapshot = await getDashboardSnapshot();

  return (
    <main className="space-y-8">
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Conversas abertas"
          value={String(snapshot.openConversations)}
          detail="Leitura real de conversas persistidas no banco."
        />
        <MetricCard
          label="Etapa dominante"
          value={snapshot.criticalStage}
          detail="Espelho do estágio mais frequente entre as conversas recentes."
        />
        <MetricCard
          label="Mensagens"
          value={String(snapshot.totalMessages)}
          detail="Total de mensagens persistidas para auditoria operacional."
        />
        <MetricCard
          label="Modo atual"
          value={snapshot.modeLabel}
          detail="Indica se o projeto está só em starter ou já usando banco/canal real."
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          title="Inbox operacional"
          subtitle="Conversas recentes persistidas pelo webhook do WhatsApp."
        >
          <ConversationPreview rows={snapshot.rows} />
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            title="Checklist da etapa 1"
            subtitle="O mínimo para o webhook da Meta operar com rastreabilidade."
          >
            <div className="space-y-4">
              <Item
                icon={<ShieldCheck className="size-4 text-[--brand]" />}
                title="Credenciais do canal"
                text="Configure verify token, access token, phone number id e app secret da Meta no ambiente."
              />
              <Item
                icon={<Database className="size-4 text-[--brand]" />}
                title="Persistência"
                text="A rota já grava cliente, conversa, mensagem, evento e snapshot do carrinho quando o Supabase estiver ativo."
              />
              <Item
                icon={<MessageCircleMore className="size-4 text-[--brand]" />}
                title="Webhook oficial"
                text="O endpoint já responde ao GET de verificação da Meta e aceita payload oficial no POST."
              />
              <Item
                icon={<FileText className="size-4 text-[--brand]" />}
                title="Painel mínimo"
                text="O dashboard agora lê conversas reais do banco; sem banco configurado, ele entra em fallback vazio."
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Status de prontidão"
            subtitle="Base entregue nesta etapa."
          >
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone="success">Webhook Meta</StatusBadge>
              <StatusBadge tone="success">Persistência</StatusBadge>
              <StatusBadge tone="success">Inbox real</StatusBadge>
              <StatusBadge tone="brand">Redis opcional</StatusBadge>
              <StatusBadge tone="gold">Checkout ainda parcial</StatusBadge>
            </div>
          </SectionCard>
        </div>
      </section>
    </main>
  );
}

function Item({
  icon,
  title,
  text
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[20px] border border-[--border-soft] bg-[--surface-soft] p-4">
      <div className="flex items-start gap-3">
        <div className="mt-1">{icon}</div>
        <div>
          <p className="font-medium text-[--text-primary]">{title}</p>
          <p className="mt-1 text-sm leading-6 text-[--text-secondary]">{text}</p>
        </div>
      </div>
    </div>
  );
}
