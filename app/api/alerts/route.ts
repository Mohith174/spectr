import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

// GET /api/alerts — list alerts for the signed-in user
export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const alerts = await prisma.alert.findMany({
    where: { userId, active: true },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ alerts });
}

// POST /api/alerts — create a new alert
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { address, symbol, condition, threshold, telegramId } = body;

  if (!address || !condition || threshold == null) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!["risk_above", "price_drop", "price_rise"].includes(condition)) {
    return Response.json({ error: "Invalid condition" }, { status: 400 });
  }

  const alert = await prisma.alert.create({
    data: {
      userId,
      address,
      symbol: symbol ?? null,
      condition,
      threshold: Number(threshold),
      telegramId: telegramId ?? null,
      active: true,
    },
  });

  return Response.json({ alert }, { status: 201 });
}

// DELETE /api/alerts?id=<alertId> — remove an alert
export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  // Ensure ownership before deleting
  const alert = await prisma.alert.findUnique({ where: { id } });
  if (!alert || alert.userId !== userId) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.alert.update({ where: { id }, data: { active: false } });
  return Response.json({ ok: true });
}
