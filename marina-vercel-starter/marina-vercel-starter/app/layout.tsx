import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marina Starter",
  description: "Starter kit da Marina pronto para deploy na Vercel."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="mx-auto min-h-screen max-w-7xl px-6 py-8 lg:px-10">
          <header className="mb-8 flex flex-col gap-4 rounded-[30px] border border-[--border-soft] bg-[rgba(255,255,255,0.72)] px-6 py-5 backdrop-blur md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-display text-3xl text-[--brand]">Marina</p>
              <p className="text-sm text-[--text-secondary]">
                MVP interno · assistente de vendas · Vercel-ready
              </p>
            </div>
            <nav className="flex flex-wrap items-center gap-3 text-sm text-[--text-secondary]">
              <Link href="/" className="rounded-full px-3 py-2 hover:bg-[--surface-soft]">
                Início
              </Link>
              <Link href="/dashboard" className="rounded-full px-3 py-2 hover:bg-[--surface-soft]">
                Dashboard
              </Link>
              <a
                href="/api/health"
                className="rounded-full border border-[--border-soft] bg-white px-4 py-2 hover:border-[--accent]"
              >
                Healthcheck
              </a>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
