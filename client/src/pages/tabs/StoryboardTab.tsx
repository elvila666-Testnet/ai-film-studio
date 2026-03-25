import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Video, X, Maximize2, ChevronLeft, ChevronRight, Clapperboard, CheckCircle2, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useCostGuard } from "@/components/FinOps/CostGuard";

interface StoryboardImage {
  id: number;
  projectId: number;
  shotNumber: number;
  imageUrl: string;
  prompt: string;
  status: string;
  masterImageUrl: string | null;
  consistencyScore: number | null;
  isConsistencyLocked: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface StoryboardTabProps {
  projectId: number;
}

export default function StoryboardTab({ projectId }: StoryboardTabProps) {
  const { requestApproval } = useCostGuard();
  const [globalInstructions, setGlobalInstructions] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pipelineResults, setPipelineResults] = useState<any>(null);

  const projectQuery = trpc.projects.get.useQuery({ id: projectId });
  const storyboardQuery = trpc.storyboard.getImages.useQuery({ projectId });
  const generateGridMutation = trpc.storyboard.generateGrid.useMutation({
    onSuccess: () => storyboardQuery.refetch(),
  });
  const runPipelineMutation = trpc.storyboard.runPipeline.useMutation();

  const handleRunPipeline = async () => {
    requestApproval(0.15, async () => {
      try {
        toast.info("Running Cinema Pipeline (7 agents)...");
        setPipelineResults(null);
        const result = await runPipelineMutation.mutateAsync({
          projectId,
          globalNotes: globalInstructions || undefined,
        });
        setPipelineResults(result);
        toast.success(`Pipeline complete: ${result.totalShotsProcessed} shots processed across ${result.scenesProcessed} scenes`);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        toast.error(`Cinema Pipeline failed: ${message}`);
      }
    });
  };

  // Grid pages are stored as shotNumber 1000+ (1000 = page 1, 1001 = page 2, etc.)
  // Also support legacy shotNumber 999 for backward compat
  const gridPages = (storyboardQuery.data as StoryboardImage[] || [])
    .filter((img: StoryboardImage) => img.shotNumber >= 999)
    .sort((a: StoryboardImage, b: StoryboardImage) => a.shotNumber - b.shotNumber);

  const totalPages = gridPages.length;
  const currentGridImage = gridPages[currentPage];

  const handleGenerateGrid = async () => {
    requestApproval(0.10, async () => {
      try {
        toast.info("Generating paginated 3×4 Storyboard Grids (Nanobanana 2.0 - Gemini 1.5 Pro)...");
        setCurrentPage(0);
        
        // Get visual style from project data if available
        const visualStyle = projectQuery.data?.content?.masterVisual || "Cinematic";
        
        await generateGridMutation.mutateAsync({
          projectId,
          globalInstructions: globalInstructions || undefined,
          visualStyle: visualStyle,
        });
        toast.success("Storyboard Grid pages materialized with Nanobanana 2.0!");
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        toast.error(`Grid synthesis failed: ${message}`);
      }
    });
  };

