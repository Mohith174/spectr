"use client";

import type { TokenRiskAssessment } from "@/agents/tools";
import { VerdictBadge } from "./VerdictBadge";
import { RiskBar } from "./RiskRing";
import { FlagList } from "./FlagList";

interface TokenCardProps {
  analysis: TokenRiskAssessment;
}

function fmt(num: number | null, prefix = ""): string {
  if (num === null || num === undefined) return "—";
  if (num >= 1_000_000) return `${prefix}${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${prefix}${(num / 1_000).toFixed(1)}K`;
  return `${prefix}${num.toFixed(2)}`;
}

function fmtPrice(price: number | null): string {
  if (price === null || price === undefined) return "—";
  if (price < 0.00001) return `$${price.toExponential(2)}`;
  if (price < 1) return `$${price.toFixed(6)}`;
  return `$${price.toFixed(2)}`;
}

function fmtAddr(addr: string): string {
  return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
}

export function TokenCard({ analysis }: TokenCardProps) {
  return (
    <div className="border border-border bg-surface font-mono text-sm animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="font-bold text-primary tracking-wide">
            {analysis.symbol ?? "???"}
          </span>
          <span className="text-muted text-xs">{analysis.name ?? "Unknown Token"}</span>
        </div>
        <VerdictBadge verdict={analysis.verdict} />
      </div>

      {/* Address */}
      <div className="px-4 py-1.5 border-b border-border text-xs text-muted">
        {fmtAddr(analysis.address)}
      </div>

      {/* Risk score bar */}
      <div className="px-4 py-2 border-b border-border">
        <RiskBar score={analysis.riskScore} verdict={analysis.verdict} />
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-border">
        {[
          { label: "PRICE", value: fmtPrice(analysis.price) },
          { label: "LIQUIDITY", value: fmt(analysis.liquidity, "$") },
          { label: "VOL 24H", value: fmt(analysis.volume24h, "$") },
          {
            label: "TOP HOLDER", value: analysis.topHolderPct != null ? `${analysis.topHolderPct.toFixed(1)}%` : "—",
            warn: analysis.topHolderPct != null && analysis.topHolderPct > 50
          },
          { label: "TOP10 %", value: analysis.top10HolderPct != null ? `${analysis.top10HolderPct.toFixed(1)}%` : "—" },
          { label: "HOLDERS", value: analysis.holders != null ? fmt(analysis.holders) : "—" },
        ].map(({ label, value, warn }) => (
          <div key={label} className="px-4 py-2 border-r border-b border-border last:border-r-0">
            <div className="text-xs text-muted mb-0.5">{label}</div>
            <div className={`font-mono font-medium ${warn ? "text-danger glow-danger" : "text-primary"}`}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Flags */}
      {analysis.flags.length > 0 && (
        <div className="border-b border-border">
          <FlagList flags={analysis.flags} />
        </div>
      )}

      {/* Summary */}
      <div className="px-4 py-3 text-xs text-sub leading-relaxed">
        {analysis.summary}
      </div>
    </div>
  );
}
