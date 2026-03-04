import { withCache } from "./redis";

const BASE_URL = "https://public-api.birdeye.so";

interface BirdeyeHolder {
  address: string;
  amount: number;
  percentage: number;
}

interface HolderDistributionResponse {
  success: boolean;
  data: {
    items: BirdeyeHolder[];
    totalHolder: number;
  };
}

interface TokenOverviewResponse {
  success: boolean;
  data: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    price: number;
    priceChange24h: number;
    volume24h: number;
    liquidity: number;
    mc: number;
    holder: number;
    supply: number;
  };
}

export async function getHolderDistribution(address: string): Promise<{
  topHolderPct: number;
  top10HolderPct: number;
  totalHolders: number;
  holders: BirdeyeHolder[];
} | null> {
  return withCache(`birdeye:holders:${address}`, 300, async () => {
    const res = await fetch(
      `${BASE_URL}/defi/token_holder?address=${address}&limit=100`,
      {
        headers: {
          "X-API-KEY": process.env.BIRDEYE_API_KEY!,
          "x-chain": "solana",
        },
      }
    );

    if (!res.ok) return null;

    const data: HolderDistributionResponse = await res.json();
    if (!data.success || !data.data?.items) return null;

    const holders = data.data.items;
    const topHolderPct = holders[0]?.percentage || 0;
    const top10HolderPct = holders.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0);

    return {
      topHolderPct,
      top10HolderPct,
      totalHolders: data.data.totalHolder,
      holders: holders.slice(0, 10),
    };
  });
}

export async function getTokenOverview(address: string): Promise<{
  name: string;
  symbol: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  holders: number;
} | null> {
  return withCache(`birdeye:overview:${address}`, 300, async () => {
    const res = await fetch(
      `${BASE_URL}/defi/token_overview?address=${address}`,
      {
        headers: {
          "X-API-KEY": process.env.BIRDEYE_API_KEY!,
          "x-chain": "solana",
        },
      }
    );

    if (!res.ok) return null;

    const data: TokenOverviewResponse = await res.json();
    if (!data.success) return null;

    return {
      name: data.data.name,
      symbol: data.data.symbol,
      price: data.data.price,
      priceChange24h: data.data.priceChange24h,
      volume24h: data.data.volume24h,
      liquidity: data.data.liquidity,
      marketCap: data.data.mc,
      holders: data.data.holder,
    };
  });
}
