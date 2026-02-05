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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, Upload, Palette, Zap } from "lucide-react";
import { toast } from "sonner";

interface MoodboardGalleryProps {
  brandId: number;
}

export function MoodboardGallery({ brandId }: MoodboardGalleryProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMoodboardId, setSelectedMoodboardId] = useState<number | null>(null);
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

  const handleAddImage = async (imageUrl: string, description?: string) => {
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
              {moodboards.map((moodboard: any) => (
                <Card
                  key={moodboard.id}
                  className={`cursor-pointer transition-colors ${
                    selectedMoodboardId === moodboard.id
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
                  <Button size="sm" className="gap-2">
                    <Upload className="w-4 h-4" />
                    Add Image
                  </Button>
                </div>

                {moodboardImages && moodboardImages.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {moodboardImages.map((image: any) => (
                      <Card key={image.id} className="overflow-hidden">
                        <img
                          src={image.imageUrl}
                          alt="Moodboard"
                          className="w-full h-32 object-cover"
                        />
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
                        <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
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
    </div>
  );
}
