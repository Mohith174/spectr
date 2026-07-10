import { getTokenPair, searchTokens } from "@/lib/dexscreener";
import { getHolderDistribution } from "@/lib/helius";
import { prisma } from "@/lib/db";
import type { TokenRiskAssessment, TokenInfo } from "./tools";

const MINT_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/**
 * Resolve arbitrary user input (mint address, ticker, or name) to a Solana
 * mint address. If the input already looks like a base58 mint address, it's
 * returned as-is. Otherwise, searches DEXScreener for a matching Solana pair
 * and returns the base token address of the highest-liquidity match.
 */
export async function resolveToMint(input: string): Promise<string | null> {
  if (MINT_ADDRESS_RE.test(input)) {
    return input;
  }

  const pairs = await searchTokens(input);
  const solanaPairs = pairs.filter((p) => p.chainId === "solana");
  if (solanaPairs.length === 0) return null;

  const best = solanaPairs.reduce((top, p) =>
    (p.liquidity?.usd || 0) > (top.liquidity?.usd || 0) ? p : top
  );

  return best.baseToken.address;
}

interface RiskFlag {
  flag: string;
  severity: "critical" | "high" | "medium" | "low";
  score: number;
}

function calculateRiskFlags(data: {
  topHolderPct: number | null;
  top10HolderPct: number | null;
  liquidity: number | null;
  volume24h: number | null;
  holders: number | null;
  pairAge: number | null;
  priceChange24h: number | null;
}): RiskFlag[] {
  const flags: RiskFlag[] = [];

  // Holder concentration checks
  if (data.topHolderPct !== null) {
    if (data.topHolderPct > 80) {
      flags.push({
        flag: `Top holder owns ${data.topHolderPct.toFixed(1)}% - extreme concentration`,
        severity: "critical",
        score: 40,
      });
    } else if (data.topHolderPct > 50) {
      flags.push({
        flag: `Top holder owns ${data.topHolderPct.toFixed(1)}% - high concentration`,
        severity: "high",
        score: 25,
      });
    } else if (data.topHolderPct > 30) {
      flags.push({
        flag: `Top holder owns ${data.topHolderPct.toFixed(1)}% - moderate concentration`,
        severity: "medium",
        score: 15,
      });
    }
  }

  if (data.top10HolderPct !== null && data.top10HolderPct > 90) {
    flags.push({
      flag: `Top 10 holders own ${data.top10HolderPct.toFixed(1)}% - whale dominated`,
      severity: "high",
      score: 20,
    });
  }

  // Liquidity checks
  if (data.liquidity !== null) {
    if (data.liquidity < 1000) {
      flags.push({
        flag: `Liquidity only $${data.liquidity.toFixed(0)} - extremely thin`,
        severity: "critical",
        score: 35,
      });
    } else if (data.liquidity < 10000) {
      flags.push({
        flag: `Liquidity $${(data.liquidity / 1000).toFixed(1)}K - low`,
        severity: "high",
        score: 20,
      });
    } else if (data.liquidity < 50000) {
      flags.push({
        flag: `Liquidity $${(data.liquidity / 1000).toFixed(1)}K - moderate`,
        severity: "medium",
        score: 10,
      });
    }
  }

  // Volume checks
  if (data.volume24h !== null && data.liquidity !== null) {
    const volumeToLiqRatio = data.volume24h / data.liquidity;
    if (volumeToLiqRatio > 10) {
      flags.push({
        flag: "Volume/liquidity ratio > 10x - potential wash trading",
        severity: "high",
        score: 15,
      });
    }
  }

  // Holder count
  if (data.holders !== null) {
    if (data.holders < 50) {
      flags.push({
        flag: `Only ${data.holders} holders - very early/risky`,
        severity: "high",
        score: 20,
      });
    } else if (data.holders < 200) {
      flags.push({
        flag: `${data.holders} holders - still early`,
        severity: "medium",
        score: 10,
      });
    }
  }

  // Token age
  if (data.pairAge !== null) {
    const ageInHours = data.pairAge / (1000 * 60 * 60);
    if (ageInHours < 1) {
      flags.push({
        flag: "Token less than 1 hour old",
        severity: "high",
        score: 15,
      });
    } else if (ageInHours < 24) {
      flags.push({
        flag: `Token only ${ageInHours.toFixed(0)} hours old`,
        severity: "medium",
        score: 10,
      });
    }
  }

  // Price volatility
  if (data.priceChange24h !== null) {
    if (data.priceChange24h < -50) {
      flags.push({
        flag: `Price down ${Math.abs(data.priceChange24h).toFixed(0)}% in 24h`,
        severity: "high",
        score: 15,
      });
    }
  }

  return flags;
}

