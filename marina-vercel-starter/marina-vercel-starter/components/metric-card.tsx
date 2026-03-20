export function MetricCard({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[24px] border border-[--border-soft] bg-[--surface-soft] p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-[--text-muted]">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-[--text-primary]">{value}</p>
      <p className="mt-2 text-sm text-[--text-secondary]">{detail}</p>
    </div>
  );
}
