import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import {
  createStripeCustomer,
  createCheckoutSession,
  createPortalSession,
  createTokenPurchaseSession,
  SUBSCRIPTION_TIERS,
  TOKEN_COSTS,
  type SubscriptionTier,
} from "../services/stripe";
import {
  getSubscription,
  createSubscription,
  getOrCreateTokenBalance,
  getTokenTransactionHistory,
} from "../db/billing";

const tierSchema = z.enum(["starter", "pro", "enterprise"]);

export const billingRouter = router({
  /**
   * Get the current user's subscription and token balance.
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    const [subscription, tokenBalance] = await Promise.all([
      getSubscription(userId),
      getOrCreateTokenBalance(userId),
    ]);

    const tier = subscription?.tier as SubscriptionTier | undefined;
    const tierConfig = tier ? SUBSCRIPTION_TIERS[tier] : null;

    return {
      subscription: subscription
        ? {
            tier: subscription.tier as SubscriptionTier,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          }
        : null,
      tokens: {
        balance: tokenBalance.balance,
        totalPurchased: tokenBalance.totalPurchased,
        totalConsumed: tokenBalance.totalConsumed,
      },
      tierConfig: tierConfig
        ? {
            name: tierConfig.name,
            monthlyPrice: tierConfig.monthlyPrice,
            monthlyTokens: tierConfig.tokens,
            features: tierConfig.features,
          }
        : null,
    };
  }),

  /**
   * Create a Stripe Checkout session for a new subscription.
   */
  createCheckoutSession: protectedProcedure
    .input(z.object({ tier: tierSchema }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const user = ctx.user;

      // Check for existing active subscription
      const existing = await getSubscription(userId);
      if (existing?.status === "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You already have an active subscription. Use the billing portal to change plans.",
        });
      }

      // Create or reuse Stripe customer
      let stripeCustomerId = existing?.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await createStripeCustomer(
          user.email ?? `user-${userId}@aifilmstudio.app`,
          user.name,
          userId
        );
        stripeCustomerId = customer.id;

        // Persist the customer ID
        if (!existing) {
          await createSubscription({
            userId,
            tier: input.tier,
            stripeCustomerId,
            status: "incomplete",
          });
        }
      }

      const origin = ctx.req.headers.origin || ctx.req.headers.referer || "http://localhost:3000";
      const baseUrl = new URL(origin).origin;

      const session = await createCheckoutSession(
        stripeCustomerId,
        input.tier,
        `${baseUrl}/?billing=success`,
        `${baseUrl}/?billing=cancelled`,
        userId
      );

      return { url: session.url };
    }),

  /**
   * Create a Stripe Billing Portal session.
   */
  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id;
    const subscription = await getSubscription(userId);

    if (!subscription?.stripeCustomerId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No subscription found. Subscribe first.",
      });
    }

    const origin = ctx.req.headers.origin || ctx.req.headers.referer || "http://localhost:3000";
    const baseUrl = new URL(origin).origin;

    const session = await createPortalSession(
      subscription.stripeCustomerId,
      `${baseUrl}/`
    );

    return { url: session.url };
  }),

  /**
   * Purchase additional tokens (one-time top-up).
   */
  purchaseTokens: protectedProcedure
    .input(
      z.object({
        pack: z.enum(["small", "medium", "large"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const subscription = await getSubscription(userId);

      if (!subscription?.stripeCustomerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You need an active subscription to purchase additional tokens.",
        });
      }

      const packs = {
        small: { tokens: 500, priceCents: 500 },    // $5 for 500 tokens
        medium: { tokens: 2000, priceCents: 1800 },  // $18 for 2000 tokens (10% discount)
        large: { tokens: 5000, priceCents: 4000 },   // $40 for 5000 tokens (20% discount)
      };

      const pack = packs[input.pack];
      const origin = ctx.req.headers.origin || ctx.req.headers.referer || "http://localhost:3000";
      const baseUrl = new URL(origin).origin;

      const session = await createTokenPurchaseSession(
        subscription.stripeCustomerId,
        pack.tokens,
        pack.priceCents,
        `${baseUrl}/?tokens=purchased`,
        `${baseUrl}/?tokens=cancelled`,
        userId
      );

      return { url: session.url };
    }),

  /**
   * Get token transaction history.
   */
  getTokenHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const limit = input?.limit ?? 20;
      const offset = input?.offset ?? 0;

      const transactions = await getTokenTransactionHistory(userId, limit, offset);

      return {
        transactions: transactions.map((t) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          balance: t.balance,
          description: t.description,
          createdAt: t.createdAt,
        })),
      };
    }),

  /**
   * Get all plan tiers (for pricing page, public-compatible).
   */
  getPlans: protectedProcedure.query(() => {
    return Object.entries(SUBSCRIPTION_TIERS).map(([key, config]) => ({
      id: key as SubscriptionTier,
      name: config.name,
      monthlyPrice: config.monthlyPrice,
      tokens: config.tokens,
      features: config.features,
    }));
  }),

  /**
   * Get token cost estimates for a given action type.
   */
  estimateTokenCost: protectedProcedure
    .input(z.object({ actionType: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const cost = TOKEN_COSTS[input.actionType as keyof typeof TOKEN_COSTS];

      if (cost === undefined) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Unknown action type: ${input.actionType}`,
        });
      }

      const balance = await getOrCreateTokenBalance(userId);

      return {
        tokenCost: cost,
        currentBalance: balance.balance,
        sufficient: balance.balance >= cost,
      };
    }),
});
