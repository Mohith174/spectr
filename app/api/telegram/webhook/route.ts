import { sendMessage } from "@/lib/telegram";

export const runtime = "nodejs";

// Telegram sends POST to this webhook when users message the bot.
// Register this URL with Telegram once deployed:
// https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-domain.com/api/telegram/webhook

interface TelegramUpdate {
  message?: {
    chat: { id: number; first_name?: string };
    text?: string;
    from?: { id: number; first_name?: string; username?: string };
  };
}

export async function POST(req: Request) {
  try {
    const update: TelegramUpdate = await req.json();
    const message = update.message;

    if (!message) return Response.json({ ok: true });

    const chatId = message.chat.id;
    const text = message.text?.trim() ?? "";
    const firstName = message.from?.first_name ?? "trader";

    if (text === "/start" || text.startsWith("/start ")) {
      await sendMessage(
        chatId,
        `<b>SPECTR // @KodavatiCryptBot</b>\n\n` +
        `Your Telegram Chat ID is:\n<code>${chatId}</code>\n\n` +
        `Copy this ID and paste it into SPECTR when setting up an alert.\n\n` +
        `Once connected, you'll receive real-time alerts when a token's risk score crosses your threshold.\n\n` +
        `<i>Run /check on any token at spectr.gg</i>`
      );
    } else if (text === "/help") {
      await sendMessage(
        chatId,
        `<b>SPECTR Alert Bot</b>\n\n` +
        `/start — Get your Chat ID for alert setup\n\n` +
        `To set up alerts, go to the SPECTR terminal and run:\n` +
        `<code>/alert add &lt;token_address&gt; &lt;risk_threshold&gt;</code>`
      );
    } else {
      await sendMessage(
        chatId,
        `Hi ${firstName}. Send /start to get your Chat ID for SPECTR alerts.`
      );
    }
  } catch (err) {
    console.warn("[telegram/webhook] error:", err);
  }

  // Always return 200 — Telegram will retry on non-200
  return Response.json({ ok: true });
}
