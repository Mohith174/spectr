"use client";

import { useState } from "react";

export function ShareButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement("input");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="text-xs text-sub hover:text-primary transition-colors tracking-widest border border-border px-3 py-1.5 hover:border-border-bright"
    >
      {copied ? "✓ Copied" : "Copy link"}
    </button>
  );
}
