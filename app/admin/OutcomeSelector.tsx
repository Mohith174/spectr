"use client";

import { useTransition, useState } from "react";
import { setOutcome } from "./actions";

type Analysis = {
  id: string;
  address: string;
  symbol: string | null;
  verdict: string;
  riskScore: number;
  checkedAt: Date;
};

const OUTCOMES = [
  { value: "rugged", label: "Rugged" },
  { value: "dumped", label: "Dumped" },
  { value: "survived", label: "Survived" },
  { value: "mooned", label: "Mooned" },
];

export function OutcomeSelector({ analyses }: { analyses: Analysis[] }) {
  if (analyses.length === 0) {
    return (
      <p className="text-muted text-xs py-4">No pending outcomes — all caught up.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border text-muted tracking-widest uppercase">
            <th className="text-left py-2 pr-4">Token</th>
            <th className="text-left py-2 pr-4">Verdict</th>
            <th className="text-left py-2 pr-4">Score</th>
            <th className="text-left py-2 pr-4">Analyzed</th>
            <th className="text-left py-2">Mark outcome</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {analyses.map((a) => (
            <OutcomeRow key={a.id} analysis={a} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OutcomeRow({ analysis }: { analysis: Analysis }) {
  const [isPending, startTransition] = useTransition();
  const [marked, setMarked] = useState<string | null>(null);

  const handleOutcome = (value: string) => {
    startTransition(async () => {
      await setOutcome(analysis.id, value);
      setMarked(value);
    });
  };

  const verdictColor =
    analysis.verdict === "RUG"
      ? "text-danger"
      : analysis.verdict === "HIGH"
        ? "text-danger opacity-70"
        : analysis.verdict === "CAUTION"
          ? "text-caution"
          : "text-safe";

  return (
    <tr className="text-sub">
      <td className="py-2 pr-4 font-mono">
        <div className="text-primary">{analysis.symbol ?? "—"}</div>
        <div className="text-muted text-[10px] truncate max-w-[120px]">{analysis.address}</div>
      </td>
      <td className={`py-2 pr-4 font-bold ${verdictColor}`}>{analysis.verdict}</td>
      <td className="py-2 pr-4">{analysis.riskScore}/100</td>
      <td className="py-2 pr-4 text-muted">
        {new Date(analysis.checkedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}
      </td>
      <td className="py-2">
        {marked ? (
          <span className="text-safe tracking-widest uppercase">{marked}</span>
        ) : isPending ? (
          <span className="text-muted">···</span>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {OUTCOMES.map((o) => (
              <button
                key={o.value}
                onClick={() => handleOutcome(o.value)}
                disabled={isPending}
                className="text-muted hover:text-primary transition-colors tracking-widest uppercase disabled:opacity-50"
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </td>
    </tr>
  );
}
