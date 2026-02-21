import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, Trash2, Sparkles, Video, Save, Camera, Aperture } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface CinematographyTabProps {
    projectId: number;
}

export default function CinematographyTab({ projectId }: CinematographyTabProps) {
    // Using masterVisual field for now, but semantically treating it as Cinematography (Lighting/Camera)
    // In a full refactor, we might want separate fields for lighting/camera vs art direction.
    // For now, consistent with schema, we use 'masterVisual' as the "Visual Style" container.

    const [cinematographyState, setCinematographyState] = useState("");
    const [notes, setNotes] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Progress states
    const [genProgress, setGenProgress] = useState(0);

    const projectQuery = trpc.projects.get.useQuery({ id: projectId });
    const utils = trpc.useUtils();
    const updateMutation = trpc.projects.updateContent.useMutation();
    const generateVisualMutation = trpc.ai.generateVisualStyle.useMutation();
    const refineVisualMutation = trpc.ai.refineVisualStyle.useMutation();

    useEffect(() => {
        if (projectQuery.data?.content?.masterVisual) {
            setCinematographyState(projectQuery.data.content.masterVisual);
        }
    }, [projectQuery.data]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateMutation.mutateAsync({
                projectId,
                masterVisual: cinematographyState,
            });
            utils.projects.get.invalidate({ id: projectId });
            toast.success("Cinematography definition saved");
        } catch (error) {
            console.error("Failed to save:", error);
            toast.error("Save failed");
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerateValues = async () => {
        const scriptContent = projectQuery.data?.content?.script;
        if (!scriptContent?.trim()) {
            toast.error("Script required for analysis");
            return;
        }

        let interval: NodeJS.Timeout | undefined;
        try {
            setGenProgress(10);
            interval = setInterval(() => {
                setGenProgress((prev) => Math.min(prev + 5, 90));
            }, 800);

            const result = await generateVisualMutation.mutateAsync({
                projectId,
                brandId: projectQuery.data?.project?.brandId || undefined,
                script: scriptContent,
            });

            const content = typeof result === "string" ? result : (result as any).content || result;

            setCinematographyState(content);
            await updateMutation.mutateAsync({ projectId, masterVisual: content });
            utils.projects.get.invalidate({ id: projectId });

            if (interval) clearInterval(interval);
            setGenProgress(100);
            toast.success("Camera & Lighting plan generated");
        } catch (error) {
            if (interval) clearInterval(interval);
            setGenProgress(0);
            toast.error("Generation failed");
        }
    };

    return (
        <div className="space-y-12 animate-fade-in">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="production-node-title flex items-center gap-3">
                        <Video className="w-6 h-6 text-primary" />
                        Cinematography
                    </h2>
                    <p className="production-label text-primary">Camera & Lighting Direction</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        variant="outline"
                        className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save DP Notes
                    </Button>
                    <div className="flex flex-col gap-2">
                        <Button
                            onClick={handleGenerateValues}
                            disabled={generateVisualMutation.isPending}
                            className="bg-primary hover:bg-primary/90 text-white font-bold"
                        >
                            {generateVisualMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Aperture className="w-4 h-4 mr-2" />}
                            Generate Look
                        </Button>
                        {generateVisualMutation.isPending && (
                            <Progress value={genProgress} className="h-1 bg-slate-800 w-full" />
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-panel p-1 rounded-3xl overflow-hidden">
                        <Textarea
                            placeholder="Define Camera Lenses, Lighting Conditions, Color Grading, and Film Stock..."
                            value={cinematographyState}
                            onChange={(e) => setCinematographyState(e.target.value)}
                            className="min-h-[500px] w-full bg-transparent border-none focus-visible:ring-0 text-slate-200 text-sm leading-relaxed p-8 resize-none font-mono"
                        />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="glass-panel p-8 space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Camera className="w-5 h-5 text-primary" />
                            <h3 className="text-xs font-bold text-white uppercase tracking-widest">Technicals</h3>
                        </div>

                        <p className="text-xs text-slate-400 leading-relaxed">
                            Define the visual language of the film. Focus on:
                        </p>
                        <ul className="text-xs text-slate-500 list-disc list-inside space-y-1 ml-2">
                            <li>Lens Choice (Anamorphic vs Spherical)</li>
                            <li>Lighting Ratios (High Key vs Low Key)</li>
                            <li>Color Palette & LUTs</li>
                            <li>Camera Movement Philosophy</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
