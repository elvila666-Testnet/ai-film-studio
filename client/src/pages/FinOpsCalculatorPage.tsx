import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Calculator, Server, Sparkles, Receipt,
  Video, Image as ImageIcon, Mic, Database, CloudLightning, FileText, ArrowLeft
} from "lucide-react";
import { Link } from "wouter";

export function FinOpsCalculatorPage() {
  const [duration, setDuration] = useState<number>(60);
  const [complexity, setComplexity] = useState<"low" | "medium" | "high">("medium");
  const [qualityTier, setQualityTier] = useState<"fast" | "quality" | "enterprise">("quality");
  const [computeHours, setComputeHours] = useState<number>(12);

  const { data: estimate, isLoading } = trpc.finops.calculateProductionCost.useQuery({
    targetDurationSeconds: duration,
    complexity,
    qualityTier,
    expectedHoursOfCompute: computeHours,
  }, {
    keepPreviousData: true,
  });

  return (
    <div className="min-h-screen bg-[#020205] text-white relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-green-500/10 rounded-full blur-[180px]" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[150px]" />

      <div className="container mx-auto px-6 pt-16 pb-24 relative z-10 max-w-6xl">
        <header className="mb-12">
          <Link href="/">
            <Button variant="ghost" className="mb-4 text-slate-400 hover:text-white -ml-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Studio
            </Button>
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center shadow-lg">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-white uppercase italic">
                FinOps <span className="text-green-400">Estimator</span>
              </h1>
              <p className="text-sm font-mono text-slate-400 uppercase tracking-widest mt-1">
                Real-time Production Cost Calculation
              </p>
            </div>
          </div>
          <p className="text-slate-400 max-w-2xl text-lg">
            Plan your production budget by simulating AI API throughput and GCP infrastructure overhead.
          </p>
        </header>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Controls */}
          <div className="lg:col-span-7 space-y-8">
            <div className="glass-panel p-8 rounded-2xl border border-white/10 space-y-8 bg-[#08081a]/60">
              
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-sm font-bold uppercase tracking-wider text-slate-300">Target Duration</label>
                  <span className="font-mono text-green-400 font-bold">{duration} seconds</span>
                </div>
                <Slider
                  value={[duration]}
                  onValueChange={(v) => setDuration(v[0])}
                  max={600}
                  min={5}
                  step={5}
                  className="py-4"
                />
                <p className="text-xs text-slate-500 mt-2">The final cut length of the production.</p>
              </div>

              <div>
                 <div className="flex justify-between items-center mb-4">
                  <label className="text-sm font-bold uppercase tracking-wider text-slate-300">Expected Compute Hours</label>
                  <span className="font-mono text-indigo-400 font-bold">{computeHours} hours</span>
                </div>
                <Slider
                  value={[computeHours]}
                  onValueChange={(v) => setComputeHours(v[0])}
                  max={120}
                  min={1}
                  step={1}
                  className="py-4"
                />
                <p className="text-xs text-slate-500 mt-2">Active time the underlying infrastructure (Cloud Run, SQL) is allocated to heavy workload processing.</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-bold uppercase tracking-wider text-slate-300 block mb-3">Complexity (Retries)</label>
                  <div className="flex bg-slate-900/80 rounded-lg p-1 border border-slate-800">
                    {(["low", "medium", "high"] as const).map(level => (
                      <button
                        key={level}
                        onClick={() => setComplexity(level)}
                        className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${complexity === level ? "bg-slate-700 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold uppercase tracking-wider text-slate-300 block mb-3">Model Quality Tier</label>
                  <div className="flex bg-slate-900/80 rounded-lg p-1 border border-slate-800">
                    {(["fast", "quality", "enterprise"] as const).map(tier => (
                      <button
                        key={tier}
                        onClick={() => setQualityTier(tier)}
                        className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${qualityTier === tier ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]" : "text-slate-500 hover:text-slate-300"}`}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Receipt Panel */}
          <div className="lg:col-span-5 relative">
            <div className={`glass-panel p-8 rounded-2xl border ${isLoading ? "border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.2)]" : "border-green-500/30"} bg-[#050510] sticky top-8 transition-colors duration-500`}>
              <div className="flex items-center gap-2 mb-8 pb-4 border-b border-white/5">
                <Receipt className="w-5 h-5 text-slate-400" />
                <h3 className="font-bold tracking-widest uppercase text-slate-300">Cost Estimate Breakdown</h3>
              </div>

              {!estimate ? (
                <div className="h-64 flex items-center justify-center">
                   <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-8 animate-fade-in">
                  
                  {/* AI Costs */}
                  <div>
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                       <Sparkles className="w-3 h-3" /> API Services
                    </h4>
                    <div className="space-y-3">
                      <CostRow icon={<FileText />} label="Script & LLM" value={estimate.aiCosts.scripting} />
                      <CostRow icon={<ImageIcon />} label="Storyboarding (Images)" value={estimate.aiCosts.storyboarding} />
                      <CostRow icon={<Video />} label="Video Generation" value={estimate.aiCosts.videoGeneration} />
                      <CostRow icon={<Mic />} label="Voiceover (TTS)" value={estimate.aiCosts.voiceover} />
                    </div>
                  </div>

                  {/* Infra Costs */}
                  <div>
                    <h4 className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-4 flex items-center gap-2 mt-6 pt-6 border-t border-white/5">
                       <CloudLightning className="w-3 h-3" /> Core Infrastructure
                    </h4>
                    <div className="space-y-3">
                      <CostRow icon={<Server />} label="Cloud Run (Compute)" value={estimate.infraCosts.cloudRun} />
                      <CostRow icon={<Database />} label="Cloud SQL (DB)" value={estimate.infraCosts.cloudSQL} />
                      <CostRow icon={<Database />} label="GCS Storage & Egress" value={estimate.infraCosts.storageAndEgress} />
                    </div>
                  </div>

                  {/* Grand Total */}
                  <div className="pt-6 border-t border-white/10 mt-6">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Total Estimated Cost</p>
                      </div>
                      <div className="text-right">
                        <p className="text-4xl font-black text-white font-mono tracking-tighter">
                          ${estimate.totalEstimatedCost.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function CostRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-3 text-slate-400 group-hover:text-slate-300 transition-colors">
        <div className="w-6 h-6 rounded bg-slate-800/50 flex items-center justify-center [&>svg]:w-3 [&>svg]:h-3">
          {icon}
        </div>
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-sm font-mono font-medium text-slate-300">
        ${value.toFixed(4)}
      </div>
    </div>
  );
}
