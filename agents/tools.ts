import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "assess_token_risk",
      description:
        "Analyze a Solana token for risk factors including holder concentration, liquidity, trading patterns, and red flags. Returns a risk score (0-100), verdict, and detailed flags.",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "The Solana token mint address to analyze",
          },
        },
        required: ["address"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_token_info",
      description:
        "Get basic information about a token including price, volume, liquidity, and market data.",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "The Solana token mint address",
          },
        },
        required: ["address"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_tokens",
      description:
        "Search for tokens by name or symbol. Returns matching tokens with basic info.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query (token name or symbol)",
          },
        },
        required: ["query"],
      },
    },
  },
];

export interface TokenRiskAssessment {
  address: string;
  name: string | null;
  symbol: string | null;
  riskScore: number;
  verdict: "SAFE" | "CAUTION" | "HIGH" | "RUG";
  flags: string[];
  topHolderPct: number | null;
  top10HolderPct: number | null;
  price: number | null;
  liquidity: number | null;
  volume24h: number | null;
  holders: number | null;
  summary: string;
}

export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
}
