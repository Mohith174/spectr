import { auth } from "@clerk/nextjs/server";
import { stripe, PRO_PRICE_ID } from "@/lib/stripe";

export const runtime = "nodejs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST() {
  if (process.env.DEMO_MODE === "true") {
    return Response.json(
      { error: "Checkout is disabled on this demo deployment." },
      { status: 503 }
    );
  }

  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: PRO_PRICE_ID, quantity: 1 }],
    metadata: { userId },
    success_url: `${APP_URL}/dashboard?upgraded=1`,
    cancel_url: `${APP_URL}/dashboard`,
    allow_promotion_codes: true,
  });

  return Response.json({ url: session.url });
}
