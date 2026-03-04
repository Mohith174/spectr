import { prisma } from "@/lib/db";
import { clerkClient } from "@clerk/nextjs/server";
import { WaitlistTable } from "./WaitlistTable";
import { OutcomeSelector } from "./OutcomeSelector";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    waitlistEntries,
    waitlistInvited,
    totalAnalyses,
    todayAnalyses,
    pendingOutcomes,
    resolvedOutcomes,
  ] = await Promise.all([
    prisma.waitlist.findMany({ orderBy: { joinedAt: "desc" }, take: 200 }),
    prisma.waitlist.count({ where: { invited: true } }),
    prisma.tokenAnalysis.count(),
    prisma.tokenAnalysis.count({ where: { checkedAt: { gte: today } } }),
    prisma.tokenAnalysis.findMany({
      where: { outcome: null, checkedAt: { lt: oneDayAgo } },
      orderBy: { checkedAt: "desc" },
      take: 50,
      select: {
        id: true,
        address: true,
        symbol: true,
        verdict: true,
        riskScore: true,
        checkedAt: true,
      },
    }),
    prisma.tokenAnalysis.count({ where: { outcome: { not: null } } }),
  ]);

  const clerk = await clerkClient();
  const { totalCount: totalUsers } = await clerk.users.getUserList({ limit: 1 });

  const waitlistTotal = waitlistEntries.length;
  const pendingInvites = waitlistTotal - waitlistInvited;

  const stats = [
    { label: "Waitlist", value: waitlistTotal.toLocaleString(), sub: `${pendingInvites} pending invite` },
    { label: "Total users", value: totalUsers.toLocaleString(), sub: "Clerk accounts" },
    { label: "Total scans", value: totalAnalyses.toLocaleString(), sub: `${todayAnalyses} today` },
    { label: "Outcomes set", value: resolvedOutcomes.toLocaleString(), sub: `${pendingOutcomes.length} pending` },
  ];

  return (
    <div className="space-y-12">
      {/* Stats */}
      <div>
        <div className="text-muted text-xs tracking-widest uppercase mb-6">Overview</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
          {stats.map((s) => (
            <div key={s.label} className="bg-surface px-5 py-4">
              <div className="text-2xl font-bold text-primary mb-1">{s.value}</div>
              <div className="text-xs text-muted tracking-widest uppercase">{s.label}</div>
              <div className="text-xs text-sub mt-1">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending outcomes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="text-muted text-xs tracking-widest uppercase">
            Pending outcomes
          </div>
          <span className="text-muted text-xs">{pendingOutcomes.length} items</span>
        </div>
        <div className="terminal-border bg-surface p-4">
          <OutcomeSelector analyses={pendingOutcomes} />
        </div>
      </div>

      {/* Waitlist */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="text-muted text-xs tracking-widest uppercase">
            Waitlist
          </div>
          <span className="text-muted text-xs">{waitlistTotal} entries · {waitlistInvited} invited</span>
        </div>
        <div className="terminal-border bg-surface p-4">
          <WaitlistTable entries={waitlistEntries} />
        </div>
      </div>
    </div>
  );
}
