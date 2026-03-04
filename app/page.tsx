import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { WaitlistForm } from "@/components/WaitlistForm";

export default function Home() {
  return (
    <div className="min-h-screen bg-bg text-primary font-mono flex flex-col">
      <div className="scanlines" />

      {/* Header */}
      <header className="border-b border-border px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm tracking-[0.2em] uppercase">SPECTR</span>
            <span className="text-muted text-xs">v0.1</span>
            <span className="text-muted">|</span>
            <span className="text-muted text-xs">SOLANA</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <Link href="/accuracy" className="text-sub hover:text-primary transition-colors">
              Accuracy
            </Link>
            <SignedIn>
              <Link
                href="/dashboard"
                className="border border-border-bright text-primary px-3 py-1 hover:bg-surface transition-colors tracking-widest uppercase text-xs"
              >
                Terminal →
              </Link>
            </SignedIn>
            <SignedOut>
              <Link
                href="/sign-in"
                className="text-sub hover:text-primary transition-colors"
              >
                Sign in
              </Link>
            </SignedOut>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-6 py-20 md:py-28">
          <div className="text-muted text-xs tracking-widest uppercase mb-6">
            spectr // solana token intelligence
          </div>

          {/* Terminal demo block */}
          <div className="terminal-border bg-surface p-6 mb-12 max-w-2xl">
            <div className="text-muted text-xs mb-4">
              <span className="text-sub">SPECTR</span> v0.1 — Solana token intelligence terminal.
            </div>
            <div className="text-sub text-sm mb-3">
              <span className="text-muted mr-2">›</span>
              /check EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
            </div>
            <div className="text-muted text-xs mb-3 pl-4 space-y-1">
              <div>├─ fetching holder distribution via Helius</div>
              <div>├─ fetching market data via DEXScreener</div>
              <div>└─ running forensic analysis</div>
            </div>
            <div className="pl-4 text-sm space-y-1">
              <div>
                <span className="text-danger font-bold">VERDICT: RUG</span>
                {"  "}
                <span className="text-muted text-xs">Risk Score: 87/100</span>
              </div>
              <div className="text-sub text-xs pt-1">
                Top holder owns 91.3% — extreme concentration
              </div>
              <div className="text-sub text-xs">
                Liquidity $2.1K — extremely thin
              </div>
              <div className="text-sub text-xs">
                Token only 2 hours old
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary inline-block animate-blink" />
              <span className="text-muted text-xs">type a command</span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-primary mb-4 leading-tight">
            Know before you buy.
          </h1>
          <p className="text-sub text-base max-w-xl mb-10 leading-relaxed">
            SPECTR is a forensic token intelligence terminal for Solana traders.
            Instant rug detection, holder analysis, and risk scoring — in plain
            English, before you lose money.
          </p>

          <SignedOut>
            <div className="space-y-4 max-w-md">
              <WaitlistForm />
              <div className="text-xs text-muted">
                Already have access?{" "}
                <Link href="/sign-in" className="text-sub hover:text-primary transition-colors">
                  Sign in →
                </Link>
              </div>
            </div>
          </SignedOut>
          <SignedIn>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="bg-primary text-bg font-bold px-6 py-3 text-sm tracking-widest uppercase hover:bg-[#d0d0d0] transition-colors"
              >
                Open terminal →
              </Link>
              <Link
                href="/accuracy"
                className="text-sub text-sm hover:text-primary transition-colors"
              >
                View accuracy data
              </Link>
            </div>
          </SignedIn>
        </section>

        {/* Features */}
        <section className="border-t border-border">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <div className="text-muted text-xs tracking-widest uppercase mb-10">
              Command set
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
              {[
                {
                  cmd: "/check <address>",
                  desc: "Full forensic scan. Holder concentration, liquidity depth, age analysis, wash trading detection. Risk score 0–100.",
                },
                {
                  cmd: "/alert add <address>",
                  desc: "Set a risk threshold alert. Get notified on Telegram the moment a token's risk score crosses your limit.",
                },
                {
                  cmd: "/watchlist",
                  desc: "Track all tokens you've analyzed. Ranked by risk score so you always know what's hot and what's dangerous.",
                },
                {
                  cmd: "/accuracy",
                  desc: "Our full prediction track record. Every call we've made, every outcome tracked. No competitor can show you this.",
                },
              ].map((f) => (
                <div key={f.cmd} className="bg-surface p-6">
                  <div className="text-primary text-sm font-bold mb-2 tracking-tight">
                    {f.cmd}
                  </div>
                  <div className="text-sub text-xs leading-relaxed">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust / Moat section */}
        <section className="border-t border-border">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="text-muted text-xs tracking-widest uppercase mb-4">
                  The moat
                </div>
                <h2 className="text-xl font-bold tracking-tight mb-4">
                  Every scan builds our accuracy dataset.
                </h2>
                <p className="text-sub text-sm leading-relaxed mb-6">
                  Every{" "}
                  <span className="text-primary">/check</span> you run generates
                  a proprietary data point. We track outcomes against our
                  predictions — did the token rug, survive, or dump? This
                  feedback loop makes our model more accurate over time.
                </p>
                <Link
                  href="/accuracy"
                  className="text-primary text-sm hover:text-sub transition-colors"
                >
                  View accuracy leaderboard →
                </Link>
              </div>
              <div className="terminal-border bg-surface p-6 text-xs space-y-2 text-sub">
                <div className="text-muted tracking-widest uppercase mb-3">
                  Risk verdicts
                </div>
                {[
                  { verdict: "SAFE", range: "0–24", desc: "Established liquidity, distributed holders" },
                  { verdict: "CAUTION", range: "25–49", desc: "Yellow flags, proceed carefully" },
                  { verdict: "HIGH", range: "50–69", desc: "Significant red flags, high loss probability" },
                  { verdict: "RUG", range: "70–100", desc: "Critical flags — do not buy" },
                ].map((v) => (
                  <div key={v.verdict} className="flex items-start gap-3">
                    <span
                      className={`font-bold w-16 shrink-0 ${
                        v.verdict === "RUG"
                          ? "text-danger"
                          : v.verdict === "HIGH"
                            ? "text-danger opacity-70"
                            : v.verdict === "CAUTION"
                              ? "text-caution"
                              : "text-safe"
                      }`}
                    >
                      {v.verdict}
                    </span>
                    <span className="text-muted">{v.range}</span>
                    <span>{v.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border">
          <div className="max-w-5xl mx-auto px-6 py-16 text-center">
            <div className="text-muted text-xs tracking-widest uppercase mb-4">
              Early access
            </div>
            <h2 className="text-xl font-bold tracking-tight mb-3">
              Be first in line.
            </h2>
            <p className="text-sub text-sm mb-8 max-w-sm mx-auto">
              SPECTR is rolling out to early users first.
              Join the waitlist and we&apos;ll notify you when access opens.
            </p>
            <SignedOut>
              <div className="flex justify-center">
                <div className="w-full max-w-md">
                  <WaitlistForm />
                </div>
              </div>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="inline-block bg-primary text-bg font-bold px-8 py-3 text-sm tracking-widest uppercase hover:bg-[#d0d0d0] transition-colors"
              >
                Open terminal →
              </Link>
            </SignedIn>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-muted">
          <span>SPECTR © 2026</span>
          <span>NOT FINANCIAL ADVICE — USE AT YOUR OWN RISK</span>
        </div>
      </footer>
    </div>
  );
}
