/**
 * Register the Telegram bot webhook URL with Telegram's API.
 * Run this once after deploying to production.
 *
 * Usage:
 *   npx tsx scripts/register-telegram-webhook.ts <production-url>
 *
 * Example:
 *   npx tsx scripts/register-telegram-webhook.ts https://spectr.vercel.app
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const domain = process.argv[2];

  if (!domain) {
    console.error("Usage: npx tsx scripts/register-telegram-webhook.ts <production-url>");
    console.error("Example: npx tsx scripts/register-telegram-webhook.ts https://spectr.vercel.app");
    process.exit(1);
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN not found in .env.local");
    process.exit(1);
  }

  const webhookUrl = `${domain.replace(/\/$/, "")}/api/telegram/webhook`;
  const apiUrl = `https://api.telegram.org/bot${token}/setWebhook`;

  console.log(`\nRegistering webhook...`);
  console.log(`  Bot token : ${token.slice(0, 10)}...`);
  console.log(`  Webhook   : ${webhookUrl}\n`);

  const res = await fetch(`${apiUrl}?url=${encodeURIComponent(webhookUrl)}`);
  const data = await res.json();

  if (data.ok) {
    console.log("✓ Webhook registered successfully.");
    console.log(`\nTo verify, run:`);
    console.log(`  npx tsx scripts/register-telegram-webhook.ts --info\n`);
  } else {
    console.error("✗ Failed to register webhook:");
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  // Also print the info
  const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  const info = await infoRes.json();
  console.log("Webhook info:");
  console.log(`  URL              : ${info.result?.url ?? "none"}`);
  console.log(`  Pending updates  : ${info.result?.pending_update_count ?? 0}`);
  console.log(`  Last error       : ${info.result?.last_error_message ?? "none"}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
