import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Brain, Image as ImageIcon, Play, LayoutGrid } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useCostGuard } from "@/components/FinOps/CostGuard";
import { ShootingPanel } from "@/features/Project/ShootingPanel";
import { VideoGenerationGrid } from "./VideoGenerationGrid";

interface VideoTabProps {
  projectId: number;
}

export default function VideoTab({ projectId }: VideoTabProps) {
  const { requestApproval } = useCostGuard();
  const [viewMode, setViewMode] = useState<"shooting" | "legacy">("shooting");

  const statusQuery = trpc.directorV2.getStatus.useQuery({ projectId });
  const promptsQuery = trpc.promptEngineer.getPrompts.useQuery({ projectId });
  const buildPromptsMutation = trpc.promptEngineer.buildPrompts.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      promptsQuery.refetch();
    },
    onError: (e) => toast.error(e.message)
  });
  const renderGridsMutation = trpc.promptEngineer.renderAllGrids.useMutation({
    onSuccess: (data) => toast.success(data.message),
    onError: (e) => toast.error(e.message)
  });

  const technicalApproved = statusQuery.data?.technicalScriptStatus === "approved";
  const hasPrompts = promptsQuery.data?.hasPrompts;

  const handleBuildPrompts = () => {
    if (!technicalApproved) {
      toast.error("⚠️ Technical script must be approved in Director's Office first.");
      return;
    }
    requestApproval(0.005, async () => {
      await buildPromptsMutation.mutateAsync({ projectId });
    });
  };

  const handleRenderGrids = () => {
    requestApproval(0.10, async () => {
      await renderGridsMutation.mutateAsync({ projectId });
    });
  };

  return (
    <div className="flex flex-col h-full animate-fade-in p-2 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="production-node-title tracking-tighter">Motion Synthesis</h2>
          <p className="production-label text-primary">Stage 7: Image-to-Video Engine</p>
        </div>
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 h-10">
          <button onClick={() => setViewMode("shooting")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === "shooting" ? "bg-primary text-white" : "text-slate-500 hover:text-white"}`}>
            <Play className="w-3.5 h-3.5" /> Shooting
          </button>
          <button onClick={() => setViewMode("legacy")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === "legacy" ? "bg-primary text-white" : "text-slate-500 hover:text-white"}`}>
            <LayoutGrid className="w-3.5 h-3.5" /> All Frames
          </button>
        </div>
      </div>

      {/* Prompt Engineer pipeline step */}
      {viewMode === "shooting" && (
        <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <Brain className="w-3.5 h-3.5 text-primary" /> Prompt Engineer — Pre-flight
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleBuildPrompts}
              disabled={buildPromptsMutation.isPending || !technicalApproved}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] h-9 uppercase tracking-widest"
            >
              {buildPromptsMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Brain className="w-3.5 h-3.5 mr-2" />}
              {hasPrompts ? "Rebuild Prompts" : "🧠 Build Storyboard Prompts"}
            </Button>
            {hasPrompts && (
              <Button
                onClick={handleRenderGrids}
                disabled={renderGridsMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] h-9 uppercase tracking-widest"
              >
                {renderGridsMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5 mr-2" />}
                🎬 Render Storyboard Grids
              </Button>
            )}
            {hasPrompts && (
              <span className="flex items-center gap-1.5 text-[9px] text-indigo-400 font-bold uppercase tracking-widest">
                <Sparkles className="w-3 h-3" />
                {(promptsQuery.data?.prompts as any[])?.length ?? 0} grid prompt(s) ready
              </span>
            )}
          </div>
          {!technicalApproved && (
            <p className="text-[10px] text-amber-400/70 uppercase tracking-widest">
              ⚠️ Approve the technical script in Director's Office to unlock this step.
            </p>
          )}
        </div>
      )}

      {viewMode === "shooting" ? (
        <ShootingPanel projectId={projectId} />
      ) : (
        <VideoGenerationGrid projectId={projectId} />
      )}
    </div>
  );
}
