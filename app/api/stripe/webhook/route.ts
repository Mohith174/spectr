import { stripe } from "@/lib/stripe";
import { clerkClient } from "@clerk/nextjs/server";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return Response.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[stripe/webhook] Signature verification failed:", err);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const clerk = await clerkClient();

  switch (event.type) {
    // Payment succeeded — grant pro access
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId) break;

      try {
        await clerk.users.updateUserMetadata(userId, {
          publicMetadata: { plan: "pro", stripeCustomerId: session.customer },
        });
        console.log(`[stripe] Pro plan activated for user ${userId}`);
      } catch (err) {
        console.error("[stripe] Failed to update Clerk metadata:", err);
      }
      break;
    }

    // Subscription cancelled or payment failed — revoke pro
    case "customer.subscription.deleted":
    case "invoice.payment_failed": {
      const obj = event.data.object as Stripe.Subscription | Stripe.Invoice;
      const customerId =
        "customer" in obj ? (obj.customer as string) : null;

      if (!customerId) break;

      // Find user by stripeCustomerId in Clerk metadata
      try {
        const users = await clerk.users.getUserList({ limit: 500 });
        const user = users.data.find(
          (u) => u.publicMetadata?.stripeCustomerId === customerId
        );
        if (user) {
          await clerk.users.updateUserMetadata(user.id, {
            publicMetadata: { plan: "free", stripeCustomerId: customerId },
          });
          console.log(`[stripe] Pro revoked for user ${user.id}`);
        }
      } catch (err) {
        console.error("[stripe] Failed to revoke pro plan:", err);
      }
      break;
    }

    default:
      // Unhandled event type — ignore
      break;
  }

  return Response.json({ received: true });
}
