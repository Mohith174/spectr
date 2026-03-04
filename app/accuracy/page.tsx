import { prisma } from "@/lib/db";

// ─── Data fetching ────────────────────────────────────────────────────────

async function getAccuracyData() {
  const [
    totalAnalyses,
    verdictGroups,
    outcomeCount,
    recentAnalyses,
    correctPredictions,
  ] = await Promise.all([
    prisma.tokenAnalysis.count(),
    prisma.tokenAnalysis.groupBy({
      by: ["verdict"],
      _count: { verdict: true },
    }),
    prisma.tokenAnalysis.count({
      where: { outcome: { not: null } },
    }),
    prisma.tokenAnalysis.findMany({
      orderBy: { checkedAt: "desc" },
      take: 20,
      select: {
        address: true,
        name: true,
        symbol: true,
        verdict: true,
        riskScore: true,
        checkedAt: true,
        outcome: true,
      },
    }),
    // Correct = RUG predicted and rugged, or SAFE predicted and survived
    prisma.tokenAnalysis.count({
      where: {
        outcome: { not: null },
        OR: [
          { verdict: "RUG", outcome: "rugged" },
          { verdict: "SAFE", outcome: "survived" },
          { verdict: "CAUTION", outcome: "survived" },
          { verdict: "HIGH", outcome: "rugged" },
          { verdict: "HIGH", outcome: "dumped" },
        ],
      },
    }),
  ]);

  const verdictMap: Record<string, number> = {};
  for (const g of verdictGroups) {
    verdictMap[g.verdict] = g._count.verdict;
  }

  const accuracyRate =
    outcomeCount > 0
      ? Math.round((correctPredictions / outcomeCount) * 100)
      : null;

  return {
    totalAnalyses,
    verdictMap,
    outcomeCount,
    correctPredictions,
    accuracyRate,
    recentAnalyses,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function verdictColor(verdict: string): string {
  if (verdict === "RUG") return "text-danger";
  if (verdict === "HIGH") return "text-danger opacity-70";
  if (verdict === "CAUTION") return "text-caution";
  return "text-safe";
}

function asciiBar(count: number, total: number, width = 20): string {
  if (total === 0) return "░".repeat(width);
  const filled = Math.round((count / total) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function timeAgo(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay > 0) return `${diffDay}d ago`;
  if (diffHr > 0) return `${diffHr}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return "just now";
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default async function AccuracyPage() {
  const data = await getAccuracyData();
  const {
    totalAnalyses,
    verdictMap,
    outcomeCount,
    accuracyRate,
    recentAnalyses,
  } = data;

  const verdictOrder = ["RUG", "HIGH", "CAUTION", "SAFE"] as const;

  return (
    <div className="min-h-screen bg-bg text-primary font-mono">
      {/* Scanlines overlay */}
      <div className="scanlines" />

      <div className="max-w-4xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="mb-10">
          <div className="text-muted text-xs mb-1 tracking-widest uppercase">
            spectr // accuracy engine
          </div>
          <div className="rule-mono mb-6" />
          <h1 className="text-2xl text-primary tracking-tight">
            PREDICTION ACCURACY
          </h1>
          <p className="text-sub text-sm mt-2 max-w-xl">
            Every{" "}
            <span className="text-primary">/check</span> command generates a
            proprietary data point. We track outcomes against predictions to
            continuously improve our forensic model.
          </p>
        </div>

        {/* Headline stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border mb-10">
          <StatBox
            label="Analyses"
            value={totalAnalyses.toLocaleString()}
            sub="total predictions"
          />
          <StatBox
            label="Outcomes tracked"
            value={outcomeCount.toLocaleString()}
            sub={`of ${totalAnalyses.toLocaleString()} predictions`}
          />
          <StatBox
            label="Accuracy rate"
            value={accuracyRate !== null ? `${accuracyRate}%` : "—"}
            sub={
              accuracyRate !== null
                ? "verified correct"
                : "building moat"
            }
            highlight={accuracyRate !== null && accuracyRate >= 70}
          />
          <StatBox
            label="Status"
            value={outcomeCount > 0 ? "LIVE" : "SEEDING"}
            sub={
              outcomeCount > 0
                ? "outcomes resolving"
                : "awaiting first outcome"
            }
          />
        </div>

        {/* Verdict distribution */}
        <section className="mb-10">
          <div className="text-sub text-xs tracking-widest uppercase mb-3">
            Verdict Distribution
          </div>
          <div className="terminal-border bg-surface p-4 space-y-3">
            {verdictOrder.map((v) => {
              const count = verdictMap[v] ?? 0;
              const pct =
                totalAnalyses > 0
                  ? Math.round((count / totalAnalyses) * 100)
                  : 0;
              return (
                <div key={v} className="flex items-center gap-4 text-sm">
                  <span
                    className={`w-16 shrink-0 font-bold ${verdictColor(v)}`}
                  >
                    {v}
                  </span>
                  <span className="text-dim font-mono text-xs w-48 shrink-0">
                    {asciiBar(count, totalAnalyses)}
                  </span>
                  <span className="text-sub text-xs w-8 text-right">
                    {pct}%
                  </span>
                  <span className="text-muted text-xs">
                    ({count.toLocaleString()})
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Accuracy pending state */}
        {outcomeCount === 0 && (
          <section className="mb-10">
            <div className="terminal-border border-dim bg-surface p-6 text-center">
              <div className="text-muted text-xs tracking-widest uppercase mb-3">
                Accuracy Tracking
              </div>
              <div className="text-sub text-sm leading-relaxed max-w-md mx-auto">
                Outcome data populates automatically as tokens resolve.
                <br />
                A RUG prediction is verified when the token rugs.
                <br />
                A SAFE prediction is verified at 30/60/90 day marks.
                <br />
                <br />
                <span className="text-muted">
                  {totalAnalyses > 0
                    ? `${totalAnalyses.toLocaleString()} predictions in the dataset. Outcomes pending.`
                    : "No predictions yet. Run /check on any token to start building the moat."}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Recent predictions */}
        {recentAnalyses.length > 0 && (
          <section className="mb-10">
            <div className="text-sub text-xs tracking-widest uppercase mb-3">
              Recent Predictions
            </div>
            <div className="terminal-border overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_80px_60px_80px_80px] gap-2 px-4 py-2 bg-raised text-muted text-xs tracking-widest uppercase border-b border-border">
                <span>Token</span>
                <span>Verdict</span>
                <span className="text-right">Score</span>
                <span className="text-right">Outcome</span>
                <span className="text-right">When</span>
              </div>

              {recentAnalyses.map((a, i) => (
                <div
                  key={a.address + i}
                  className="grid grid-cols-[1fr_80px_60px_80px_80px] gap-2 px-4 py-2 border-b border-border last:border-0 hover:bg-surface transition-colors text-sm"
                >
                  {/* Token */}
                  <div className="min-w-0">
                    <span className="text-primary">
                      {a.symbol || shortAddr(a.address)}
                    </span>
                    {a.name && a.symbol && (
                      <span className="text-muted ml-2 text-xs truncate">
                        {a.name}
                      </span>
                    )}
                    {!a.symbol && (
                      <span className="text-muted ml-2 text-xs font-mono">
                        {shortAddr(a.address)}
                      </span>
                    )}
                  </div>

                  {/* Verdict */}
                  <span className={`font-bold text-xs ${verdictColor(a.verdict)}`}>
                    {a.verdict}
                  </span>

                  {/* Risk score */}
                  <span className="text-right text-sub text-xs">
                    {a.riskScore}
                  </span>

                  {/* Outcome */}
                  <span className="text-right text-xs">
                    {a.outcome ? (
                      <span className="text-sub">{a.outcome}</span>
                    ) : (
                      <span className="text-muted">pending</span>
                    )}
                  </span>

                  {/* Time */}
                  <span className="text-right text-muted text-xs">
                    {timeAgo(a.checkedAt)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state — no predictions yet */}
        {recentAnalyses.length === 0 && (
          <section className="mb-10">
            <div className="terminal-border bg-surface p-8 text-center">
              <div className="text-muted text-sm">
                No predictions yet.
                <br />
                <span className="text-dim">
                  Run{" "}
                  <a href="/dashboard" className="text-sub hover:text-primary transition-colors underline">
                    /check &lt;token_address&gt;
                  </a>{" "}
                  to start building the moat.
                </span>
              </div>
            </div>
          </section>
        )}

        {/* How it works */}
        <section>
          <div className="text-sub text-xs tracking-widest uppercase mb-3">
            How The Moat Works
          </div>
          <div className="terminal-border bg-surface p-4 text-sub text-sm leading-relaxed space-y-2">
            <p>
              Every <span className="text-primary">/check</span> command
              generates a proprietary prediction stored in our dataset.
            </p>
            <p>
              We track the <span className="text-primary">outcome</span> field
              against each prediction: did the token rug, survive, or dump?
            </p>
            <p>
              This feedback loop lets us continuously improve accuracy, discover
              new risk patterns, and — unlike any competitor — publish verified
              prediction performance.
            </p>
            <p className="text-muted text-xs pt-2">
              Outcome values: <code>rugged</code> · <code>survived</code> ·{" "}
              <code>dumped</code> · <code>mooned</code>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── StatBox component ────────────────────────────────────────────────────

function StatBox({
  label,
  value,
  sub,
  highlight = false,
}: {
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-surface p-4">
      <div className="text-muted text-xs tracking-widest uppercase mb-1">
        {label}
      </div>
      <div
        className={`text-2xl font-bold tracking-tight ${
          highlight ? "text-safe" : "text-primary"
        }`}
      >
        {value}
      </div>
      <div className="text-muted text-xs mt-1">{sub}</div>
    </div>
  );
}
