import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isDemoMode = process.env.DEMO_MODE === "true";

const isProtected = createRouteMatcher([
  "/dashboard(.*)",
  "/admin(.*)",
  "/api/terminal(.*)",
  "/api/search(.*)",
  "/api/alerts(.*)",
  "/api/usage(.*)",
  "/api/admin(.*)",
]);

// Demo deployments run with no Clerk keys configured at all — the terminal
// is open to anyone, no sign-in wall. clerkMiddleware() would throw without
// keys, so it's never invoked in that mode.
export default isDemoMode
  ? () => NextResponse.next()
  : clerkMiddleware(async (auth, req) => {
      if (isProtected(req)) {
        await auth.protect();
      }
    });

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