function determineVerdict(
  riskScore: number,
  topHolderPct: number | null
): "SAFE" | "CAUTION" | "HIGH" | "RUG" {
  // Deterministic override: extreme holder concentration = RUG
  if (topHolderPct !== null && topHolderPct > 80) {
    return "RUG";
  }

  if (riskScore >= 70) return "RUG";
  if (riskScore >= 50) return "HIGH";
  if (riskScore >= 25) return "CAUTION";
  return "SAFE";
}

function generateSummary(
  name: string | null,
  symbol: string | null,
  verdict: string,
  flags: RiskFlag[],
  data: {
    price: number | null;
    liquidity: number | null;
    holders: number | null;
  }
): string {
  const tokenName = name || symbol || "This token";
  const criticalFlags = flags.filter((f) => f.severity === "critical");
  const highFlags = flags.filter((f) => f.severity === "high");

  let summary = "";

  if (verdict === "RUG") {
    summary = `${tokenName} shows critical red flags. `;
    if (criticalFlags.length > 0) {
      summary += criticalFlags.map((f) => f.flag).join(". ") + ". ";
    }
    summary += "High probability of rug pull. Do not buy.";
  } else if (verdict === "HIGH") {
    summary = `${tokenName} has significant risk factors. `;
    summary += highFlags
      .slice(0, 2)
      .map((f) => f.flag)
      .join(". ");
    summary += ". Exercise extreme caution.";
  } else if (verdict === "CAUTION") {
    summary = `${tokenName} shows some warning signs. `;
    if (data.liquidity && data.liquidity < 50000) {
      summary += `Liquidity is ${(data.liquidity / 1000).toFixed(1)}K. `;
    }
    summary += "DYOR before investing.";
  } else {
    summary = `${tokenName} appears relatively safe. `;
    if (data.holders) {
      summary += `${data.holders} holders. `;
    }
    if (data.liquidity) {
      summary += `$${(data.liquidity / 1000).toFixed(0)}K liquidity. `;
    }
    summary += "Standard risks still apply.";
  }

  return summary;
}

