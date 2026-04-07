import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Film, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useCostGuard } from "@/components/FinOps/CostGuard";

interface ShootingPanelProps {
    projectId: number;
}

const PROVIDERS = [
    { id: "flow", label: "Flow (Fast)" },
    { id: "veo3", label: "Veo 3 (Quality)" },
    { id: "kie-seedance", label: "Seedream / Seedance 2.0 (KIE)", provider: "kie", modelId: "kie-seedance-2-0" },
    { id: "kie-kling", label: "Kling 3.0 (KIE)", provider: "kie", modelId: "kie-kling-3-0" },
    { id: "kie-wan", label: "Wan 2.6 (KIE)", provider: "kie", modelId: "kie-wan-2-6" },
] as const;

export function ShootingPanel({ projectId }: ShootingPanelProps) {
    const { requestApproval } = useCostGuard();
    const [providerId, setProviderId] = useState<typeof PROVIDERS[number]["id"]>("flow");
    const [duration, setDuration] = useState(5);
    const [renderingId, setRenderingId] = useState<number | null>(null);

    const storyboardQuery = trpc.storyboard.getImages.useQuery({ projectId });
    const renderShotMutation = trpc.shooting.renderShot.useMutation({
        onSuccess: (data) => {
            if (data.videoUrl) {
                toast.success("🎞️ Shot rendered! Video attached to frame.");
                storyboardQuery.refetch();
            }
        },
        onError: (e) => toast.error(e.message)
    });

    // Only frames that are approved + have a 4K masterImage
    const approvedFrames = (storyboardQuery.data || []).filter(
        (f: any) => f.status === "approved" && f.masterImageUrl
    );

    const handleRenderShot = (frameId: number) => {
        let estimatedCost = duration * 0.02;
        if (providerId === "veo3") estimatedCost = duration * 0.055;
        else if (providerId === "kie-kling") estimatedCost = duration * 0.18;
        else if (providerId.startsWith("kie")) estimatedCost = duration * 0.15;

        requestApproval(estimatedCost, async () => {
            setRenderingId(frameId);
            try {
            const selected = PROVIDERS.find(p => p.id === providerId);
            const provider = selected && "provider" in selected ? selected.provider : providerId;
            const modelId = selected && "modelId" in selected ? selected.modelId : undefined;

            await renderShotMutation.mutateAsync({
                projectId,
                storyboardImageId: frameId,
                provider: provider as any,
                modelId,
                durationSeconds: duration,
                isApproved: true,
            });
            } finally {
                setRenderingId(null);
            }
        });
    };

    return (
        <div className="space-y-6">
            {/* Controls */}
            <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-wrap items-center gap-4">
                <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Provider</label>
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 gap-1">
                        {PROVIDERS.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => setProviderId(p.id)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${providerId === p.id ? "bg-primary text-white" : "text-slate-500 hover:text-white"}`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Duration</label>
                    <div className="flex items-center gap-2">
                        {[3, 5, 8, 10].map((d) => (
                            <button key={d} onClick={() => setDuration(d)}
                                className={`w-10 h-8 rounded-lg text-[10px] font-bold transition-all ${duration === d ? "bg-primary text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>
                                {d}s
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {approvedFrames.length === 0 ? (
                <div className="py-20 text-center glass-panel rounded-[2rem] border-dashed border-white/10">
                    <Film className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-sm font-bold uppercase tracking-widest text-slate-600">
                        No approved 4K keyframes yet.
                    </p>
                    <p className="text-[10px] text-slate-700 mt-2 uppercase tracking-widest">
                        Go to Storyboard Lab → approve frames → upscale to 4K
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {approvedFrames.map((frame: any) => (
                        <div key={frame.id} className="glass-panel rounded-2xl overflow-hidden border border-green-500/20 group hover:border-primary/40 transition-all">
                            {/* Thumbnail */}
                            <div className="relative aspect-video bg-black">
                                {frame.videoUrl ? (
                                    <video src={frame.videoUrl} className="w-full h-full object-cover" controls muted loop />
                                ) : (
                                    <img src={frame.masterImageUrl} className="w-full h-full object-cover" alt={`Frame ${frame.shotNumber}`} />
                                )}
                                {/* Status overlays */}
                                <div className="absolute top-2 left-2 flex gap-1">
                                    <span className="px-2 py-0.5 bg-green-500/80 text-white text-[8px] font-bold uppercase rounded">4K Approved</span>
                                    {frame.videoUrl && <span className="px-2 py-0.5 bg-primary/80 text-white text-[8px] font-bold uppercase rounded">Video Ready</span>}
                                </div>
                                <div className="absolute bottom-2 right-2 text-[8px] font-mono text-white/50">
                                    Shot #{frame.shotNumber}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="p-3">
                                {frame.videoUrl ? (
                                    <div className="flex items-center gap-2 text-green-400 text-[10px] font-bold uppercase tracking-widest">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Video rendered
                                    </div>
                                ) : (
                                    <Button
                                        onClick={() => handleRenderShot(frame.id)}
                                        disabled={renderingId === frame.id}
                                        className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-[10px] h-9 uppercase tracking-widest"
                                    >
                                        {renderingId === frame.id
                                            ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Rendering...</>
                                            : <><Play className="w-3.5 h-3.5 mr-2" /> Render Shot · {duration}s</>
                                        }
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
