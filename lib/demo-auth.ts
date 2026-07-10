import { auth, currentUser } from "@clerk/nextjs/server";

export const isDemoMode = process.env.DEMO_MODE === "true";

const DEMO_USER_ID = "demo-anon";

// In demo mode there's no login wall — every visitor shares one bucket for
// rate limiting and alerts. Outside demo mode, this defers to real Clerk auth.
export async function getEffectiveUser(): Promise<{ userId: string | null; isPro: boolean }> {
  if (isDemoMode) {
    return { userId: DEMO_USER_ID, isPro: false };
  }

  const { userId } = await auth();
  if (!userId) return { userId: null, isPro: false };

  const user = await currentUser();
  return { userId, isPro: user?.publicMetadata?.plan === "pro" };
}
