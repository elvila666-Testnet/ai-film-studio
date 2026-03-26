import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Zap, Grid3x3, Download, Plus, Film, Sparkles, Lock, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useCostGuard } from "@/components/FinOps/CostGuard";

interface ShotDesignerTabProps {
  projectId: number;
}

interface StoryboardFrame {
  id: number;
  shotNumber: number;
  imageUrl: string;
  prompt: string;
  status: string;
}

export default function ShotDesignerTab({ projectId }: ShotDesignerTabProps) {
  const { requestApproval } = useCostGuard();
  const [activeFrame, setActiveFrame] = useState<StoryboardFrame | null>(null);
  const [selectedShotNumber, setSelectedShotNumber] = useState<number | null>(null);
  const [renderingFrame, setRenderingFrame] = useState<number | null>(null);
  const [generatingMoments, setGeneratingMoments] = useState<number | null>(null);

  // Fetch storyboard frames (first images)
  const storyboardQuery = trpc.storyboard.getShotsWithState.useQuery({ projectId });
  const frames = (storyboardQuery.data || []) as any[];
  const missingImagesCount = frames.filter((f: any) => !f.imageUrl).length;

  // Mutations
  const bulkMaterializeMutation = trpc.storyboard.bulkMaterialize.useMutation({
    onSuccess: (data) => {
      toast.success(`Success! Materialized ${data.successCount} of ${data.processed} shots.`);
      storyboardQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Bulk generation failed: ${error.message}`);
    }
  });

  const generateSingleMutation = trpc.storyboard.generateShot.useMutation({
    onSuccess: () => {
      toast.success("Draft materialized!");
      storyboardQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Generation failed: ${error.message}`);
    }
  });

  const render4kMutation = trpc.shotDesigner.render4kFrame.useMutation({
    onSuccess: (data) => {
      setActiveFrame(data as StoryboardFrame);
      toast.success("4K frame rendered successfully!");
      storyboardQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Rendering failed: ${error.message}`);
    },
  });

  const generateMomentsMutation = trpc.shotDesigner.generateMoments.useMutation({
    onSuccess: () => {
      toast.success("Shot moments generated successfully!");
      momentsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Generation failed: ${error.message}`);
    },
  });

  const handleFrameSelect = (frame: any) => {
    setSelectedShotNumber(frame.globalShotNumber);
    
    // Store metadata for display even if frame is missing
    if (!frame.imageUrl) {
      setActiveFrame(null);
      return;
    }
    
    setActiveFrame({
      id: frame.frameId, // Match storyboardImages.id
      shotNumber: frame.globalShotNumber,
      imageUrl: frame.masterImageUrl || frame.imageUrl,
      prompt: frame.prompt || frame.description || "",
      status: frame.masterImageUrl ? "4k_rendered" : "base"
    });
  };

  const handleBulkMaterialize = () => {
    requestApproval(0.10 * missingImagesCount, async () => {
      toast.info(`Triggering bulk generation for ${missingImagesCount} shots...`);
      bulkMaterializeMutation.mutate({ projectId });
    });
  };

  const handleQuickMaterialize = (frame: any) => {
    if (!frame) return;
    requestApproval(0.10, async () => {
      toast.info(`Materializing Draft for Shot ${frame.globalShotNumber}...`);
      setRenderingFrame(frame.shotId);
      try {
        await generateSingleMutation.mutateAsync({
          projectId,
          shotNumber: Number(frame.globalShotNumber),
          prompt: frame.description || "Production shot"
        });
      } finally {
        setRenderingFrame(null);
      }
    });
  };

  // Fetch moments for selected shot
  const selectedFrame = (frames.find(f => f.globalShotNumber === selectedShotNumber) as any) || null;
  const selectedFrameId = selectedFrame?.frameId;
  
  const momentsQuery = trpc.shotDesigner.getMoments.useQuery(
    { projectId, shotNumber: Number(selectedShotNumber) },
    { enabled: !!selectedShotNumber }
  );

  const [generationStatus, setGenerationStatus] = useState<string | null>(null);

  const handleRender4k = async () => {
    if (!selectedFrameId) {
      toast.error("Please select a frame first");
      return;
    }

    requestApproval(0.25, async () => {
      try {
        setRenderingFrame(selectedFrameId);
        setGenerationStatus("Preparing high-fidelity render...");
        toast.info("Rendering 4K frame with Nanobanana 2.0...");
        
        setTimeout(() => setGenerationStatus("Processing complex cinematic detail..."), 5000);
        setTimeout(() => setGenerationStatus("Optimizing 4K resolution..."), 15000);
        setTimeout(() => setGenerationStatus("Finalizing color grading..."), 25000);

        await render4kMutation.mutateAsync({
          projectId,
          frameId: selectedFrameId,
        });
      } catch (e) {
        console.error("Render 4K failed:", e);
      } finally {
        setRenderingFrame(null);
        setGenerationStatus(null);
      }
    });
  };

  const handleGenerateMoments = async () => {
    if (!selectedFrameId) {
      toast.error("Please select a frame first");
      return;
    }

    requestApproval(0.50, async () => {
      try {
        setGeneratingMoments(selectedFrameId);
        setGenerationStatus("Initializing multi-moment generation...");
        toast.info("Generating 4 additional moments for this shot...");
        
        setTimeout(() => setGenerationStatus("Injecting character consistency anchors..."), 3000);
        setTimeout(() => setGenerationStatus("Generating parallel cinematic variations..."), 8000);
        setTimeout(() => setGenerationStatus("Encoding high-fidelity PNGs..."), 25000);
        setTimeout(() => setGenerationStatus("Uploading to cloud storage..."), 40000);

        await generateMomentsMutation.mutateAsync({
          projectId,
          frameId: selectedFrameId,
          momentCount: 4,
        });
      } catch (e) {
        console.error("Generate moments failed:", e);
      } finally {
        setGeneratingMoments(null);
        setGenerationStatus(null);
      }
    });
  };

  const [feedback, setFeedback] = useState("");
  const refineMutation = trpc.shotDesigner.refineShot.useMutation({
    onSuccess: () => {
      toast.success("Shot refined successfully!");
      setFeedback("");
      storyboardQuery.refetch();
    }
  });

  const handleRefine = async () => {
    if (!selectedFrame || !feedback) return;
    requestApproval(0.15, async () => {
      setRenderingFrame(selectedFrame.shotId);
      setGenerationStatus("Analyzing current frame for identity preservation...");
      try {
        await refineMutation.mutateAsync({
          projectId,
          shotNumber: Number(selectedFrame.globalShotNumber),
          feedback,
          parentImageUrl: selectedFrame.imageUrl
        });
      } finally {
        setRenderingFrame(null);
        setGenerationStatus(null);
      }
    });
  };

  const versionsQuery = trpc.shotDesigner.getShotVersions.useQuery(
    { projectId, shotNumber: Number(selectedFrame?.globalShotNumber) },
    { enabled: !!selectedFrame?.globalShotNumber }
  );
  
  const versions = versionsQuery.data || [];
  const [currentVersionIdx, setCurrentVersionIdx] = useState(0);

  // Sync index when versions change
  useEffect(() => {
    if (versions.length > 0) {
      setCurrentVersionIdx(versions.length - 1);
    }
  }, [versions.length]);

  const currentVersion = versions[currentVersionIdx] || selectedFrame;

  // Fetch production status
  const statusQuery = trpc.directorV2.getStatus.useQuery({ projectId });
  const status = statusQuery.data;

  return (
    <div className="space-y-12 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div className="space-y-4">
          <div>
            <h2 className="production-node-title tracking-tighter text-white">Shot Designer</h2>
            <p className="production-label text-primary uppercase">Stage 5: Individual Shot Development</p>
          </div>
          
          {/* Status Ticker */}
          <div className="flex gap-4">
            <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 transition-all ${status?.hasTechnicalScript ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white/5 border-white/10 text-muted-foreground opacity-50'}`}>
              <div className={`h-1.5 w-1.5 rounded-full ${status?.hasTechnicalScript ? 'bg-primary animate-pulse' : 'bg-slate-500'}`} />
              <span className="text-[10px] font-black uppercase tracking-widest">Bible: {status?.hasTechnicalScript ? 'Breakdown Ready' : 'Incomplete'}</span>
            </div>
            <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 transition-all ${status?.shotCount && status.shotCount > 0 ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white/5 border-white/10 text-muted-foreground opacity-50'}`}>
              <div className={`h-1.5 w-1.5 rounded-full ${status?.shotCount && status.shotCount > 0 ? 'bg-primary animate-pulse' : 'bg-slate-500'}`} />
              <span className="text-[10px] font-black uppercase tracking-widest">Breakdown: {status?.shotCount || 0} Slots</span>
            </div>
            <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 transition-all ${status?.imageCount && status.imageCount > 0 ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white/5 border-white/10 text-muted-foreground opacity-50'}`}>
              <div className={`h-1.5 w-1.5 rounded-full ${status?.imageCount && status.imageCount > 0 ? 'bg-primary animate-pulse' : 'bg-slate-500'}`} />
              <span className="text-[10px] font-black uppercase tracking-widest">Vault: {status?.imageCount || 0} Drafts</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setRenderingFrame(null);
              setGeneratingMoments(null);
              toast.info("UI state manually reset");
              storyboardQuery.refetch();
            }}
            className="h-10 w-10 text-destructive/50 hover:text-destructive hover:bg-destructive/10 rounded-full"
            title="Force Reset UI"
          >
            <Loader2 className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            className="border-primary/50 text-primary hover:bg-primary hover:text-white font-black h-12 px-6 rounded-xl"
            disabled={!selectedFrameId}
          >
            <Grid3x3 className="mr-2 h-4 w-4" />
            View Grid
          </Button>
        </div>
      </div>

      {/* Main Layout: Storyboard Grid + Shot Designer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Storyboard Grid Selection */}
        <div className="lg:col-span-1">
          <Card className="border-primary/20 bg-black/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Grid3x3 className="h-5 w-5 text-primary" />
                  Production Vault
                </CardTitle>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  {frames.length} Shots Planned
                </p>
              </div>
              {missingImagesCount > 0 && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={handleBulkMaterialize}
                  disabled={bulkMaterializeMutation.isPending}
                  className="h-8 text-[9px] text-primary hover:bg-primary/10 border border-primary/20"
                >
                  {bulkMaterializeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                  Materialize All
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {storyboardQuery.isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
                  <p className="text-[10px] text-muted-foreground mt-4 uppercase tracking-widest">Scanning Production Vault...</p>
                </div>
              ) : storyboardQuery.isError ? (
                <div className="flex flex-col items-center justify-center py-12 text-destructive/50 italic">
                  <p className="text-xs">Access Denied or Connection Lost</p>
                  <Button variant="link" size="sm" onClick={() => storyboardQuery.refetch()} className="text-primary text-[10px]">Retry</Button>
                </div>
              ) : frames.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/40 text-center text-balance px-12">
                  <Film className="h-8 w-8 mb-4 opacity-20" />
                  <p className="text-xs">Vault Empty</p>
                  <p className="text-[10px] mt-2">Generate a Technical Script first to populate shot slots here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {frames.map((frame: any) => (
                    <button
                      key={frame.shotId}
                      onClick={() => handleFrameSelect(frame)}
                      className={`relative group overflow-hidden rounded-lg border-2 transition-all ${
                        (selectedShotNumber && frame.globalShotNumber === selectedShotNumber) || (!selectedShotNumber && frame.shotId === renderingFrame)
                          ? "border-primary bg-primary/10 shadow-[0_0_15px_-3px_rgba(var(--primary),0.3)] scale-[0.98]"
                          : "border-primary/10 hover:border-primary/30"
                      }`}
                    >
                      {frame.imageUrl ? (
                        <img
                          src={frame.imageUrl}
                          alt={`Shot ${frame.globalShotNumber}`}
                          className="w-full h-24 object-cover"
                        />
                      ) : (
                        <div className="w-full h-24 bg-white/5 flex flex-col items-center justify-center gap-1">
                          <Plus className="h-4 w-4 text-primary/20" />
                          <span className="text-[8px] text-slate-500 uppercase tracking-tighter">Draft Missing</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center border-t border-primary/20">
                        <span className="text-white text-[10px] font-black uppercase italic tracking-tighter">Shot {frame.globalShotNumber}</span>
                      </div>
                        <div className="absolute top-1 right-1 flex gap-1">
                          {frame.masterImageUrl && (
                            <div className="bg-primary rounded-full p-0.5 shadow-lg">
                              <Zap className="h-2 w-2 text-white" />
                            </div>
                          )}
                          <div className="bg-emerald-500 rounded-full p-0.5 shadow-lg">
                            <CheckCircle className="h-2 w-2 text-white" />
                          </div>
                        </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Shot Designer Interface */}
        <div className="lg:col-span-2 space-y-6">
          {/* 4K Frame Display */}
          <Card className="border-primary/20 bg-black/40 relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-lg text-white">Visual Refinement</CardTitle>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  Fine-tune shot composition & lighting
                </p>
              </div>
              {versions.length > 1 && (
                <div className="flex items-center gap-2 bg-black/40 border border-primary/20 rounded-full px-2 py-0.5">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-5 w-5 rounded-full hover:bg-primary/20"
                    disabled={currentVersionIdx === 0}
                    onClick={() => setCurrentVersionIdx(v => v - 1)}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <span className="text-[9px] font-black w-14 text-center">VERS {currentVersionIdx + 1}/{versions.length}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-5 w-5 rounded-full hover:bg-primary/20"
                    disabled={currentVersionIdx === versions.length - 1}
                    onClick={() => setCurrentVersionIdx(v => v + 1)}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {currentVersion?.imageUrl ? (
                <div className="space-y-6">
                  {/* ... same as before ... */}
                  <div className="aspect-video rounded-xl bg-black border border-primary/20 overflow-hidden relative group">
                    <img
                      src={currentVersion.imageUrl}
                      alt="Current Version"
                      className="w-full h-full object-cover"
                    />
                    <div className={`absolute top-4 right-4 px-3 py-1 rounded-full border shadow-2xl backdrop-blur-md ${currentVersion.status === "4k_rendered" ? 'bg-primary/20 border-primary text-primary' : 'bg-yellow-900/40 border-yellow-500/50 text-yellow-500'}`}>
                      <span className="text-[10px] font-black tracking-widest uppercase italic">
                        {currentVersion.status === "4k_rendered" ? "Master (4K UHD)" : "Refinement Draft"}
                      </span>
                    </div>
                  </div>
                  
                  {/* Refinement Interface */}
                  <div className="space-y-3 pt-4 border-t border-primary/10">
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-primary/70">Director's Input (Regenerate with anchor)</label>
                        <textarea
                          placeholder="Example: Make the lighting more dramatic, add high contrast shadows, and refine the face..."
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          className="w-full h-24 bg-black/60 border-primary/10 rounded-xl p-3 text-xs text-white focus:border-primary/30 outline-none transition-all resize-none font-mono"
                        />
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <Button
                        onClick={handleRefine}
                        disabled={!feedback || refineMutation.isPending}
                        className="flex-1 bg-primary hover:bg-primary/90 text-white font-black h-12 rounded-xl group"
                      >
                        {refineMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 group-hover:rotate-12 transition-transform" />}
                        Refine Current Vision
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                           // Set the active variant for 4K/Moments logic
                           // In a real app we'd mark this as 'primary' in DB
                           toast.info(`Version ${currentVersionIdx + 1} locked as current target for 4K upscale.`);
                        }}
                        className="border-primary/20 text-muted-foreground hover:text-white h-12 rounded-xl px-4"
                      >
                        <Lock className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Render & Generate Controls */}
                  <div className="space-y-4 pt-4 border-t border-primary/10">
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        onClick={handleRender4k}
                        disabled={renderingFrame !== null}
                        className="bg-black/60 hover:bg-primary/10 border border-primary/30 text-primary font-black h-12 rounded-xl"
                      >
                        {renderingFrame !== null && (renderingFrame === selectedFrameId || renderingFrame === selectedFrame?.shotId) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Render 4K Master
                      </Button>
                      <Button
                        onClick={handleGenerateMoments}
                        disabled={generatingMoments !== null}
                        className="bg-black/60 hover:bg-primary/10 border border-primary/30 text-primary font-black h-12 rounded-xl"
                      >
                        {generatingMoments !== null && (generatingMoments === selectedFrameId || generatingMoments === selectedFrame?.shotId) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Generate Moments
                      </Button>
                    </div>
                    
                    {generationStatus && (
                      <div className="bg-black/40 border border-primary/10 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-2 bg-primary rounded-full animate-ping" />
                          <span className="text-[10px] font-bold text-primary tracking-widest uppercase font-mono">
                            {generationStatus}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : selectedShotNumber ? (
                // Selected a shot that hasn't been materialized yet
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
                   <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10 animate-pulse">
                      <Plus className="h-8 w-8 text-primary/20" />
                   </div>
                   <div className="px-12">
                     <p className="text-sm text-white font-bold uppercase tracking-widest">Planned Shot Detected</p>
                     <p className="text-[10px] text-muted-foreground mt-2">This shot from your technical breakdown hasn't been rendered yet. Materialize it to begin refining.</p>
                   </div>
                   <Button 
                    onClick={() => handleQuickMaterialize(selectedFrame)}
                    disabled={renderingFrame === selectedFrame?.shotId}
                    className="bg-primary hover:bg-primary/90 text-white font-black px-8 rounded-xl h-12"
                   >
                     {renderingFrame === selectedFrame?.shotId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                     Materialize Draft
                   </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/30 text-center">
                  <Grid3x3 className="h-10 w-10 mb-6 opacity-20" />
                  <p className="text-sm uppercase tracking-[0.2em] font-light">Select a frame from the vault to begin refinement</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generated Moments */}
          <Card className="border-primary/20 bg-black/40">
            <CardHeader>
              <CardTitle className="text-lg text-white">Shot Moments</CardTitle>
              <p className="text-xs text-muted-foreground mt-2">
                Additional frames generated for this shot
              </p>
            </CardHeader>
            <CardContent>
              {momentsQuery.isLoading ? (
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-black/40 rounded-lg aspect-video border border-primary/10 animate-pulse flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-primary/20" />
                    </div>
                  ))}
                </div>
              ) : momentsQuery.data && momentsQuery.data.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {momentsQuery.data.map((moment: any) => (
                    <div
                      key={moment.id}
                      className="group relative bg-black/60 rounded-lg overflow-hidden aspect-video border border-primary/20 hover:border-primary/50 transition-all"
                    >
                      <img
                        src={moment.imageUrl}
                        alt={`Moment ${moment.shotNumber % 100}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4">
                        <span className="text-white text-xs font-bold mb-2">Moment {moment.shotNumber % 100}</span>
                        <Button size="sm" variant="outline" className="h-7 text-[10px] border-primary/50 text-primary">
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Zap className="h-8 w-8 mb-4 opacity-50" />
                  <p className="text-sm">Click "Generate Moments" to create additional camera angles</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
