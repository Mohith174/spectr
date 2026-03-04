import { searchTokens } from "@/lib/dexscreener";

export const runtime = "nodejs";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
        return Response.json([]);
    }

    try {
        const pairs = await searchTokens(q);
        const results = pairs
            .filter((p) => p.chainId === "solana")
            .slice(0, 6)
            .map((p) => ({
                address: p.baseToken.address,
                name: p.baseToken.name,
                symbol: p.baseToken.symbol,
                liquidity: p.liquidity?.usd ?? 0,
                priceUsd: p.priceUsd,
            }));

        return Response.json(results);
    } catch {
        return Response.json([]);
    }
}
