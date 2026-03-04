import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg text-primary font-mono flex flex-col">
      <div className="scanlines" />

      <header className="border-b border-border px-6 py-3">
        <Link href="/" className="font-bold text-sm tracking-[0.2em] uppercase hover:text-sub transition-colors">
          SPECTR
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-lg w-full">
          <div className="terminal-border bg-surface p-8">
            <div className="text-muted text-xs tracking-widest uppercase mb-6">
              spectr // system error
            </div>

            <div className="rule-mono mb-6" />

            <div className="text-danger font-bold text-sm mb-2">
              ERROR 404 — NOT FOUND
            </div>
            <div className="text-sub text-sm mb-6 leading-relaxed">
              The address you entered does not resolve to any known route
              in this terminal. It may have been moved, deleted, or never
              existed.
            </div>

            <div className="text-muted text-xs mb-6 space-y-1 pl-2 border-l border-border">
              <div>If you were looking for a token report, verify the</div>
              <div>address and run <span className="text-sub">/check &lt;address&gt;</span> first.</div>
            </div>

            <div className="rule-mono mb-6" />

            <div className="flex flex-col gap-2 text-sm">
              <Link
                href="/dashboard"
                className="text-primary hover:text-sub transition-colors"
              >
                → Open terminal
              </Link>
              <Link
                href="/"
                className="text-muted hover:text-sub transition-colors"
              >
                → Back to home
              </Link>
              <Link
                href="/accuracy"
                className="text-muted hover:text-sub transition-colors"
              >
                → Accuracy leaderboard
              </Link>
            </div>
          </div>

          <div className="mt-4 text-center text-muted text-xs">
            NOT FINANCIAL ADVICE — USE AT YOUR OWN RISK
          </div>
        </div>
      </main>
    </div>
  );
}
