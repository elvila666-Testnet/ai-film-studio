import { useState, useEffect } from "react";
import { Loader2, Save, Camera, Sparkles, Eye, CheckCircle2, AlertCircle, Maximize2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CinemaPipelineShot } from "./types";
import { useAIProcessing } from "@/lib/aiProcessingContext";
import { CinematographyManifest } from "./Cinematography/CinematographyManifest";

interface CinematographyTabProps {
    projectId: number;
}

export default function CinematographyTab({ projectId }: CinematographyTabProps) {
    const [cinematography, setCinematography] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingLook, setIsGeneratingLook] = useState(false);
    const [validationResult, setValidationResult] = useState<{ approved: boolean; feedback: string } | null>(null);
    const [shotBreakdown, setShotBreakdown] = useState<CinemaPipelineShot[]>([]);

    const utils = trpc.useUtils();
    const projectQuery = trpc.projects.get.useQuery({ id: projectId });
    const updateMutation = trpc.projects.updateContent.useMutation();
    const validateCineMutation = trpc.directorV2.validateCinematography.useMutation();
    const generateHighFidelityMutation = trpc.ai.generateHighFidelityArtDepartmentLook.useMutation();

    const { startProcessing, stopProcessing, updateProgress } = useAIProcessing();

    useEffect(() => {
        const masterVisual = projectQuery.data?.content?.masterVisual;
        if (masterVisual) {
            try {
                // Handle both pre-parsed and stringified JSON
                const parsed = typeof masterVisual === 'string' ? JSON.parse(masterVisual) : masterVisual;

                // Priority 1: Full Pipeline Result (The most detailed)
                if (parsed.cinematography) {
                    const cineText = parsed.cinematography.overarchingTechnicalDirectives
                        || parsed.cinematography.generalStyle
                        || (typeof parsed.cinematography === 'string' ? parsed.cinematography : '');

                    if (cineText) setCinematography(cineText);
                } else if (parsed.overarchingTechnicalDirectives || parsed.generalStyle) {
                    // Priority 2: Direct Cinematography Output
                    setCinematography(parsed.overarchingTechnicalDirectives || parsed.generalStyle);
                }

                if (parsed.finalHarmonizedDocument?.shots) {
                    setShotBreakdown(parsed.finalHarmonizedDocument.shots);
                }
            } catch (e) {
                // Priority 3: Raw text fallback
                if (typeof masterVisual === 'string') {
                    setCinematography(masterVisual);
                }
            }
        }
    }, [projectQuery.data]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateMutation.mutateAsync({
                projectId,
                masterVisual: cinematography,
            });
            utils.projects.get.invalidate({ id: projectId });
            toast.success("Optical Manifest saved to Vault");
        } catch (error) {
            toast.error("Save failed");
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerateLook = async (refinementNotes?: string) => {
        const script = projectQuery.data?.content?.script;
        if (!script) return toast.error("Script must be Materialized first.");
        const brandId = projectQuery.data?.project?.brandId || undefined;

        setIsGeneratingLook(true);
        startProcessing(refinementNotes ? "Refining Optical Physics & Lighting..." : "Simulating Optical Physics & Lighting...");

        let progress = 10;
        const interval = setInterval(() => {
            progress = Math.min(progress + 2, 95); 
            updateProgress(progress);
        }, 1000);

        try {
            const result = await generateHighFidelityMutation.mutateAsync({
                projectId,
                script,
                brandId,
                cineRefinementNotes: refinementNotes
            });

            clearInterval(interval);
            updateProgress(100);

            const shots = result.finalHarmonizedDocument?.shots || [];
            setShotBreakdown(shots);

            const cineText = result.cinematography?.overarchingTechnicalDirectives
                || result.cinematography?.generalStyle
                || (typeof result.cinematography === "string" ? result.cinematography : JSON.stringify(result.cinematography, null, 2));

            setCinematography(cineText);

            const updatePayload = {
                projectId,
                masterVisual: JSON.stringify(result),
            };

            await updateMutation.mutateAsync(updatePayload);

            utils.projects.get.invalidate({ id: projectId });
            toast.success(refinementNotes ? "Optical Plan Refined" : "Optical Technical Bible Generated");
            if (refinementNotes) setValidationResult(null); // Clear feedback after successful refinement
        } catch (error: any) {
            console.error("Pipeline failure:", error);
            toast.error(`Optical Pipeline Error: ${error.message}`);
        } finally {
            setIsGeneratingLook(false);
            stopProcessing();
            clearInterval(interval);
        }
    };

    const handleAttendFeedback = () => {
        if (!validationResult?.feedback) return;
        handleGenerateLook(validationResult.feedback);
    };

    const handleSendToDirector = async () => {
        if (!cinematography) return toast.error("Materialize optics first");
        try {
            const result = await validateCineMutation.mutateAsync({
                projectId,
                cinematographyOutput: cinematography,
                specs: cinematography,
            });
            setValidationResult(result);
            if (result.approved) {
                toast.success("✅ Director has approved the optical plan");
            } else {
                toast.warning(`Director feedback: ${result.feedback}`);
            }
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    return (
        <div className="space-y-10 animate-fade-in mb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className="production-node-title text-primary uppercase italic text-2xl tracking-tighter flex items-center gap-3">
                        <Camera className="w-6 h-6" />
                        Phase 4: Cinematography
                    </h2>
                    <p className="production-label text-slate-400">Optical physics and lighting architecture.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Button
                        onClick={() => handleGenerateLook()}
                        disabled={isGeneratingLook}
                        variant="outline"
                        className="h-12 border-primary/30 text-primary hover:bg-primary/10 rounded-xl px-6"
                    >
                        {isGeneratingLook ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        Generate Aesthetics
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-primary hover:bg-primary/90 text-white font-bold h-12 px-8 rounded-xl shadow-lg shadow-primary/20"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Seal Optics
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="manifest" className="w-full">
                <TabsList className="bg-white/[0.02] border border-white/10 mb-8 p-1 rounded-2xl">
                    <TabsTrigger value="manifest" className="rounded-xl gap-2 px-6 data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all">
                        <Camera className="w-4 h-4" />
                        Technical Manifest
                    </TabsTrigger>
                    <TabsTrigger value="creative" className="rounded-xl gap-2 px-6 data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all">
                        <Eye className="w-4 h-4" />
                        Creative Vision
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="manifest" className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                        <div className="lg:col-span-3 space-y-8">
                            {shotBreakdown.length > 0 ? (
                                <CinematographyManifest shotBreakdown={shotBreakdown} />
                            ) : (
                                <div className="glass-panel p-1 rounded-[2rem] overflow-hidden group hover:border-primary/20 transition-all duration-500">
                                    <Textarea
                                        placeholder="Define the visual physics: Lenses, Lighting, Movement, and Sensor specs..."
                                        value={cinematography}
                                        onChange={(e) => setCinematography(e.target.value)}
                                        className="min-h-[500px] w-full bg-transparent border-none focus-visible:ring-0 text-slate-200 text-lg leading-relaxed p-12 resize-none placeholder:text-slate-800 font-mono"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div className="glass-panel p-8 space-y-6 border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent">
                                <div className="flex items-center gap-3 mb-2">
                                    <Maximize2 className="w-5 h-5 text-primary" />
                                    <h3 className="text-xs font-black text-white uppercase tracking-widest">Optical Authority</h3>
                                </div>
                                <p className="text-[11px] text-slate-500 leading-relaxed italic">The Director Agent will review these optics for emotional resonance and lens consistency.</p>

                                <Button
                                    onClick={handleSendToDirector}
                                    disabled={validateCineMutation.isPending || !cinematography}
                                    className="w-full border-orange-500/30 text-orange-400 bg-orange-500/5 hover:bg-orange-500/20 text-[10px] font-black h-12 rounded-xl transition-all hover:scale-[1.02] active:scale-95"
                                    variant="outline"
                                >
                                    {validateCineMutation.isPending ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-2" />}
                                    SUBMIT OPTICS
                                </Button>

                                <div className="pt-4 border-t border-white/5 space-y-3">
                                    {["Lens Strategy", "Lighting Spec", "Sensor Format", "Movement Logic"].map((item) => (
                                        <div key={item} className="flex items-center gap-3 text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary/20" />
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {validationResult && (
                                <div className={`p-6 rounded-2xl border text-xs font-medium animate-in zoom-in-95 duration-300 ${validationResult.approved
                                    ? "bg-green-500/10 border-green-500/20 text-green-300"
                                    : "bg-amber-500/10 border-amber-500/20 text-amber-300"
                                    }`}>
                                    <div className="flex items-start gap-4">
                                        {validationResult.approved ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                                        <div className="space-y-3 flex-1">
                                            <div className="space-y-1">
                                                <span className="font-black uppercase tracking-widest">Director Verdict</span>
                                                <p className="leading-relaxed opacity-90">{validationResult.approved ? "Optical plan approved for production." : validationResult.feedback}</p>
                                            </div>
                                            
                                            {!validationResult.approved && (
                                                <Button 
                                                    onClick={handleAttendFeedback}
                                                    disabled={isGeneratingLook}
                                                    className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold h-10 rounded-xl flex items-center gap-2"
                                                >
                                                    {isGeneratingLook ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                                    Attend Director Feedback
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="creative" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="glass-panel p-1 rounded-[2rem] overflow-hidden group hover:border-primary/20 transition-all duration-500 bg-gradient-to-br from-white/[0.01] to-transparent">
                        <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                            <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                <Eye className="w-4 h-4 text-primary" />
                                Cinematic Vision Statement
                            </h3>
                            <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Aesthetic Protocol</div>
                        </div>
                        <Textarea
                            value={cinematography}
                            onChange={(e) => setCinematography(e.target.value)}
                            className="min-h-[600px] w-full bg-transparent border-none focus-visible:ring-0 text-slate-200 text-lg leading-relaxed p-12 resize-none placeholder:text-slate-800"
                        />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
