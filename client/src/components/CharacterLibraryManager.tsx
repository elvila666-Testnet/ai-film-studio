/**
 * Character Library Manager Component
 * Manages character libraries for a brand with CRUD operations
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Lock, Unlock, Plus, Edit2 } from "lucide-react";
import { toast } from "sonner";

interface CharacterLibraryManagerProps {
  brandId: number;
}

export function CharacterLibraryManager({ brandId }: CharacterLibraryManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    imageUrl: "",
    traits: "",
  });

  const utils = trpc.useUtils();
  const { data: characters, isLoading } = trpc.casting.characterLibrary.list.useQuery({
    brandId,
  });

  const createMutation = trpc.casting.characterLibrary.create.useMutation({
    onSuccess: () => {
      utils.casting.characterLibrary.list.invalidate({ brandId });
      toast.success("Character created successfully");
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create character");
    },
  });

  const updateMutation = trpc.casting.characterLibrary.update.useMutation({
    onSuccess: () => {
      utils.casting.characterLibrary.list.invalidate({ brandId });
      toast.success("Character updated successfully");
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update character");
    },
  });

  const deleteMutation = trpc.casting.characterLibrary.delete.useMutation({
    onSuccess: () => {
      utils.casting.characterLibrary.list.invalidate({ brandId });
      toast.success("Character deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete character");
    },
  });

  const lockMutation = trpc.casting.characterLibrary.lock.useMutation({
    onSuccess: () => {
      utils.casting.characterLibrary.list.invalidate({ brandId });
      toast.success("Character locked");
    },
  });

  const unlockMutation = trpc.casting.characterLibrary.unlock.useMutation({
    onSuccess: () => {
      utils.casting.characterLibrary.list.invalidate({ brandId });
      toast.success("Character unlocked");
    },
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", imageUrl: "", traits: "" });
    setEditingId(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.description) {
      toast.error("Name and description are required");
      return;
    }

    if (editingId) {
      await updateMutation.mutateAsync({
        characterId: editingId,
        ...formData,
      });
    } else {
      await createMutation.mutateAsync({
        brandId,
        ...formData,
      });
    }
  };

  const handleEdit = (character: any) => {
    setFormData({
      name: character.name,
      description: character.description,
      imageUrl: character.imageUrl,
      traits: character.traits || "",
    });
    setEditingId(character.id);
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading characters...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Character Library</h2>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Character
        </Button>
      </div>

      {characters && characters.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((character: any) => (
            <Card key={character.id} className="relative">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{character.name}</CardTitle>
                    <CardDescription>{character.description}</CardDescription>
                  </div>
                  {character.isLocked && (
                    <Badge variant="secondary" className="gap-1">
                      <Lock className="w-3 h-3" />
                      Locked
                    </Badge>
                  )}
                </div>
              </CardHeader>

              {character.imageUrl && (
                <CardContent className="pb-2">
                  <img
                    src={character.imageUrl}
                    alt={character.name}
                    className="w-full h-40 object-cover rounded-md"
                  />
                </CardContent>
              )}

              <CardContent>
                {character.traits && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold mb-2">Traits</p>
                    <p className="text-sm text-muted-foreground">{character.traits}</p>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(character)}
                    className="gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </Button>

                  {character.isLocked ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => unlockMutation.mutate({ characterId: character.id })}
                      className="gap-1"
                    >
                      <Unlock className="w-3 h-3" />
                      Unlock
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => lockMutation.mutate({ characterId: character.id })}
                      className="gap-1"
                    >
                      <Lock className="w-3 h-3" />
                      Lock
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteMutation.mutate({ characterId: character.id })}
                    className="gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No characters yet. Create your first character to get started.
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Character" : "Add New Character"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Character Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Alex, Jordan, Sam"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the character's role and personality"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Image URL</label>
              <Input
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://example.com/character.jpg"
              />
              {formData.imageUrl && (
                <img
                  src={formData.imageUrl}
                  alt="Preview"
                  className="mt-2 w-full h-40 object-cover rounded-md"
                  onError={() => toast.error("Failed to load image")}
                />
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Traits (JSON)</label>
              <Textarea
                value={formData.traits}
                onChange={(e) => setFormData({ ...formData, traits: e.target.value })}
                placeholder='{"age": 28, "personality": "ambitious", "style": "modern"}'
                rows={2}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingId ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
