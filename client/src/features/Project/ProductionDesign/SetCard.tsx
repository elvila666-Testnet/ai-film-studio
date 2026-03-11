import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2, Sparkles, ImageIcon, X, Maximize2, Package } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAIProcessing } from "@/lib/aiProcessingContext";

interface SetCardProps {
  projectId: number;
  set: any;
  onDelete: () => void;
  onRefresh: () => void;
  onLightbox: (url: string) => void;
}

export function SetCard({ projectId, set, onDelete, onRefresh, onLightbox }: SetCardProps) {
  const [notes, setNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { startProcessing, stopProcessing, updateProgress } = useAIProcessing();

  const renderSetMutation = trpc.productionDesign.renderSet.useMutation();
  const updateSetMutation = trpc.productionDesign.updateSetReference.useMutation();
  const [isUploadingRef, setIsUploadingRef] = useState(false);

  const handleRender = async () => {
    setIsGenerating(true);
    startProcessing(notes ? "Refining Set Visuals..." : "Architecting Set Environment...");
    updateProgress(30);
    try {
      await renderSetMutation.mutateAsync({
        projectId,
        setId: set.id,
        notes
      });
      updateProgress(100);
      onRefresh();
      toast.success("Set portrait rendered");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsGenerating(false);
      stopProcessing();
    }
  };

  return (
    <div className={`group glass-panel p-5 flex flex-col gap-6 transition-all hover:bg-white/5 border-white/5`}>
      <div className="flex flex-col gap-5">
        {set.imageUrl === "draft" ? (
          <div className="w-full aspect-video rounded-2xl border border-dashed border-white/20 bg-white/5 flex flex-col items-center justify-center gap-2">
            <Package className="w-12 h-12 text-white/20" />
            <span className="text-[10px] uppercase tracking-widest text-white/20">Empty Set</span>
          </div>
        ) : (
          <div className="relative group/img cursor-pointer w-full aspect-video" onClick={() => onLightbox(set.imageUrl)}>
            <img src={set.imageUrl} className="w-full h-full rounded-2xl object-cover border border-white/10 transition-transform hover:scale-[1.01]" alt={set.name} />
            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-all rounded-2xl flex items-center justify-center">
              <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <h3 className="font-black text-base uppercase tracking-tight truncate text-primary">{set.name}</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-8 w-8 text-slate-500 hover:text-red-500 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">{set.description}</p>
          
          <div className="flex flex-wrap gap-2 mt-2">
            {set.props?.map((prop: any) => (
              <span key={prop.id} className="text-[9px] uppercase tracking-wide bg-white/5 text-slate-400 px-3 py-1 rounded-full border border-white/10 font-bold">
                {prop.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-white/5">
        <div className="flex gap-2">
          <div className="flex-1 space-y-2">
            <Input
              placeholder="Visual notes: 'Icy textures', 'Cinematic glow'..."
              className="h-8 text-[10px] bg-black/40 border-white/10 focus:border-primary/50"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <Button
              size="sm"
              onClick={handleRender}
              disabled={isGenerating}
              className="w-full h-8 text-[9px] uppercase font-black bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all tracking-widest"
            >
              {isGenerating ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Sparkles className="w-3 h-3 mr-2" />}
              {set.imageUrl === "draft" ? "Materialize Set (AI)" : "Refine Concept"}
            </Button>
          </div>

          <div className="flex-shrink-0 space-y-1">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 border-white/10 bg-white/5 hover:bg-white/10 relative overflow-hidden group/ref"
              disabled={isUploadingRef}
              onClick={() => document.getElementById(`ref-upload-set-${set.id}`)?.click()}
            >
              {isUploadingRef ? (
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
              ) : set.referenceImageUrl ? (
                <img 
                  src={set.referenceImageUrl} 
                  className="absolute inset-0 w-full h-full object-cover group-hover/ref:scale-110 transition-transform" 
                  alt="Reference"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <ImageIcon className="w-4 h-4 text-white/40 group-hover/ref:text-white/60 transition-colors" />
              )}
            </Button>
            <input
              type="file"
              id={`ref-upload-set-${set.id}`}
              className="hidden"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                setIsUploadingRef(true);
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = async () => {
                  const base64 = reader.result as string;
                  try {
                    await updateSetMutation.mutateAsync({
                      setId: set.id,
                      imageUrl: base64
                    });
                    onRefresh();
                    toast.success("Reference shard locked");
                  } catch (err: any) {
                    toast.error(`Sync failed: ${err.message}`);
                  } finally {
                    setIsUploadingRef(false);
                    e.target.value = '';
                  }
                };
              }}
            />
            <div className="text-[7px] uppercase tracking-tighter text-center text-slate-500 font-bold">Reference</div>
          </div>
        </div>
      </div>
    </div>
  );
}
