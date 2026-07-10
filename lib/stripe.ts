import Stripe from "stripe";

// Falls back to a placeholder so importing this module doesn't crash builds
// where Stripe isn't configured (e.g. DEMO_MODE deployments, which never
// actually call the Stripe API — see app/api/stripe/checkout/route.ts).
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_demo_placeholder", {
  apiVersion: "2026-02-25.clover",
});

export const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID ?? "";
