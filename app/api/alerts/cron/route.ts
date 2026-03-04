import { prisma } from "@/lib/db";
import { assessTokenRisk } from "@/agents/forensics";
import { sendAnalysisAlert } from "@/lib/telegram";

export const runtime = "nodejs";
export const maxDuration = 60;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function GET(req: Request) {
  // Protect cron endpoint — Vercel sends Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all active alerts
  const alerts = await prisma.alert.findMany({
    where: { active: true, telegramId: { not: null } },
  });

  if (alerts.length === 0) {
    return Response.json({ processed: 0 });
  }

  let triggered = 0;

  for (const alert of alerts) {
    try {
      const analysis = await assessTokenRisk(alert.address);

      let shouldFire = false;

      if (alert.condition === "risk_above" && analysis.riskScore >= alert.threshold) {
        shouldFire = true;
      }
      // price_drop / price_rise: compare against last recorded price
      // For MVP, only risk_above is implemented. Price alerts are V1.5.

      if (shouldFire && alert.telegramId) {
        await sendAnalysisAlert(alert.telegramId, {
          address: alert.address,
          name: analysis.name,
          symbol: analysis.symbol ?? alert.symbol,
          verdict: analysis.verdict,
          riskScore: analysis.riskScore,
          flags: analysis.flags,
          appUrl: APP_URL,
        });

        // Deactivate alert after firing (one-shot for MVP)
        await prisma.alert.update({
          where: { id: alert.id },
          data: { active: false, triggeredAt: new Date() },
        });

        triggered++;
      }
    } catch (err) {
      // Log but don't stop processing other alerts
      console.warn(`[cron] Failed to process alert ${alert.id}:`, err);
    }
  }

  return Response.json({ processed: alerts.length, triggered });
}
