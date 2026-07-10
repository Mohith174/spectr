import { prisma } from "@/lib/db";
import { getEffectiveUser, isDemoMode } from "@/lib/demo-auth";

export const runtime = "nodejs";

const DAILY_FREE_LIMIT = 20;
const DEMO_SHARED_DAILY_LIMIT = 100;

export async function GET() {
  const { userId, isPro } = await getEffectiveUser();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isPro) {
    return Response.json({ used: 0, limit: Infinity, isPro: true });
  }

  const limit = isDemoMode ? DEMO_SHARED_DAILY_LIMIT : DAILY_FREE_LIMIT;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const used = await prisma.tokenAnalysis.count({
    where: { userId, checkedAt: { gte: today } },
  });

  return Response.json({ used, limit, isPro: false });
}
