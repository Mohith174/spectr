import OpenAI from "openai";
import { tools, type TokenRiskAssessment, type TokenInfo } from "./tools";
import { assessTokenRisk, getTokenInfo, searchForTokens } from "./forensics";

// Falls back to a placeholder so importing this module doesn't crash builds
// where the key isn't configured — see lib/stripe.ts for the same pattern.
const openai = new OpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_API_KEY || "nvapi-build-placeholder",
});

const MODEL = "meta/llama-3.1-8b-instruct";

const SYSTEM_PROMPT = `You are Spectr, a forensic Solana token analysis terminal. You are a tool, not a conversationalist.

RULES — FOLLOW EXACTLY:
1. When user provides a token ADDRESS (base58, 32-44 chars) or uses /check — ALWAYS call assess_token_risk. Never substitute get_token_info for this. Never skip the tool and answer from memory.
2. get_token_info is ONLY for casual price/volume queries when no forensic scan is requested.
3. search_tokens is ONLY when user provides a name/symbol, not an address.
4. Never produce markdown formatting (**bold**, _italic_, # headers). Output plain text only.
5. After getting tool results, lead with the verdict on its own line. Then metrics. Then flags if any.

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

export async function streamChat(
  messages: Message[],
  callbacks: StreamCallbacks,
  context?: { userId?: string }
): Promise<void> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      tools,
      stream: true,
    });

    let fullResponse = "";
    let currentToolCall: {
      id: string;
      name: string;
      arguments: string;
    } | null = null;

    for await (const chunk of response) {
      const delta = chunk.choices[0]?.delta;

      // Handle content tokens
      if (delta?.content) {
        fullResponse += delta.content;
        callbacks.onToken(delta.content);
      }

      // Handle tool calls
      if (delta?.tool_calls) {
        for (const toolCall of delta.tool_calls) {
          if (toolCall.id) {
            // New tool call starting
            currentToolCall = {
              id: toolCall.id,
              name: toolCall.function?.name || "",
              arguments: toolCall.function?.arguments || "",
            };
          } else if (currentToolCall && toolCall.function?.arguments) {
            // Accumulating arguments
            currentToolCall.arguments += toolCall.function.arguments;
          }
        }
      }

      // Check if tool call is complete (finish_reason)
      if (chunk.choices[0]?.finish_reason === "tool_calls" && currentToolCall) {
        const args = JSON.parse(currentToolCall.arguments);
        callbacks.onToolCall(currentToolCall.name, args);

        // Execute the tool
        const result = await executeToolCall(currentToolCall.name, args, context?.userId);
        callbacks.onToolResult(currentToolCall.name, result);

        // Continue conversation with tool result
        const toolResultMessages: OpenAI.ChatCompletionMessageParam[] = [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
          {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: currentToolCall.id,
                type: "function",
                function: {
                  name: currentToolCall.name,
                  arguments: currentToolCall.arguments,
                },
              },
            ],
          },
          {
            role: "tool",
            tool_call_id: currentToolCall.id,
            content: JSON.stringify(result),
          },
        ];

        // Get the final response after tool execution
        const followUp = await openai.chat.completions.create({
          model: MODEL,
          messages: toolResultMessages,
          stream: true,
        });

        for await (const followUpChunk of followUp) {
          const content = followUpChunk.choices[0]?.delta?.content;
          if (content) {
            fullResponse += content;
            callbacks.onToken(content);
          }
        }

        currentToolCall = null;
      }
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
