"use server";

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

async function assertAdmin() {
  const user = await currentUser();
  if (!user || user.publicMetadata?.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

export async function markInvited(id: string) {
  await assertAdmin();
  await prisma.waitlist.update({
    where: { id },
    data: { invited: true },
  });
}

export async function setOutcome(id: string, outcome: string) {
  await assertAdmin();
  await prisma.tokenAnalysis.update({
    where: { id },
    data: { outcome, outcomeAt: new Date() },
  });
}
