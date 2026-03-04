"use client";

type Verdict = "SAFE" | "CAUTION" | "HIGH" | "RUG";

const BAR_CHARS = 20; // total width of progress bar

function buildBar(score: number): string {
  const filled = Math.round((score / 100) * BAR_CHARS);
  const empty = BAR_CHARS - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

interface RiskBarProps {
  score: number;
  verdict?: Verdict;
  label?: string;
  className?: string;
}

export function RiskBar({
  score,
  verdict,
  label = "RISK SCORE",
  className = "",
}: RiskBarProps) {
  const bar = buildBar(score);
  // Determine danger based on score, assuming a threshold for "HIGH" or "RUG" if verdict is no longer a prop
  // For this example, let's assume scores above 75 are "danger"
  const isDanger = score > 75 || verdict === "HIGH" || verdict === "RUG";
  const isRug = score > 90 || verdict === "RUG";

  return (
    <div className={`font-mono text-xs flex items-center gap-3 ${className}`}>
      <span className="text-muted select-none shrink-0">{label}</span>
      <span className={isDanger ? (isRug ? "text-danger glow-danger" : "text-sub") : "text-muted"}>
        {bar}
      </span>
      <span className={`font-bold tabular-nums ${isDanger ? (isRug ? "text-danger" : "text-sub") : "text-muted"}`}>
        {score}/100
      </span>
    </div>
  );
}

// Keep old export name to avoid breaking anything
export { RiskBar as RiskRing };