  return (
    <div className="space-y-12 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="production-node-title tracking-tighter text-white">Director's Vision</h2>
          <p className="production-label text-primary">Stage 4: Visual Storyboarding</p>
        </div>
        <div className="flex gap-4">
          <Button
            onClick={handleRunPipeline}
            disabled={runPipelineMutation.isPending}
            variant="outline"
            className="border-primary/50 text-primary hover:bg-primary hover:text-white font-black h-12 px-6 rounded-xl"
          >
            {runPipelineMutation.isPending ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Clapperboard className="w-5 h-5 mr-2" />
            )}
            Run Cinema Pipeline
          </Button>
          <Button
            onClick={handleGenerateGrid}
            disabled={generateGridMutation.isPending}
            className="bg-white text-black hover:bg-primary hover:text-white font-black h-12 px-8 rounded-xl shadow-lg"
          >
            {generateGridMutation.isPending ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5 mr-2" />
            )}
            {totalPages > 0 ? "Regenerate Storyboard Grids" : "Generate Storyboard Grid"}
          </Button>
        </div>
      </div>



      {/* Cinema Pipeline Results */}
      {(runPipelineMutation.isPending || pipelineResults) && (
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Clapperboard className="w-4 h-4 text-primary" />
              Cinema Pipeline Results
            </h3>
            {pipelineResults && (
              <span className="text-[10px] text-emerald-400 font-mono uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {pipelineResults.totalShotsProcessed} shots · {pipelineResults.scenesProcessed} scenes
              </span>
            )}
          </div>

          {runPipelineMutation.isPending && (
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Running 7 agents (Director → DP → PD → Sound → VFX → FinOps → Supervisor)...
            </div>
          )}

          {pipelineResults?.results?.map((r: any, i: number) => (
            <div key={i} className="bg-white/5 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">{r.sceneTitle}</span>
                <span className="text-[10px] text-slate-500 font-mono">{r.shotsProcessed} shots</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase tracking-widest text-slate-600">Continuity</span>
                  <p className="text-[11px] text-emerald-400/80 line-clamp-2">{r.continuityValidation}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] uppercase tracking-widest text-slate-600">Conflicts</span>
                  <p className={`text-[11px] line-clamp-2 ${r.conflictReport === 'None' ? 'text-emerald-400/80' : 'text-amber-400/80'}`}>
                    {r.conflictReport === 'None' ? (
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> None</span>
                    ) : (
                      <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {r.conflictReport}</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid Display */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Storyboard Grid</h3>
          <p className="text-[10px] text-slate-500 font-mono uppercase">
            {totalPages > 0
              ? `Page ${currentPage + 1} of ${totalPages} · 3×4 Grid · Click to expand`
              : "No grid generated yet"}
          </p>
        </div>

        {/* Loading State */}
        {generateGridMutation.isPending && (
          <div className="glass-panel aspect-[4/3] flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 animate-pulse" />
            <div className="relative z-10 flex flex-col items-center gap-6">
              <div className="relative">
                <Loader2 className="w-20 h-20 animate-spin text-primary" />
                <div className="absolute inset-0 blur-2xl bg-primary/20 animate-pulse rounded-full" />
              </div>
              <div className="text-center space-y-2">
                <span className="text-sm font-black text-white uppercase tracking-[0.3em] block">
                  Materializing Storyboard Grid
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest block">
                  3×4 · 16:9 · 12 Frames/Page · Nanobanana Pro · 8K HDR
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Grid Image with Pagination */}
        {!generateGridMutation.isPending && totalPages > 0 && currentGridImage && (
          <div className="space-y-4">
            <div
              className="glass-panel overflow-hidden group cursor-pointer relative"
              onClick={() => setLightboxUrl(currentGridImage.imageUrl)}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gridTemplateRows: 'repeat(4, 1fr)',
                gap: '0px',
                aspectRatio: '4 / 3',
                width: '100%',
              }}
            >
              <img
                src={currentGridImage.imageUrl}
                className="w-full h-full transition-transform duration-700 group-hover:scale-[1.01]"
                style={{
                  objectFit: 'cover',
                  objectPosition: 'center',
                  gridColumn: '1 / -1',
                  gridRow: '1 / -1',
                }}
                alt={`Storyboard Grid Page ${currentPage + 1}`}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-500 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col items-center gap-3">
                  <Maximize2 className="w-12 h-12 text-white drop-shadow-2xl" />
                  <span className="text-[10px] uppercase tracking-[0.4em] text-white font-black bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm">
                    View Full Resolution
                  </span>
                </div>
              </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className="border-white/10 bg-white/5 hover:bg-white/10 h-9 px-4"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>

                <div className="flex gap-2">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i)}
                      className={`w-8 h-8 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${currentPage === i
                        ? "bg-primary text-white shadow-lg shadow-primary/30"
                        : "bg-white/5 text-slate-500 hover:bg-white/10 hover:text-white"
                        }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage === totalPages - 1}
                  className="border-white/10 bg-white/5 hover:bg-white/10 h-9 px-4"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!generateGridMutation.isPending && totalPages === 0 && (
          <div className="glass-panel aspect-[4/3] flex flex-col items-center justify-center border-dashed border-white/10">
            <div className="text-center space-y-4">
              <div className="relative inline-block">
                <Video className="w-20 h-20 text-slate-800" />
                <div className="absolute inset-0 blur-3xl bg-primary/5" />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em]">
                  No Storyboard Grid Generated
                </p>
                <p className="text-[9px] text-slate-700 max-w-xs">
                  Click "Generate Storyboard Grid" to create paginated 3×4 16:9 tiles of all your shots. 12 frames per page.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Full-Screen Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-6 right-6 z-60 text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full p-2"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="text-center space-y-3" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxUrl}
              className="max-w-[95vw] max-h-[90vh] object-contain rounded-2xl border border-white/10 shadow-2xl"
              alt="Storyboard Grid Full Resolution"
            />
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold">
              Page {currentPage + 1} of {totalPages} · 3×4 Grid (16:9) · Nanobanana Pro · Click outside to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
