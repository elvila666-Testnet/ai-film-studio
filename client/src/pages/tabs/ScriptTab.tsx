import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Save } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useCostGuard } from "@/components/FinOps/CostGuard";
import { ScriptRefinementPanel } from "@/features/Project/ScriptRefinementPanel";
import { ScreenplayEditor } from "@/features/Project/ScreenplayEditor";
import { Project } from "@/features/Project/types";

interface ScriptTabProps {
  projectId: number;
}

export default function ScriptTab({ projectId }: ScriptTabProps) {
  const [synopsis, setSynopsis] = useState("");
  const [script, setScript] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { requestApproval } = useCostGuard();

  const projectQuery = trpc.projects.get.useQuery({ id: projectId });
  const utils = trpc.useUtils();
  const updateMutation = trpc.projects.updateContent.useMutation();
  const generateScriptMutation = trpc.script.generateScript.useMutation();
  const generateSynopsisMutation = trpc.script.generateSynopsis.useMutation();
  const refineScriptMutation = trpc.script.refineScript.useMutation();
  const createScenesMutation = trpc.director.createScenes.useMutation();
  const toggleLockMutation = trpc.projects.toggleScriptLock.useMutation({
    onSuccess: () => {
      utils.projects.get.invalidate({ id: projectId });
      toast.success(isLocked ? "Script Unlocked" : "Script Approved & Locked");
    }
  });

  const projectData = projectQuery.data?.project as any as Project;
  const isLocked = projectData?.isScriptLocked === true;

  useEffect(() => {
    if (projectQuery.data?.content?.synopsis) {
      setSynopsis(projectQuery.data.content.synopsis);
    }
    if (projectQuery.data?.content?.script) {
      setScript(projectQuery.data.content.script);
    }
  }, [projectQuery.data]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateMutation.mutateAsync({ projectId, script });
      toast.success("Script saved to vault");
    } catch (error) {
      toast.error("Failed to save script");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateSynopsis = async () => {
    const brief = projectQuery.data?.content?.brief;
    if (!brief) {
      toast.error("Please enter a brief first");
      return;
    }

    requestApproval(0.01, async () => {
      try {
        const result = await generateSynopsisMutation.mutateAsync({ projectId, brief });
        setSynopsis(result.synopsis);
        toast.success("Synopsis generated successfully");
        utils.projects.get.invalidate({ id: projectId });
      } catch (error) {
        toast.error("Synopsis generation failed");
      }
    });
  };

  const handleGenerateScript = async () => {
    const brief = projectQuery.data?.content?.brief;
    if (!brief) {
      toast.error("Please enter a brief first");
      return;
    }

    requestApproval(0.05, async () => {
      try {
        const result = await generateScriptMutation.mutateAsync({
          projectId,
          synopsis: synopsis || undefined,
          brief: !synopsis ? brief : undefined
        });
        setScript(result.script);
        await updateMutation.mutateAsync({ projectId, script: result.script });
        utils.projects.get.invalidate({ id: projectId });
        toast.success("Script generated successfully");
      } catch (error) {
        toast.error("Script generation failed");
      }
    });
  };

  const handleRefineScript = async (notes: string) => {
    if (!script.trim()) { toast.error("No script to refine"); return; }
    requestApproval(0.015, async () => {
      try {
        const refinedResult = await refineScriptMutation.mutateAsync({
          script, notes, projectId,
          brandId: projectData?.brandId || undefined
        }) as any;
        const scriptContent = typeof refinedResult === "string" ? refinedResult : (refinedResult.content || refinedResult.script);
        if (!scriptContent) throw new Error("No content in refinement result");
        setScript(scriptContent);
        await updateMutation.mutateAsync({ projectId, script: scriptContent });
        utils.projects.get.invalidate({ id: projectId });
        toast.success("Script refined with AI");
      } catch (error) { toast.error("Refinement failed"); }
    });
  };

  const handleBreakdown = async () => {
    if (!script) return;
    requestApproval(0.05, async () => {
      try {
        await createScenesMutation.mutateAsync({ projectId, script });
        toast.success("Script broken down into scenes!");
      } catch (error) { toast.error("Analysis failed"); }
    });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="production-node-title flex items-center gap-2">
            Screenplay Construction
            {isLocked && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/30">APPROVED</span>}
          </h2>
          <p className="production-label text-primary">Stage 2: Literary Foundation</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => toggleLockMutation.mutate({ projectId, isLocked: !isLocked })} variant={isLocked ? "secondary" : "default"} className={isLocked ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/50" : "bg-green-600 hover:bg-green-700 text-white"}>
            {isLocked ? "🔓 Unlock Script" : "🔒 Approve & Lock"}
          </Button>

          {!isLocked && (
            <>
              <Button onClick={handleGenerateSynopsis} disabled={generateSynopsisMutation.isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
                {generateSynopsisMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {synopsis ? "Re-generate Synopsis" : "Generate Synopsis"}
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !script} variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-white">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Progress
              </Button>
              <Button onClick={handleGenerateScript} disabled={generateScriptMutation.isPending} className="bg-primary hover:bg-primary/90 text-white">
                {generateScriptMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {script ? "Re-generate" : "Generate Draft"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <ScreenplayEditor
          synopsis={synopsis}
          onSynopsisChange={setSynopsis}
          script={script}
          onScriptChange={setScript}
          isLocked={isLocked}
        />
        <div className="space-y-6">
          <ScriptRefinementPanel
            onRefine={handleRefineScript}
            isPending={refineScriptMutation.isPending}
            disabled={isLocked}
          />
          <div className="pt-6 border-t border-white/5">
            <Button
              onClick={handleBreakdown}
              disabled={createScenesMutation.isPending || !script || isLocked}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold h-12 border border-violet-500/50"
            >
              {createScenesMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Analyze & Break Down ($0.05)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
