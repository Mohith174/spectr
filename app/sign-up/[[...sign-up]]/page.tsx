"use client";

import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

function AppleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.54 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09z" />
      <path d="M15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
    </svg>
  );
}

type Step = "form" | "verify";

export default function SignUpPage() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();

  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"apple" | "google" | null>(null);

  // Step 1 — Create account
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError("");
    setLoading(true);

    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "errors" in err
          ? (err as { errors: Array<{ message: string }> }).errors[0]?.message
          : "Sign up failed. Please try again.";
      setError(msg ?? "Sign up failed.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — Verify email code
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError("");
    setLoading(true);

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/dashboard");
      } else {
        setError("Verification incomplete. Try again.");
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "errors" in err
          ? (err as { errors: Array<{ message: string }> }).errors[0]?.message
          : "Invalid code. Please try again.";
      setError(msg ?? "Invalid code.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "oauth_apple" | "oauth_google") => {
    if (!isLoaded) return;
    setOauthLoading(provider === "oauth_apple" ? "apple" : "google");
    try {
      await signUp.authenticateWithRedirect({
        strategy: provider,
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectUrlComplete: "/dashboard",
      });
    } catch {
      setError("OAuth sign-up failed. Try again.");
      setOauthLoading(null);
    }
  };

  const resendCode = async () => {
    if (!isLoaded) return;
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
    } catch {
      setError("Could not resend code.");
    }
  };

  return (
    <div className="min-h-screen bg-bg text-primary font-mono flex flex-col">
      <div className="scanlines" />

      <header className="border-b border-border px-6 py-3">
        <Link href="/" className="font-bold text-sm tracking-[0.2em] uppercase hover:text-sub transition-colors">
          SPECTR
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

          {step === "form" ? (
            <>
              <div className="mb-8">
                <div className="text-muted text-xs tracking-widest uppercase mb-1">spectr //</div>
                <h1 className="text-lg tracking-widest uppercase">Create account</h1>
                <p className="text-sub text-xs mt-2">Free tier: 20 token scans / day</p>
              </div>

              <div className="rule-mono mb-8" />

              {/* OAuth */}
              <div className="space-y-2 mb-8">
                <button
                  onClick={() => handleOAuth("oauth_apple")}
                  disabled={!!oauthLoading}
                  className="w-full flex items-center justify-center gap-3 border border-border-bright bg-surface px-4 py-3 text-sm text-primary hover:bg-raised transition-colors disabled:opacity-50"
                >
                  <AppleIcon />
                  <span className="tracking-wide">
                    {oauthLoading === "apple" ? "Redirecting···" : "Continue with Apple"}
                  </span>
                </button>
                <button
                  onClick={() => handleOAuth("oauth_google")}
                  disabled={!!oauthLoading}
                  className="w-full flex items-center justify-center gap-3 border border-border bg-surface px-4 py-3 text-sm text-sub hover:bg-raised hover:text-primary transition-colors disabled:opacity-50"
                >
                  <GoogleIcon />
                  <span className="tracking-wide">
                    {oauthLoading === "google" ? "Redirecting···" : "Continue with Google"}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-3 mb-8">
                <div className="flex-1 rule-mono" />
                <span className="text-muted text-xs tracking-widest">OR</span>
                <div className="flex-1 rule-mono" />
              </div>

              {/* Email form */}
              <form onSubmit={handleSignUp} className="space-y-3">
                <div>
                  <label className="block text-xs text-muted tracking-widest uppercase mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-surface border border-border px-4 py-3 text-sm text-primary placeholder:text-muted font-mono focus:outline-none focus:border-border-bright transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted tracking-widest uppercase mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="min. 8 characters"
                    className="w-full bg-surface border border-border px-4 py-3 text-sm text-primary placeholder:text-muted font-mono focus:outline-none focus:border-border-bright transition-colors"
                  />
                </div>

                {error && (
                  <p className="text-danger text-xs py-2 border-l-2 border-danger pl-3">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-bg font-bold py-3 text-xs tracking-widest uppercase hover:bg-[#d0d0d0] transition-colors disabled:opacity-50 mt-2"
                >
                  {loading ? "CREATING ACCOUNT···" : "CREATE ACCOUNT →"}
                </button>
              </form>
            </>
          ) : (
            <>
              {/* Email verification step */}
              <div className="mb-8">
                <div className="text-muted text-xs tracking-widest uppercase mb-1">spectr //</div>
                <h1 className="text-lg tracking-widest uppercase">Verify email</h1>
                <p className="text-sub text-xs mt-2">
                  Code sent to <span className="text-primary">{email}</span>
                </p>
              </div>

              <div className="rule-mono mb-8" />

              <form onSubmit={handleVerify} className="space-y-3">
                <div>
                  <label className="block text-xs text-muted tracking-widest uppercase mb-1.5">
                    Verification code
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="6-digit code"
                    maxLength={6}
                    className="w-full bg-surface border border-border px-4 py-3 text-sm text-primary placeholder:text-muted font-mono focus:outline-none focus:border-border-bright transition-colors tracking-[0.5em] text-center"
                  />
                </div>

                {error && (
                  <p className="text-danger text-xs py-2 border-l-2 border-danger pl-3">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-bg font-bold py-3 text-xs tracking-widest uppercase hover:bg-[#d0d0d0] transition-colors disabled:opacity-50"
                >
                  {loading ? "VERIFYING···" : "VERIFY →"}
                </button>
              </form>

              <div className="mt-6 text-center text-xs text-muted">
                Didn&apos;t receive it?{" "}
                <button onClick={resendCode} className="text-sub hover:text-primary transition-colors">
                  Resend code
                </button>
              </div>
            </>
          )}

          <div className="rule-mono my-8" />

          <div className="text-center space-y-2 text-xs text-muted">
            {step === "form" && (
              <div>
                Already have access?{" "}
                <Link href="/sign-in" className="text-sub hover:text-primary transition-colors">
                  Sign in →
                </Link>
              </div>
            )}
            <div>
              <Link href="/" className="hover:text-sub transition-colors">← Back to home</Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border px-6 py-3 text-center text-muted text-xs">
        NOT FINANCIAL ADVICE — USE AT YOUR OWN RISK
      </footer>
    </div>
  );
}
