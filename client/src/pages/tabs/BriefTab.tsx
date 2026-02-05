import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface BriefTabProps {
  projectId: number;
}

export default function BriefTab({ projectId }: BriefTabProps) {
  const [brief, setBrief] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const projectQuery = trpc.projects.get.useQuery({ id: projectId });
  const updateMutation = trpc.projects.updateContent.useMutation();
  const generateScriptMutation = trpc.ai.generateScript.useMutation();

  useEffect(() => {
    if (projectQuery.data?.content?.brief) {
      setBrief(projectQuery.data.content.brief);
    }
  }, [projectQuery.data]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateMutation.mutateAsync({
        projectId,
        brief,
      });
    } catch (error) {
      console.error("Failed to save brief:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateScript = async () => {
    if (!brief.trim()) {
      alert("Please enter a brief first");
      return;
    }
    try {
      const script = await generateScriptMutation.mutateAsync({ brief });
      const scriptContent = typeof script === "string" ? script : script.content;
      await updateMutation.mutateAsync({ projectId, script: scriptContent });
      projectQuery.refetch();
    } catch (error) {
      console.error("Failed to generate script:", error);
      alert("Failed to generate script. Please try again.");
    }
  };

  return (
    <div className="production-node">
      <div className="production-node-header">
        <div className="production-node-title">Project Brief</div>
        <div className="text-xs text-muted-foreground">Stage 1 of 5</div>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-3">
            Project Concept
          </label>
          <Textarea
            placeholder="Describe your film project, story concept, and creative vision..."
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={10}
            className="bg-input border-border text-foreground placeholder-muted-foreground rounded-sm"
          />
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
            onClick={handleGenerateScript}
            disabled={generateScriptMutation.isPending}
            className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-sm"
            size="sm"
          >
            {generateScriptMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Generate Script
          </Button>
        </div>
      </div>
    </div>
  );
}
