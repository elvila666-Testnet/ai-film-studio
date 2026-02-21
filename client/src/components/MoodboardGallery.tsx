/**
 * Moodboard Gallery Component
 * Manages moodboards with image upload and AI analysis
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, Upload, Palette, Zap, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Lightbox } from "@/components/ui/Lightbox";

interface MoodboardGalleryProps {
  brandId: number;
}

export function MoodboardGallery({ brandId }: MoodboardGalleryProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMoodboardId, setSelectedMoodboardId] = useState<number | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const utils = trpc.useUtils();
  const { data: moodboards, isLoading } = trpc.casting.moodboard.list.useQuery({
    brandId,
  });

  const { data: selectedMoodboard } = trpc.casting.moodboard.get.useQuery(
    { moodboardId: selectedMoodboardId! },
    { enabled: !!selectedMoodboardId }
  );

  const { data: moodboardImages } = trpc.casting.moodboard.getImages.useQuery(
    { moodboardId: selectedMoodboardId! },
    { enabled: !!selectedMoodboardId }
  );

  const { data: moodboardAnalysis } = trpc.casting.moodboard.getAnalysis.useQuery(
    { moodboardId: selectedMoodboardId! },
    { enabled: !!selectedMoodboardId }
  );

  const createMutation = trpc.casting.moodboard.create.useMutation({
    onSuccess: () => {
      utils.casting.moodboard.list.invalidate({ brandId });
      toast.success("Moodboard created successfully");
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create moodboard");
    },
  });

  const addImageMutation = trpc.casting.moodboard.addImage.useMutation({
    onSuccess: () => {
      if (selectedMoodboardId) {
        utils.casting.moodboard.getImages.invalidate({ moodboardId: selectedMoodboardId });
        utils.casting.moodboard.getAnalysis.invalidate({ moodboardId: selectedMoodboardId });
      }
      toast.success("Image added successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add image");
    },
  });

  const deleteMutation = trpc.casting.moodboard.delete.useMutation({
    onSuccess: () => {
      utils.casting.moodboard.list.invalidate({ brandId });
      setSelectedMoodboardId(null);
      toast.success("Moodboard deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete moodboard");
    },
  });

  const resetForm = () => {
    setFormData({ name: "", description: "" });
    setIsDialogOpen(false);
  };

  const handleCreateMoodboard = async () => {
    if (!formData.name) {
      toast.error("Moodboard name is required");
      return;
    }

    await createMutation.mutateAsync({
      brandId,
      ...formData,
    });
  };

  const _handleAddImage = async (imageUrl: string, description?: string) => {
    void _handleAddImage;
    if (!selectedMoodboardId) {
      toast.error("Please select a moodboard first");
      return;
    }

    await addImageMutation.mutateAsync({
      moodboardId: selectedMoodboardId,
      imageUrl,
      description,
    });
  };

  const autoSynthesizeMutation = trpc.casting.moodboard.autoSynthesize.useMutation({
    onSuccess: () => {
      if (selectedMoodboardId) {
        utils.casting.moodboard.getImages.invalidate({ moodboardId: selectedMoodboardId });
        utils.casting.moodboard.getAnalysis.invalidate({ moodboardId: selectedMoodboardId });
      }
      setIsSynthesisDialogOpen(false);
      toast.success("Mood board generated");
    },
    onError: (error) => {
      toast.error("Synthesis failed: " + error.message);
    }
  });

  const { data: characters } = trpc.casting.characterLibrary.list.useQuery({ brandId });
  const [isSynthesisDialogOpen, setIsSynthesisDialogOpen] = useState(false);
  const [synthesisConfig, setSynthesisConfig] = useState<{
    concept: string;
    selectedCharacterIds: number[];
  }>({ concept: "", selectedCharacterIds: [] });

  const handleAutoSynthesize = async () => {
    if (!selectedMoodboardId || !synthesisConfig.concept) return;

    await autoSynthesizeMutation.mutateAsync({
      brandId,
      moodboardId: selectedMoodboardId,
      concept: synthesisConfig.concept,
      characterIds: synthesisConfig.selectedCharacterIds
    });
  };

  const toggleCharacterSelection = (id: number) => {
    setSynthesisConfig(prev => {
      const exists = prev.selectedCharacterIds.includes(id);
      return {
        ...prev,
        selectedCharacterIds: exists
          ? prev.selectedCharacterIds.filter(cid => cid !== id)
          : [...prev.selectedCharacterIds, id]
      };
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading moodboards...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Moodboards</h2>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Moodboard
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Moodboard List */}
        <div className="space-y-2">
          <h3 className="font-semibold mb-4">Your Moodboards</h3>
          {moodboards && moodboards.length > 0 ? (
            <div className="space-y-2">
              {moodboards.map((moodboard: unknown) => (
                <Card
                  key={moodboard.id}
                  className={`cursor-pointer transition-colors ${selectedMoodboardId === moodboard.id
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/50"
                    }`}
                  onClick={() => setSelectedMoodboardId(moodboard.id)}
                >
                  <CardContent className="pt-4">
                    <h4 className="font-medium">{moodboard.name}</h4>
                    {moodboard.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {moodboard.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-4 text-center text-muted-foreground text-sm">
                No moodboards yet
              </CardContent>
            </Card>
          )}
        </div>

        {/* Moodboard Details */}
        {selectedMoodboardId && selectedMoodboard && (
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="images" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="images">Images</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
              </TabsList>

              {/* Images Tab */}
              <TabsContent value="images" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Reference Images</h3>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/10" onClick={() => setIsSynthesisDialogOpen(true)}>
                      <Zap className="w-4 h-4" />
                      Auto-Synthesize
                    </Button>
                    <Button size="sm" className="gap-2">
                      <Upload className="w-4 h-4" />
                      Add Image
                    </Button>
                  </div>
                </div>

                {moodboardImages && moodboardImages.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {moodboardImages.map((image: unknown) => (
                      <Card
                        key={image.id}
                        className="overflow-hidden group relative cursor-pointer"
                        onClick={() => setSelectedImageIndex(moodboardImages.indexOf(image))}
                      >
                        <img
                          src={image.imageUrl}
                          alt="Moodboard"
                          className="w-full h-32 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button variant="destructive" size="icon" onClick={(e) => { e.stopPropagation(); /* Add delete image logic */ }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        {image.description && (
                          <CardContent className="pt-2">
                            <p className="text-xs text-muted-foreground">
                              {image.description}
                            </p>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No images yet. Add images to analyze style and color palette.
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Analysis Tab */}
              <TabsContent value="analysis" className="space-y-4">
                {moodboardAnalysis ? (
                  <div className="space-y-4">
                    {/* Color Palette */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Palette className="w-4 h-4" />
                          Color Palette
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-4 gap-2">
                          {moodboardAnalysis.dominantColors?.map((color: string) => (
                            <div
                              key={color}
                              className="flex flex-col items-center gap-2"
                            >
                              <div
                                className="w-12 h-12 rounded border"
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-xs font-mono">{color}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Composition Patterns */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          Composition Patterns
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {moodboardAnalysis.commonPatterns?.map((pattern: string) => (
                            <Badge key={pattern} variant="secondary">
                              {pattern}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Visual Guidelines */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Visual Guidelines</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64 whitespace-pre-wrap">
                          {moodboardAnalysis.overallGuidelines}
                        </pre>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      Add images to generate analysis
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>

            {/* Delete Moodboard */}
            <div className="flex justify-end">
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate({ moodboardId: selectedMoodboardId })}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Moodboard
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Moodboard Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Moodboard</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Moodboard Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Sci-Fi Aesthetic, Minimalist Design"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the visual direction and mood"
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateMoodboard}
                disabled={createMutation.isPending}
              >
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auto-Synthesis Dialog */}
      <Dialog open={isSynthesisDialogOpen} onOpenChange={setIsSynthesisDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Auto-Synthesize Aesthetics</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Concept / Mood</label>
              <Textarea
                value={synthesisConfig.concept}
                onChange={(e) => setSynthesisConfig(prev => ({ ...prev, concept: e.target.value }))}
                placeholder="Describe the desired aesthetic (e.g. 'Cyberpunk street market at night, neon lights, rain'). The brand DNA will be automatically applied."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Include Characters (Optional)</label>
              <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto p-1">
                {characters?.map((char: unknown) => (
                  <div
                    key={char.id}
                    onClick={() => toggleCharacterSelection(char.id)}
                    className={`p-2 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${synthesisConfig.selectedCharacterIds.includes(char.id) ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0">
                      {char.imageUrl && <img src={char.imageUrl} className="w-full h-full object-cover" />}
                    </div>
                    <span className="text-xs truncate font-medium">{char.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsSynthesisDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAutoSynthesize} disabled={autoSynthesizeMutation.isPending || !synthesisConfig.concept}>
                {autoSynthesizeMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Synthesize
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Lightbox */}
      <Lightbox
        isOpen={selectedImageIndex !== null}
        onClose={() => setSelectedImageIndex(null)}
        imageSrc={selectedImageIndex !== null && moodboardImages ? moodboardImages[selectedImageIndex]?.imageUrl : ""}
        title={selectedImageIndex !== null && moodboardImages ? (moodboardImages[selectedImageIndex]?.description || "") : ""}
        onNext={() => setSelectedImageIndex(prev => prev !== null && moodboardImages && prev < moodboardImages.length - 1 ? prev + 1 : prev)}
        onPrev={() => setSelectedImageIndex(prev => prev !== null && prev > 0 ? prev - 1 : prev)}
        hasNext={selectedImageIndex !== null && moodboardImages ? selectedImageIndex < moodboardImages.length - 1 : false}
        hasPrev={selectedImageIndex !== null && selectedImageIndex > 0}
      />
    </div>
  );
}
