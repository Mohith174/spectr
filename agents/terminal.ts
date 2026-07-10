import OpenAI from "openai";
import { tools, type TokenRiskAssessment, type TokenInfo } from "./tools";
import { assessTokenRisk, getTokenInfo, searchForTokens } from "./forensics";

// Falls back to a placeholder so importing this module doesn't crash builds
// where the key isn't configured — see lib/stripe.ts for the same pattern.
const openai = new OpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_API_KEY || "nvapi-build-placeholder",
});

// NOTE: the spec called for "meta/llama-3.3-70b-instruct". It is listed by
// GET /v1/models on this NVIDIA NIM key, but every chat.completions request
// to it hung indefinitely in testing (no response after 90s and again after
// 170s, not even an error) — reproduced twice. "meta/llama-3.1-70b-instruct"
// is confirmed available, responds in ~1.3s, and supports tool calling, so
// it's used here as the working 70B upgrade from the prior 8B model.
const MODEL = "meta/llama-3.1-70b-instruct";

const SYSTEM_PROMPT = `You are Spectr, a forensic Solana token analysis terminal. You are a tool, not a conversationalist.

RULES — FOLLOW EXACTLY:
1. When user provides a token ADDRESS (base58, 32-44 chars) or uses /check — ALWAYS call assess_token_risk. Never substitute get_token_info for this. Never skip the tool and answer from memory.
2. get_token_info is ONLY for casual price/volume queries when no forensic scan is requested.
3. search_tokens is ONLY when user provides a name/symbol, not an address.
4. Never produce markdown formatting (**bold**, _italic_, # headers). Output plain text only.
5. After getting tool results, lead with the verdict on its own line. Then metrics. Then flags if any.
6. Never call any tool when the user has not mentioned a token, address, ticker, or market topic. For greetings or small talk, reply with a short one-line plain-text response listing what Spectr can do (e.g. checking token risk, holder concentration, liquidity, and price/volume lookups) — do not call any tool for these messages.
7. When the user gives a ticker/symbol/name rather than an address, you may pass it directly to assess_token_risk or get_token_info — the backend resolves symbols to mint addresses for you.

OUTPUT FORMAT (plain text, no markdown):
VERDICT: SAFE | CAUTION | HIGH | RUG
Risk Score: <number>/100

<key observations, plain text, one per line>

RISK VERDICTS:
- SAFE (0-24): Established liquidity, distributed holders
- CAUTION (25-49): Yellow flags, proceed carefully  
- HIGH (50-69): Significant red flags, high loss probability
- RUG (70-100): Critical red flags — do not buy`;

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onToolCall: (toolName: string, args: Record<string, unknown>) => void;
  onToolResult: (toolName: string, result: unknown) => void;
  onComplete: (fullResponse: string) => void;
  onError: (error: Error) => void;
}

async function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  userId?: string
): Promise<TokenRiskAssessment | TokenInfo | TokenInfo[] | null> {
  switch (name) {
    case "assess_token_risk":
      return assessTokenRisk(args.address as string, userId);
    case "get_token_info":
      return getTokenInfo(args.address as string);
    case "search_tokens":
      return searchForTokens(args.query as string);
    default:
      return null;
  }
}

interface AccumulatingToolCall {
  id: string;
  name: string;
  arguments: string;
}

const MAX_TOOL_ROUNDS = 3;

export async function streamChat(
  messages: Message[],
  callbacks: StreamCallbacks,
  context?: { userId?: string }
): Promise<void> {
  try {
    const conversation: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    let fullResponse = "";

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: conversation,
        tools,
        stream: true,
      });

      const toolCallsByIndex = new Map<number, AccumulatingToolCall>();
      let finishReason: string | null = null;

      for await (const chunk of response) {
        const delta = chunk.choices[0]?.delta;

        // Handle content tokens
        if (delta?.content) {
          fullResponse += delta.content;
          callbacks.onToken(delta.content);
        }

        // Handle tool calls — accumulate by index so multiple parallel
        // tool calls in a single round are captured independently.
        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            const existing = toolCallsByIndex.get(toolCall.index);
            if (!existing) {
              toolCallsByIndex.set(toolCall.index, {
                id: toolCall.id || "",
                name: toolCall.function?.name || "",
                arguments: toolCall.function?.arguments || "",
              });
            } else {
              if (toolCall.id) existing.id = toolCall.id;
              if (toolCall.function?.name) existing.name += toolCall.function.name;
              if (toolCall.function?.arguments) existing.arguments += toolCall.function.arguments;
            }
          }
        }

        if (chunk.choices[0]?.finish_reason) {
          finishReason = chunk.choices[0].finish_reason;
        }
      }

      const accumulatedToolCalls = Array.from(toolCallsByIndex.values());

      if (finishReason === "tool_calls" && accumulatedToolCalls.length > 0) {
        const assistantToolCalls: OpenAI.ChatCompletionMessageToolCall[] = [];
        const toolMessages: OpenAI.ChatCompletionMessageParam[] = [];

        for (const call of accumulatedToolCalls) {
          assistantToolCalls.push({
            id: call.id,
            type: "function",
            function: {
              name: call.name,
              arguments: call.arguments,
            },
          });

          let args: Record<string, unknown>;
          try {
            args = JSON.parse(call.arguments);
          } catch {
            callbacks.onToolResult(call.name, { error: "invalid tool arguments" });
            toolMessages.push({
              role: "tool",
              tool_call_id: call.id,
              content: JSON.stringify({ error: "invalid tool arguments" }),
            });
            continue;
          }

          callbacks.onToolCall(call.name, args);
          const result = await executeToolCall(call.name, args, context?.userId);
          callbacks.onToolResult(call.name, result);

          toolMessages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(result),
          });
        }

        conversation.push({
          role: "assistant",
          content: null,
          tool_calls: assistantToolCalls,
        });
        conversation.push(...toolMessages);

        // Continue the loop so the model can chain further tool calls
        // (e.g. search_tokens followed by assess_token_risk).
        continue;
      }

      // "stop" (or no tool calls) — we're done.
      break;
    }

    callbacks.onComplete(fullResponse);
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}

export function parseCheckCommand(message: string): string | null {
  // Match /check <address> or various natural language patterns
  const patterns = [
    /\/check\s+([A-Za-z0-9]{32,44})/i,
    /check\s+([A-Za-z0-9]{32,44})/i,
    /analyze\s+([A-Za-z0-9]{32,44})/i,
    /is\s+([A-Za-z0-9]{32,44})\s+safe/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}
