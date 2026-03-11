import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2, Star, Sparkles, User, ImageIcon, X, Maximize2, CheckCircle2, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CharacterTrainingDialog } from "./CharacterTrainingDialog";
import { useAIProcessing } from "@/lib/aiProcessingContext";

interface CharacterCastingTabProps {
  projectId: number;
}

export default function CharacterCastingTab({ projectId }: CharacterCastingTabProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const { startProcessing, stopProcessing, updateProgress } = useAIProcessing();

  const charactersQuery = trpc.characters.list.useQuery({ projectId });
  const lockedCharacterQuery = trpc.characters.getLocked.useQuery({ projectId });
  const projectQuery = trpc.projects.get.useQuery({ id: projectId });

  const lockCharacterMutation = trpc.characters.lock.useMutation();
  const unlockCharacterMutation = trpc.characters.unlock.useMutation();
  const deleteCharacterMutation = trpc.characters.delete.useMutation();
  const updateCharacterMutation = trpc.characters.update.useMutation();
  const generateOptionsMutation = trpc.casting.characterLibrary.generateOptions.useMutation();
  const generateCharacterOptionImageMutation = trpc.casting.characterLibrary.generateCharacterOptionImage.useMutation();

  const [isGeneratingOptions, setIsGeneratingOptions] = useState(false);
  const [characterNotes, setCharacterNotes] = useState<Record<number, string>>({});
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [isUploadingRef, setIsUploadingRef] = useState<number | null>(null);
  const [validationResult, setValidationResult] = useState<{ approved: boolean; feedback: string } | null>(null);

  const validateCastingMutation = trpc.directorV2.validateCasting.useMutation();

  const handleCharacterNoteChange = (id: number, note: string) => {
    setCharacterNotes(prev => ({ ...prev, [id]: note }));
  };

  const handleGenerateCharacterImage = async (characterId: number) => {
    setGeneratingId(characterId);
    try {
      const notes = characterNotes[characterId] || "";
      const isRefinement = !!notes;
      startProcessing(isRefinement ? "Refining Character Identity..." : "Rendering New Talent Concept...");
      updateProgress(20);
      await generateCharacterOptionImageMutation.mutateAsync({ characterId, notes });
      updateProgress(100);
      charactersQuery.refetch();
      toast.success("Character concept rendered successfully");
    } catch (e: any) {
      toast.error(`Failed to render concept: ${e.message}`);
    } finally {
      setGeneratingId(null);
      stopProcessing();
    }
  };

  const handleGenerateOptions = async (refinementNotes?: string) => {
    setIsGeneratingOptions(true);
    try {
      console.log(`[CastingTab] Initiating Discover Talent. projectId=${projectId} refinement=${!!refinementNotes}`);
      startProcessing(refinementNotes ? "Refining Talent Discovery..." : "Discovering Talent from Script...");
      updateProgress(30);
      await generateOptionsMutation.mutateAsync({ 
        projectId, 
        brandId: projectQuery.data?.project?.brandId || undefined, 
        targetDemographic: "Script Characters", 
        count: 4,
        refinementNotes
      });
      updateProgress(100);
      console.log(`[CastingTab] Discover Talent completed. Refetching characters...`);
      charactersQuery.refetch();
      toast.success(refinementNotes ? "Talent selection refined" : "Talent profiles discovered from Script");
      if (refinementNotes) setValidationResult(null); // Clear feedback after successful refinement
    } catch (e: any) {
      console.error("[CastingTab] Discovery failed:", e);
      toast.error(`Discovery failed: ${e.message}`);
    } finally {
      setIsGeneratingOptions(false);
      stopProcessing();
    }
  };

  const handleAttendFeedback = () => {
    if (!validationResult?.feedback) return;
    handleGenerateOptions(validationResult.feedback);
  };

  const handleValidateCasting = async () => {
    const lockedChars = (lockedCharacterQuery.data || []) as any[];
    if (lockedChars.length === 0) return toast.error("Lock at least one talent first");

    try {
      const charUrls = lockedChars.map(c => c.imageUrl).filter(url => url && url !== "draft");
      const result = await validateCastingMutation.mutateAsync({
        projectId,
        castingOutput: `Validated ${lockedChars.length} characters: ${lockedChars.map(c => c.name).join(", ")}`,
        characterUrls: charUrls
      });
      setValidationResult(result);
      if (result.approved) {
        toast.success("✅ Director approved the casting!");
      } else {
        toast.warning(`Director feedback: ${result.feedback}`);
      }
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="production-node-title tracking-tight">Casting</h2>
          <p className="production-label text-primary">Stage 3: Vision & Talent</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleValidateCasting}
            disabled={validateCastingMutation.isPending || !lockedCharacterQuery.data}
            variant="outline"
            className="border-purple-500/30 text-purple-400 bg-purple-500/5 hover:bg-purple-500/10"
          >
            {validateCastingMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            Send to Director
          </Button>

          <Button onClick={() => handleGenerateOptions()} disabled={isGeneratingOptions} className="bg-primary text-white hover:bg-primary/80">
            {isGeneratingOptions ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Discover Talent (AI)
          </Button>
          <CharacterTrainingDialog projectId={projectId} />
        </div>
      </div>

      {validationResult && (
        <div className={`p-4 rounded-2xl border text-sm font-medium ${validationResult.approved
          ? "bg-green-500/10 border-green-500/20 text-green-300"
          : "bg-amber-500/10 border-amber-500/20 text-amber-300"
          }`}>
          <div className="flex items-start gap-4">
            {validationResult.approved ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
            <div className="space-y-3 flex-1">
              <div className="space-y-1">
                <span className="font-black uppercase tracking-widest text-[10px] opacity-50">Director Verdict</span>
                <p className="leading-relaxed">
                  {validationResult.approved ? "Director approved the casting selection." : validationResult.feedback}
                </p>
              </div>
              
              {!validationResult.approved && (
                <Button 
                  onClick={handleAttendFeedback}
                  disabled={isGeneratingOptions}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold h-10 rounded-xl flex items-center gap-2"
                >
                  {isGeneratingOptions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Attend Director Feedback
                </Button>
              )}
            </div>
          </div>
        </div>
      )}



      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-panel p-6 bg-studio-gradient border-primary/20 relative">
            <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-primary fill-primary" /> Production Cast
            </h3>
            {lockedCharacterQuery.isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4 bg-primary/5 rounded-3xl border border-primary/10 animate-pulse">
                <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" />
                <div className="text-center">
                  <p className="text-[10px] uppercase font-black tracking-[0.3em] text-primary">Synchronizing Production Cast</p>
                  <p className="text-[9px] uppercase font-bold tracking-widest text-slate-500 mt-1">Verifying Ledger Persistence...</p>
                </div>
              </div>
            ) : Array.isArray(lockedCharacterQuery.data) && lockedCharacterQuery.data.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lockedCharacterQuery.data.map((char: any) => (
                  <div key={char.id} className="flex gap-4 items-start bg-black/20 p-4 rounded-3xl border border-white/5 group/cast">
                    <div className="relative group/img cursor-pointer flex-shrink-0" onClick={() => setLightboxUrl(char.imageUrl)}>
                      <img src={char.imageUrl} className="w-24 h-32 rounded-2xl object-contain border-2 border-primary transition-transform hover:scale-[1.02]" alt={char.name} />
                      <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-all rounded-2xl flex items-center justify-center">
                        <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex justify-between items-start">
                        <h2 className="text-sm font-black italic tracking-tight truncate">{char.name}</h2>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => unlockCharacterMutation.mutate({ projectId })}
                          className="h-6 w-6 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                          title="Unlock Talent"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-slate-400 text-[10px] line-clamp-3 leading-relaxed">{char.description}</p>
                      <div className="pt-2">
                        <span className="text-[8px] uppercase tracking-tighter bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">Locked for Continuity</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-3xl opacity-50">
                <User className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">No Production Cast Locked</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {charactersQuery.data?.map((c: any) => (
              <div key={c.id} className={`group glass-panel p-4 flex gap-4 transition-all hover:bg-white/5 ${c.isLocked ? "border-primary" : "border-white/5"}`}>
                {c.imageUrl === "draft" ? (
                  <div className="w-16 h-16 rounded-xl border border-dashed border-white/20 bg-white/5 flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-white/20" />
                  </div>
                ) : (
                  <img src={c.imageUrl} className="w-32 max-h-48 rounded-xl object-contain border border-white/10 flex-shrink-0 cursor-pointer hover:border-primary/50 transition-colors" alt={c.name} onClick={() => setLightboxUrl(c.imageUrl)} />
                )}
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <div className="flex justify-between">
                    <div className="font-bold text-sm truncate">{c.name}</div>
                    <Trash2 className="w-3 h-3 text-slate-600 hover:text-red-500 cursor-pointer" onClick={() => deleteCharacterMutation.mutate({ id: c.id })} />
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-2">{c.description}</p>

                  <div className="flex gap-2 items-center">
                    <div className="flex-1 space-y-2 mt-1">
                      <Input
                        placeholder="Note: 'More beard', 'Business suit', etc."
                        className="h-7 text-[10px] bg-black/20 border-white/10"
                        value={characterNotes[c.id] || ""}
                        onChange={(e) => handleCharacterNoteChange(c.id, e.target.value)}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleGenerateCharacterImage(c.id)}
                        disabled={generatingId === c.id}
                        className="w-full h-7 text-[9px] uppercase font-bold bg-primary/20 text-primary hover:bg-primary hover:text-white"
                      >
                        {generatingId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : c.imageUrl === "draft" ? "Render Persona (AI)" : "Regenerate / Refine"}
                      </Button>
                    </div>

                    <div className="flex-shrink-0 space-y-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 border-white/10 bg-white/5 hover:bg-white/10 relative overflow-hidden group/ref"
                        disabled={isUploadingRef === c.id}
                        onClick={() => document.getElementById(`ref-upload-${c.id}`)?.click()}
                      >
                        {isUploadingRef === c.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        ) : c.referenceImageUrl ? (
                          <img 
                            src={c.referenceImageUrl} 
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform" 
                            alt="Reference"
                            onError={(e) => {
                              console.error("Ref image load error:", c.referenceImageUrl);
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors" />
                        )}
                      </Button>
                      <input
                        type="file"
                        id={`ref-upload-${c.id}`}
                        className="hidden"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          setIsUploadingRef(c.id);
                          const reader = new FileReader();
                          reader.readAsDataURL(file);
                          reader.onload = async () => {
                            const base64 = reader.result as string;
                            try {
                              console.log(`[CastingTab] Uploading reference for character ${c.id}...`);
                              await updateCharacterMutation.mutateAsync({
                                id: c.id,
                                referenceImageUrl: base64
                              });
                              
                              await Promise.all([
                                charactersQuery.refetch(),
                                lockedCharacterQuery.refetch()
                              ]);
                              
                              toast.success("Reference attached to talent");
                            } catch (err: any) {
                              console.error("[CastingTab] Upload failed:", err);
                              toast.error(`Upload failed: ${err.message}`);
                            } finally {
                              setIsUploadingRef(null);
                              // Reset input so same file can be selected again
                              e.target.value = '';
                            }
                          };
                        }}
                      />
                      <div className="text-[8px] uppercase tracking-tighter text-center text-slate-500 font-bold">Reference</div>
                    </div>
                  </div>

                  {!c.isLocked && (
                    <Button
                      size="sm"
                      onClick={() => lockCharacterMutation.mutate({ projectId, characterId: c.id })}
                      className="w-full h-7 text-[9px] uppercase font-black bg-white/5 hover:bg-primary tracking-[0.2em] mt-1"
                    >
                      {c.imageUrl === "draft" ? "Lock Profile (No Image)" : "Cast Lead"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full-Screen Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-8 animate-fade-in"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-6 right-6 z-60 text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full p-2"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="text-center space-y-3" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxUrl}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl border border-white/10 shadow-2xl"
              alt="4K Character Reference"
            />
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold">4K Storyboard Reference · Click outside to close</p>
          </div>
        </div>
      )}
    </div>
  );
}
