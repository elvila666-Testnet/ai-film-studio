import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface TechnicalShot {
  shot: number;
  tipo_plano: string;
  accion: string;
  intencion: string;
}

interface TechnicalShotsTabProps {
  projectId: number;
}

export default function TechnicalShotsTab({ projectId }: TechnicalShotsTabProps) {
  const [shots, setShots] = useState<TechnicalShot[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const projectQuery = trpc.projects.get.useQuery({ id: projectId });
  const updateMutation = trpc.projects.updateContent.useMutation();
  const generateShotsMutation = trpc.ai.generateTechnicalShots.useMutation();

  useEffect(() => {
    if (projectQuery.data?.content?.technicalShots) {
      try {
        const parsed = JSON.parse(projectQuery.data.content.technicalShots);
        setShots(Array.isArray(parsed) ? parsed : []);
      } catch {
        setShots([]);
      }
    }
  }, [projectQuery.data]);

  const handleUpdateShot = (
    index: number,
    field: keyof TechnicalShot,
    value: string
  ) => {
    const newShots = [...shots];
    newShots[index] = { ...newShots[index], [field]: value };
    setShots(newShots);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateMutation.mutateAsync({
        projectId,
        technicalShots: JSON.stringify(shots),
      });
    } catch (error) {
      console.error("Failed to save technical shots:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateTechnicalShots = async () => {
    const scriptContent = projectQuery.data?.content?.script;
    const visualContent = projectQuery.data?.content?.masterVisual;

    if (!scriptContent?.trim()) {
      alert("Please create a script first");
      return;
    }
    if (!visualContent?.trim()) {
      alert("Please create a visual style first");
      return;
    }

    try {
      const response = await generateShotsMutation.mutateAsync({
        script: scriptContent,
        visualStyle: visualContent,
      });
      // Parse response if it's a string (from mock mode)
      const parsedShots = typeof response === 'string' ? JSON.parse(response) : response;
      setShots(Array.isArray(parsedShots) ? parsedShots : []);
      await updateMutation.mutateAsync({
        projectId,
        technicalShots: JSON.stringify(Array.isArray(parsedShots) ? parsedShots : []),
      });
      projectQuery.refetch();
    } catch (error) {
      console.error("Failed to generate technical shots:", error);
      alert("Failed to generate technical shots. Please try again.");
    }
  };

  return (
    <div className="production-node">
      <div className="production-node-header">
        <div className="production-node-title">Shot Breakdown</div>
        <div className="text-xs text-muted-foreground">Stage 4 of 5</div>
      </div>
      <div className="p-6 space-y-4">
        <Button
          onClick={handleGenerateTechnicalShots}
          disabled={generateShotsMutation.isPending}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-sm"
          size="sm"
        >
          {generateShotsMutation.isPending && (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          )}
          Generate Shot Breakdown
        </Button>

        {shots.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No shots generated yet</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {shots.map((shot, index) => (
              <div key={index} className="bg-input border border-border rounded-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-accent text-sm">SHOT {shot.shot}</h3>
                  <span className="text-xs text-muted-foreground uppercase tracking-widest">{shot.tipo_plano}</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">
                    Shot Type
                  </label>
                  <Input
                    value={shot.tipo_plano}
                    onChange={(e) =>
                      handleUpdateShot(index, "tipo_plano", e.target.value)
                    }
                    placeholder="e.g., Close-up, Wide shot"
                    className="bg-card border-border rounded-sm text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">
                    Action
                  </label>
                  <Textarea
                    value={shot.accion}
                    onChange={(e) =>
                      handleUpdateShot(index, "accion", e.target.value)
                    }
                    placeholder="What happens in this shot..."
                    rows={2}
                    className="bg-card border-border rounded-sm text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">
                    Intention
                  </label>
                  <Textarea
                    value={shot.intencion}
                    onChange={(e) =>
                      handleUpdateShot(index, "intencion", e.target.value)
                    }
                    placeholder="Purpose and emotional intent..."
                    rows={2}
                    className="bg-card border-border rounded-sm text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t border-border">
          <Button
            onClick={handleSave}
            disabled={isSaving || shots.length === 0}
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-sm"
            size="sm"
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
