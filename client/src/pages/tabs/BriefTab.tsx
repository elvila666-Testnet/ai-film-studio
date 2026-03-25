import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, FileText, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface BriefTabProps {
  projectId: number;
}

export default function BriefTab({ projectId }: BriefTabProps) {
  const [brief, setBrief] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const briefRef = useRef(brief);
  const hasUnsavedChanges = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const projectQuery = trpc.projects.get.useQuery({ id: projectId });
  const utils = trpc.useUtils();
  const updateMutation = trpc.projects.updateContent.useMutation();

  // Keep ref in sync with state
  useEffect(() => {
    briefRef.current = brief;
  }, [brief]);

  useEffect(() => {
    if (projectQuery.data?.content?.brief) {
      setBrief(projectQuery.data.content.brief);
      hasUnsavedChanges.current = false;
    }
  }, [projectQuery.data]);

  // Auto-save function (no toast to avoid noise)
  const autoSave = useCallback(async (text: string) => {
    if (!text.trim()) return;
    try {
      await updateMutation.mutateAsync({ projectId, brief: text });
      hasUnsavedChanges.current = false;
      console.log("[BriefTab] Auto-saved brief");
    } catch (e) {
      console.error("[BriefTab] Auto-save failed:", e);
    }
  }, [projectId, updateMutation]);

  // Auto-save on unmount (tab switch)
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (hasUnsavedChanges.current && briefRef.current.trim()) {
        // Fire-and-forget save on unmount
        updateMutation.mutate({ projectId, brief: briefRef.current });
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Handle brief text change with debounced auto-save
  const handleBriefChange = useCallback((value: string) => {
    setBrief(value);
    hasUnsavedChanges.current = true;
    
    // Debounce auto-save: 2 seconds after user stops typing
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      autoSave(value);
    }, 2000);
  }, [autoSave]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateMutation.mutateAsync({
        projectId,
        brief,
      });
      hasUnsavedChanges.current = false;
      utils.projects.get.invalidate({ id: projectId });
      toast.success("Strategic vision captured");
    } catch (error) {
      console.error("Failed to save brief:", error);
      toast.error("Failed to sync brief");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="production-node-title">Strategic Directive</h2>
          <p className="production-label text-primary">Stage 1: Narrative Nucleus</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving || !brief}
          className="bg-primary hover:bg-primary/90 text-white font-bold h-12 px-8 rounded-2xl shadow-lg shadow-primary/20"
        >
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Finalize Brief
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <div className="glass-panel p-1 rounded-[2rem] overflow-hidden">
            <Textarea
              placeholder="Inject your creative DNA here. Describe the setting, conflict, and soul of the film..."
              value={brief}
              onChange={(e) => handleBriefChange(e.target.value)}
              className="min-h-[500px] w-full bg-transparent border-none focus-visible:ring-0 text-slate-200 text-lg leading-relaxed p-12 resize-none placeholder:text-slate-800"
            />
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-8 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Creative Guidelines
            </h3>
            <ul className="space-y-4">
              <li className="text-[10px] text-slate-500 uppercase tracking-widest leading-loose">
                <span className="text-primary mr-2 font-black">•</span>
                Define the core conflict and stakes
              </li>
              <li className="text-[10px] text-slate-500 uppercase tracking-widest leading-loose">
                <span className="text-primary mr-2 font-black">•</span>
                Specify the visual atmosphere (Noir, Cyberpunk, etc.)
              </li>
              <li className="text-[10px] text-slate-500 uppercase tracking-widest leading-loose">
                <span className="text-primary mr-2 font-black">•</span>
                Mention key character dynamic
              </li>
            </ul>
          </div>

          <div className="glass-panel p-8 group hover:bg-primary/5 transition-all border-primary/10">
            <Sparkles className="w-6 h-6 text-primary mb-4 group-hover:scale-110 transition-transform" />
            <p className="text-xs text-slate-400 leading-relaxed">
              The AI foundation is built upon this brief. The more cinematic your description, the more refined the resulting screenplay and technical manifest will be.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
