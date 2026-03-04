import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { ShareButton } from "@/components/ShareButton";
import type { Metadata } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// ─── Metadata (OG image + Twitter card) ──────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { address: string };
}): Promise<Metadata> {
  const analysis = await prisma.tokenAnalysis.findFirst({
    where: { address: params.address },
    orderBy: { checkedAt: "desc" },
  });

  if (!analysis) {
    return { title: "Report not found — SPECTR" };
  }

  const label = analysis.symbol ?? analysis.name ?? params.address.slice(0, 8);
  const ogUrl = `${APP_URL}/api/og/${params.address}?verdict=${analysis.verdict}&score=${analysis.riskScore}&symbol=${encodeURIComponent(label)}`;

  return {
    title: `${label} — ${analysis.verdict} (${analysis.riskScore}/100) | SPECTR`,
    description: `Forensic analysis: ${analysis.verdict} verdict, risk score ${analysis.riskScore}/100. ${analysis.flags[0] ?? ""}`,
    openGraph: {
      title: `${label} — ${analysis.verdict} | SPECTR`,
      description: `Risk Score: ${analysis.riskScore}/100. ${analysis.flags[0] ?? "Forensic Solana token analysis."}`,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${label} — ${analysis.verdict} | SPECTR`,
      description: `Risk Score: ${analysis.riskScore}/100`,
      images: [ogUrl],
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function verdictColor(v: string) {
  if (v === "RUG") return "text-danger";
  if (v === "HIGH") return "text-danger opacity-70";
  if (v === "CAUTION") return "text-caution";
  return "text-safe";
}

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  return `${Math.floor(diff / 60000)}m ago`;
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default async function ReportPage({
  params,
}: {
  params: { address: string };
}) {
  const { address } = params;

  const analysis = await prisma.tokenAnalysis.findFirst({
    where: { address },
    orderBy: { checkedAt: "desc" },
  });

  if (!analysis) {
    notFound();
  }

  // Track view (fire-and-forget)
  prisma.reportView
    .create({ data: { address } })
    .catch(() => {});

  const label = analysis.symbol
    ? `${analysis.symbol}${analysis.name ? ` (${analysis.name})` : ""}`
    : address;

  const shareUrl = `${APP_URL}/report/${address}`;

  return (
    <div className="min-h-screen bg-bg text-primary font-mono">
      <div className="scanlines" />

      {/* Header */}
      <header className="border-b border-border px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-sm tracking-[0.2em] uppercase hover:text-sub transition-colors">
            SPECTR
          </Link>
          <Link
            href="/dashboard"
            className="text-xs text-muted hover:text-primary transition-colors tracking-widest"
          >
            → Open terminal
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Report header */}
        <div className="mb-8">
          <div className="text-muted text-xs tracking-widest uppercase mb-2">
            forensic report
          </div>
          <div className="rule-mono mb-6" />

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold tracking-tight mb-1">{label}</h1>
              <div className="text-muted text-xs font-mono break-all">{address}</div>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${verdictColor(analysis.verdict)}`}>
                {analysis.verdict}
              </div>
              <div className="text-sub text-xs mt-0.5">
                Risk Score: {analysis.riskScore}/100
              </div>
            </div>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border mb-8">
          {[
            { label: "Price", value: analysis.price ? `$${analysis.price < 0.01 ? analysis.price.toExponential(2) : analysis.price.toFixed(4)}` : "—" },
            { label: "Liquidity", value: analysis.liquidity ? `$${(analysis.liquidity / 1000).toFixed(1)}K` : "—" },
            { label: "Volume 24h", value: analysis.volume24h ? `$${(analysis.volume24h / 1000).toFixed(1)}K` : "—" },
            { label: "Top holder", value: analysis.topHolderPct ? `${analysis.topHolderPct.toFixed(1)}%` : "—" },
          ].map((m) => (
            <div key={m.label} className="bg-surface p-4">
              <div className="text-muted text-xs uppercase tracking-widest mb-1">{m.label}</div>
              <div className="text-primary text-lg font-bold">{m.value}</div>
            </div>
          ))}
        </div>

        {/* Risk flags */}
        {analysis.flags.length > 0 && (
          <section className="mb-8">
            <div className="text-sub text-xs tracking-widest uppercase mb-3">
              Risk flags ({analysis.flags.length})
            </div>
            <div className="terminal-border bg-surface divide-y divide-border">
              {analysis.flags.map((flag, i) => (
                <div key={i} className="px-4 py-3 text-sm text-sub flex items-start gap-3">
                  <span className="text-danger mt-0.5 shrink-0">▸</span>
                  <span>{flag}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Outcome (if set) */}
        {analysis.outcome && (
          <section className="mb-8">
            <div className="text-sub text-xs tracking-widest uppercase mb-3">
              Verified outcome
            </div>
            <div className="terminal-border bg-surface px-4 py-3 flex items-center justify-between">
              <span className="text-primary text-sm font-bold uppercase">{analysis.outcome}</span>
              {analysis.outcomeAt && (
                <span className="text-muted text-xs">{timeAgo(analysis.outcomeAt)}</span>
              )}
            </div>
          </section>
        )}

        {/* Scan details */}
        <section className="mb-10">
          <div className="text-sub text-xs tracking-widest uppercase mb-3">
            Scan details
          </div>
          <div className="terminal-border bg-surface px-4 py-3 text-xs text-muted space-y-1">
            <div>Chain: <span className="text-sub">SOLANA</span></div>
            <div>Scanned: <span className="text-sub">{timeAgo(analysis.checkedAt)} — {new Date(analysis.checkedAt).toISOString()}</span></div>
            <div>Engine: <span className="text-sub">GPT-4o + Helius + DEXScreener</span></div>
          </div>
        </section>

        {/* Share + CTA */}
        <div className="rule-mono mb-6" />
        <div className="flex items-center justify-between flex-wrap gap-4">
          <ShareButton url={shareUrl} />

          <Link
            href="/dashboard"
            className="text-xs text-sub hover:text-primary transition-colors tracking-widest"
          >
            → Scan another token
          </Link>
        </div>

        <div className="mt-8 text-muted text-xs text-center">
          NOT FINANCIAL ADVICE — USE AT YOUR OWN RISK
        </div>
      </div>
    </div>
  );
}

