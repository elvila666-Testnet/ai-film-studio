import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Video, Eye, EyeOff } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AnimaticPreview } from "@/components/AnimaticPreview";
import { Lightbox } from "@/components/ui/Lightbox";
import { useCostGuard } from "@/components/FinOps/CostGuard";
import { ShotCard } from "./ShotCard";
import { Shot, Actor } from "@/features/Project/types";

interface StoryboardTabProps {
  projectId: number;
}

export default function StoryboardTab({ projectId }: StoryboardTabProps) {
  const { requestApproval } = useCostGuard();
  const [isExportingAnimatic, setIsExportingAnimatic] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [audioUrl] = useState<string>();
  const [audioVolume] = useState(100);
  const [frameDurations, setFrameDurations] = useState<Record<number, number>>({});
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const productionQuery = trpc.director.getFullProductionLayout.useQuery({ projectId });
  const actorsQuery = trpc.director.listActors.useQuery();

  const generateShotMutation = trpc.storyboard.generateShot.useMutation({ onSuccess: () => productionQuery.refetch() });
  const generateAllMutation = trpc.storyboard.generateAll.useMutation({ onSuccess: () => productionQuery.refetch() });
  const approveFrameMutation = trpc.storyboard.approveAndUpscaleFrame.useMutation({ onSuccess: () => productionQuery.refetch() });
  const regenerateFrameMutation = trpc.storyboard.regenerateSingleFrame.useMutation({ onSuccess: () => productionQuery.refetch() });

  const bindActorMutation = trpc.director.bindActorToShot.useMutation({ onSuccess: () => productionQuery.refetch() });
  const unbindActorMutation = trpc.director.unbindActorFromShot.useMutation({ onSuccess: () => productionQuery.refetch() });
  const exportAnimaticMutation = trpc.editor.exportAnimatic.useMutation();

  const allFrames = productionQuery.data?.flatMap((s: any) => s.shots || []) as Shot[] || [];

  const handleGenerateShot = async (shotId: number) => {
    const shot = allFrames.find((s) => s.id === shotId);
    if (!shot) return;
    requestApproval(0.04, async () => {
      try {
        await generateShotMutation.mutateAsync({ projectId, shotNumber: shot.order, prompt: shot.visualDescription || "" });
        toast.success("Asset materialized");
      } catch (e) { toast.error("Visual synthesis failed"); }
    });
  };

  const handleRegenerateShot = async (shotId: number, prompt: string) => {
    const shot = allFrames.find((s) => s.id === shotId);
    if (!shot) return;
    requestApproval(0.04, async () => {
      try {
        await regenerateFrameMutation.mutateAsync({ projectId, shotNumber: shot.order, prompt });
        toast.success("Frame regenerated");
      } catch (e) { toast.error("Regeneration failed"); }
    });
  };

  const handleApproveShot = async (_shotId: number, imageId: number, imageUrl: string) => {
    requestApproval(0.02, async () => {
      try {
        toast.info("Approving & Upscaling to 4K...");
        await approveFrameMutation.mutateAsync({ projectId, storyboardImageId: imageId, imageUrl });
        toast.success("Frame 4K Upscaled!");
      } catch (e) { toast.error("Upscale failed"); }
    });
  };

  const handleGenerateAll = async () => {
    const totalShots = allFrames.length;
    const cost = totalShots * 0.04;
    requestApproval(cost, async () => {
      try {
        toast.info(`Starting batch synthesis for ${totalShots} shots...`);
        await generateAllMutation.mutateAsync({ projectId });
        toast.success("All assets materialized");
      } catch (e) { toast.error("Batch synthesis failed"); }
    });
  };

  const handleExportAnimatic = async () => {
    if (!productionQuery.data) return;
    setIsExportingAnimatic(true);
    try {
      const result = await exportAnimaticMutation.mutateAsync({
        projectId, durationPerFrame: 2, fps: 24, resolution: "1920x1080",
        audioUrl, audioVolume, frameDurations
      });
      if (result.success && result.videoUrl) window.open(result.videoUrl, "_blank");
    } finally { setIsExportingAnimatic(false); }
  };

  const totalPages = Math.ceil(allFrames.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentShots = allFrames.slice(startIndex, startIndex + itemsPerPage);

  const selectedShotIndex = allFrames.findIndex(s => s.id === selectedImageId);
  const selectedShot = selectedImageId !== null ? allFrames[selectedShotIndex] : null;

  const handleNext = () => {
    if (selectedShotIndex < allFrames.length - 1) {
      const nextShot = allFrames[selectedShotIndex + 1];
      if (nextShot.masterImageUrl || nextShot.imageUrl) {
        setSelectedImageId(nextShot.id);
      }
    }
  };

  const handlePrev = () => {
    if (selectedShotIndex > 0) {
      const prevShot = allFrames[selectedShotIndex - 1];
      if (prevShot.masterImageUrl || prevShot.imageUrl) {
        setSelectedImageId(prevShot.id);
      }
    }
  };

  return (
    <div className="space-y-12 animate-fade-in pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="production-node-title tracking-tighter text-white">Director's Vision</h2>
          <p className="production-label text-primary">Stage 4: Visual Storyboarding</p>
        </div>
        <div className="flex gap-4">
          <Button onClick={handleGenerateAll} disabled={generateAllMutation.isPending} className="bg-white text-black hover:bg-primary hover:text-white">
            {generateAllMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Generate All Storyboard Assets
          </Button>
          <Button onClick={handleExportAnimatic} disabled={isExportingAnimatic} className="bg-primary text-white font-bold h-10 px-6 rounded-xl">
            {isExportingAnimatic ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Video className="w-4 h-4 mr-2" />}
            Export Animatic
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        <div className="lg:col-span-3 space-y-8">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Storyboard Grid</h3>
            <p className="text-[10px] text-slate-500 font-mono uppercase">{allFrames.length} Total Shots</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {currentShots.map((shot) => (
              <ShotCard
                key={shot.id}
                shot={shot}
                isGenerating={generateShotMutation.isPending && generateShotMutation.variables?.shotNumber === shot.order}
                isRegenerating={regenerateFrameMutation.isPending && regenerateFrameMutation.variables?.shotNumber === shot.order}
                isApproving={approveFrameMutation.isPending && approveFrameMutation.variables?.storyboardImageId === shot.imageId}
                onGenerate={handleGenerateShot}
                onRegenerate={handleRegenerateShot}
                onApprove={handleApproveShot}
                onBindActor={(s, a) => bindActorMutation.mutate({ shotId: s, actorId: a })}
                onUnbindActor={(s, a) => unbindActorMutation.mutate({ shotId: s, actorId: a })}
                availableActors={(actorsQuery.data as Actor[]) || []}
                onClick={setSelectedImageId}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8 pt-6 border-t border-white/5">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="bg-black/40 border-white/10 hover:bg-white/10"
              >
                Previous
              </Button>
              <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="bg-black/40 border-white/10 hover:bg-white/10"
              >
                Next
              </Button>
            </div>
          )}
        </div>

        <div className="lg:col-span-1 glass-panel p-6 sticky top-24 space-y-6 h-fit">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest">Workbench</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)} className="text-primary p-0 h-6">
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          {showPreview && (
            <AnimaticPreview
              frames={allFrames.filter((s) => s.imageUrl).map((s) => ({ shotNumber: s.order, imageUrl: s.imageUrl!, duration: frameDurations[s.id] || 2 }))}
              onFrameDurationChange={(num, dur) => {
                const s = allFrames.find((f) => f.order === num);
                if (s) setFrameDurations(p => ({ ...p, [s.id]: dur }));
              }}
              audioUrl={audioUrl}
              audioVolume={audioVolume}
              onExport={handleExportAnimatic}
              isExporting={isExportingAnimatic}
            />
          )}
        </div>
      </div>

      {selectedImageId && selectedShot && (
        <Lightbox
          isOpen={!!selectedImageId}
          onClose={() => setSelectedImageId(null)}
          imageSrc={selectedShot.masterImageUrl || selectedShot.imageUrl || ""}
          title={`SHOT ${selectedShot.order}`}
          onNext={handleNext}
          onPrev={handlePrev}
          hasNext={selectedShotIndex < allFrames.length - 1}
          hasPrev={selectedShotIndex > 0}
        />
      )}
    </div>
  );
}
