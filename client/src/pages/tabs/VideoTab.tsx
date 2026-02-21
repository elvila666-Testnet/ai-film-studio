import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Film, LayoutGrid } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useCostGuard } from "@/components/FinOps/CostGuard";
import { VideoGenerationGrid } from "./VideoGenerationGrid";

interface VideoTabProps {
  projectId: number;
}

export default function VideoTab({ projectId }: VideoTabProps) {
  const { requestApproval } = useCostGuard();
  const [viewMode, setViewMode] = useState<"generation" | "timeline">("generation");
  const storyboardQuery = trpc.storyboard.getImages.useQuery({ projectId });
  const animateAllMutation = trpc.video.animateAll.useMutation();
  const utils = trpc.useUtils();

  const handleAnimateAll = async () => {
    const shotCount = storyboardQuery.data?.length || 0;
    const cost = shotCount * 0.15;
    requestApproval(cost, async () => {
      try {
        toast.info("Assembling cinematic sequence...");
        await animateAllMutation.mutateAsync({ projectId, provider: "replicate", modelId: "minimax/video-01" });
        toast.success("Batch synthesis sequence started");
        utils.storyboard.getImages.invalidate({ projectId });
      } catch (e: any) {
        toast.error(`Batch failed: ${e.message || "Unknown error"}`);
      }
    });
  };

  return (
    <div className="flex flex-col h-full animate-fade-in p-2 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="production-node-title tracking-tighter">Cinematic Synthesis</h2>
          <p className="production-label text-primary">Stage 7: Image-to-Video Engine</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 h-10">
            <button onClick={() => setViewMode("generation")} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === "generation" ? "bg-primary text-white" : "text-slate-500 hover:text-white"}`}>
              <LayoutGrid className="w-3.5 h-3.5" /> Generator
            </button>
            <button onClick={() => setViewMode("timeline")} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === "timeline" ? "bg-primary text-white" : "text-slate-500 hover:text-white"}`}>
              <Film className="w-3.5 h-3.5" /> Editor
            </button>
          </div>
          {viewMode === "generation" && (
            <Button onClick={handleAnimateAll} disabled={animateAllMutation.isPending} className="bg-white text-black hover:bg-primary hover:text-white font-black h-10 px-6 rounded-xl shadow-lg">
              {animateAllMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Animate All Frames
            </Button>
          )}
        </div>
      </div>

      {viewMode === "generation" ? (
        <VideoGenerationGrid projectId={projectId} />
      ) : (
        <div className="flex-1 glass-panel flex flex-col items-center justify-center opacity-20 border-dashed border-white/10 py-40">
          <Film className="w-16 h-16 mb-4" />
          <h3 className="text-xl font-black uppercase tracking-tighter">Timeline Editor</h3>
          <p className="text-sm text-slate-500 uppercase tracking-widest font-bold">Refining Sequence Engine...</p>
        </div>
      )}
    </div>
  );
}
