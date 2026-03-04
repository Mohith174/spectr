/**
 * Mark the outcome of a token analysis prediction.
 * Updates the most recent token_analyses record for the given address.
 *
 * Usage:
 *   npx tsx scripts/mark-outcome.ts <address> <outcome>
 *
 * Outcomes: rugged | survived | dumped | mooned
 *
 * Example:
 *   npx tsx scripts/mark-outcome.ts EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v rugged
 */

import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

// Load .env.local
config({ path: resolve(process.cwd(), ".env.local") });

const VALID_OUTCOMES = ["rugged", "survived", "dumped", "mooned"] as const;
type Outcome = (typeof VALID_OUTCOMES)[number];

async function main() {
  const [address, outcome] = process.argv.slice(2);

  if (!address || !outcome) {
    console.error("Usage: npx tsx scripts/mark-outcome.ts <address> <outcome>");
    console.error(`Outcomes: ${VALID_OUTCOMES.join(" | ")}`);
    process.exit(1);
  }

  if (!VALID_OUTCOMES.includes(outcome as Outcome)) {
    console.error(`Invalid outcome "${outcome}". Must be: ${VALID_OUTCOMES.join(" | ")}`);
    process.exit(1);
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DIRECT_URL } },
  });

  try {
    // Find the most recent analysis for this address
    const record = await prisma.tokenAnalysis.findFirst({
      where: { address },
      orderBy: { checkedAt: "desc" },
    });

    if (!record) {
      console.error(`No analysis found for address: ${address}`);
      console.error("Run /check on the token first.");
      process.exit(1);
    }

    if (record.outcome) {
      console.log(`\nExisting outcome: ${record.outcome}`);
      console.log("Overwriting...");
    }

    const updated = await prisma.tokenAnalysis.update({
      where: { id: record.id },
      data: {
        outcome: outcome as Outcome,
        outcomeAt: new Date(),
      },
    });

    console.log("\n✓ Outcome recorded:");
    console.log(`  Address : ${updated.address}`);
    console.log(`  Token   : ${updated.symbol ?? updated.name ?? "unknown"}`);
    console.log(`  Verdict : ${updated.verdict} (${updated.riskScore}/100)`);
    console.log(`  Outcome : ${updated.outcome}`);
    console.log(`  At      : ${updated.outcomeAt?.toISOString()}`);
    console.log(`\n  Prediction was ${updated.verdict === "RUG" && outcome === "rugged" ? "✓ CORRECT" :
      updated.verdict === "SAFE" && outcome === "survived" ? "✓ CORRECT" :
      updated.verdict === "HIGH" && (outcome === "rugged" || outcome === "dumped") ? "✓ CORRECT" :
      "✗ INCORRECT"}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
