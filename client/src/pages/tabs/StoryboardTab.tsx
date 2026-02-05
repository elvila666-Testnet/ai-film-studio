import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, RotateCcw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AnimaticPreview } from "@/components/AnimaticPreview";
import { AudioUpload } from "@/components/AudioUpload";

interface StoryboardPrompt {
  shot: number;
  prompt: string;
  notes: string;
}

interface TechnicalShot {
  shot: number;
  tipo_plano: string;
  accion: string;
  intencion: string;
}

interface StoryboardTabProps {
  projectId: number;
}

export default function StoryboardTab({ projectId }: StoryboardTabProps) {
  const [storyboard, setStoryboard] = useState<StoryboardPrompt[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [generatingImageIndex, setGeneratingImageIndex] = useState<number | null>(null);
  const [isExportingAnimatic, setIsExportingAnimatic] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>();
  const [audioVolume, setAudioVolume] = useState(100);
  const [frameDurations, setFrameDurations] = useState<Record<number, number>>({});

  const projectQuery = trpc.projects.get.useQuery({ id: projectId });
  const imagesQuery = trpc.storyboard.getImages.useQuery({ projectId });
  const updateMutation = trpc.projects.updateContent.useMutation();
  const saveImageMutation = trpc.storyboard.saveImage.useMutation();
  const generateImageMutation = trpc.ai.generateStoryboardImage.useMutation();
  const generateImagePromptMutation = trpc.ai.generateImagePrompt.useMutation();
  const refinePromptMutation = trpc.ai.refineImagePrompt.useMutation();
  const exportAnimaticMutation = trpc.editor.exportAnimatic.useMutation();
  const getAnimaticConfigQuery = trpc.editor.getAnimaticConfig.useQuery({ projectId });
  const saveAnimaticConfigMutation = trpc.editor.saveAnimaticConfig.useMutation();

  useEffect(() => {
    if (projectQuery.data?.content?.storyboardPrompts) {
      try {
        const parsed = JSON.parse(projectQuery.data.content.storyboardPrompts);
        setStoryboard(Array.isArray(parsed) ? parsed : []);
      } catch {
        setStoryboard([]);
      }
    }
  }, [projectQuery.data]);

  useEffect(() => {
    if (getAnimaticConfigQuery.data) {
      if (getAnimaticConfigQuery.data.frameDurations) {
        setFrameDurations(JSON.parse(getAnimaticConfigQuery.data.frameDurations));
      }
      if (getAnimaticConfigQuery.data.audioUrl) {
        setAudioUrl(getAnimaticConfigQuery.data.audioUrl);
      }
      if (getAnimaticConfigQuery.data.audioVolume) {
        setAudioVolume(getAnimaticConfigQuery.data.audioVolume);
      }
    }
  }, [getAnimaticConfigQuery.data]);

  const handleUpdatePrompt = (
    index: number,
    field: keyof StoryboardPrompt,
    value: string
  ) => {
    const newStoryboard = [...storyboard];
    newStoryboard[index] = { ...newStoryboard[index], [field]: value };
    setStoryboard(newStoryboard);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateMutation.mutateAsync({
        projectId,
        storyboardPrompts: JSON.stringify(storyboard),
      });
      toast.success("Storyboard saved successfully");
    } catch (error) {
      console.error("Failed to save storyboard:", error);
      toast.error("Failed to save storyboard");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateAllImages = async () => {
    if (storyboard.length === 0) {
      toast.error("No storyboard prompts to generate images for");
      return;
    }

    for (let i = 0; i < storyboard.length; i++) {
      await generateSingleImage(i);
    }
  };

  const generateSingleImage = async (index: number) => {
    const item = storyboard[index];
    if (!item?.prompt.trim()) {
      toast.error(`Please add a prompt for shot ${item?.shot}`);
      return;
    }

    setGeneratingImageIndex(index);
    try {
      const result = await generateImageMutation.mutateAsync({
        prompt: item.prompt,
      });
      const imageUrl = typeof result === 'string' ? result : result.url;
      await saveImageMutation.mutateAsync({
        projectId,
        shotNumber: item.shot,
        imageUrl,
        prompt: item.prompt,
      });
      imagesQuery.refetch();
      toast.success(`Image generated for shot ${item.shot}`);
    } catch (error) {
      console.error("Failed to generate image:", error);
      toast.error("Failed to generate image");
    } finally {
      setGeneratingImageIndex(null);
    }
  };

  const handleRegenerateImage = async (index: number) => {
    const item = storyboard[index];
    if (!item?.notes.trim()) {
      toast.error("Please add direction notes for refinement");
      return;
    }

    setGeneratingImageIndex(index);
    try {
      const refinedPrompt = await refinePromptMutation.mutateAsync({
        prompt: item.prompt,
        notes: item.notes,
      });

      handleUpdatePrompt(index, "prompt", refinedPrompt);

      const variationIndex = ((item as any).generationVariant || 0) + 1;
      const result = await generateImageMutation.mutateAsync({
        prompt: refinedPrompt,
        variationIndex,
      });
      const imageUrl = typeof result === 'string' ? result : result.url;

      await saveImageMutation.mutateAsync({
        projectId,
        shotNumber: item.shot,
        imageUrl,
        prompt: refinedPrompt,
      });

      imagesQuery.refetch();
      toast.success(`Image regenerated for shot ${item.shot}`);
    } catch (error) {
      console.error("Failed to regenerate image:", error);
      toast.error("Failed to regenerate image");
    } finally {
      setGeneratingImageIndex(null);
    }
  };

  const getImageForShot = (shotNumber: number) => {
    return imagesQuery.data?.find((img) => img.shotNumber === shotNumber);
  };

  const handleInitializeStoryboard = async () => {
    const technicalShotsContent = projectQuery.data?.content?.technicalShots;

    if (!technicalShotsContent) {
      toast.error("Please generate technical shots first");
      return;
    }

    setIsInitializing(true);
    try {
      const shots: TechnicalShot[] = JSON.parse(technicalShotsContent);
      const newStoryboard: StoryboardPrompt[] = [];

      // Create simple prompts based on shot information without calling AI
      for (const shot of shots) {
        const simplePrompt = `${shot.tipo_plano}: ${shot.accion}. ${shot.intencion}`;
        newStoryboard.push({
          shot: shot.shot,
          prompt: simplePrompt,
          notes: "",
        });
      }

      setStoryboard(newStoryboard);
      await updateMutation.mutateAsync({
        projectId,
        storyboardPrompts: JSON.stringify(newStoryboard),
      });
      projectQuery.refetch();
      toast.success("Storyboard initialized successfully");
    } catch (error) {
      console.error("Failed to initialize storyboard:", error);
      toast.error("Failed to initialize storyboard");
    } finally {
      setIsInitializing(false);
    }
  };

  const handleExportAnimatic = async () => {
    if (storyboard.length === 0) {
      toast.error("No storyboard to export");
      return;
    }

    const images = imagesQuery.data || [];
    if (images.length === 0) {
      toast.error("No images generated yet. Please generate images first.");
      return;
    }

    setIsExportingAnimatic(true);
    try {
      const result = await exportAnimaticMutation.mutateAsync({
        projectId,
        durationPerFrame: 2,
        fps: 24,
        resolution: "1920x1080",
      });

      if (result.success && result.videoUrl) {
        toast.success("Animatic exported successfully!");
        // Open the video in a new tab
        window.open(result.videoUrl, "_blank");
      } else {
        toast.error("Failed to export animatic");
      }
    } catch (error) {
      console.error("Failed to export animatic:", error);
      toast.error(error instanceof Error ? error.message : "Failed to export animatic");
    } finally {
      setIsExportingAnimatic(false);
    }
  };

  return (
    <div className="production-node">
      <div className="production-node-header">
        <div className="production-node-title">Visual Storyboard</div>
        <div className="text-xs text-muted-foreground">Stage 5 of 5</div>
      </div>
      <div className="p-6 space-y-4">
        {storyboard.length === 0 ? (
          <div className="space-y-4">
            <Button
              onClick={handleInitializeStoryboard}
              disabled={isInitializing}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-sm"
              size="sm"
            >
              {isInitializing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Initialize Storyboard
            </Button>
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No storyboard initialized yet</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <Button
                onClick={handleGenerateAllImages}
                className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground rounded-sm"
                disabled={generatingImageIndex !== null}
                size="sm"
              >
                {generatingImageIndex !== null && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Generate All Images
              </Button>
              <Button
                onClick={handleExportAnimatic}
                disabled={isExportingAnimatic || (imagesQuery.data?.length ?? 0) === 0}
                className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-sm"
                size="sm"
              >
                {isExportingAnimatic && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Export Animatic
              </Button>
            </div>

            {showPreview && (
              <div className="space-y-4">
                <AnimaticPreview
                  frames={(imagesQuery.data || []).map((img, idx) => ({
                    shotNumber: img.shotNumber,
                    imageUrl: img.imageUrl,
                    duration: frameDurations[img.shotNumber] || 2,
                  }))}
                  onFrameDurationChange={(shotNumber, duration) => {
                    setFrameDurations(prev => ({ ...prev, [shotNumber]: duration }));
                  }}
                  audioUrl={audioUrl}
                  audioVolume={audioVolume}
                  onAudioVolumeChange={setAudioVolume}
                  onExport={handleExportAnimatic}
                  isExporting={isExportingAnimatic}
                />
                <AudioUpload
                  onAudioSelected={(url, fileName) => {
                    setAudioUrl(url);
                    toast.success(`Audio "${fileName}" added`);
                  }}
                  currentAudioUrl={audioUrl}
                  onRemoveAudio={() => {
                    setAudioUrl(undefined);
                    toast.success("Audio removed");
                  }}
                />
                <Button
                  onClick={() => setShowPreview(false)}
                  variant="outline"
                  className="w-full border-border"
                  size="sm"
                >
                  Close Preview
                </Button>
              </div>
            )}

            {!showPreview && (
              <Button
                onClick={() => setShowPreview(true)}
                disabled={(imagesQuery.data?.length ?? 0) === 0}
                className="w-full bg-accent/50 hover:bg-accent/70 text-accent-foreground rounded-sm"
                size="sm"
              >
                Show Preview & Settings
              </Button>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {storyboard.map((item, index) => {
                const image = getImageForShot(item.shot);
                const isGenerating = generatingImageIndex === index;

                return (
                  <div key={`shot-${item.shot}`} className="bg-input border border-border rounded-sm p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-accent text-sm">SHOT {item.shot}</h3>
                    </div>

                    {/* Image Display */}
                    <div className="bg-card rounded aspect-video flex items-center justify-center overflow-hidden relative border border-border">
                      {isGenerating && (
                        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-accent" />
                        </div>
                      )}
                      {image?.imageUrl ? (
                        <img
                          src={image.imageUrl}
                          alt={`Shot ${item.shot}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center text-muted-foreground">
                          <p className="text-xs">No image</p>
                        </div>
                      )}
                    </div>

                    {/* Prompt */}
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">
                        Prompt
                      </label>
                      <Textarea
                        value={item.prompt}
                        onChange={(e) =>
                          handleUpdatePrompt(index, "prompt", e.target.value)
                        }
                        placeholder="Image generation prompt..."
                        rows={2}
                        className="bg-card border-border rounded-sm text-xs"
                      />
                    </div>

                    {/* Direction Notes */}
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">
                        Notes
                      </label>
                      <Textarea
                        value={item.notes}
                        onChange={(e) =>
                          handleUpdatePrompt(index, "notes", e.target.value)
                        }
                        placeholder="Director notes..."
                        rows={2}
                        className="bg-card border-border rounded-sm text-xs"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => generateSingleImage(index)}
                        variant="outline"
                        size="sm"
                        className="flex-1 border-border rounded-sm text-xs"
                        disabled={isGenerating}
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Gen...
                          </>
                        ) : (
                          "Generate"
                        )}
                      </Button>

                      {image && (
                        <Button
                          onClick={() => handleRegenerateImage(index)}
                          variant="outline"
                          size="sm"
                          className="flex-1 border-border rounded-sm text-xs"
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Regen...
                            </>
                          ) : (
                            <>
                              <RotateCcw className="w-3 h-3 mr-1" />
                              Refine
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="flex gap-2 pt-4 border-t border-border">
          <Button
            onClick={handleSave}
            disabled={isSaving || storyboard.length === 0}
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-sm"
            size="sm"
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
