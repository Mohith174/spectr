"use client";

const SEVERITY_PREFIX: Record<string, string> = {
  critical: "!! ",
  high: "▲  ",
  medium: "▸  ",
  low: "·  ",
};

// Flags come as plain strings from forensics — parse severity from content heuristically
function getPrefix(flag: string): string {
  const lower = flag.toLowerCase();
  if (lower.includes("extreme") || lower.includes("critical") || lower.includes("rug")) {
    return SEVERITY_PREFIX.critical;
  }
  if (lower.includes("high") || lower.includes("only") || lower.includes("thin") || lower.includes("wash")) {
    return SEVERITY_PREFIX.high;
  }
  if (lower.includes("moderate") || lower.includes("early") || lower.includes("still") || lower.includes("some")) {
    return SEVERITY_PREFIX.medium;
  }
  return SEVERITY_PREFIX.low;
}

interface FlagListProps {
  flags: string[];
}

export function FlagList({ flags }: FlagListProps) {
  return (
    <div className="px-4 py-2 space-y-0.5 font-mono text-xs">
      <div className="text-muted mb-1">FLAGS</div>
      {flags.map((flag, i) => {
        const prefix = getPrefix(flag);
        const isCritical = prefix === SEVERITY_PREFIX.critical;
        const isHigh = prefix === SEVERITY_PREFIX.high;
        return (
          <div
            key={i}
            className={`flex gap-1 ${isCritical ? "text-danger" : isHigh ? "text-sub" : "text-muted"}`}
          >
            <span className="select-none shrink-0">{prefix}</span>
            <span>{flag}</span>
          </div>
        );
      })}
    </div>
  );
}
