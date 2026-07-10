"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { UserButton } from "@clerk/nextjs";
import { MessageList, type ChatMessage } from "@/components/Terminal/MessageList";
import { InputBar } from "@/components/Terminal/InputBar";
import { ToolStatus } from "@/components/Terminal/ToolStatus";
import type { TokenRiskAssessment } from "@/agents/tools";

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// ─── Alert command parsing ────────────────────────────────────────────────

function parseAlertCommand(
  content: string
): { action: "add" | "list" | "remove"; address?: string; threshold?: number; id?: string } | null {
  const lower = content.trim().toLowerCase();

  if (lower === "/alert list" || lower === "/alerts") {
    return { action: "list" };
  }

  const addMatch = content.match(/\/alert\s+add\s+([A-Za-z0-9]{32,44})\s+(\d+)/i);
  if (addMatch) {
    return { action: "add", address: addMatch[1], threshold: parseInt(addMatch[2]) };
  }

  const removeMatch = content.match(/\/alert\s+(?:remove|delete|rm)\s+(\S+)/i);
  if (removeMatch) {
    return { action: "remove", id: removeMatch[1] };
  }

  return null;
}

// ─── Component ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "SPECTR v0.1 — Solana token intelligence terminal.\n" +
        "Type /check <address> to scan any Solana token for risk factors.\n" +
        "Type /alert add <address> <risk_threshold> to set a Telegram alert.\n" +
        "Type /help for all commands.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  const [toolComplete, setToolComplete] = useState(false);
  const [usage, setUsage] = useState<{ used: number; limit: number; isPro: boolean } | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch usage on mount
  useEffect(() => {
    fetch("/api/usage")
      .then((r) => r.json())
      .then((data) => setUsage(data))
      .catch(() => {});
  }, []);

  const addSystemMessage = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "assistant", content },
    ]);
  }, []);

  const handleAlertCommand = useCallback(
    async (
      content: string,
      parsed: { action: "add" | "list" | "remove"; address?: string; threshold?: number; id?: string }
    ) => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "user", content },
      ]);

      if (parsed.action === "list") {
        try {
          const res = await fetch("/api/alerts");
          const { alerts } = await res.json();
          if (!alerts || alerts.length === 0) {
            addSystemMessage("No active alerts. Use /alert add <address> <risk_score> to create one.");
          } else {
            const lines = alerts.map(
              (a: { id: string; address: string; symbol?: string; condition: string; threshold: number }) =>
                `[${a.id.slice(-6)}] ${a.symbol ?? a.address.slice(0, 8) + "…"} — ${a.condition} ${a.threshold}`
            );
            addSystemMessage("Active alerts:\n" + lines.join("\n") + "\n\nUse /alert remove <id> to delete.");
          }
        } catch {
          addSystemMessage("ERROR: Failed to fetch alerts.");
        }
        return;
      }

      if (parsed.action === "add") {
        const telegramId = prompt(
          "Enter your Telegram Chat ID to receive alerts.\n\n" +
          "Get it by messaging @KodavatiCryptBot and sending /start."
        );
        try {
          const res = await fetch("/api/alerts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              address: parsed.address,
              condition: "risk_above",
              threshold: parsed.threshold,
              telegramId: telegramId?.trim() ?? null,
            }),
          });
          if (res.ok) {
            addSystemMessage(
              `Alert set: notify when ${parsed.address?.slice(0, 8)}… risk score > ${parsed.threshold}.\n` +
              (telegramId ? "Telegram notifications enabled." : "No Telegram ID provided — alert will be logged only.")
            );
          } else {
            const data = await res.json();
            addSystemMessage(`ERROR: ${data.error}`);
          }
        } catch {
          addSystemMessage("ERROR: Failed to create alert.");
        }
        return;
      }

      if (parsed.action === "remove" && parsed.id) {
        try {
          const res = await fetch(`/api/alerts?id=${parsed.id}`, { method: "DELETE" });
          if (res.ok) {
            addSystemMessage(`Alert ${parsed.id} removed.`);
          } else {
            addSystemMessage("ERROR: Alert not found or already removed.");
          }
        } catch {
          addSystemMessage("ERROR: Failed to remove alert.");
        }
        return;
      }
    },
    [addSystemMessage]
  );

  const handleSubmit = async (content: string) => {
    // Intercept local commands
    const alertParsed = parseAlertCommand(content);
    if (alertParsed) {
      await handleAlertCommand(content, alertParsed);
      return;
    }

    // /upgrade command
    if (content.trim().toLowerCase() === "/upgrade") {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "user", content },
      ]);
      setUpgrading(true);
      try {
        const res = await fetch("/api/stripe/checkout", { method: "POST" });
        const { url } = await res.json();
        if (url) window.location.href = url;
        else addSystemMessage("ERROR: Could not start checkout. Try again.");
      } catch {
        addSystemMessage("ERROR: Could not start checkout. Try again.");
      } finally {
        setUpgrading(false);
      }
      return;
    }

    // /help command
    if (content.trim().toLowerCase() === "/help") {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "user", content },
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "Available commands:\n\n" +
            "/check <address>         — full forensic token scan\n" +
            "/alert add <addr> <N>    — alert when risk score > N\n" +
            "/alert list              — list your active alerts\n" +
            "/alert remove <id>       — remove an alert\n" +
            "/accuracy                — view prediction track record\n" +
            "/upgrade                 — unlock unlimited scans\n" +
            "/help                    — show this message\n\n" +
            "Or just ask in plain English: 'is [address] safe?'",
        },
      ]);
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setCurrentTool(null);
    setToolComplete(false);

    const assistantId = (Date.now() + 1).toString();
    let fullContent = "";
    let tokenAnalysis: TokenRiskAssessment | undefined;

    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", isStreaming: true },
    ]);

    try {
      const response = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messages.filter((m) => m.id !== "welcome"),
            userMessage,
          ].map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (response.status === 429) {
        const data = await response.json();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: `LIMIT: ${data.error}\n\nType /upgrade to unlock unlimited scans.`,
                  isStreaming: false,
                }
              : m
          )
        );
        return;
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            switch (data.type) {
              case "token":
                fullContent += data.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: fullContent, isStreaming: true }
                      : m
                  )
                );
                break;
              case "tool_call":
                setCurrentTool(data.tool);
                setToolComplete(false);
                break;
              case "tool_result":
                setToolComplete(true);
                if (data.tool === "assess_token_risk" && data.result) {
                  tokenAnalysis = data.result as TokenRiskAssessment;
                  // Refresh usage count after a successful scan
                  fetch("/api/usage")
                    .then((r) => r.json())
                    .then((d) => setUsage(d))
                    .catch(() => {});
                }
                break;
              case "done":
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: fullContent, isStreaming: false, tokenAnalysis }
                      : m
                  )
                );
                setCurrentTool(null);
                break;
              case "error":
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: `ERROR: ${data.message}`, isStreaming: false }
                      : m
                  )
                );
                break;
            }
          } catch {
            // skip invalid JSON
          }
        }
      }
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: `ERROR: ${error instanceof Error ? error.message : "Unknown error"}`,
                isStreaming: false,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      setCurrentTool(null);
    }
  };

  const usageColor =
    usage?.isPro
      ? "text-safe"
      : usage && usage.used >= usage.limit
        ? "text-danger"
        : usage && usage.used >= usage.limit * 0.8
          ? "text-caution"
          : "text-muted";

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      {/* Header */}
      <header className="border-b border-border px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-mono font-bold text-sm tracking-[0.2em] text-primary uppercase">
              SPECTR
            </h1>
            <span className="text-xs text-muted font-mono tracking-widest">v0.1</span>
            <span className="text-muted font-mono">|</span>
            <span className="text-xs text-muted font-mono">SOLANA</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            {usage?.isPro ? (
              <span className={usageColor}>PRO — unlimited</span>
            ) : usage ? (
              <span className={usageColor}>
                {usage.used}/{usage.limit} today
                {usage.used >= usage.limit && (
                  <button
                    onClick={() => handleSubmit("/upgrade")}
                    className="ml-2 text-primary underline hover:text-sub"
                  >
                    upgrade
                  </button>
                )}
              </span>
            ) : null}
            {isLoading ? (
              <span className="text-sub animate-pulse">PROCESSING</span>
            ) : (
              <span className="text-muted">READY</span>
            )}
            {!isDemoMode && (
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-6 h-6",
                  },
                }}
              />
            )}
          </div>
        </div>
      </header>

      {/* Terminal body */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <MessageList messages={messages} />
        <div ref={messagesEndRef} />

        {currentTool && (
          <div className="px-6 py-1 border-t border-border">
            <ToolStatus toolName={currentTool} isComplete={toolComplete} />
          </div>
        )}

        <InputBar onSubmit={handleSubmit} disabled={isLoading || upgrading} />
      </main>

      {/* Status bar */}
      <footer className="border-t border-border px-6 py-1.5">
        <div className="flex items-center justify-between text-xs text-muted font-mono">
          <span>NOT FINANCIAL ADVICE — USE AT YOUR OWN RISK</span>
          <span>LLAMA 3.1 + DEXSCREENER + HELIUS</span>
        </div>
      </footer>
    </div>
  );
}
