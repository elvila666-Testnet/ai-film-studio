import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Save, CheckCircle2, Lock, Unlock, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useCostGuard } from "@/components/FinOps/CostGuard";
import { ScriptRefinementPanel } from "@/features/Project/ScriptRefinementPanel";
import { ScreenplayEditor } from "@/features/Project/ScreenplayEditor";

interface ScriptTabProps {
  projectId: number;
}

/** Status badge chip */
function StatusBadge({ status }: { status?: string | null }) {
  if (!status || status === "draft") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-slate-800 text-slate-400 border border-white/10">
      Draft
    </span>
  );
  if (status === "pending_review") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/30">
      <AlertCircle className="w-2.5 h-2.5" /> Pending Review
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-green-500/20 text-green-400 border border-green-500/30">
      <CheckCircle2 className="w-2.5 h-2.5" /> Approved
    </span>
  );
}

export default function ScriptTab({ projectId }: ScriptTabProps) {
  const [synopsis, setSynopsis] = useState("");
  const [script, setScript] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [validationFeedback, setValidationFeedback] = useState<{ isValid: boolean, message: string } | null>(null);
  const { requestApproval } = useCostGuard();

  const projectQuery = trpc.projects.get.useQuery({ id: projectId });
  const statusQuery = trpc.scriptWriter.getStatus.useQuery({ projectId });
  const utils = trpc.useUtils();

  // New pipeline routers
  const validateBriefMutation = trpc.scriptWriter.validateBrief.useMutation();
  const generateSynopsisMutation = trpc.scriptWriter.generateSynopsis.useMutation();
  const generateScriptMutation = trpc.scriptWriter.generateScript.useMutation();
  const refineScriptMutation = trpc.scriptWriter.refineScript.useMutation();
  const approveScriptMutation = trpc.scriptWriter.approveScript.useMutation({
    onSuccess: () => {
      statusQuery.refetch();
      toast.success("✅ Script approved! Director can now start the technical breakdown.");
    }
  });
  const updateMutation = trpc.projects.updateContent.useMutation();

  const scriptStatus = statusQuery.data?.scriptStatus;
  const isApproved = scriptStatus === "approved";

  useEffect(() => {
    if (projectQuery.data?.content?.synopsis) setSynopsis(projectQuery.data.content.synopsis);
    if (projectQuery.data?.content?.script) setScript(projectQuery.data.content.script);
    if (projectQuery.data?.content?.brandValidationFeedback) {
      try {
        JSON.parse(projectQuery.data.content.brandValidationFeedback);
        setValidationFeedback({ isValid: true, message: projectQuery.data.content.brandValidationFeedback });
      } catch (e) {
        setValidationFeedback({ isValid: false, message: projectQuery.data.content.brandValidationFeedback });
      }
    }
  }, [projectQuery.data]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateMutation.mutateAsync({ projectId, script });
      toast.success("Script saved to vault");
    } catch { toast.error("Failed to save script"); }
    finally { setIsSaving(false); }
  };

  const handleValidateBrief = async () => {
    const brief = projectQuery.data?.content?.brief;
    if (!brief) { toast.error("Add a project brief in the Project Vault first"); return; }
    
    try {
      const result = await validateBriefMutation.mutateAsync({ projectId, brief });
      setValidationFeedback({ isValid: result.isValid, message: result.feedback });
      utils.projects.get.invalidate({ id: projectId });
      if (result.isValid) {
        toast.success("Brief validated against Brand DNA!");
      } else {
        toast.warning("Brief validation concerns found.");
      }
    } catch (e: any) { toast.error(e.message || "Validation failed"); }
  };

  const handleGenerateSynopsis = () => {
    const brief = projectQuery.data?.content?.brief;
    if (!brief) { toast.error("Add a project brief first"); return; }
    if (validationFeedback && !validationFeedback.isValid) {
      toast.error("Please address the validation feedback before generating.");
    }
    
    requestApproval(0.01, async () => {
      try {
        const result = await generateSynopsisMutation.mutateAsync({ projectId, brief });
        setSynopsis(result.synopsis);
        utils.projects.get.invalidate({ id: projectId });
        statusQuery.refetch();
        toast.success("Synopsis generated");
      } catch (e: any) { toast.error(e.message || "Synopsis failed"); }
    });
  };

  const handleGenerateScript = () => {
    const brief = projectQuery.data?.content?.brief;
    if (!synopsis.trim() && !brief?.trim()) {
      toast.error("Insufficient narrative foundation: Add a project brief in the workspace or generate a synopsis first.");
      return;
    }

    requestApproval(0.05, async () => {
      try {
        const result = await generateScriptMutation.mutateAsync({ 
          projectId, 
          synopsis: synopsis.trim() || undefined 
        });
        setScript(result.script);
        await updateMutation.mutateAsync({ projectId, script: result.script });
        utils.projects.get.invalidate({ id: projectId });
        statusQuery.refetch();
        toast.success("Script generated — ready for review");
      } catch (e: any) { 
        console.error("Script generation failed:", e);
        toast.error(e.message || "Generation failed"); 
      }
    });
  };

  const handleRefineScript = async (notes: string): Promise<void> => {
    if (!script.trim()) { toast.error("No script to refine"); return; }
    requestApproval(0.015, async () => {
      try {
        const result = await refineScriptMutation.mutateAsync({ projectId, script, notes });
        setScript(result.script);
        await updateMutation.mutateAsync({ projectId, script: result.script });
        statusQuery.refetch();
        toast.success("Script refined");
      } catch (e: any) { toast.error(e.message || "Refinement failed"); }
    });
  };

  const handleApprove = async () => {
    if (!script) { toast.error("Generate a script first"); return; }
    await approveScriptMutation.mutateAsync({ projectId });
  };

  return (
    <div className="space-y-8 animate-fade-in mb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-8 gap-6">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-1 italic">Genesis Node</p>
          <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none flex items-center gap-4">
            Phase 2: Screenplay Construction
            <StatusBadge status={scriptStatus} />
          </h2>
          <p className="text-[11px] text-slate-500 uppercase font-bold tracking-widest mt-2">
            Constructing the literary foundation and narrative architecture.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isApproved && (
            <>
              <Button 
                 onClick={handleValidateBrief} 
                 disabled={validateBriefMutation.isPending}
                 variant="outline"
                 className="h-12 border-blue-500/30 text-blue-500 hover:bg-blue-500/10 rounded-xl px-6 font-black uppercase text-[10px] tracking-widest transition-all"
              >
                {validateBriefMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Validate Brief
              </Button>

              <Button 
                 onClick={handleGenerateSynopsis} 
                 disabled={generateSynopsisMutation.isPending}
                 variant="outline"
                 className="h-12 border-amber-500/30 text-amber-500 hover:bg-amber-500/10 rounded-xl px-6 font-black uppercase text-[10px] tracking-widest transition-all"
              >
                {generateSynopsisMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {synopsis ? "Regen Synopsis" : "Generate Synopsis"}
              </Button>
              
              <Button 
                onClick={handleSave} 
                disabled={isSaving || !script} 
                variant="outline"
                className="h-12 border-white/10 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl px-6 font-black uppercase text-[10px] tracking-widest transition-all"
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save
              </Button>

              <Button 
                onClick={handleGenerateScript} 
                disabled={generateScriptMutation.isPending}
                className="h-12 bg-primary hover:bg-primary/90 text-white rounded-xl px-8 font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-primary/20"
              >
                {generateScriptMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {script ? "Re-generate Draft" : "Generate Draft"}
              </Button>
            </>
          )}

          {/* Approve / Unlock gate */}
          {!isApproved ? (
            <Button
              onClick={handleApprove}
              disabled={!script || approveScriptMutation.isPending}
              className="h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-8 font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-emerald-500/20 border border-emerald-400/50"
            >
              {approveScriptMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
              Approve Script
            </Button>
          ) : (
            <Button
              onClick={async () => { 
                try {
                  await trpc.useUtils().client.scriptWriter.unlockScript.mutate({ projectId });
                  toast.success("Script Unlocked. Edit mode enabled.");
                  statusQuery.refetch();
                } catch {
                  toast.error("Failed to unlock script");
                }
              }}
              variant="secondary"
              className="h-12 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl px-8 font-black uppercase text-[10px] tracking-widest transition-all"
            >
              <Unlock className="w-4 h-4 mr-2" /> Edit Mode
            </Button>
          )}
        </div>
      </div>

      {/* Locked banner */}
      {isApproved && (
        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
          <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
          <p className="text-sm text-green-300 font-medium">
            Script approved and locked. Head to <strong>Director's Office</strong> to run the technical breakdown.
          </p>
        </div>
      )}

      {/* Validation Feedback Banner */}
      {validationFeedback && !isApproved && (
        <div className={`flex items-start gap-4 p-5 rounded-2xl border ${validationFeedback.isValid ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
          {validationFeedback.isValid ? (
             <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
          ) : (
             <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <h4 className={`text-sm font-bold uppercase tracking-widest mb-2 ${validationFeedback.isValid ? 'text-green-400' : 'text-red-400'}`}>
               Creative Director Feedback {validationFeedback.isValid ? '(Approved)' : '(Issues Found)'}
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-mono">
              {validationFeedback.message}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <ScreenplayEditor
          synopsis={synopsis}
          onSynopsisChange={setSynopsis}
          script={script}
          onScriptChange={setScript}
          isLocked={isApproved}
        />
        <div className="space-y-6">
          <ScriptRefinementPanel
            onRefine={handleRefineScript}
            isPending={refineScriptMutation.isPending}
            disabled={isApproved}
          />
        </div>
      </div>
    </div>
  );
}
