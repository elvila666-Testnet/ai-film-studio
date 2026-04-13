import Stripe from "stripe";
import { ENV } from "../_core/env";

/**
 * Subscription tier configuration.
 * Maps tier names to Stripe Price IDs and token allocations.
 */
export const SUBSCRIPTION_TIERS = {
  starter: {
    name: "Starter",
    monthlyPrice: 2000, // $20.00 in cents
    tokens: 500,
    priceId: () => ENV.stripeStarterPriceId,
    features: [
      "500 tokens/month",
      "LLM Script & Synopsis Generation",
      "Basic Brand Management",
      "Email Support",
    ],
  },
  pro: {
    name: "Pro",
    monthlyPrice: 5000, // $50.00 in cents
    tokens: 3000,
    priceId: () => ENV.stripeProPriceId,
    features: [
      "3,000 tokens/month",
      "Everything in Starter",
      "AI Storyboard Generation",
      "Character Consistency Engine",
      "Video Generation (Basic)",
      "Priority Support",
    ],
  },
  enterprise: {
    name: "Enterprise",
    monthlyPrice: 10000, // $100.00 in cents
    tokens: 10000,
    priceId: () => ENV.stripeEnterprisePriceId,
    features: [
      "10,000 tokens/month (discounted rate)",
      "Everything in Pro",
      "4K Upscaling & Mastering",
      "LoRA Actor Training",
      "Bulk Video Generation",
      "Dedicated Support Channel",
    ],
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

/**
 * Token cost rates for AI operations.
 * These represent the customer-facing token cost (2x API cost markup).
 */
export const TOKEN_COSTS = {
  llm_script: 2,
  llm_synopsis: 1,
  llm_analysis: 1,
  image_generation_fast: 5,
  image_generation_quality: 15,
  image_upscale: 10,
  video_generation: 50,
  video_generation_premium: 100,
  lora_training: 200,
  tts_voiceover: 5,
  sound_effect: 3,
} as const;

export type TokenActionType = keyof typeof TOKEN_COSTS;

/** Lazy Stripe client singleton */
let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    if (!ENV.stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    _stripe = new Stripe(ENV.stripeSecretKey, {
      apiVersion: "2026-03-25.dahlia" as any,
      typescript: true,
    });
  }
  return _stripe;
}

/**
 * Create a Stripe customer for a user.
 */
export async function createStripeCustomer(
  email: string,
  name: string | null,
  userId: number
): Promise<Stripe.Customer> {
  const stripe = getStripe();
  return stripe.customers.create({
    email,
    name: name ?? undefined,
    metadata: { userId: String(userId) },
  });
}

/**
 * Create a Stripe Checkout session for a subscription.
 */
export async function createCheckoutSession(
  customerId: string,
  tier: SubscriptionTier,
  successUrl: string,
  cancelUrl: string,
  userId: number
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  const priceId = tierConfig.priceId();

  if (!priceId) {
    throw new Error(`Stripe Price ID not configured for tier: ${tier}`);
  }

  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId: String(userId),
      tier,
    },
    subscription_data: {
      metadata: {
        userId: String(userId),
        tier,
      },
    },
  });
}

/**
 * Create a Stripe Billing Portal session for subscription management.
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripe();
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

/**
 * Create a one-time Checkout session for purchasing additional tokens.
 */
export async function createTokenPurchaseSession(
  customerId: string,
  tokenAmount: number,
  unitPriceCents: number,
  successUrl: string,
  cancelUrl: string,
  userId: number
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();

  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${tokenAmount} AI Film Studio Tokens`,
            description: `Top up your token balance with ${tokenAmount} tokens`,
          },
          unit_amount: unitPriceCents,
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId: String(userId),
      type: "token_purchase",
      tokenAmount: String(tokenAmount),
    },
  });
}

/**
 * Verify a Stripe webhook signature.
 */
export function constructWebhookEvent(
  payload: Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripe();
  if (!ENV.stripeWebhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    ENV.stripeWebhookSecret
  );
}

/**
 * Retrieve a Stripe subscription by ID.
 */
export async function getStripeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const stripe = getStripe();
  return stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Map a Stripe price ID back to our tier name.
 */
export function priceIdToTier(priceId: string): SubscriptionTier | null {
  for (const [tier, config] of Object.entries(SUBSCRIPTION_TIERS)) {
    if (config.priceId() === priceId) {
      return tier as SubscriptionTier;
    }
  }
  return null;
}
