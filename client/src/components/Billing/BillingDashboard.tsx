import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  CreditCard, ExternalLink, History,
  TrendingDown, TrendingUp, Coins,
  Crown, Zap, Film, Package
} from "lucide-react";
import { useState } from "react";

const TIER_ICONS: Record<string, React.ElementType> = {
  starter: Zap,
  pro: Film,
  enterprise: Crown,
};

const TIER_GRADIENTS: Record<string, string> = {
  starter: "from-blue-500 to-cyan-400",
  pro: "from-indigo-500 to-violet-500",
  enterprise: "from-amber-500 to-orange-500",
};

export function BillingDashboard() {
  const [showHistory, setShowHistory] = useState(false);

  const billingStatus = trpc.billing.getStatus.useQuery();
  const tokenHistory = trpc.billing.getTokenHistory.useQuery(
    { limit: 20, offset: 0 },
    { enabled: showHistory }
  );

  const createPortal = trpc.billing.createPortalSession.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
  });

  const purchaseTokens = trpc.billing.purchaseTokens.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
  });

  const sub = billingStatus.data?.subscription;
  const tokens = billingStatus.data?.tokens;
  const tierConfig = billingStatus.data?.tierConfig;

  if (billingStatus.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  const TierIcon = sub?.tier ? TIER_ICONS[sub.tier] ?? Coins : Coins;
  const tierGradient = sub?.tier ? TIER_GRADIENTS[sub.tier] ?? "from-slate-500 to-slate-400" : "from-slate-500 to-slate-400";

  // Token usage percentage
  const monthlyTokens = tierConfig?.monthlyTokens ?? 1;
  const usagePercent = tokens ? Math.min(100, Math.round(((monthlyTokens - tokens.balance) / monthlyTokens) * 100)) : 0;
  const balancePercent = 100 - usagePercent;

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Plan Overview Card */}
      <div className="bg-[#0a0a18]/80 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
        <div className={`bg-gradient-to-r ${tierGradient} p-px`}>
          <div className="bg-[#0a0a18] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tierGradient} flex items-center justify-center shadow-lg`}>
                <TierIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {sub ? `${tierConfig?.name ?? sub.tier} Plan` : "No Active Plan"}
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  {sub?.status === "active" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 text-xs font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      Active
                    </span>
                  )}
                  {sub?.cancelAtPeriodEnd && (
                    <span className="text-xs text-amber-400 font-medium">
                      Cancels at period end
                    </span>
                  )}
                  {sub?.currentPeriodEnd && (
                    <span className="text-xs text-slate-500 font-mono">
                      Renews {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {sub?.status === "active" && (
              <Button
                onClick={() => createPortal.mutate()}
                disabled={createPortal.isPending}
                variant="outline"
                className="bg-white/5 border-white/10 text-white hover:bg-white/10 text-xs uppercase tracking-widest font-bold"
              >
                <CreditCard className="w-3.5 h-3.5 mr-2" />
                Manage Subscription
                <ExternalLink className="w-3 h-3 ml-2 opacity-50" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Token Balance */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Balance Card */}
        <div className="bg-[#0a0a18]/80 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Coins className="w-4 h-4 text-indigo-400" />
            <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">Balance</span>
          </div>
          <div className="text-4xl font-black text-white mb-2">
            {tokens?.balance.toLocaleString() ?? 0}
          </div>
          <p className="text-xs text-slate-500">tokens available</p>
          {/* Progress bar */}
          <div className="mt-4 h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                balancePercent > 30
                  ? "bg-gradient-to-r from-indigo-500 to-cyan-400"
                  : balancePercent > 10
                  ? "bg-gradient-to-r from-amber-500 to-orange-400"
                  : "bg-gradient-to-r from-red-500 to-rose-400"
              }`}
              style={{ width: `${Math.max(2, balancePercent)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-600 mt-2 font-mono">
            {usagePercent}% of monthly allocation used
          </p>
        </div>

        {/* Total Purchased */}
        <div className="bg-[#0a0a18]/80 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">Total Credited</span>
          </div>
          <div className="text-4xl font-black text-white mb-2">
            {tokens?.totalPurchased.toLocaleString() ?? 0}
          </div>
          <p className="text-xs text-slate-500">tokens all-time</p>
        </div>

        {/* Total Consumed */}
        <div className="bg-[#0a0a18]/80 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-4 h-4 text-rose-400" />
            <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">Total Used</span>
          </div>
          <div className="text-4xl font-black text-white mb-2">
            {tokens?.totalConsumed.toLocaleString() ?? 0}
          </div>
          <p className="text-xs text-slate-500">tokens consumed</p>
        </div>
      </div>

      {/* Buy More Tokens */}
      <div className="bg-[#0a0a18]/80 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-indigo-400" />
          Buy More Tokens
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { pack: "small" as const, tokens: 500, price: "$5", label: "500 Tokens" },
            { pack: "medium" as const, tokens: 2000, price: "$18", label: "2,000 Tokens", badge: "10% OFF" },
            { pack: "large" as const, tokens: 5000, price: "$40", label: "5,000 Tokens", badge: "20% OFF" },
          ].map((item) => (
            <button
              key={item.pack}
              onClick={() => purchaseTokens.mutate({ pack: item.pack })}
              disabled={purchaseTokens.isPending || !sub}
              className="relative bg-white/5 hover:bg-white/10 border border-white/5 hover:border-indigo-500/30 rounded-xl p-4 text-center transition-all group disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {item.badge && (
                <div className="absolute -top-2 right-3 px-2 py-0.5 bg-indigo-600 rounded text-[9px] font-bold text-white uppercase">
                  {item.badge}
                </div>
              )}
              <div className="text-2xl font-black text-white mb-1">{item.price}</div>
              <div className="text-xs text-slate-400">{item.label}</div>
            </button>
          ))}
        </div>
        {!sub && (
          <p className="text-xs text-slate-500 mt-3 italic">
            Subscribe to a plan first to purchase additional tokens.
          </p>
        )}
      </div>

      {/* Transaction History */}
      <div className="bg-[#0a0a18]/80 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 text-lg font-bold text-white hover:text-indigo-400 transition-colors w-full text-left"
        >
          <History className="w-5 h-5 text-indigo-400" />
          Transaction History
          <span className="ml-auto text-xs text-slate-500">{showHistory ? "Hide" : "Show"}</span>
        </button>

        {showHistory && (
          <div className="mt-4 space-y-1">
            {tokenHistory.isLoading && (
              <p className="text-sm text-slate-500 py-4 text-center">Loading...</p>
            )}
            {tokenHistory.data?.transactions.length === 0 && (
              <p className="text-sm text-slate-500 py-4 text-center">No transactions yet.</p>
            )}
            {tokenHistory.data?.transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    tx.amount > 0
                      ? "bg-green-500/10 text-green-400"
                      : "bg-rose-500/10 text-rose-400"
                  }`}>
                    {tx.amount > 0 ? "+" : "−"}
                  </div>
                  <div>
                    <div className="text-sm text-white font-medium">{tx.description}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {new Date(tx.createdAt).toLocaleDateString()} · {tx.type.replace(/_/g, " ")}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-bold ${tx.amount > 0 ? "text-green-400" : "text-rose-400"}`}>
                    {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">bal: {tx.balance}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
