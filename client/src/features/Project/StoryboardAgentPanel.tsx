import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Bot, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { useCostGuard } from "@/components/FinOps/CostGuard";

interface StoryboardAgentPanelProps {
    projectId: number;
    scriptText?: string;
    onCompleted?: () => void;
}

export function StoryboardAgentPanel({ projectId, scriptText, onCompleted }: StoryboardAgentPanelProps) {
    const [sceneInput, setSceneInput] = useState(scriptText || "");
    const { requestApproval } = useCostGuard();
    const [isThinking, setIsThinking] = useState(false);

    const autoStoryboardMutation = trpc.storyboardAgent.autoStoryboardScene.useMutation();

    const handleRunAgent = () => {
        if (!sceneInput) {
            toast.error("Please provide scene text for the agent to analyze.");
            return;
        }

        // Auto Storyboarding costs around $0.05 per API call plus whatever image gen costs trigger
        requestApproval(0.05, async () => {
            setIsThinking(true);
            try {
                const response = await autoStoryboardMutation.mutateAsync({
                    projectId,
                    sceneText: sceneInput
                });
                toast.success(response.message);
                if (onCompleted) onCompleted();
            } catch (err: any) {
                toast.error(err.message || "Storyboard Agent failed.");
            } finally {
                setIsThinking(false);
            }
        });
    };

    return (
        <div className="glass-panel p-6 rounded-2xl border border-primary/20 space-y-4 relative overflow-hidden group">
            {/* Background effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
            <div className="absolute -inset-1 blur-2xl bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

            <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg text-primary border border-primary/30 shadow-[0_0_15px_rgba(var(--primary),0.3)]">
                        <Bot className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-200">Autonomous Storyboard Agent</h3>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Scene Breakdown & Generation</p>
                    </div>
                </div>

                <Textarea
                    placeholder="Paste a scene from your script here..."
                    className="min-h-[100px] bg-black/40 border-white/10 text-xs text-slate-300 focus-visible:ring-primary/50 resize-y"
                    value={sceneInput}
                    onChange={(e) => setSceneInput(e.target.value)}
                />

                <Button
                    onClick={handleRunAgent}
                    disabled={isThinking || !sceneInput.trim()}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-black tracking-widest uppercase text-[10px] h-10 shadow-[0_0_20px_rgba(var(--primary),0.2)] transition-all hover:shadow-[0_0_30px_rgba(var(--primary),0.4)]"
                >
                    {isThinking ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Agent is Directing...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Run Storyboard Agent
                        </>
                    )}
                </Button>

                {autoStoryboardMutation.isSuccess && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2 text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                            {autoStoryboardMutation.data?.estimatedShots} Shots Queued for Materialization
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