export async function assessTokenRisk(
  input: string,
  userId?: string
): Promise<TokenRiskAssessment> {
  const address = await resolveToMint(input);

  if (address === null) {
    return {
      address: input,
      name: null,
      symbol: null,
      riskScore: 0,
      verdict: "CAUTION",
      flags: [`Could not resolve '${input}' to a Solana token — provide a mint address`],
      topHolderPct: null,
      top10HolderPct: null,
      price: null,
      liquidity: null,
      volume24h: null,
      holders: null,
      summary: `Could not resolve '${input}' to a known Solana token. Provide a valid mint address or a well-known ticker/name.`,
    };
  }

  // Fetch data from both sources in parallel; handle individual failures gracefully
  const [dexData, holderData] = await Promise.all([
    getTokenPair(address).catch((err) => {
      console.warn("[forensics] getTokenPair failed:", err);
      return null;
    }),
    getHolderDistribution(address).catch((err) => {
      console.warn("[forensics] getHolderDistribution failed:", err);
      return null;
    }),
  ]);

  const name = dexData?.baseToken.name || null;
  const symbol = dexData?.baseToken.symbol || null;
  const price = dexData ? parseFloat(dexData.priceUsd) : null;
  const liquidity = dexData?.liquidity?.usd ?? null;
  const volume24h = dexData?.volume?.h24 ?? null;
  // Helius provides totalHolders via getTokenAccounts (may be null for low-liquidity tokens)
  const holders = holderData?.totalHolders ?? null;
  const topHolderPct = holderData?.topHolderPct ?? null;
  const top10HolderPct = holderData?.top10HolderPct ?? null;
  const priceChange24h = dexData?.priceChange?.h24 ?? null;
  const pairAge = dexData?.pairCreatedAt
    ? Date.now() - dexData.pairCreatedAt
    : null;

  // Calculate risk flags
  const riskFlags = calculateRiskFlags({
    topHolderPct,
    top10HolderPct,
    liquidity,
    volume24h,
    holders,
    pairAge,
    priceChange24h,
  });

  // If holder distribution data is unavailable, add an explicit flag
  if (holderData === null) {
    riskFlags.push({
      flag: "Holder distribution data unavailable — concentration risk unknown",
      severity: "medium",
      score: 10,
    });
  }

  // If no on-chain data found at all, surface it
  if (!dexData) {
    riskFlags.push({
      flag: "Token not found on DEXScreener — verify address or token may be too new",
      severity: "critical",
      score: 30,
    });
  }

  // Calculate total risk score (0-100)
  const riskScore = Math.min(
    100,
    riskFlags.reduce((sum, f) => sum + f.score, 0)
  );

  // Determine verdict
  const verdict = determineVerdict(riskScore, topHolderPct);

  // Generate summary
  const summary = generateSummary(name, symbol, verdict, riskFlags, {
    price,
    liquidity,
    holders,
  });

  const assessment: TokenRiskAssessment = {
    address,
    name,
    symbol,
    riskScore,
    verdict,
    flags: riskFlags.map((f) => f.flag),
    topHolderPct,
    top10HolderPct,
    price,
    liquidity,
    volume24h,
    holders,
    summary,
  };

  // Persist to database — wrap in try/catch to not kill the response
  try {
    await prisma.tokenAnalysis.create({
      data: {
        address,
        name,
        symbol,
        riskScore,
        verdict,
        flags: riskFlags.map((f) => f.flag),
        topHolderPct,
        price,
        liquidity,
        volume24h,
        userId: userId ?? null,
      },
    });
  } catch (dbErr) {
    console.warn("[forensics] DB write failed (non-fatal):", dbErr);
  }

  return assessment;
}

export async function getTokenInfo(input: string): Promise<TokenInfo | null> {
  const address = await resolveToMint(input);
  if (address === null) return null;

  const dexData = await getTokenPair(address);
  if (!dexData) return null;

  return {
    address,
    name: dexData.baseToken.name,
    symbol: dexData.baseToken.symbol,
    price: parseFloat(dexData.priceUsd),
    priceChange24h: dexData.priceChange?.h24 || 0,
    volume24h: dexData.volume?.h24 || 0,
    liquidity: dexData.liquidity?.usd || 0,
    marketCap: dexData.fdv || 0,
  };
}

export async function searchForTokens(query: string): Promise<TokenInfo[]> {
  const pairs = await searchTokens(query);
  return pairs
    .filter((p) => p.chainId === "solana")
    .slice(0, 5)
    .map((p) => ({
      address: p.baseToken.address,
      name: p.baseToken.name,
      symbol: p.baseToken.symbol,
      price: parseFloat(p.priceUsd),
      priceChange24h: p.priceChange?.h24 || 0,
      volume24h: p.volume?.h24 || 0,
      liquidity: p.liquidity?.usd || 0,
      marketCap: p.fdv || 0,
    }));
}
