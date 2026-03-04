import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const DAILY_FREE_LIMIT = 20;

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  const isPro = user?.publicMetadata?.plan === "pro";

  if (isPro) {
    return Response.json({ used: 0, limit: Infinity, isPro: true });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const used = await prisma.tokenAnalysis.count({
    where: { userId, checkedAt: { gte: today } },
  });

  return Response.json({ used, limit: DAILY_FREE_LIMIT, isPro: false });
}
