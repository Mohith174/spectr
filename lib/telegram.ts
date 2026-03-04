const TELEGRAM_API = "https://api.telegram.org";

function botUrl(method: string): string {
  return `${TELEGRAM_API}/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`;
}

/**
 * Send a plain-text message to a Telegram chat ID.
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function sendMessage(
  chatId: string | number,
  text: string
): Promise<void> {
  try {
    await fetch(botUrl("sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    });
  } catch (err) {
    console.warn("[telegram] sendMessage failed:", err);
  }
}

/**
 * Send a formatted token analysis alert.
 * Produces a clean, terminal-style message in Telegram.
 */
export async function sendAnalysisAlert(
  chatId: string | number,
  opts: {
    address: string;
    name: string | null;
    symbol: string | null;
    verdict: "SAFE" | "CAUTION" | "HIGH" | "RUG";
    riskScore: number;
    flags: string[];
    appUrl?: string;
  }
): Promise<void> {
  const { address, name, symbol, verdict, riskScore, flags, appUrl } = opts;

  const verdictEmoji =
    verdict === "RUG"
      ? "🚨"
      : verdict === "HIGH"
        ? "⚠️"
        : verdict === "CAUTION"
          ? "🟡"
          : "✅";

  const tokenLabel = symbol
    ? `${symbol}${name ? ` (${name})` : ""}`
    : address.slice(0, 8) + "…" + address.slice(-6);

  const shortAddr = `${address.slice(0, 6)}…${address.slice(-6)}`;

  const flagLines =
    flags.length > 0
      ? "\n" + flags.slice(0, 4).map((f) => `  • ${f}`).join("\n")
      : "\n  No flags.";

  const reportLine = appUrl
    ? `\n\n<a href="${appUrl}/report/${address}">View full report →</a>`
    : "";

  const text =
    `${verdictEmoji} <b>SPECTR ALERT</b>\n` +
    `<code>${shortAddr}</code> — ${tokenLabel}\n\n` +
    `VERDICT: <b>${verdict}</b>  |  Risk Score: ${riskScore}/100` +
    `${flagLines}` +
    `${reportLine}`;

  await sendMessage(chatId, text);
}
