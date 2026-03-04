"use client";

type Verdict = "SAFE" | "CAUTION" | "HIGH" | "RUG";

const VERDICT_CONFIG: Record<Verdict, { label: string; className: string }> = {
  SAFE: { label: "[ SAFE ]", className: "text-safe   border-safe" },
  CAUTION: { label: "[ CAUTION ]", className: "text-caution border-caution" },
  HIGH: { label: "[ HIGH RISK ]", className: "text-sub     border-border-bright" },
  RUG: { label: "[ ⚠ RUG PULL ]", className: "text-danger  border-danger glow-danger" },
};

interface VerdictBadgeProps {
  verdict: Verdict;
}

export function VerdictBadge({ verdict }: VerdictBadgeProps) {
  const { label, className } = VERDICT_CONFIG[verdict];
  return (
    <span
      className={`font-mono text-xs font-bold border px-2 py-0.5 tracking-wider ${className}`}
    >
      {label}
    </span>
  );
}
