import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Layout, Package } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ProductionDesignTabProps {
    projectId: number;
}

export default function ProductionDesignTab({ projectId }: ProductionDesignTabProps) {
    // Currently using 'globalDirectorNotes' as a proxy for Production Design notes 
    // until we migrate 'locationDetails' and 'setDesign' from scene-level to project-level or similar.
    // Ideally, this tab writes to the new 'setDesign' concepts if they were global, but schema added them to 'scenes'.
    // For this sprint's "Production Design" feature, we might need a global "World/Set" definition.
    // Using 'globalDirectorNotes' for now to store the High Level Production Design.

    const [productionDesign, setProductionDesign] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const projectQuery = trpc.projects.get.useQuery({ id: projectId });
    const utils = trpc.useUtils();
    const updateMutation = trpc.projects.updateContent.useMutation();

    useEffect(() => {
        if (projectQuery.data?.content?.globalDirectorNotes) {
            setProductionDesign(projectQuery.data.content.globalDirectorNotes);
        }
    }, [projectQuery.data]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateMutation.mutateAsync({
                projectId,
                globalDirectorNotes: productionDesign,
            });
            utils.projects.get.invalidate({ id: projectId });
            toast.success("Production Design saved");
        } catch (error) {
            console.error("Failed to save:", error);
            toast.error("Save failed");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-12 animate-fade-in">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="production-node-title flex items-center gap-3">
                        <Layout className="w-6 h-6 text-primary" />
                        Production Design
                    </h2>
                    <p className="production-label text-primary">Sets, Props & World Building</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        variant="outline"
                        className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Set Details
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-panel p-1 rounded-3xl overflow-hidden">
                        <Textarea
                            placeholder="Define Key Sets, Locations, Props, and Costumes..."
                            value={productionDesign}
                            onChange={(e) => setProductionDesign(e.target.value)}
                            className="min-h-[500px] w-full bg-transparent border-none focus-visible:ring-0 text-slate-200 text-sm leading-relaxed p-8 resize-none font-mono"
                        />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="glass-panel p-8 space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Package className="w-5 h-5 text-primary" />
                            <h3 className="text-xs font-bold text-white uppercase tracking-widest">Assets</h3>
                        </div>

                        <p className="text-xs text-slate-400 leading-relaxed">
                            Describe the physical world of the story.
                        </p>
                        <ul className="text-xs text-slate-500 list-disc list-inside space-y-1 ml-2">
                            <li>Key Locations (EXT/INT)</li>
                            <li>Hero Props</li>
                            <li>Set Decoration Style</li>
                            <li>Costume Palette</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
