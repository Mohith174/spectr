import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { email, source } = await req.json();

  if (!email || typeof email !== "string") {
    return Response.json({ error: "Valid email required" }, { status: 400 });
  }

  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    return Response.json({ error: "Invalid email address" }, { status: 400 });
  }

  try {
    await prisma.waitlist.create({
      data: { email: clean, source: source ?? "landing" },
    });
    return Response.json({ ok: true }, { status: 201 });
  } catch (err: unknown) {
    // Unique constraint = already on the list
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      return Response.json({ ok: true, duplicate: true }, { status: 200 });
    }
    console.error("[waitlist]", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  // Admin-only: return waitlist data
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const entries = await prisma.waitlist.findMany({ orderBy: { joinedAt: "desc" } });
  return Response.json({ entries, total: entries.length });
}
