import { useState } from "react";
import { Loader2, Save, Layout, ImageIcon, CheckCircle2, AlertCircle, Trash2, Sparkles, Layers, Box, Maximize2, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAIProcessing } from "@/lib/aiProcessingContext";
import { SetCard } from "./ProductionDesign/SetCard";

interface ProductionDesignTabProps {
    projectId: number;
}

export default function ProductionDesignTab({ projectId }: ProductionDesignTabProps) {
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const { startProcessing, stopProcessing, updateProgress } = useAIProcessing();

    const setsQuery = trpc.productionDesign.listSets.useQuery({ projectId });
    const projectQuery = trpc.projects.get.useQuery({ id: projectId });
    
    const breakdownMutation = trpc.productionDesign.breakdownSets.useMutation();
    const validatePDMutation = trpc.directorV2.validateProductionDesign.useMutation();
    const deleteSetMutation = trpc.productionDesign.deleteSet.useMutation();

    const [isBreakingDown, setIsBreakingDown] = useState(false);
    const [validationResult, setValidationResult] = useState<{ approved: boolean; feedback: string } | null>(null);

    const handleBreakdown = async (refinementNotes?: string) => {
        setIsBreakingDown(true);
        startProcessing(refinementNotes ? "Refining Production Design Entities..." : "Architecting Production Design Entities...");
        updateProgress(30);
        try {
            await breakdownMutation.mutateAsync({ 
                projectId,
                refinementNotes
            });
            updateProgress(100);
            setsQuery.refetch();
            toast.success(refinementNotes ? "Production Design Refined" : "Sets and Props extracted from Director Script");
            if (refinementNotes) setValidationResult(null); // Clear feedback after successful refinement
        } catch (e: any) {
            toast.error(`Breakdown failed: ${e.message}`);
        } finally {
            setIsBreakingDown(false);
            stopProcessing();
        }
    };

    const handleAttendFeedback = () => {
        if (!validationResult?.feedback) return;
        handleBreakdown(validationResult.feedback);
    };

    const handleValidate = async () => {
        const sets = setsQuery.data || [];
        if (sets.length === 0) return toast.error("Breakdown sets first");

        try {
            const result = await validatePDMutation.mutateAsync({
                projectId,
                pdOutput: `Validated ${sets.length} sets: ${sets.map(s => s.name).join(", ")}`,
                specs: JSON.stringify(sets),
                moodboardUrls: [],
                referenceUrls: sets.map(s => s.referenceImageUrl).filter(Boolean) as string[],
            });
            setValidationResult(result);
            if (result.approved) {
                toast.success("✅ Director approved the Production Design!");
            } else {
                toast.warning(`Director feedback: ${result.feedback}`);
            }
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="production-node-title tracking-tight flex items-center gap-3">
                        <Layout className="w-6 h-6 text-primary" />
                        Production Design
                    </h2>
                    <p className="production-label text-primary">Stage 3: World Building & Sets</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        onClick={handleValidate}
                        disabled={validatePDMutation.isPending || !setsQuery.data}
                        variant="outline"
                        className="border-orange-500/30 text-orange-400 bg-orange-500/5 hover:bg-orange-500/10"
                    >
                        {validatePDMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                        Send to Director
                    </Button>

                    <Button 
                        onClick={() => handleBreakdown()} 
                        disabled={isBreakingDown} 
                        className="bg-primary text-white hover:bg-primary/80"
                    >
                        {isBreakingDown ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        Breakdown Sets (AI)
                    </Button>
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
                                    {validationResult.approved ? "Director approved the production design." : validationResult.feedback}
                                </p>
                            </div>
                            
                            {!validationResult.approved && (
                                <Button 
                                    onClick={handleAttendFeedback}
                                    disabled={isBreakingDown}
                                    className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold h-10 rounded-xl flex items-center gap-2"
                                >
                                    {isBreakingDown ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    Attend Director Feedback
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {setsQuery.isLoading ? (
                    Array(3).fill(0).map((_, i) => (
                        <div key={i} className="glass-panel p-6 h-64 animate-pulse flex flex-col items-center justify-center gap-4">
                            <Loader2 className="w-8 h-8 animate-spin text-primary/20" />
                            <div className="space-y-2 w-full">
                                <div className="h-4 bg-white/5 rounded w-1/2 mx-auto" />
                                <div className="h-2 bg-white/5 rounded w-full" />
                            </div>
                        </div>
                    ))
                ) : setsQuery.data && setsQuery.data.length > 0 ? (
                    setsQuery.data.map((set: any) => (
                        <SetCard
                            key={set.id}
                            projectId={projectId}
                            set={set}
                            onDelete={() => deleteSetMutation.mutateAsync({ setId: set.id }).then(() => setsQuery.refetch())}
                            onRefresh={() => setsQuery.refetch()}
                            onLightbox={(url) => setLightboxUrl(url)}
                        />
                    ))
                ) : (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-[2.5rem] bg-white/[0.01]">
                        <Box className="w-12 h-12 text-slate-700 mb-4" />
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">No physical sets identified</h3>
                        <p className="text-[10px] text-slate-600 mt-2 uppercase tracking-tighter">Click 'Breakdown Sets' to extract locations from your script</p>
                    </div>
                )}
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
                            alt="Set Reference"
                        />
                        <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold">8K Set Portrait · Click outside to close</p>
                    </div>
                </div>
            )}
        </div>
    );
}
