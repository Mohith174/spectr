"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

// Handles OAuth redirects back from Apple/Google.
// Clerk automatically reads the callback params and completes the sign-in/sign-up flow.
export default function SSOCallbackPage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center font-mono">
      <div className="text-muted text-xs tracking-widest animate-pulse">
        AUTHENTICATING···
      </div>
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
