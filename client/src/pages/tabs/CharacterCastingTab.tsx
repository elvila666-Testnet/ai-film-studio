import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, Lock, Unlock, Star } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface CharacterCastingTabProps {
  projectId: number;
}

export default function CharacterCastingTab({ projectId }: CharacterCastingTabProps) {
  const [isCreatingCharacter, setIsCreatingCharacter] = useState(false);
  const [characterName, setCharacterName] = useState("");
  const [characterDescription, setCharacterDescription] = useState("");
  const [characterImageUrl, setCharacterImageUrl] = useState("");
  const [isHero, setIsHero] = useState(false);

  const charactersQuery = trpc.characters.list.useQuery({ projectId });
  const lockedCharacterQuery = trpc.characters.getLocked.useQuery({ projectId });
  const createCharacterMutation = trpc.characters.create.useMutation();
  const lockCharacterMutation = trpc.characters.lock.useMutation();
  const unlockCharacterMutation = trpc.characters.unlock.useMutation();
  const deleteCharacterMutation = trpc.characters.delete.useMutation();

  const handleCreateCharacter = async () => {
    if (!characterName.trim() || !characterDescription.trim() || !characterImageUrl.trim()) {
      alert("Please fill in all fields");
      return;
    }

    try {
      setIsCreatingCharacter(true);
      await createCharacterMutation.mutateAsync({
        projectId,
        name: characterName,
        description: characterDescription,
        imageUrl: characterImageUrl,
        isHero,
      });

      setCharacterName("");
      setCharacterDescription("");
      setCharacterImageUrl("");
      setIsHero(false);
      charactersQuery.refetch();
    } catch (error) {
      console.error("Failed to create character:", error);
      alert("Failed to create character");
    } finally {
      setIsCreatingCharacter(false);
    }
  };

  const handleLockCharacter = async (characterId: number) => {
    try {
      await lockCharacterMutation.mutateAsync({ projectId, characterId });
      charactersQuery.refetch();
      lockedCharacterQuery.refetch();
    } catch (error) {
      console.error("Failed to lock character:", error);
      alert("Failed to lock character");
    }
  };

  const handleUnlockCharacter = async () => {
    try {
      await unlockCharacterMutation.mutateAsync({ projectId });
      charactersQuery.refetch();
      lockedCharacterQuery.refetch();
    } catch (error) {
      console.error("Failed to unlock character:", error);
      alert("Failed to unlock character");
    }
  };

  const handleDeleteCharacter = async (characterId: number) => {
    if (!confirm("Delete this character?")) return;

    try {
      await deleteCharacterMutation.mutateAsync({ id: characterId });
      charactersQuery.refetch();
      lockedCharacterQuery.refetch();
    } catch (error) {
      console.error("Failed to delete character:", error);
      alert("Failed to delete character");
    }
  };

  return (
    <div className="space-y-6">
      {/* Locked Character Display */}
      {lockedCharacterQuery.data && (
        <Card className="bg-card border-border border-accent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-accent" />
                <CardTitle className="text-lg">Locked Character</CardTitle>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleUnlockCharacter}
                className="border-border text-muted-foreground hover:text-foreground"
              >
                <Unlock className="w-3 h-3 mr-1" />
                Unlock
              </Button>
            </div>
            <CardDescription>This character will be used consistently across all storyboard shots</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <div className="aspect-square rounded-sm bg-background border border-border overflow-hidden">
                  <img
                    src={lockedCharacterQuery.data.imageUrl}
                    alt={lockedCharacterQuery.data.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="md:col-span-2 space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    {lockedCharacterQuery.data.name}
                    {lockedCharacterQuery.data.isHero && (
                      <Star className="w-4 h-4 text-accent fill-accent" />
                    )}
                  </h3>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    Description
                  </label>
                  <p className="text-sm text-foreground mt-2">{lockedCharacterQuery.data.description}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Character Casting Options */}
      {charactersQuery.data && charactersQuery.data.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Character Casting Options</CardTitle>
            <CardDescription>
              {lockedCharacterQuery.data
                ? "Select a different character to change the locked character"
                : "Select a character to lock it for this project"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {charactersQuery.data.map((character) => (
                <div
                  key={character.id}
                  className={`rounded-sm border-2 overflow-hidden transition-colors ${
                    character.isLocked
                      ? "border-accent bg-accent/10"
                      : "border-border bg-background hover:border-accent/50"
                  }`}
                >
                  <div className="aspect-square overflow-hidden bg-background">
                    <img
                      src={character.imageUrl}
                      alt={character.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm text-foreground flex items-center gap-1">
                        {character.name}
                        {character.isHero && (
                          <Star className="w-3 h-3 text-accent fill-accent" />
                        )}
                      </h3>
                      {character.isLocked && (
                        <Lock className="w-3 h-3 text-accent" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {character.description}
                    </p>
                    <div className="flex gap-2 pt-2">
                      {!character.isLocked && (
                        <Button
                          size="sm"
                          onClick={() => handleLockCharacter(character.id)}
                          className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground text-xs"
                        >
                          <Lock className="w-3 h-3 mr-1" />
                          Lock
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteCharacter(character.id)}
                        className="border-border text-muted-foreground hover:text-foreground"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create New Character */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Generate Character Option</CardTitle>
          <CardDescription>Add a new character option for casting</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
              Character Name
            </label>
            <Input
              placeholder="e.g., Alex, Sarah, The CEO"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              className="bg-background border-border"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
              Character Description
            </label>
            <Textarea
              placeholder="Describe the character's appearance, personality, and role. E.g., 'A confident female executive in her 40s, wearing professional attire, with sharp features and commanding presence'"
              value={characterDescription}
              onChange={(e) => setCharacterDescription(e.target.value)}
              className="bg-background border-border min-h-20"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
              Character Image URL
            </label>
            <Input
              placeholder="URL to character reference image"
              value={characterImageUrl}
              onChange={(e) => setCharacterImageUrl(e.target.value)}
              className="bg-background border-border"
            />
            {characterImageUrl && (
              <div className="mt-3 aspect-square max-w-xs rounded-sm bg-background border border-border overflow-hidden">
                <img
                  src={characterImageUrl}
                  alt="Character preview"
                  className="w-full h-full object-cover"
                  onError={() => {
                    // Image failed to load
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isHero"
              checked={isHero}
              onChange={(e) => setIsHero(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <label htmlFor="isHero" className="text-sm text-foreground cursor-pointer">
              This is the hero/main character
            </label>
          </div>

          <Button
            onClick={handleCreateCharacter}
            disabled={isCreatingCharacter || !characterName.trim()}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {isCreatingCharacter ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Character...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Character Option
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
