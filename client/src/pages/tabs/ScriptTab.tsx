import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface ScriptTabProps {
  projectId: number;
}

export default function ScriptTab({ projectId }: ScriptTabProps) {
  const [script, setScript] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const projectQuery = trpc.projects.get.useQuery({ id: projectId });
  const updateMutation = trpc.projects.updateContent.useMutation();
  const refineScriptMutation = trpc.ai.refineScript.useMutation();

  useEffect(() => {
    if (projectQuery.data?.content?.script) {
      setScript(projectQuery.data.content.script);
    }
  }, [projectQuery.data]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateMutation.mutateAsync({
        projectId,
        script,
      });
    } catch (error) {
      console.error("Failed to save script:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefineScript = async () => {
    if (!script.trim()) {
      alert("Please enter a script first");
      return;
    }
    if (!notes.trim()) {
      alert("Please add notes for refinement");
      return;
    }
    try {
      const refinedScript = await refineScriptMutation.mutateAsync({ script, notes });
      const scriptContent = typeof refinedScript === "string" ? refinedScript : refinedScript.content;
      await updateMutation.mutateAsync({ projectId, script: scriptContent });
      projectQuery.refetch();
    } catch (error) {
      console.error("Failed to refine script:", error);
      alert("Failed to refine script. Please try again.");
    }
  };

  return (
    <div className="production-node">
      <div className="production-node-header">
        <div className="production-node-title">Screenplay</div>
        <div className="text-xs text-muted-foreground">Stage 2 of 5</div>
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-3">
              Script
            </label>
            <Textarea
              placeholder="Enter or paste your screenplay..."
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={12}
              className="bg-input border-border text-foreground placeholder-muted-foreground rounded-sm font-mono text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-3">
              Refinement Notes
            </label>
            <Textarea
              placeholder="Add feedback for AI refinement..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={12}
              className="bg-input border-border text-foreground placeholder-muted-foreground rounded-sm text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t border-border">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-sm"
            size="sm"
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save
          </Button>
          <Button
            onClick={handleRefineScript}
            disabled={refineScriptMutation.isPending}
            className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-sm"
            size="sm"
          >
            {refineScriptMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Refine with AI
          </Button>
        </div>
      </div>
    </div>
  );
}
