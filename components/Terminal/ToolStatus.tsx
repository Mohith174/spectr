"use client";

import { useEffect, useState } from "react";

const SPINNER_FRAMES = ["/", "—", "\\", "|"];

const TOOL_LABELS: Record<string, string> = {
  assess_token_risk: "FORENSIC SCAN",
  get_token_info: "FETCHING TOKEN DATA",
  search_tokens: "SEARCHING REGISTRY",
};

interface ToolStatusProps {
  toolName: string;
  isComplete: boolean;
}

export function ToolStatus({ toolName, isComplete }: ToolStatusProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (isComplete) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % SPINNER_FRAMES.length), 120);
    return () => clearInterval(id);
  }, [isComplete]);

  const label = TOOL_LABELS[toolName] ?? toolName.toUpperCase().replace(/_/g, " ");

  return (
    <div className="flex items-center gap-2 font-mono text-xs text-muted py-1">
      <span className="text-sub w-4 text-center select-none">
        {isComplete ? "✓" : SPINNER_FRAMES[frame]}
      </span>
      <span>{label}</span>
      {isComplete ? (
        <span className="text-sub ml-1">— DONE</span>
      ) : (
        <span className="progress-pulse">...</span>
      )}
    </div>
  );
}
