"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────
const MAX_CHARS = 500;
const WARN_AT = 400; // show counter once input exceeds this

// ─── Command definitions ───────────────────────────────────────────────────────
const COMMANDS = [
  { cmd: "/check", description: "forensic scan a token address" },
  { cmd: "/search", description: "find tokens by name or symbol" },
  { cmd: "/help", description: "show available commands" },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────
interface TokenSuggestion {
  address: string;
  name: string;
  symbol: string;
  liquidity: number;
  priceUsd: string;
}

type SuggestionMode = "commands" | "tokens" | "none";

interface InputBarProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtLiq(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

// Detect if input is likely a raw Solana address (base58, 32-44 chars)
function looksLikeAddress(s: string): boolean {
  return /^[A-Za-z0-9]{32,44}$/.test(s.trim());
}

// ─── Component ────────────────────────────────────────────────────────────────
export function InputBar({ onSubmit, disabled }: InputBarProps) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<SuggestionMode>("none");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [tokenResults, setTokenResults] = useState<TokenSuggestion[]>([]);
  const [tokenLoading, setTokenLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus input when enabled
  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  // Dismiss on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setMode("none");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Determine mode from input ──────────────────────────────────────────────
  const fetchTokens = useCallback(async (query: string) => {
    setTokenLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data: TokenSuggestion[] = await res.json();
      setTokenResults(data);
    } catch {
      setTokenResults([]);
    } finally {
      setTokenLoading(false);
    }
  }, []);

  useEffect(() => {
    const trimmed = input.trimStart();
    clearTimeout(debounceTimer.current);

    // "/" at start → command picker
    if (trimmed === "/" || trimmed.startsWith("/") && !trimmed.includes(" ")) {
      setMode("commands");
      setSelectedIdx(0);
      return;
    }

    // "/check <query>" or "/search <query>" after a space → token search
    const afterCmd = trimmed.match(/^\/(?:check|search)\s+(.+)/i);
    if (afterCmd) {
      const query = afterCmd[1].trim();
      // Don't search if it's already a full address
      if (looksLikeAddress(query)) {
        setMode("none");
        return;
      }
      if (query.length >= 2) {
        setMode("tokens");
        setSelectedIdx(0);
        debounceTimer.current = setTimeout(() => fetchTokens(query), 280);
        return;
      }
    }

    setMode("none");
  }, [input, fetchTokens]);

  // ── Submission ────────────────────────────────────────────────────────────
  const submit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setInput("");
    setMode("none");
  };

  // ── Suggestion selection ──────────────────────────────────────────────────
  const applyCommandSuggestion = (cmd: string) => {
    setInput(`${cmd} `);
    setMode("none");
    inputRef.current?.focus();
  };

  const applyTokenSuggestion = (token: TokenSuggestion) => {
    // Replace the query after the command with the address
    const match = input.match(/^(\/(?:check|search)\s+).*/i);
    const newInput = match ? `${match[1]}${token.address}` : token.address;
    setInput(newInput);
    setMode("none");
    inputRef.current?.focus();
  };

  // ── Keyboard navigation ───────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (mode === "none") {
      if (e.key === "Enter") {
        e.preventDefault();
        submit(input);
      }
      return;
    }

    const listLength =
      mode === "commands" ? filteredCommands.length : tokenResults.length;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIdx((i) => (i + 1) % listLength);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIdx((i) => (i - 1 + listLength) % listLength);
        break;
      case "Tab":
      case "Enter":
        e.preventDefault();
        if (mode === "commands" && filteredCommands[selectedIdx]) {
          applyCommandSuggestion(filteredCommands[selectedIdx].cmd);
        } else if (mode === "tokens" && tokenResults[selectedIdx]) {
          applyTokenSuggestion(tokenResults[selectedIdx]);
        } else {
          submit(input);
        }
        break;
      case "Escape":
        e.preventDefault();
        setMode("none");
        break;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode !== "none") return; // let keydown handle
    submit(input);
  };

  // Filtered commands based on what the user has typed after "/"
  const cmdPrefix = input.trimStart().slice(1).toLowerCase();
  const filteredCommands = COMMANDS.filter((c) =>
    c.cmd.slice(1).startsWith(cmdPrefix)
  );

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative border-t border-border">
      {/* Suggestion panel — rendered ABOVE the input */}
      {mode === "commands" && filteredCommands.length > 0 && (
        <div className="border-b border-border bg-surface">
          <div className="px-6 py-1 text-xs text-muted flex items-center gap-2">
            <span>COMMANDS</span>
            <span className="text-dim">— ↑↓ navigate · Tab/↵ select · Esc dismiss</span>
          </div>
          {filteredCommands.map((c, i) => (
            <button
              key={c.cmd}
              onMouseDown={(e) => { e.preventDefault(); applyCommandSuggestion(c.cmd); }}
              className={`w-full flex items-baseline gap-4 px-6 py-1.5 text-left font-mono text-xs transition-colors ${i === selectedIdx ? "bg-raised" : "hover:bg-raised"
                }`}
            >
              <span className={`${i === selectedIdx ? "text-primary" : "text-sub"} font-bold w-16 shrink-0`}>
                {c.cmd}
              </span>
              <span className="text-muted">{c.description}</span>
            </button>
          ))}
        </div>
      )}

      {mode === "tokens" && (
        <div className="border-b border-border bg-surface">
          <div className="px-6 py-1 text-xs text-muted flex items-center gap-2">
            <span>TOKENS</span>
            {tokenLoading && <span className="text-dim animate-pulse">searching...</span>}
            {!tokenLoading && tokenResults.length === 0 && <span className="text-dim">no results</span>}
            {!tokenLoading && tokenResults.length > 0 && (
              <span className="text-dim">— ↑↓ navigate · Tab/↵ fill address · Esc dismiss</span>
            )}
          </div>
          {tokenResults.map((t, i) => (
            <button
              key={t.address}
              onMouseDown={(e) => { e.preventDefault(); applyTokenSuggestion(t); }}
              className={`w-full flex items-center gap-3 px-6 py-1.5 text-left font-mono text-xs transition-colors ${i === selectedIdx ? "bg-raised" : "hover:bg-raised"
                }`}
            >
              <span className={`font-bold w-16 shrink-0 ${i === selectedIdx ? "text-primary" : "text-sub"}`}>
                {t.symbol}
              </span>
              <span className="text-muted flex-1 truncate">{t.name}</span>
              <span className="text-dim shrink-0">{fmtLiq(t.liquidity)}</span>
              <span className="text-dim font-mono text-[10px] shrink-0">
                {t.address.slice(0, 6)}…{t.address.slice(-4)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-6 py-3">
        <span className="text-sub font-mono select-none shrink-0">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          maxLength={MAX_CHARS}
          placeholder={disabled ? "processing..." : "/ for commands · type symbol to search · or paste address"}
          className="flex-1 bg-transparent text-primary font-mono text-sm outline-none placeholder:text-dim disabled:opacity-40 disabled:cursor-not-allowed"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        {/* Character counter — shows as soon as user starts typing */}
        {input.length > 0 && (
          <span
            className={`font-mono text-xs shrink-0 tabular-nums transition-colors ${input.length >= MAX_CHARS
                ? "text-danger"
                : input.length >= WARN_AT
                  ? "text-muted"
                  : "text-dim"
              }`}
          >
            {MAX_CHARS - input.length} left
          </span>
        )}
        {input.trim() && !disabled && mode === "none" && input.length < MAX_CHARS && (
          <button
            type="submit"
            className="text-muted hover:text-sub font-mono text-xs transition-colors shrink-0"
          >
            ENTER
          </button>
        )}
      </form>

      {/* Hint bar */}
      <div className="px-6 pb-2 text-xs text-dim font-mono">
        /check &lt;address&gt; · /search &lt;symbol&gt; · type / to see all commands
      </div>
    </div>
  );
}
