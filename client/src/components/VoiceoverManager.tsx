/**
 * Voiceover Manager Component
 * Manages voice profiles and generates voiceovers with preview
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
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Play, Mic, Volume2, Zap } from "lucide-react";
import { toast } from "sonner";

interface VoiceoverManagerProps {
  brandId: number;
  projectId?: number;
}

export function VoiceoverManager({ brandId, projectId }: VoiceoverManagerProps) {
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [scriptText, setScriptText] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [speed, setSpeed] = useState([100]);
  const [pitch, setPitch] = useState([100]);

  const [profileFormData, setProfileFormData] = useState({
    name: "",
    elevenLabsVoiceId: "",
    description: "",
    tone: "",
  });

  const utils = trpc.useUtils();

  // Queries
  const { data: voiceProfiles, isLoading: profilesLoading } =
    trpc.casting.voiceProfile.list.useQuery({ brandId });

  const { data: availableVoices } = trpc.casting.voiceProfile.getAvailableVoices.useQuery();

  const { data: projectVoiceovers } = trpc.casting.voiceover.list.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId }
  );

  // Mutations
  const createProfileMutation = trpc.casting.voiceProfile.create.useMutation({
    onSuccess: () => {
      utils.casting.voiceProfile.list.invalidate({ brandId });
      toast.success("Voice profile created successfully");
      resetProfileForm();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create voice profile");
    },
  });

  const deleteProfileMutation = trpc.casting.voiceProfile.delete.useMutation({
    onSuccess: () => {
      utils.casting.voiceProfile.list.invalidate({ brandId });
      toast.success("Voice profile deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete voice profile");
    },
  });

  const generateVoiceoverMutation = trpc.casting.voiceover.generate.useMutation({
    onSuccess: () => {
      if (projectId) {
        utils.casting.voiceover.list.invalidate({ projectId });
      }
      toast.success("Voiceover generated successfully");
      resetGenerateForm();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate voiceover");
    },
  });

  const deleteVoiceoverMutation = trpc.casting.voiceover.delete.useMutation({
    onSuccess: () => {
      if (projectId) {
        utils.casting.voiceover.list.invalidate({ projectId });
      }
      toast.success("Voiceover deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete voiceover");
    },
  });

  const resetProfileForm = () => {
    setProfileFormData({
      name: "",
      elevenLabsVoiceId: "",
      description: "",
      tone: "",
    });
    setIsProfileDialogOpen(false);
  };

  const resetGenerateForm = () => {
    setScriptText("");
    setSelectedLanguage("en");
    setSpeed([100]);
    setPitch([100]);
    setIsGenerateDialogOpen(false);
  };

  const handleCreateProfile = async () => {
    if (!profileFormData.name || !profileFormData.elevenLabsVoiceId) {
      toast.error("Name and voice are required");
      return;
    }

    await createProfileMutation.mutateAsync({
      brandId,
      ...profileFormData,
      speed: speed[0],
      pitch: pitch[0],
    });
  };

  const handleGenerateVoiceover = async () => {
    if (!projectId) {
      toast.error("Project ID is required");
      return;
    }

    if (!scriptText.trim()) {
      toast.error("Script text is required");
      return;
    }

    if (!selectedProfileId) {
      toast.error("Please select a voice profile");
      return;
    }

    await generateVoiceoverMutation.mutateAsync({
      projectId,
      script: scriptText,
      voiceProfileId: selectedProfileId,
      language: selectedLanguage,
    });
  };

  if (profilesLoading) {
    return <div className="text-center py-8">Loading voice profiles...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="profiles" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profiles">Voice Profiles</TabsTrigger>
          <TabsTrigger value="voiceovers" disabled={!projectId}>
            Generated Voiceovers
          </TabsTrigger>
        </TabsList>

        {/* Voice Profiles Tab */}
        <TabsContent value="profiles" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Brand Voice Profiles</h3>
            <Button onClick={() => setIsProfileDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              New Profile
            </Button>
          </div>

          {voiceProfiles && voiceProfiles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {voiceProfiles.map((profile: unknown) => (
                <Card key={profile.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">{profile.name}</CardTitle>
                        <CardDescription>{profile.description}</CardDescription>
                      </div>
                      {profile.isDefault && (
                        <Badge variant="default">Default</Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Language</p>
                        <p className="font-medium">{profile.language}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tone</p>
                        <p className="font-medium">{profile.tone || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Speed</p>
                        <p className="font-medium">{profile.speed}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Pitch</p>
                        <p className="font-medium">{profile.pitch}%</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {projectId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedProfileId(profile.id);
                            setIsGenerateDialogOpen(true);
                          }}
                          className="gap-1"
                        >
                          <Mic className="w-3 h-3" />
                          Generate
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteProfileMutation.mutate({ profileId: profile.id })}
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
                No voice profiles yet. Create one to get started.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Generated Voiceovers Tab */}
        {projectId && (
          <TabsContent value="voiceovers" className="space-y-4">
            <h3 className="text-lg font-semibold">Project Voiceovers</h3>

            {projectVoiceovers && projectVoiceovers.length > 0 ? (
              <div className="space-y-3">
                {projectVoiceovers.map((voiceover: unknown) => (
                  <Card key={voiceover.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium mb-1">
                            {voiceover.language.toUpperCase()} - {Math.round(voiceover.duration / 1000)}s
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {voiceover.script}
                          </p>
                        </div>

                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(voiceover.audioUrl)}
                            className="gap-1"
                          >
                            <Play className="w-3 h-3" />
                            Play
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteVoiceoverMutation.mutate({ voiceoverId: voiceover.id })}
                            className="gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No voiceovers generated yet
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Create Voice Profile Dialog */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Voice Profile</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Profile Name</label>
              <Input
                value={profileFormData.name}
                onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })}
                placeholder="e.g., Professional, Friendly, Energetic"
              />
            </div>

            <div>
              <label className="text-sm font-medium">ElevenLabs Voice</label>
              <Select
                value={profileFormData.elevenLabsVoiceId}
                onValueChange={(value) =>
                  setProfileFormData({ ...profileFormData, elevenLabsVoiceId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  {availableVoices?.map((voice: unknown) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      {voice.name} - {voice.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Tone</label>
              <Input
                value={profileFormData.tone}
                onChange={(e) => setProfileFormData({ ...profileFormData, tone: e.target.value })}
                placeholder="e.g., professional, friendly, energetic"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={profileFormData.description}
                onChange={(e) =>
                  setProfileFormData({ ...profileFormData, description: e.target.value })
                }
                placeholder="Describe this voice profile"
                rows={2}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetProfileForm}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateProfile}
                disabled={createProfileMutation.isPending}
              >
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate Voiceover Dialog */}
      <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate Voiceover</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Script</label>
              <Textarea
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                placeholder="Enter the script for voiceover generation"
                rows={6}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Language</label>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="it">Italian</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                    <SelectItem value="ja">Japanese</SelectItem>
                    <SelectItem value="zh">Chinese</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    Speed
                  </label>
                  <span className="text-sm font-medium">{speed[0]}%</span>
                </div>
                <Slider
                  value={speed}
                  onValueChange={setSpeed}
                  min={50}
                  max={200}
                  step={10}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Pitch
                  </label>
                  <span className="text-sm font-medium">{pitch[0]}%</span>
                </div>
                <Slider
                  value={pitch}
                  onValueChange={setPitch}
                  min={50}
                  max={200}
                  step={10}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetGenerateForm}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerateVoiceover}
                disabled={generateVoiceoverMutation.isPending}
              >
                Generate Voiceover
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
