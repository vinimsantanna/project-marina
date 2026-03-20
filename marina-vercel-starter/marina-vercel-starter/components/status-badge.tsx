import clsx from "clsx";

export function StatusBadge({
  children,
  tone = "neutral"
}: {
  children: React.ReactNode;
  tone?: "neutral" | "brand" | "gold" | "success";
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-wide",
        tone === "neutral" && "border-[--border-soft] bg-white text-[--text-secondary]",
        tone === "brand" && "border-[--brand] bg-[--brand-soft] text-[--brand]",
        tone === "gold" && "border-[--accent] bg-[--accent-soft] text-[--text-primary]",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700"
      )}
    >
      {children}
    </span>
  );
}
