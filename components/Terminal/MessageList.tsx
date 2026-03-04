"use client";

import { TokenCard } from "../TokenCard/TokenCard";
import type { TokenRiskAssessment } from "@/agents/tools";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  tokenAnalysis?: TokenRiskAssessment;
  isStreaming?: boolean;
}

interface MessageListProps {
  messages: ChatMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1 text-sm">
      {messages.map((message, idx) => (
        <div key={message.id} className="animate-fade-in">
          {message.role === "user" ? (
            // User input — terminal prompt style
            <div className="flex gap-2 py-1">
              <span className="text-sub select-none shrink-0">$</span>
              <span className="text-primary font-mono">{message.content}</span>
            </div>
          ) : (
            // Assistant output — plain stream output
            <div className="py-1">
              {/* First message gets no extra separator, subsequent ones get visual gap */}
              {idx > 0 && messages[idx - 1]?.role === "user" && (
                <div className="text-muted font-mono text-xs mb-1 select-none">
                  ──
                </div>
              )}
              <div className="font-mono text-sub whitespace-pre-wrap leading-relaxed">
                {message.content}
                {message.isStreaming && (
                  <span className="cursor-block text-primary ml-0.5" aria-hidden />
                )}
              </div>
              {message.tokenAnalysis && (
                <div className="mt-4 mb-2">
                  <TokenCard analysis={message.tokenAnalysis} />
                </div>
              )}
              {!message.isStreaming && message.content && (
                <div className="text-muted font-mono text-xs mt-1 select-none">
                  ──
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
