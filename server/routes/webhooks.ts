import { Router, raw } from "express";
import {
  constructWebhookEvent,
  priceIdToTier,
  getStripeSubscription,
  SUBSCRIPTION_TIERS,
  type SubscriptionTier,
} from "../services/stripe";
import {
  getSubscriptionByStripeId,
  getSubscriptionByCustomerId,
  createSubscription,
  updateSubscription,
  creditSubscriptionTokens,
  creditTokens,
} from "../db/billing";

const webhookRouter = Router();

/**
 * Stripe requires the raw body for webhook signature verification.
 * This route uses express.raw() middleware instead of json().
 */
webhookRouter.post(
  "/stripe",
  raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];

    if (!sig || typeof sig !== "string") {
      console.error("[Webhook] Missing stripe-signature header");
      res.status(400).json({ error: "Missing signature" });
      return;
    }

    let event;
    try {
      event = constructWebhookEvent(req.body as Buffer, sig);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[Webhook] Signature verification failed:", message);
      res.status(400).json({ error: `Webhook Error: ${message}` });
      return;
    }

    console.log(`[Webhook] Received event: ${event.type} (${event.id})`);

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          await handleCheckoutCompleted(event.data.object);
          break;
        }
        case "invoice.paid": {
          await handleInvoicePaid(event.data.object);
          break;
        }
        case "customer.subscription.updated": {
          await handleSubscriptionUpdated(event.data.object);
          break;
        }
        case "customer.subscription.deleted": {
          await handleSubscriptionDeleted(event.data.object);
          break;
        }
        default:
          console.log(`[Webhook] Unhandled event type: ${event.type}`);
      }
    } catch (err) {
      console.error(`[Webhook] Error processing ${event.type}:`, err);
      // Return 200 to prevent Stripe from retrying (we log the error)
      res.status(200).json({ received: true, error: "Processing error" });
      return;
    }

    res.status(200).json({ received: true });
  }
);

/**
 * Handle checkout.session.completed:
 * - Subscription checkout → Activate subscription + credit tokens
 * - Token purchase → Credit tokens
 */
async function handleCheckoutCompleted(session: Record<string, unknown>) {
  const metadata = (session.metadata ?? {}) as Record<string, string>;
  const userId = parseInt(metadata.userId ?? "0", 10);
  const customerId = session.customer as string;

  if (!userId) {
    console.error("[Webhook] checkout.session.completed: No userId in metadata");
    return;
  }

  // Token purchase (one-time payment)
  if (metadata.type === "token_purchase") {
    const tokenAmount = parseInt(metadata.tokenAmount ?? "0", 10);
    if (tokenAmount > 0) {
      const paymentIntentId = session.payment_intent as string | undefined;
      await creditTokens(
        userId,
        tokenAmount,
        `Purchased ${tokenAmount} tokens (top-up)`,
        "purchase",
        paymentIntentId
      );
      console.log(`[Webhook] Credited ${tokenAmount} tokens to user ${userId} (purchase)`);
    }
    return;
  }

  // Subscription checkout
  const tier = metadata.tier as SubscriptionTier;
  const subscriptionId = session.subscription as string;

  if (!tier || !subscriptionId) {
    console.error("[Webhook] checkout.session.completed: Missing tier or subscriptionId");
    return;
  }

  // Check if subscription record already exists
  const existing = await getSubscriptionByCustomerId(customerId);

  if (existing) {
    // Update existing record
    await updateSubscription(existing.userId, {
      tier,
      status: "active",
      stripeSubscriptionId: subscriptionId,
    });
  } else {
    // Create new subscription record
    await createSubscription({
      userId,
      tier,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      status: "active",
    });
  }

  // Credit initial tokens
  await creditSubscriptionTokens(userId, tier);
  console.log(`[Webhook] Activated ${tier} subscription for user ${userId}, tokens credited`);
}

/**
 * Handle invoice.paid:
 * Credit monthly tokens on subscription renewal.
 */
async function handleInvoicePaid(invoice: Record<string, unknown>) {
  const subscriptionId = invoice.subscription as string;
  const billingReason = invoice.billing_reason as string;

  if (!subscriptionId) return;

  // Only credit tokens for recurring payments, not the initial invoice
  if (billingReason === "subscription_create") {
    console.log("[Webhook] Skipping token credit for initial invoice (already handled in checkout)");
    return;
  }

  const subscription = await getSubscriptionByStripeId(subscriptionId);
  if (!subscription) {
    console.error(`[Webhook] No subscription found for Stripe ID: ${subscriptionId}`);
    return;
  }

  const tier = subscription.tier as SubscriptionTier;
  const paymentIntentId = invoice.payment_intent as string | undefined;
  await creditSubscriptionTokens(subscription.userId, tier, paymentIntentId);
  console.log(`[Webhook] Monthly renewal: Credited ${SUBSCRIPTION_TIERS[tier].tokens} tokens to user ${subscription.userId}`);
}

/**
 * Handle customer.subscription.updated:
 * Sync tier/status changes from Stripe.
 */
async function handleSubscriptionUpdated(sub: Record<string, unknown>) {
  const stripeSubscriptionId = sub.id as string;
  const existing = await getSubscriptionByStripeId(stripeSubscriptionId);

  if (!existing) {
    console.error(`[Webhook] subscription.updated: No record for ${stripeSubscriptionId}`);
    return;
  }

  // Resolve current tier from price
  const items = sub.items as { data?: Array<{ price?: { id?: string } }> } | undefined;
  const priceId = items?.data?.[0]?.price?.id;
  const tier = priceId ? priceIdToTier(priceId) : null;

  const status = sub.status as string;
  const cancelAtPeriodEnd = sub.cancel_at_period_end as boolean;
  const currentPeriodStart = sub.current_period_start
    ? new Date((sub.current_period_start as number) * 1000)
    : undefined;
  const currentPeriodEnd = sub.current_period_end
    ? new Date((sub.current_period_end as number) * 1000)
    : undefined;

  await updateSubscription(existing.userId, {
    tier: tier ?? undefined,
    status: status as "active" | "cancelled" | "past_due" | "trialing" | "incomplete",
    stripePriceId: priceId,
    cancelAtPeriodEnd,
    currentPeriodStart,
    currentPeriodEnd,
  });

  console.log(`[Webhook] Subscription updated for user ${existing.userId}: status=${status}, tier=${tier}`);
}

/**
 * Handle customer.subscription.deleted:
 * Mark subscription as cancelled.
 */
async function handleSubscriptionDeleted(sub: Record<string, unknown>) {
  const stripeSubscriptionId = sub.id as string;
  const existing = await getSubscriptionByStripeId(stripeSubscriptionId);

  if (!existing) {
    console.error(`[Webhook] subscription.deleted: No record for ${stripeSubscriptionId}`);
    return;
  }

  await updateSubscription(existing.userId, { status: "cancelled" });
  console.log(`[Webhook] Subscription cancelled for user ${existing.userId}`);
}

export default webhookRouter;
