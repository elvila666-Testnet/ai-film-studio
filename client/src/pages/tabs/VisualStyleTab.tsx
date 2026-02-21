import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, PenTool, Save, Eye } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { VisualStyleGuidePreview } from "@/components/VisualStyleGuidePreview";
import { MoodboardGallery } from "@/components/MoodboardGallery";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface VisualStyleTabProps {
  projectId: number;
}

export default function VisualStyleTab({ projectId }: VisualStyleTabProps) {
  const [masterVisual, setMasterVisual] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingStyleGuide, setIsGeneratingStyleGuide] = useState(false);
  const [generatedStyleGuide, setGeneratedStyleGuide] = useState<any>(null);

  // Progress states
  const [visualProgress, setVisualProgress] = useState(0);
  const [styleGuideProgress, setStyleGuideProgress] = useState(0);

  const projectQuery = trpc.projects.get.useQuery({ id: projectId });
  const utils = trpc.useUtils();
  const updateMutation = trpc.projects.updateContent.useMutation();
  const generateVisualMutation = trpc.ai.generateVisualStyle.useMutation();
  const refineVisualMutation = trpc.ai.refineVisualStyle.useMutation();
  const generateStyleGuideMutation = trpc.ai.generateStyleGuide.useMutation();
  const generateStoryboardImageMutation = trpc.ai.generateStoryboardImage.useMutation();

  useEffect(() => {
    if (projectQuery.data?.content?.masterVisual) {
      setMasterVisual(projectQuery.data.content.masterVisual);
    }
  }, [projectQuery.data]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateMutation.mutateAsync({
        projectId,
        masterVisual,
      });
      utils.projects.get.invalidate({ id: projectId });
      toast.success("Visual identity stored");
    } catch (error) {
      console.error("Failed to save visual style:", error);
      toast.error("Sync failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateVisual = async () => {
    const scriptContent = projectQuery.data?.content?.script;
    if (!scriptContent?.trim()) {
      toast.error("Screenplay required for visual analysis");
      return;
    }

    let interval: NodeJS.Timeout | undefined;
    try {
      setVisualProgress(10);
      interval = setInterval(() => {
        setVisualProgress((prev) => Math.min(prev + 5, 90));
      }, 800);

      const visual = await generateVisualMutation.mutateAsync({
        projectId,
        brandId: projectQuery.data?.project?.brandId || undefined,
        script: scriptContent,
      });

      const visualContent = typeof visual === "string" ? visual : (visual as any).content || visual;

      setMasterVisual(visualContent);
      await updateMutation.mutateAsync({ projectId, masterVisual: visualContent });
      utils.projects.get.invalidate({ id: projectId });

      if (interval) clearInterval(interval);
      setVisualProgress(100);
      toast.success("Aesthetic DNA generated");
    } catch (error) {
      if (interval) clearInterval(interval);
      setVisualProgress(0);
      console.error("Failed to generate visual style:", error);
      toast.error("Visual generation failed");
    }
  };

  const handleRefineVisual = async () => {
    if (!masterVisual.trim()) {
      toast.error("Establish base style first");
      return;
    }
    if (!notes.trim()) {
      toast.error("Clarify refinement intent");
      return;
    }
    try {
      const refined = await refineVisualMutation.mutateAsync({
        projectId,
        brandId: projectQuery.data?.project?.brandId || undefined,
        visualStyle: masterVisual,
        notes,
      });
      const refinedContent = typeof refined === "string" ? refined : (refined as any).content || refined;
      setMasterVisual(refinedContent);
      await updateMutation.mutateAsync({ projectId, masterVisual: refinedContent });
      utils.projects.get.invalidate({ id: projectId });
      setNotes("");
      toast.success("Aesthetic refined");
    } catch (error) {
      console.error("Failed to refine visual style:", error);
      toast.error("Refinement logic failed");
    }
  };

  const handleGenerateStyleGuide = async () => {
    if (!masterVisual.trim()) {
      toast.error("Generate Aesthetic DNA first");
      return;
    }

    let interval: NodeJS.Timeout | undefined;
    try {
      setIsGeneratingStyleGuide(true);
      setStyleGuideProgress(10);
      interval = setInterval(() => {
        setStyleGuideProgress((prev) => Math.min(prev + 5, 90));
      }, 800);

      toast.info("Analyzing script and visual style...");

      const scriptContent = projectQuery.data?.content?.script || "";
      const styleGuide = await generateStyleGuideMutation.mutateAsync({
        script: scriptContent,
        visualStyle: masterVisual,
        projectId
      });

      // Initial set without images
      const initialGuide = {
        ...styleGuide,
        visualReferences: [],
        generatedAt: new Date(),
      };

      if (interval) clearInterval(interval);
      setStyleGuideProgress(90); // Keep at 90 while generating images

      setGeneratedStyleGuide(initialGuide);
      toast.success("Style structure generated. Creating mood board...");

      // Generate images for visual references
      if (styleGuide.visualReferencePrompts && Array.isArray(styleGuide.visualReferencePrompts)) {
        const generatedImages: string[] = [];
        const prompts = styleGuide.visualReferencePrompts.slice(0, 4); // Limit to 4 images

        for (let i = 0; i < prompts.length; i++) {
          try {
            toast.info(`Generating mood board image ${i + 1}/${prompts.length}...`);
            const result = await generateStoryboardImageMutation.mutateAsync({
              prompt: prompts[i]
            });

            if (result && result.url) {
              generatedImages.push(result.url);
              // Progressive update
              setGeneratedStyleGuide((prev: unknown) => ({
                ...prev,
                visualReferences: [...generatedImages]
              }));
            }
            // Increment progress slightly for each image
            setStyleGuideProgress((prev) => Math.min(prev + 2, 99));
          } catch (imgError) {
            console.error(`Failed to generate image ${i}:`, imgError);
          }
        }
        setStyleGuideProgress(100);
        toast.success("Mood board complete");
      } else {
        setStyleGuideProgress(100);
      }
    } catch (error) {
      if (interval) clearInterval(interval);
      setStyleGuideProgress(0);
      console.error("Failed to generate style guide:", error);
      toast.error("Style guide generation failed");
    } finally {
      setIsGeneratingStyleGuide(false);
    }
  };

  return (
    <div className="space-y-12 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="production-node-title">Cinematography Design</h2>
          <p className="production-label text-primary">Stage 4: Aesthetic Framework</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={isSaving || !masterVisual}
            variant="outline"
            className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Manifest
          </Button>
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleGenerateVisual}
              disabled={generateVisualMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-white font-bold"
            >
              {generateVisualMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {masterVisual ? "Regenerate Style" : "Materialize Style"}
            </Button>
            {generateVisualMutation.isPending && (
              <Progress value={visualProgress} className="h-1 bg-slate-800 w-full" />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-1 rounded-3xl overflow-hidden">
            <Textarea
              placeholder="Define high-level aesthetic: Lighting, Composition, Color Palette..."
              value={masterVisual}
              onChange={(e) => setMasterVisual(e.target.value)}
              className="min-h-[500px] w-full bg-transparent border-none focus-visible:ring-0 text-slate-200 text-sm leading-relaxed p-8 resize-none"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="production-label">Mood Board & Visual References</h3>
            </div>

            {projectQuery.data?.project?.brandId ? (
              <MoodboardGallery brandId={projectQuery.data.project.brandId} />
            ) : (
              <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground">
                Project has no associated brand.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-8 space-y-6">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2 mb-4">
                <PenTool className="w-4 h-4 text-primary" />
                Stylistic Refinement
              </h3>
              <Textarea
                placeholder="e.g. 'Shift toward a more desaturated look', 'Add anamorphic lens flares'..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[150px] bg-white/[0.03] border-white/5 text-sm"
              />
            </div>

            <Button
              onClick={handleRefineVisual}
              disabled={refineVisualMutation.isPending || !notes.trim()}
              className="w-full h-12 bg-white text-black hover:bg-primary hover:text-white font-bold"
            >
              {refineVisualMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Evolve Aesthetic"}
            </Button>
          </div>

          <div className="glass-panel p-8 space-y-4">
            <div className="space-y-2">
              <Button
                onClick={handleGenerateStyleGuide}
                disabled={isGeneratingStyleGuide}
                variant="outline"
                className="w-full border-primary/20 hover:bg-primary/10 text-primary-foreground"
              >
                {isGeneratingStyleGuide ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
                Preview Style Guide
              </Button>
              {isGeneratingStyleGuide && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400 uppercase">
                    <span>Synthesizing Aesthetic...</span>
                    <span>{Math.round(styleGuideProgress)}%</span>
                  </div>
                  <Progress value={styleGuideProgress} className="h-1 bg-slate-800" />
                </div>
              )}
            </div>

            {generatedStyleGuide && (
              <div className="pt-4  animate-in fade-in slide-in-from-top-4 duration-500">
                <VisualStyleGuidePreview styleGuide={generatedStyleGuide} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
