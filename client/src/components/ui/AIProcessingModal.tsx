import { useEffect, useState } from "react";
import { useAIProcessing } from "@/lib/aiProcessingContext";
import { Sparkles, Cpu, Radio, ShieldCheck } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function AIProcessingModal() {
    const { isProcessing, processName, progress } = useAIProcessing();
    const [isVisible, setIsVisible] = useState(false);

    // Keep it visible for a moment after finishing to show 100%
    useEffect(() => {
        if (isProcessing) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 800);
            return () => clearTimeout(timer);
        }
    }, [isProcessing]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-2xl animate-in fade-in duration-500">
            <div className="relative w-full max-w-md p-10 text-center space-y-10 glass-panel border-white/10 bg-black/40 shadow-[0_0_100px_rgba(var(--primary),0.1)]">
                {/* Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary/20 rounded-full blur-[100px] -z-10 animate-pulse" />

                <div className="relative inline-block scale-110">
                    <div className="w-24 h-24 rounded-full border-2 border-primary/10 border-t-primary animate-spin [animation-duration:1.5s]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Cpu className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                    {/* Ring Accents */}
                    <div className="absolute -inset-4 border border-white/5 rounded-full animate-[spin_10s_linear_infinite]" />
                    <div className="absolute -inset-8 border border-white/5 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                </div>

                <div className="space-y-3">
                    <h2 className="text-2xl font-black italic tracking-tighter text-white flex items-center justify-center gap-3">
                        <Sparkles className="w-6 h-6 text-primary fill-primary" />
                        SYSTEM DEEP-THINK
                    </h2>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.25em]">
                            {processName || "Executing Autonomous Pipeline"}
                        </p>
                    </div>
                </div>

                <div className="space-y-4 px-4">
                    <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-white/40 mb-1">
                        <span className="flex items-center gap-1.5">
                            <Radio className="w-3 h-3 text-primary" />
                            Computation Flux
                        </span>
                        <span className="text-primary">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5 bg-white/5 border border-white/5 overflow-hidden" />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 px-4">
                    <div className="flex items-center justify-center gap-2 text-[8px] uppercase font-black text-slate-400 bg-white/5 py-2.5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                        <Radio className="w-3 h-3 text-primary" />
                        Neural Link Active
                    </div>
                    <div className="flex items-center justify-center gap-2 text-[8px] uppercase font-black text-slate-400 bg-white/5 py-2.5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                        <ShieldCheck className="w-3 h-3 text-green-500" />
                        FinOps Secured
                    </div>
                </div>

                <p className="text-[10px] text-slate-500 italic leading-relaxed px-6 opacity-60">
                    Proprietary Agent Orchestration in progress. <br />
                    Complex high-fidelity blueprints may take 60-90s to materialize.
                </p>
            </div>
        </div>
    );
}
