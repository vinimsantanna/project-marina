import clsx from "clsx";

export function SectionCard({
  title,
  subtitle,
  children,
  className
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={clsx(
        "rounded-[28px] border border-[--border-soft] bg-white p-6 shadow-[0_10px_30px_rgba(54,35,29,0.08)]",
        className
      )}
    >
      <header className="mb-5">
        <h2 className="font-display text-2xl text-[--text-primary]">{title}</h2>
        {subtitle ? (
          <p className="mt-2 text-sm text-[--text-muted]">{subtitle}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
