import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Zap, Grid3x3, Download, Plus } from "lucide-react";
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
  const [selectedFrame, setSelectedFrame] = useState<StoryboardFrame | null>(null);
  const [selectedFrameId, setSelectedFrameId] = useState<number | null>(null);
  const [renderingFrame, setRenderingFrame] = useState<number | null>(null);
  const [generatingMoments, setGeneratingMoments] = useState<number | null>(null);

  // Fetch storyboard frames (first images)
  const storyboardQuery = trpc.storyboard.getImages.useQuery({ projectId });
  const frames = (storyboardQuery.data || []).filter((img: any) => img.shotNumber < 1000);

  // Mutations
  const render4kMutation = trpc.shotDesigner.render4kFrame.useMutation({
    onSuccess: (data) => {
      setSelectedFrame(data);
      toast.success("4K frame rendered successfully!");
    },
    onError: (error) => {
      toast.error(`Rendering failed: ${error.message}`);
    },
  });

  const generateMomentsMutation = trpc.shotDesigner.generateMoments.useMutation({
    onSuccess: () => {
      toast.success("Shot moments generated successfully!");
    },
    onError: (error) => {
      toast.error(`Generation failed: ${error.message}`);
    },
  });

  const handleFrameSelect = (frame: any) => {
    setSelectedFrameId(frame.id);
    setSelectedFrame(null); // Reset 4K version
  };

  const handleRender4k = async () => {
    if (!selectedFrameId) {
      toast.error("Please select a frame first");
      return;
    }

    requestApproval(0.25, async () => {
      try {
        setRenderingFrame(selectedFrameId);
        toast.info("Rendering 4K frame with Nanobanana 2.0...");
        await render4kMutation.mutateAsync({
          projectId,
          frameId: selectedFrameId,
        });
      } catch (e) {
        console.error("Render 4K failed:", e);
      } finally {
        setRenderingFrame(null);
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
        toast.info("Generating 4 additional moments for this shot...");
        await generateMomentsMutation.mutateAsync({
          projectId,
          frameId: selectedFrameId,
          momentCount: 4,
        });
      } catch (e) {
        console.error("Generate moments failed:", e);
      } finally {
        setGeneratingMoments(null);
      }
    });
  };

  return (
    <div className="space-y-12 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="production-node-title tracking-tighter text-white">Shot Designer</h2>
          <p className="production-label text-primary">Stage 5: Individual Shot Development</p>
        </div>
        <div className="flex gap-2">
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
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Grid3x3 className="h-5 w-5 text-primary" />
                Storyboard Frames
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-2">
                Select a frame to render in 4K and generate moments
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 max-h-[600px] overflow-y-auto">
                {frames.map((frame: any) => (
                  <button
                    key={frame.id}
                    onClick={() => handleFrameSelect(frame)}
                    className={`relative group overflow-hidden rounded-lg border-2 transition-all ${
                      selectedFrameId === frame.id
                        ? "border-primary bg-primary/10"
                        : "border-primary/20 hover:border-primary/50"
                    }`}
                  >
                    <img
                      src={frame.imageUrl}
                      alt={`Shot ${frame.shotNumber}`}
                      className="w-full h-24 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-xs font-bold">Shot {frame.shotNumber}</span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Shot Designer Interface */}
        <div className="lg:col-span-2 space-y-6">
          {/* 4K Frame Display */}
          <Card className="border-primary/20 bg-black/40">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                4K Frame Rendering
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedFrame ? (
                <div className="space-y-4">
                  <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                    <img
                      src={selectedFrame.imageUrl}
                      alt="4K Rendered Frame"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 right-4 bg-black/80 px-3 py-1 rounded-full">
                      <span className="text-white text-xs font-bold">4K UHD</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 border-primary/50 text-primary hover:bg-primary hover:text-white font-black rounded-xl"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download 4K
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-primary/50 text-primary hover:bg-primary hover:text-white font-black rounded-xl"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add to Sequence
                    </Button>
                  </div>
                </div>
              ) : selectedFrameId ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                  <p>Click "Render 4K" to generate high-resolution frame</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Grid3x3 className="h-8 w-8 mb-4 opacity-50" />
                  <p>Select a frame from the storyboard to begin</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Render & Generate Controls */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={handleRender4k}
              disabled={!selectedFrameId || renderingFrame === selectedFrameId}
              className="bg-primary hover:bg-primary/90 text-white font-black h-12 rounded-xl"
            >
              {renderingFrame === selectedFrameId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Render 4K Frame
            </Button>
            <Button
              onClick={handleGenerateMoments}
              disabled={!selectedFrame || generatingMoments === selectedFrameId}
              className="bg-primary/20 hover:bg-primary/30 text-primary font-black h-12 rounded-xl border border-primary/50"
            >
              {generatingMoments === selectedFrameId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Moments
            </Button>
          </div>

          {/* Generated Moments */}
          <Card className="border-primary/20 bg-black/40">
            <CardHeader>
              <CardTitle className="text-lg text-white">Shot Moments</CardTitle>
              <p className="text-xs text-muted-foreground mt-2">
                Additional frames generated for this shot
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-black/60 rounded-lg aspect-video border border-primary/20 flex items-center justify-center"
                  >
                    <span className="text-muted-foreground text-sm">Moment {i}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
