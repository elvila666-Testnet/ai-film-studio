import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Check, Zap, Film, Crown, Sparkles,
  ArrowRight, Shield, ChevronRight
} from "lucide-react";

const TIERS = [
  {
    id: "starter" as const,
    name: "Starter",
    price: 20,
    tokens: 500,
    tokenValue: "$5",
    description: "Perfect for scriptwriters and early exploration",
    icon: Zap,
    gradient: "from-blue-500 to-cyan-400",
    glowColor: "rgba(59, 130, 246, 0.3)",
    borderColor: "border-blue-500/20",
    features: [
      "500 tokens/month",
      "LLM Script & Synopsis",
      "Basic Brand Management",
      "Email Support",
    ],
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: 50,
    tokens: 3000,
    tokenValue: "$30",
    description: "The full creative pipeline for serious filmmakers",
    icon: Film,
    gradient: "from-indigo-500 to-violet-500",
    glowColor: "rgba(99, 102, 241, 0.4)",
    borderColor: "border-indigo-500/30",
    popular: true,
    features: [
      "3,000 tokens/month",
      "Everything in Starter",
      "AI Storyboard Generation",
      "Character Consistency Engine",
      "Video Generation (Basic)",
      "Priority Support",
    ],
  },
  {
    id: "enterprise" as const,
    name: "Enterprise",
    price: 100,
    tokens: 10000,
    tokenValue: "$80",
    description: "Maximum power for productions at scale",
    icon: Crown,
    gradient: "from-amber-500 to-orange-500",
    glowColor: "rgba(245, 158, 11, 0.3)",
    borderColor: "border-amber-500/20",
    features: [
      "10,000 tokens/month (discounted)",
      "Everything in Pro",
      "4K Upscaling & Mastering",
      "LoRA Actor Training",
      "Bulk Video Generation",
      "Dedicated Support Channel",
    ],
  },
];

interface PricingPageProps {
  onClose?: () => void;
  isAuthenticated?: boolean;
}

