import { getDb } from "../db";
import { subscriptions, tokenBalances, tokenTransactions } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import type { SubscriptionTier } from "../services/stripe";
import { SUBSCRIPTION_TIERS } from "../services/stripe";

/**
 * Get or create a subscription record for a user.
 */
export async function getSubscription(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unreachable");

  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  return result[0] ?? null;
}

/**
 * Create a new subscription record.
 */
export async function createSubscription(data: {
  userId: number;
  tier: SubscriptionTier;
  stripeCustomerId: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  status?: "active" | "cancelled" | "past_due" | "trialing" | "incomplete";
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unreachable");

  await db.insert(subscriptions).values({
    userId: data.userId,
    tier: data.tier,
    status: data.status ?? "incomplete",
    stripeCustomerId: data.stripeCustomerId,
    stripeSubscriptionId: data.stripeSubscriptionId,
    stripePriceId: data.stripePriceId,
    currentPeriodStart: data.currentPeriodStart,
    currentPeriodEnd: data.currentPeriodEnd,
  });
}

/**
 * Update an existing subscription.
 */
export async function updateSubscription(
  userId: number,
  data: {
    tier?: SubscriptionTier;
    status?: "active" | "cancelled" | "past_due" | "trialing" | "incomplete";
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database unreachable");

  await db
    .update(subscriptions)
    .set(data)
    .where(eq(subscriptions.userId, userId));
}

/**
 * Find a subscription by Stripe subscription ID.
 */
export async function getSubscriptionByStripeId(stripeSubscriptionId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unreachable");

  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1);

  return result[0] ?? null;
}

/**
 * Find a subscription by Stripe customer ID.
 */
export async function getSubscriptionByCustomerId(stripeCustomerId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unreachable");

  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, stripeCustomerId))
    .limit(1);

  return result[0] ?? null;
}

// ─── TOKEN BALANCE OPERATIONS ──────────────────────────────

/**
 * Get or initialize the token balance for a user.
 */
export async function getOrCreateTokenBalance(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unreachable");

  const existing = await db
    .select()
    .from(tokenBalances)
    .where(eq(tokenBalances.userId, userId))
    .limit(1);

  if (existing[0]) return existing[0];

  // Create default zero balance
  await db.insert(tokenBalances).values({ userId, balance: 0, totalPurchased: 0, totalConsumed: 0 });

  const created = await db
    .select()
    .from(tokenBalances)
    .where(eq(tokenBalances.userId, userId))
    .limit(1);

  return created[0]!;
}

/**
 * Credit tokens to a user's balance (subscription renewal, purchase, bonus).
 */
export async function creditTokens(
  userId: number,
  amount: number,
  description: string,
  type: "subscription_credit" | "purchase" | "refund" | "bonus",
  stripePaymentIntentId?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database unreachable");

  // Ensure balance row exists
  const currentBalance = await getOrCreateTokenBalance(userId);
  const newBalance = currentBalance.balance + amount;

  // Update balance atomically
  await db
    .update(tokenBalances)
    .set({
      balance: newBalance,
      totalPurchased: sql`${tokenBalances.totalPurchased} + ${amount}`,
    })
    .where(eq(tokenBalances.userId, userId));

  // Log transaction
  await db.insert(tokenTransactions).values({
    userId,
    type,
    amount,
    balance: newBalance,
    description,
    stripePaymentIntentId,
  });

  return newBalance;
}

/**
 * Deduct tokens from a user's balance (AI generation consumption).
 * Returns the new balance or throws if insufficient funds.
 */
export async function deductTokens(
  userId: number,
  amount: number,
  description: string,
  relatedProjectId?: number
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database unreachable");

  const currentBalance = await getOrCreateTokenBalance(userId);

  if (currentBalance.balance < amount) {
    throw new Error(
      `Insufficient tokens. Required: ${amount}, Available: ${currentBalance.balance}`
    );
  }

  const newBalance = currentBalance.balance - amount;

  // Deduct atomically
  await db
    .update(tokenBalances)
    .set({
      balance: newBalance,
      totalConsumed: sql`${tokenBalances.totalConsumed} + ${amount}`,
    })
    .where(eq(tokenBalances.userId, userId));

  // Log consumption transaction
  await db.insert(tokenTransactions).values({
    userId,
    type: "consumption",
    amount: -amount,
    balance: newBalance,
    description,
    relatedProjectId,
  });

  return newBalance;
}

/**
 * Credit tokens for a subscription tier (monthly renewal).
 */
export async function creditSubscriptionTokens(
  userId: number,
  tier: SubscriptionTier,
  stripePaymentIntentId?: string
) {
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  return creditTokens(
    userId,
    tierConfig.tokens,
    `Monthly ${tierConfig.name} subscription token credit (${tierConfig.tokens} tokens)`,
    "subscription_credit",
    stripePaymentIntentId
  );
}

/**
 * Get paginated token transaction history.
 */
export async function getTokenTransactionHistory(
  userId: number,
  limit: number = 20,
  offset: number = 0
) {
  const db = await getDb();
  if (!db) throw new Error("Database unreachable");

  const transactions = await db
    .select()
    .from(tokenTransactions)
    .where(eq(tokenTransactions.userId, userId))
    .orderBy(sql`${tokenTransactions.createdAt} DESC`)
    .limit(limit)
    .offset(offset);

  return transactions;
}
