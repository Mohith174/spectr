import { withCache } from "./redis";

const BASE_URL = "https://api.dexscreener.com/latest";

export interface TokenPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  txns: {
    h24: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    m5: { buys: number; sells: number };
  };
  volume: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  priceChange: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv: number;
  pairCreatedAt: number;
}

export interface DexscreenerResponse {
  schemaVersion: string;
  pairs: TokenPair[] | null;
}

export async function getTokenPair(address: string): Promise<TokenPair | null> {
  return withCache(`dex:pair:${address}`, 300, async () => {
    const res = await fetch(`${BASE_URL}/dex/tokens/${address}`);
    if (!res.ok) return null;

    const data: DexscreenerResponse = await res.json();
    if (!data.pairs || data.pairs.length === 0) return null;

    // Return the pair with highest liquidity
    return data.pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
  });
}

export async function searchTokens(query: string): Promise<TokenPair[]> {
  return withCache(`dex:search:${query}`, 300, async () => {
    const res = await fetch(`${BASE_URL}/dex/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];

    const data: DexscreenerResponse = await res.json();
    return data.pairs || [];
  });
}

export async function getTrending(): Promise<TokenPair[]> {
  return withCache("dex:trending:solana", 120, async () => {
    // Dexscreener doesn't have a direct trending endpoint,
    // but we can use their boosted tokens as a proxy
    const res = await fetch("https://api.dexscreener.com/token-boosts/top/v1");
    if (!res.ok) return [];

    const data = await res.json();
    // Filter for Solana tokens
    return (data || []).filter((t: { chainId: string }) => t.chainId === "solana").slice(0, 10);
  });
}