export function PricingPage({ onClose, isAuthenticated }: PricingPageProps) {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const billingStatus = trpc.billing.getStatus.useQuery(undefined, {
    enabled: !!isAuthenticated,
  });

  const createCheckout = trpc.billing.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err) => {
      setLoadingTier(null);
      alert(err.message);
    },
  });

  const handleSubscribe = (tier: "starter" | "pro" | "enterprise") => {
    if (!isAuthenticated) {
      alert("Please sign in first to subscribe.");
      return;
    }
    setLoadingTier(tier);
    createCheckout.mutate({ tier });
  };

  const currentTier = billingStatus.data?.subscription?.tier;

  return (
    <div className="min-h-screen bg-[#020205] text-white relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/8 rounded-full blur-[200px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-violet-600/8 rounded-full blur-[150px]" />

      {/* Header */}
      <div className="container mx-auto px-6 pt-20 pb-16 text-center relative z-10">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-8 left-6 text-slate-400 hover:text-white text-sm font-medium transition-colors"
          >
            ← Back
          </button>
        )}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-xs font-bold tracking-[0.2em] uppercase mb-8">
          <Sparkles className="w-3 h-3" />
          Simple, Transparent Pricing
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6">
          Power Your{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
            Vision
          </span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Choose the plan that fits your production. Scale up anytime.
          Every plan includes AI tokens that power scripts, storyboards, and video generation.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="container mx-auto px-6 pb-24 relative z-10">
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto items-start">
          {TIERS.map((tier) => {
            const isCurrentPlan = currentTier === tier.id;
            const TierIcon = tier.icon;

            return (
              <div
                key={tier.id}
                className={`relative group rounded-[2rem] p-px transition-all duration-500 ${
                  tier.popular
                    ? "md:-translate-y-4 md:scale-105"
                    : ""
                }`}
              >
                {/* Glow border for popular */}
                {tier.popular && (
                  <div
                    className="absolute -inset-px rounded-[2rem] bg-gradient-to-b from-indigo-500/40 to-violet-500/20 blur-sm"
                  />
                )}

                <div
                  className={`relative h-full bg-[#08081a]/90 backdrop-blur-xl rounded-[2rem] p-8 border ${tier.borderColor} hover:border-opacity-60 transition-all duration-500`}
                >
                  {/* Popular badge */}
                  {tier.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full text-xs font-bold uppercase tracking-wider shadow-[0_4px_20px_rgba(99,102,241,0.4)]">
                      Most Popular
                    </div>
                  )}

                  {/* Tier header */}
                  <div className="flex items-center gap-3 mb-6 mt-2">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tier.gradient} flex items-center justify-center shadow-lg`}>
                      <TierIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                      <p className="text-xs text-slate-500 uppercase tracking-widest font-mono">
                        {tier.tokens.toLocaleString()} tokens/mo
                      </p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-black text-white">${tier.price}</span>
                      <span className="text-slate-500 text-sm font-medium">/month</span>
                    </div>
                    <p className="text-sm text-slate-400 mt-2">{tier.description}</p>
                    <p className="text-xs text-indigo-400 mt-1 font-mono">
                      Includes {tier.tokenValue} in AI generation credits
                    </p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm">
                        <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          tier.popular ? "text-indigo-400" : "text-slate-500"
                        }`} />
                        <span className="text-slate-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  {isCurrentPlan ? (
                    <div className="w-full py-3 px-6 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 font-bold text-center text-sm uppercase tracking-widest">
                      ✓ Current Plan
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleSubscribe(tier.id)}
                      disabled={loadingTier === tier.id}
                      className={`w-full py-6 rounded-xl font-bold text-sm uppercase tracking-wider transition-all active:scale-95 ${
                        tier.popular
                          ? "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-[0_0_30px_rgba(99,102,241,0.3)]"
                          : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                      }`}
                    >
                      {loadingTier === tier.id ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Get {tier.name}
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Token Explanation */}
        <div className="max-w-4xl mx-auto mt-20">
          <div className="bg-[#08081a]/60 backdrop-blur-xl rounded-[2rem] border border-white/5 p-10">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-indigo-400" />
              How Tokens Work
            </h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <TokenCostRow action="Script Generation" cost="1-3" />
                <TokenCostRow action="Image Generation (Fast)" cost="5" />
                <TokenCostRow action="Image Generation (Quality)" cost="15" />
                <TokenCostRow action="Image Upscale to 4K" cost="10" />
              </div>
              <div className="space-y-4">
                <TokenCostRow action="Video Generation" cost="50-100" />
                <TokenCostRow action="LoRA Actor Training" cost="200" />
                <TokenCostRow action="Text-to-Speech" cost="5-10" />
                <TokenCostRow action="Sound Effects" cost="3" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-6 flex items-center gap-2">
              <Shield className="w-3 h-3" />
              Unused tokens do not roll over. Additional token packs available for purchase anytime.
            </p>
          </div>
        </div>

        {/* Trust signals */}
        <div className="flex flex-wrap justify-center gap-8 mt-16 text-xs text-slate-500 font-mono uppercase tracking-widest">
          <span className="flex items-center gap-2">
            <Shield className="w-3 h-3 text-green-500" />
            256-bit SSL Encryption
          </span>
          <span className="flex items-center gap-2">
            <ChevronRight className="w-3 h-3 text-indigo-400" />
            Powered by Stripe
          </span>
          <span className="flex items-center gap-2">
            <ChevronRight className="w-3 h-3 text-indigo-400" />
            Cancel Anytime
          </span>
        </div>
      </div>
    </div>
  );
}

function TokenCostRow({ action, cost }: { action: string; cost: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-sm text-slate-300">{action}</span>
      <span className="text-sm font-mono font-bold text-indigo-400">{cost} tokens</span>
    </div>
  );
}
