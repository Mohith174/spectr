import { withCache } from "./redis";

// ─── Helius RPC helpers ────────────────────────────────────────────────────

function rpcUrl(): string {
  return `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
}

// Standard Solana JSON-RPC (array params) and Helius enhanced (object params)
async function rpc(method: string, params: unknown): Promise<unknown> {
  try {
    const res = await fetch(rpcUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    return data.result ?? null;
  } catch {
    return null;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────

interface LargestAccountItem {
  address: string;
  amount: string;
  decimals: number;
  uiAmount: number;
  uiAmountString: string;
}

interface TokenSupplyValue {
  amount: string;
  decimals: number;
  uiAmount: number;
  uiAmountString: string;
}

interface HeliusTokenAccountsResult {
  total: number;
  limit: number;
  page: number;
  token_accounts: unknown[];
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Get holder concentration data for a Solana token.
 * Uses getTokenLargestAccounts (top 20 by balance) + getTokenSupply for percentages.
 * Uses getTokenAccounts (Helius enhanced) to get approximate total holder count.
 */
export async function getHolderDistribution(address: string): Promise<{
  topHolderPct: number;
  top10HolderPct: number;
  totalHolders: number | null;
} | null> {
  return withCache(`helius:holders:${address}`, 300, async () => {
    const [largestResult, supplyResult, accountsResult] = await Promise.all([
      rpc("getTokenLargestAccounts", [address]),
      rpc("getTokenSupply", [address]),
      rpc("getTokenAccounts", {
        mint: address,
        page: 1,
        limit: 1,
        displayOptions: { showZeroBalance: false },
      }),
    ]);

    const largest = largestResult as { value: LargestAccountItem[] } | null;
    const supply = supplyResult as { value: TokenSupplyValue } | null;

    // Both are required to compute percentages
    if (!largest?.value?.length || !supply?.value?.uiAmount) return null;

    const totalSupply = supply.value.uiAmount;
    if (totalSupply === 0) return null;

    const amounts = largest.value.map((h) => h.uiAmount);
    const topHolderPct = (amounts[0] / totalSupply) * 100;
    const top10HolderPct = amounts
      .slice(0, 10)
      .reduce((sum, amt) => sum + (amt / totalSupply) * 100, 0);

    const accounts = accountsResult as HeliusTokenAccountsResult | null;
    const totalHolders = accounts?.total ?? null;

    return { topHolderPct, top10HolderPct, totalHolders };
  });
}

/**
 * Get token name and symbol from Helius REST token-metadata endpoint.
 * Used as fallback when DEXScreener doesn't have the token.
 */
export async function getTokenMetadata(address: string): Promise<{
  name: string | null;
  symbol: string | null;
} | null> {
  return withCache(`helius:meta:${address}`, 3600, async () => {
    try {
      const res = await fetch(
        `https://api.helius.xyz/v0/token-metadata?api-key=${process.env.HELIUS_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mintAccounts: [address],
            includeOffChain: true,
            disableCache: false,
          }),
        }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const token = data?.[0];
      if (!token) return null;

      // Prefer on-chain metadata, fall back to legacy
      const name =
        token.onChainMetadata?.metadata?.data?.name ??
        token.legacyMetadata?.name ??
        null;
      const symbol =
        token.onChainMetadata?.metadata?.data?.symbol ??
        token.legacyMetadata?.symbol ??
        null;

      return { name, symbol };
    } catch {
      return null;
    }
  });
}
