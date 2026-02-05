import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Upload, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface VisualStyleTabProps {
  projectId: number;
}

export default function VisualStyleTab({ projectId }: VisualStyleTabProps) {
  const [masterVisual, setMasterVisual] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const projectQuery = trpc.projects.get.useQuery({ id: projectId });
  const referenceImagesQuery = trpc.referenceImages.list.useQuery({ projectId });
  const updateMutation = trpc.projects.updateContent.useMutation();
  const generateVisualMutation = trpc.ai.generateVisualStyle.useMutation();
  const refineVisualMutation = trpc.ai.refineVisualStyle.useMutation();
  const uploadReferenceMutation = trpc.referenceImages.upload.useMutation();
  const deleteReferenceMutation = trpc.referenceImages.delete.useMutation();

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
    } catch (error) {
      console.error("Failed to save visual style:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateVisual = async () => {
    const scriptContent = projectQuery.data?.content?.script;
    if (!scriptContent?.trim()) {
      alert("Please create a script first");
      return;
    }
    try {
      const visual = await generateVisualMutation.mutateAsync({
        script: scriptContent,
      });
      const visualContent = typeof visual === "string" ? visual : visual.content;
      setMasterVisual(visualContent);
      await updateMutation.mutateAsync({ projectId, masterVisual: visualContent });
      projectQuery.refetch();
    } catch (error) {
      console.error("Failed to generate visual style:", error);
      alert("Failed to generate visual style. Please try again.");
    }
  };

  const handleRefineVisual = async () => {
    if (!masterVisual.trim()) {
      alert("Please generate or enter a visual style first");
      return;
    }
    if (!notes.trim()) {
      alert("Please add comments for refinement");
      return;
    }
    try {
      const refined = await refineVisualMutation.mutateAsync({
        visualStyle: masterVisual,
        notes,
      });
      const refinedContent = typeof refined === "string" ? refined : (refined as any).content || refined;
      setMasterVisual(refinedContent);
      await updateMutation.mutateAsync({ projectId, masterVisual: refinedContent });
      setNotes("");
      projectQuery.refetch();
    } catch (error) {
      console.error("Failed to refine visual style:", error);
      alert("Failed to refine visual style. Please try again.");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const imageUrl = event.target?.result as string;
          await uploadReferenceMutation.mutateAsync({
            projectId,
            imageUrl,
            description: file.name,
          });
          referenceImagesQuery.refetch();
        } catch (error) {
          console.error("Failed to upload reference image:", error);
          alert("Failed to upload image. Please try again.");
        } finally {
          setIsUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Failed to read file:", error);
      alert("Failed to read image file. Please try again.");
      setIsUploadingImage(false);
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  const handleDeleteReference = async (imageId: number) => {
    try {
      await deleteReferenceMutation.mutateAsync({ imageId });
      referenceImagesQuery.refetch();
    } catch (error) {
      console.error("Failed to delete reference image:", error);
      alert("Failed to delete image. Please try again.");
    }
  };

  return (
    <div className="production-node">
      <div className="production-node-header">
        <div className="production-node-title">Cinematography & Visual Style</div>
        <div className="text-xs text-muted-foreground">Stage 3 of 5</div>
      </div>
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-3">
              Visual Style Guide
            </label>
            <Textarea
              placeholder="Color palette, lighting approach, camera movements, composition style..."
              value={masterVisual}
              onChange={(e) => setMasterVisual(e.target.value)}
              rows={12}
              className="bg-input border-border text-foreground placeholder-muted-foreground rounded-sm text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-3">
              Director Notes
            </label>
            <Textarea
              placeholder="Add feedback to refine the visual style..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={12}
              className="bg-input border-border text-foreground placeholder-muted-foreground rounded-sm text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t border-border">
          <Button
            onClick={handleGenerateVisual}
            disabled={generateVisualMutation.isPending}
            className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-sm"
            size="sm"
          >
            {generateVisualMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Generate
          </Button>
          <Button
            onClick={handleRefineVisual}
            disabled={refineVisualMutation.isPending}
            className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-sm"
            size="sm"
          >
            {refineVisualMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Refine
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-sm"
            size="sm"
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save
          </Button>
        </div>

        <div className="border-t border-border pt-6">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-4">
            Moodboard
          </label>
          <p className="text-sm text-muted-foreground mb-4">Upload visual references and mood images to establish the aesthetic direction for your production.</p>
          
          <div className="mb-4">
            <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-border rounded-sm cursor-pointer hover:bg-input/50 transition">
              <div className="flex flex-col items-center justify-center">
                <Upload className="w-5 h-5 text-accent mb-2" />
                <span className="text-xs text-muted-foreground">Click to add mood images</span>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isUploadingImage}
                className="hidden"
              />
            </label>
          </div>

          {referenceImagesQuery.data && referenceImagesQuery.data.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {referenceImagesQuery.data.map((img) => (
                <div key={img.id} className="relative group">
                  <img
                    src={img.imageUrl}
                    alt={img.description || "Mood"}
                    className="w-full h-40 object-cover rounded-sm border border-border"
                  />
                  <button
                    onClick={() => handleDeleteReference(img.id)}
                    className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-sm opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border pt-6">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-4">
            Reference Images for Nanobanana
          </label>
          
          <div className="mb-4">
            <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-border rounded-sm cursor-pointer hover:bg-input/50 transition">
              <div className="flex flex-col items-center justify-center">
                <Upload className="w-5 h-5 text-accent mb-2" />
                <span className="text-xs text-muted-foreground">Click to upload reference images</span>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isUploadingImage}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
