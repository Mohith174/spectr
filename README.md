# SPECTR

Forensic analysis terminal for Solana tokens. Paste a mint address, get a risk verdict — not a chart, not a vibe check, an actual breakdown of holder concentration, liquidity depth, and known rug patterns.

## What it does

- **`/check <address>`** — pulls live on-chain + market data (holder distribution via Helius, pricing/liquidity via Birdeye and Dexscreener) and runs it through a deterministic risk-scoring engine (`agents/forensics.ts`): holder concentration, liquidity depth, volume anomalies, pair age.
- An LLM agent (`agents/terminal.ts`) sits on top as the terminal interface — it decides which tool to call (`assess_token_risk`, `get_token_info`, `search_tokens`) based on what you type, then narrates the verdict in a fixed, no-nonsense format. The scoring itself is not LLM-guessed; the model calls a tool and reports what the tool returns.
- Risk verdicts: `SAFE` / `CAUTION` / `HIGH` / `RUG`, each with a 0–100 score and the specific flags that drove it.
- Optional Telegram alerts: connect a chat ID and get pinged when a watched token's risk score crosses your threshold (`app/api/alerts/cron`, checked on a schedule).
- Accounts (Clerk), a Pro tier (Stripe), and a small admin panel for tracking prediction accuracy over time (did a token flagged `RUG` actually rug?).

## Architecture

```
User input ("check <address>")
        │
        ▼
Terminal agent (agents/terminal.ts) ──tool call──▶ Forensics engine (agents/forensics.ts)
        │                                                   │
        │                                    Helius (holders) · Dexscreener/Birdeye (price, liquidity)
        │                                                   │
        ◀──────────────── verdict + flags ──────────────────┘
        │
        ▼
Streamed response to terminal UI, persisted to Postgres (Prisma) for the accuracy dashboard
```

## Stack

Next.js (App Router) · TypeScript · Clerk (auth) · Prisma + Postgres · Upstash Redis · Stripe · Helius / Birdeye / Dexscreener (Solana data) · Telegram Bot API

The chat/tool-calling layer runs on an OpenAI-compatible endpoint, currently wired to [NVIDIA NIM](https://build.nvidia.com/) (`meta/llama-3.1-8b-instruct`) rather than a paid provider — same `tools`-calling contract, no API cost.

## Running locally

```bash
npm install
npm run dev
```

Requires a `.env.local` with `DATABASE_URL`, `DIRECT_URL` (Postgres/Prisma), `UPSTASH_REDIS_REST_URL`/`TOKEN`, Clerk keys, `NVIDIA_API_KEY`, `HELIUS_API_KEY`, and Stripe keys if testing checkout. Set `DEMO_MODE=true` to disable real Stripe checkout and the Telegram webhook (useful for a public demo deployment without touching billing or bot traffic).
