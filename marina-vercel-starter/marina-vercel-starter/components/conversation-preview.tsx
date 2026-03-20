import { StatusBadge } from "@/components/status-badge";
import type { DashboardConversationRow } from "@/lib/types";

export function ConversationPreview({
  rows
}: {
  rows: DashboardConversationRow[];
}) {
  if (!rows.length) {
    return (
      <div className="rounded-[22px] border border-dashed border-[--border-medium] bg-[--surface-soft] p-5">
        <p className="font-medium text-[--text-primary]">Sem conversas persistidas ainda</p>
        <p className="mt-2 text-sm leading-6 text-[--text-secondary]">
          Assim que o webhook da Meta começar a receber mensagens reais, a inbox passa a
          refletir clientes, etapa atual e última mensagem.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div
          key={row.conversation_id}
          className="rounded-[22px] border border-[--border-soft] bg-white p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-[--text-primary]">{row.nome}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[--text-muted]">
                {row.whatsapp}
              </p>
              <p className="mt-2 text-sm text-[--text-secondary]">{row.ultima_mensagem}</p>
            </div>
            <div className="text-right">
              <StatusBadge tone={row.etapa === "checkout" ? "success" : "brand"}>
                {row.etapa}
              </StatusBadge>
              <p className="mt-2 text-xs text-[--text-muted]">{row.tempo_relativo}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
