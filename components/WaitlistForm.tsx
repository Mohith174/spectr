"use client";

import { useState } from "react";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setState("success");
      } else {
        const data = await res.json();
        setErrorMsg(data.error ?? "Something went wrong.");
        setState("error");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setState("error");
    }
  };

  if (state === "success") {
    return (
      <div className="terminal-border bg-surface px-5 py-4 text-sm text-sub max-w-md">
        <span className="text-safe mr-2">✓</span>
        You&apos;re on the list. We&apos;ll reach out when access opens.
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="flex-1 bg-surface border border-border px-4 py-3 text-sm text-primary placeholder:text-muted font-mono focus:outline-none focus:border-border-bright transition-colors"
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className="bg-primary text-bg font-bold px-6 py-3 text-xs tracking-widest uppercase hover:bg-[#d0d0d0] transition-colors disabled:opacity-50 shrink-0"
        >
          {state === "loading" ? "···" : "Join waitlist →"}
        </button>
      </form>
      {state === "error" && (
        <p className="text-danger text-xs mt-2">{errorMsg}</p>
      )}
    </div>
  );
}
