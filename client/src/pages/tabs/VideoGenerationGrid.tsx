import { Button } from "@/components/ui/button";
import { Loader2, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useCostGuard } from "@/components/FinOps/CostGuard";
import { cn } from "@/lib/utils";

interface VideoGenerationGridProps {
    projectId: number;
}

export function VideoGenerationGrid({ projectId }: VideoGenerationGridProps) {
    const { requestApproval } = useCostGuard();
    const storyboardQuery = trpc.storyboard.getImages.useQuery({ projectId });
    const animateFrameMutation = trpc.video.animateFrame.useMutation();
    const utils = trpc.useUtils();

    const handleAnimate = async (shotNumber: number, motionPrompt: string) => {
        // High-end video costs $0.15
        requestApproval(0.15, async () => {
            try {
                await animateFrameMutation.mutateAsync({
                    projectId,
                    shotNumber,
                    motionPrompt,
                    provider: "replicate", // Default for now
                    characterLocked: true
                });
                toast.success(`Synthesis engine engaged for Shot ${shotNumber}`);
                utils.storyboard.getImages.invalidate({ projectId });
            } catch (e: React.ChangeEvent<any>) {
                toast.error(`Synthesis failed: ${e.message}`);
            }
        });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {storyboardQuery.data?.map((shot: unknown) => (
                <div key={shot.id} className="glass-panel group overflow-hidden border-white/5 hover:border-primary/40 hover:shadow-[0_0_40px_-15px_rgba(var(--primary),0.2)] transition-all duration-700 flex flex-col">
                    <div className="aspect-video relative bg-black/40 overflow-hidden">
                        {(animateFrameMutation.isPending && animateFrameMutation.variables?.shotNumber === shot.shotNumber) && (
                            <div className="absolute inset-0 z-20 bg-black/80 flex flex-col items-center justify-center backdrop-blur-md">
                                <div className="relative">
                                    <Loader2 className="w-10 h-10 animate-spin text-primary mb-3" />
                                    <div className="absolute inset-0 blur-lg bg-primary/20 animate-pulse rounded-full" />
                                </div>
                                <span className="text-[9px] font-black text-white uppercase tracking-[0.5em] animate-pulse">Synthesizing...</span>
                            </div>
                        )}

                        {shot.videoUrl ? (
                            <div className="relative w-full h-full">
                                <video
                                    src={shot.videoUrl}
                                    controls={false}
                                    autoPlay
                                    muted
                                    loop
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent group-hover:opacity-40 transition-opacity" />
                                <div className="absolute bottom-2 right-2">
                                    <div className="px-2 py-0.5 bg-emerald-500/20 backdrop-blur-xl border border-emerald-500/30 text-emerald-400 rounded-full text-[7px] font-black uppercase tracking-widest">
                                        Materialized
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <img src={shot.imageUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-[2s] ease-out" alt={`Shot ${shot.shotNumber}`} />
                        )}

                        <div className="absolute top-3 left-3 z-10">
                            <div className="px-2.5 py-1 bg-black/60 backdrop-blur-xl rounded-md border border-white/10 text-[9px] font-black text-white uppercase tracking-widest group-hover:border-primary/30 transition-colors">
                                SHT_{String(shot.shotNumber).padStart(3, '0')}
                            </div>
                        </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col gap-4 bg-[#0a0a0a]/40 group-hover:bg-[#0a0a0a]/60 transition-colors duration-500">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Motion Directives</label>
                            <div className="text-[11px] text-slate-400/80 line-clamp-2 h-9 leading-relaxed group-hover:text-slate-200 transition-colors">
                                {shot.visualDescription || "No cinematic directives available"}
                            </div>
                        </div>
                        <Button
                            onClick={() => handleAnimate(shot.shotNumber, shot.visualDescription)}
                            disabled={animateFrameMutation.isPending}
                            className={cn(
                                "w-full h-10 text-[10px] uppercase font-black tracking-[0.2em] transition-all duration-300 rounded-full",
                                shot.videoUrl
                                    ? "bg-white/5 border border-white/10 text-slate-400 hover:bg-white hover:text-black hover:border-white"
                                    : "bg-primary text-white shadow-[0_5px_15px_-5px_rgba(var(--primary),0.4)] hover:scale-[1.02] active:scale-[0.98] hover:bg-white hover:text-black"
                            )}
                        >
                            {animateFrameMutation.isPending && animateFrameMutation.variables?.shotNumber === shot.shotNumber ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                            ) : <Zap className="w-3.5 h-3.5 mr-2" />}
                            {shot.videoUrl ? "Re-Synthesize" : "Animate Frame"}
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}
