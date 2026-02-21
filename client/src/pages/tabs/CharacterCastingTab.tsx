import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, Unlock, Star, Sparkles, User, ImageIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CharacterTrainingDialog } from "./CharacterTrainingDialog";

interface CharacterCastingTabProps {
  projectId: number;
}

export default function CharacterCastingTab({ projectId }: CharacterCastingTabProps) {
  const [characterName, setCharacterName] = useState("");
  const [characterDescription, setCharacterDescription] = useState("");
  const [characterImageUrl, setCharacterImageUrl] = useState("");
  const [isHero, setIsHero] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isCreatingCharacter, setIsCreatingCharacter] = useState(false);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);

  const charactersQuery = trpc.characters.list.useQuery({ projectId });
  const lockedCharacterQuery = trpc.characters.getLocked.useQuery({ projectId });
  const projectQuery = trpc.projects.get.useQuery({ id: projectId });

  const createCharacterMutation = trpc.characters.create.useMutation();
  const lockCharacterMutation = trpc.characters.lock.useMutation();
  const unlockCharacterMutation = trpc.characters.unlock.useMutation();
  const deleteCharacterMutation = trpc.characters.delete.useMutation();
  const generateImageMutation = trpc.ai.generateCharacterImage.useMutation();
  const generateNanoMutation = trpc.ai.generateCharacterNano.useMutation();
  const generateOptionsMutation = trpc.casting.characterLibrary.generateOptions.useMutation();
  const generateMoodboardMutation = trpc.casting.moodboard.generateMoodboard.useMutation();

  const [moodboardUrl, setMoodboardUrl] = useState<string | null>(null);
  const [isGeneratingMoodboard, setIsGeneratingMoodboard] = useState(false);
  const [isGeneratingOptions, setIsGeneratingOptions] = useState(false);

  const handleGenerateMoodboard = async () => {
    const brandId = projectQuery.data?.project?.brandId;
    if (!brandId) return toast.error("Set Brand Intelligence first");
    setIsGeneratingMoodboard(true);
    try {
      const res = await generateMoodboardMutation.mutateAsync({ brandId, style: "Cinematic, luxury" });
      setMoodboardUrl(res.imageUrl);
      toast.success("Moodboard synthesized");
    } catch (e) { toast.error("Moodboard failed"); } finally { setIsGeneratingMoodboard(false); }
  };

  const handleGenerateOptions = async () => {
    const brandId = projectQuery.data?.project?.brandId;
    if (!brandId) return toast.error("Set Brand Intelligence first");
    setIsGeneratingOptions(true);
    try {
      await generateOptionsMutation.mutateAsync({ brandId, targetDemographic: "Modern luxury", count: 4 });
      charactersQuery.refetch();
      toast.success("Talent profiles discovered");
    } catch (e) { toast.error("Discovery failed"); } finally { setIsGeneratingOptions(false); }
  };

  const handleCreateCharacter = async () => {
    if (!characterName || !characterDescription || !characterImageUrl) return toast.error("Fill all details");
    setIsCreatingCharacter(true);
    try {
      await createCharacterMutation.mutateAsync({ projectId, name: characterName, description: characterDescription, imageUrl: characterImageUrl, isHero });
      setCharacterName(""); setCharacterDescription(""); setCharacterImageUrl(""); setIsHero(false);
      charactersQuery.refetch();
      toast.success("Character added");
    } finally { setIsCreatingCharacter(false); }
  };

  const handleGenerateImage = async () => {
    if (!characterName || !characterDescription) return toast.error("Enter name/desc");
    setIsGeneratingImage(true);
    try {
      if (referenceImages.length > 0) {
        toast.info("Synthesizing Nano Pro Reference Sheet...");
        const res = await generateNanoMutation.mutateAsync({ name: characterName, description: characterDescription, referenceImages });
        setCharacterImageUrl(res.imageUrl);
        toast.success("Nano Pro Reference Sheet generated");
      } else {
        const res = await generateImageMutation.mutateAsync({ name: characterName, description: characterDescription });
        setCharacterImageUrl(res.imageUrl);
        toast.success("Standard Portrait generated");
      }
    } catch (e: any) {
      toast.error(`Generation failed: ${e.message}`);
    } finally { setIsGeneratingImage(false); }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    Promise.all(files.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });
    })).then(base64Images => {
      setReferenceImages(prev => [...prev, ...base64Images]);
      toast.success(`${files.length} references attached for Nano Pro`);
    }).catch(err => {
      toast.error("Failed to read image files");
    });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="production-node-title tracking-tight">Casting & Moodboard</h2>
          <p className="production-label text-primary">Stage 3: Vision & Talent</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleGenerateMoodboard} disabled={isGeneratingMoodboard} className="border-primary/50 text-primary bg-primary/5 hover:bg-primary/10">
            {isGeneratingMoodboard ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ImageIcon className="w-4 h-4 mr-2" />}
            Synthesize Moodboard
          </Button>
          <Button onClick={handleGenerateOptions} disabled={isGeneratingOptions} className="bg-primary text-white hover:bg-primary/80">
            {isGeneratingOptions ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Discover Talent (AI)
          </Button>
          <CharacterTrainingDialog projectId={projectId} />
        </div>
      </div>

      {moodboardUrl && (
        <div className="glass-panel p-2 overflow-hidden border-primary/20">
          <img src={moodboardUrl} className="w-full h-64 object-cover rounded-xl" alt="Moodboard" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 glass-panel p-6 space-y-4 h-fit">
          <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> Recruit</h3>
          <div className="space-y-4">
            <Input placeholder="Character Name" value={characterName} onChange={(e) => setCharacterName(e.target.value)} className="bg-white/5 border-white/10" />
            <Textarea placeholder="Biology/Style Profile" value={characterDescription} onChange={(e) => setCharacterDescription(e.target.value)} className="bg-white/5 border-white/10 min-h-[100px] text-sm" />
            <div className="flex gap-2">
              <Input placeholder="Image URL (Optional)" value={characterImageUrl} onChange={(e) => setCharacterImageUrl(e.target.value)} className="bg-white/5 border-white/10" />
              <Button onClick={() => document.getElementById('ref-upload')?.click()} variant="outline" className="border-white/10 px-3 bg-white/5 hover:bg-white/10">
                <ImageIcon className="w-4 h-4 mr-2" />
                {referenceImages.length > 0 ? `${referenceImages.length} Ref` : "Ref"}
              </Button>
              <input type="file" id="ref-upload" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />

              <Button onClick={handleGenerateImage} disabled={isGeneratingImage} className="bg-white text-black hover:bg-primary hover:text-white px-3 flex-shrink-0">
                {isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              </Button>
            </div>
            {referenceImages.length > 0 && (
              <div className="flex gap-2 overflow-x-auto py-2">
                {referenceImages.map((src, i) => (
                  <div key={i} className="relative w-12 h-12 flex-shrink-0">
                    <img src={src} className="w-full h-full object-cover rounded-md border border-white/10" />
                    <div className="absolute -top-2 -right-2 bg-red-500 rounded-full w-4 h-4 flex items-center justify-center cursor-pointer" onClick={() => setReferenceImages(prev => prev.filter((_, idx) => idx !== i))}>
                      <Trash2 className="w-2 h-2 text-white" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {characterImageUrl && <img src={characterImageUrl} className="w-full aspect-square object-cover rounded-xl border border-white/10" alt="Preview" />}
            <Button onClick={handleCreateCharacter} disabled={isCreatingCharacter || !characterImageUrl} className="w-full bg-primary font-bold">{isCreatingCharacter ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign to Production"}</Button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 bg-studio-gradient border-primary/20 relative">
            {lockedCharacterQuery.data ? (
              <div className="flex gap-6 items-center">
                <img src={lockedCharacterQuery.data.imageUrl} className="w-32 h-32 rounded-3xl object-cover border-2 border-primary" alt="Lead" />
                <div className="flex-1 space-y-2">
                  <h2 className="text-2xl font-black italic tracking-tight">{lockedCharacterQuery.data.name} <Star className="inline w-5 h-5 text-primary fill-primary" /></h2>
                  <p className="text-slate-400 text-xs line-clamp-2">{lockedCharacterQuery.data.description}</p>
                  <Button variant="outline" size="sm" onClick={() => unlockCharacterMutation.mutate({ projectId })} className="h-7 text-[10px] uppercase border-red-500/20 text-red-400 font-bold hover:bg-red-500/10">Unlock for Casting</Button>
                </div>
              </div>
            ) : <div className="py-8 text-center text-slate-500 uppercase tracking-widest text-[10px] font-bold">No Lead Talent Locked</div>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {charactersQuery.data?.map((c: unknown) => (
              <div key={c.id} className={`group glass-panel p-4 flex gap-4 transition-all hover:bg-white/5 ${c.isLocked ? "border-primary" : "border-white/5"}`}>
                <img src={c.imageUrl} className="w-16 h-16 rounded-xl object-cover border border-white/10" alt={c.name} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between"><div className="font-bold text-sm truncate">{c.name}</div><Trash2 className="w-3 h-3 text-slate-600 hover:text-red-500 cursor-pointer" onClick={() => deleteCharacterMutation.mutate({ id: c.id })} /></div>
                  <p className="text-[10px] text-slate-500 line-clamp-1 mb-2">{c.description}</p>
                  {!c.isLocked && <Button size="sm" onClick={() => lockCharacterMutation.mutate({ projectId, characterId: c.id })} className="w-full h-7 text-[9px] uppercase font-black bg-white/5 hover:bg-primary tracking-[0.2em]">Cast Lead</Button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
