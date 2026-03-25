import { trpc } from "../../lib/trpc";
import { Layout, Sparkles, Loader2, CheckCircle2, AlertCircle, Lock, Users, Camera, Paintbrush } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCostGuard } from "@/components/FinOps/CostGuard";

interface DirectorViewProps {
    projectId: number;
}

function StatusBadge({ status }: { status?: string | null }) {
    if (!status || status === "draft") return <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-slate-800 text-slate-400 border border-white/10">Draft</span>;
    if (status === "pending_review") return <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1"><AlertCircle className="w-2.5 h-2.5" /> Pending Review</span>;
    return <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> Approved</span>;
}

/**
 * Defensive helper to prevent React Error #31 (objects as children).
 */
function renderSafe(val: any): React.ReactNode {
    if (!val) return "—";
    if (typeof val === "string") return val;
    if (typeof val === "object") {
        return (
            <div className="space-y-1 font-mono text-[9px]">
                {Object.entries(val).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                        <span className="text-white/40 uppercase">{k}:</span>
                        <span>{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                    </div>
                ))}
            </div>
        );
    }
    return String(val);
}

export function DirectorView({ projectId }: DirectorViewProps) {
    const utils = trpc.useUtils();
    const { requestApproval } = useCostGuard();

    const projectQuery = trpc.projects.get.useQuery({ id: projectId });
    const statusQuery = trpc.directorV2.getStatus.useQuery({ projectId });
    const validationStatusQuery = trpc.directorV2.getDeptValidationStatus.useQuery({ projectId }, {
        refetchInterval: 5000
    });

    const buildPromptsMutation = trpc.promptEngineer.buildPrompts.useMutation({
        onSuccess: (data) => toast.success(data.message),
        onError: (e) => toast.error(e.message)
    });

    const breakdownMutation = trpc.directorV2.breakdownScript.useMutation({
        onSuccess: async () => {
            await statusQuery.refetch();
            await projectQuery.refetch();
            utils.projects.get.invalidate({ id: projectId });
            toast.success("Scene breakdown generated. Casting & Look generation running in background.");
        },
        onError: (e) => toast.error(e.message)
    });

    const generateProposalMutation = trpc.director.generateCreativeProposal.useMutation({
        onSuccess: async () => {
            await projectQuery.refetch();
            toast.success("Creative Proposal generated — review and approve.");
        },
        onError: (e) => toast.error(e.message)
    });

    const approveProposalMutation = trpc.director.approveCreativeProposal.useMutation({
        onSuccess: async () => {
            await projectQuery.refetch();
            toast.success("✅ Creative Proposal approved! You can now run the Technical Breakdown.");
        },
        onError: (e) => toast.error(e.message)
    });

    const generateTechnicalScriptMutation = trpc.director.generateTechnicalScript.useMutation({
        onSuccess: async () => {
            await projectQuery.refetch();
            toast.success("Master Technical Script generated from departmental outputs!");
        },
        onError: (e) => toast.error(e.message)
    });

    const approveTechnicalScriptMutation = trpc.directorV2.approveTechnicalScript.useMutation({
        onSuccess: async () => {
            await statusQuery.refetch();
            await projectQuery.refetch();
            toast.success("✅ Technical script approved. Production departments unlocked.");
        },
        onError: (e) => toast.error(e.message)
    });

    const scriptStatus = statusQuery.data?.scriptStatus;
    const technicalStatus = statusQuery.data?.technicalScriptStatus;
    const scriptApproved = scriptStatus === "approved";
    const technicalApproved = technicalStatus === "approved";

    const content = projectQuery.data?.content;
    const proposalContentData = (content as any)?.creativeProposal;
    const proposalContent = typeof proposalContentData === 'string' ? JSON.parse(proposalContentData) : proposalContentData;
    const proposalStatus = (content as any)?.proposalStatus;
    const proposalApproved = proposalStatus === "approved";

    const hasNewTechnicalScript = !!(content as any)?.technicalScript;

    // Parse technical script from content
    const technicalScript = (() => {
        try {
            const raw = (projectQuery.data?.content as any)?.technicalShots;
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    })();

    const handleBreakdown = () => {
        if (!scriptApproved) {
            toast.error("⚠️ Script must be approved first. Go to Command Center and approve the script.");
            return;
        }
        requestApproval(0.05, async () => {
            await breakdownMutation.mutateAsync({ projectId });
        });
    };

    return (
        <div className="space-y-8 animate-fade-in relative">
            {/* Loading Overlay */}
            {breakdownMutation.isPending && (
                <div className="absolute inset-0 z-50 bg-[#020205]/60 backdrop-blur-sm rounded-[2.5rem] flex items-center justify-center border border-primary/20">
                    <div className="flex flex-col items-center gap-6 bg-black/90 p-12 rounded-3xl border border-primary/30 shadow-2xl flex-shrink-0 animate-pulse">
                        <Sparkles className="w-16 h-16 text-primary animate-spin" />
                        <div className="text-center space-y-2">
                            <h3 className="text-primary font-black uppercase tracking-[0.3em] text-lg">Running Technical Breakdown</h3>
                            <p className="text-sm text-slate-300 font-mono">Parsing screenplay into departmental tasks...</p>
                            <p className="text-xs text-slate-500 font-mono mt-2 flex items-center justify-center gap-2">
                                <Loader2 className="w-3 h-3 animate-spin"/> Generating characters, lighting, & look
                            </p>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="production-node-title flex items-center gap-3">
                        <Layout className="w-6 h-6 text-primary" />
                        Director's Chair
                        <StatusBadge status={technicalStatus} />
                    </h2>
                    <p className="production-label text-primary">Technical Script Breakdown</p>
                </div>
                <div className="flex gap-3">
                    {!scriptApproved && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-[10px] font-bold uppercase tracking-widest">
                            <AlertCircle className="w-3.5 h-3.5" /> Approve Script First
                        </div>
                    )}
                    
                    {scriptApproved && proposalStatus !== 'approved' && (
                        <Button
                            onClick={() => generateProposalMutation.mutate({ projectId })}
                            disabled={generateProposalMutation.isPending}
                            variant="outline"
                            className="border-primary/50 text-primary hover:bg-primary hover:text-white font-bold h-10 px-6 rounded-xl"
                        >
                            {generateProposalMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                            {proposalStatus === 'pending_review' ? "Regenerate Proposal" : "Generate Creative Proposal"}
                        </Button>
                    )}

                    {scriptApproved && proposalStatus === 'pending_review' && (
                        <Button
                            onClick={() => approveProposalMutation.mutate({ projectId })}
                            disabled={approveProposalMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black"
                        >
                            {approveProposalMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                            Approve Proposal
                        </Button>
                    )}

                    {proposalApproved && !technicalApproved && technicalStatus !== 'pending_review' && (
                        <Button
                            onClick={handleBreakdown}
                            disabled={breakdownMutation.isPending}
                            className="bg-primary hover:bg-primary/90 text-white font-bold h-10 px-6 rounded-xl shadow-lg shadow-primary/20"
                        >
                            {breakdownMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                            Run Technical Breakdown
                        </Button>
                    )}

                    {technicalStatus === 'pending_review' && (
                        <Button
                            onClick={() => approveTechnicalScriptMutation.mutate({ projectId })}
                            disabled={approveTechnicalScriptMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black h-10 px-6 rounded-xl shadow-lg shadow-emerald-500/20"
                        >
                            {approveTechnicalScriptMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                            Approve Technical Script
                        </Button>
                    )}
                </div>
            </div>

            {/* Creative Proposal Display */}
            {proposalContent && (
                 <div className="glass-panel p-6 rounded-[1.5rem] border border-cyan-500/20 bg-cyan-500/5 space-y-4">
                     <h3 className="text-sm font-black uppercase tracking-[0.2em] text-cyan-400 flex items-center gap-2">
                         <Layout className="w-4 h-4" /> Creative Proposal
                     </h3>
                     <div className="text-xs text-slate-300 leading-relaxed max-h-48 overflow-y-auto pr-2">
                         {renderSafe(proposalContent)}
                     </div>
                 </div>
            )}

            {/* Approved unlock banner */}
            {technicalApproved && (
                <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <p className="text-sm text-green-300 font-medium">
                        Technical script approved. Casting Director, Cinematography, and Production Design are now unlocked.
                        Casting &amp; visual look are being generated in the background — check the respective tabs shortly.
                    </p>
                </div>
            )}

            {/* Production Readiness & Storyboard Gate */}
            {technicalApproved && (
                <div className="glass-panel p-6 rounded-[2.5rem] border border-primary/20 bg-primary/5 space-y-6">
                    <div className="flex justify-between items-center px-2">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white flex items-center gap-2">
                                <Lock className="w-4 h-4 text-primary" /> Production Readiness
                            </h3>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                                Validate departments and build Technical Script to unlock Storyboards.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                onClick={() => requestApproval(0.015, () => generateTechnicalScriptMutation.mutate({ projectId }))}
                                disabled={!validationStatusQuery.data?.castingValidated || !validationStatusQuery.data?.cineValidated || !validationStatusQuery.data?.pdValidated || generateTechnicalScriptMutation.isPending}
                                className={`h-12 px-6 rounded-2xl font-black transition-all ${(!hasNewTechnicalScript && validationStatusQuery.data?.castingValidated && validationStatusQuery.data?.cineValidated && validationStatusQuery.data?.pdValidated)
                                    ? "bg-primary text-white hover:bg-primary/90 shadow-xl shadow-primary/20"
                                    : "bg-white/5 text-white/20 border border-white/10"
                                    }`}
                            >
                                {generateTechnicalScriptMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                Generate Technical Script
                            </Button>

                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className={`p-4 rounded-3xl border transition-all ${validationStatusQuery.data?.castingValidated ? "bg-green-500/10 border-green-500/20" : "bg-white/[0.02] border-white/5 opacity-50"}`}>
                            <div className="flex items-center justify-between mb-2">
                                <Users className={`w-4 h-4 ${validationStatusQuery.data?.castingValidated ? "text-green-400" : "text-slate-500"}`} />
                                {validationStatusQuery.data?.castingValidated ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Loader2 className="w-3 h-3 text-slate-600 animate-spin" />}
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-white">Casting</div>
                            <div className={`text-[9px] mt-1 font-medium ${validationStatusQuery.data?.castingValidated ? "text-green-400/70" : "text-slate-500"}`}>
                                {validationStatusQuery.data?.castingValidated ? "Validated & Ready" : "Processing in background…"}
                            </div>
                        </div>

                        <div className={`p-4 rounded-3xl border transition-all ${validationStatusQuery.data?.cineValidated ? "bg-green-500/10 border-green-500/20" : "bg-white/[0.02] border-white/5 opacity-50"}`}>
                            <div className="flex items-center justify-between mb-2">
                                <Camera className={`w-4 h-4 ${validationStatusQuery.data?.cineValidated ? "text-green-400" : "text-slate-500"}`} />
                                {validationStatusQuery.data?.cineValidated ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Loader2 className="w-3 h-3 text-slate-600 animate-spin" />}
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-white">Cinematography</div>
                            <div className={`text-[9px] mt-1 font-medium ${validationStatusQuery.data?.cineValidated ? "text-green-400/70" : "text-slate-500"}`}>
                                {validationStatusQuery.data?.cineValidated ? "Validated & Ready" : "Processing in background…"}
                            </div>
                        </div>

                        <div className={`p-4 rounded-3xl border transition-all ${validationStatusQuery.data?.pdValidated ? "bg-green-500/10 border-green-500/20" : "bg-white/[0.02] border-white/5 opacity-50"}`}>
                            <div className="flex items-center justify-between mb-2">
                                <Paintbrush className={`w-4 h-4 ${validationStatusQuery.data?.pdValidated ? "text-green-400" : "text-slate-500"}`} />
                                {validationStatusQuery.data?.pdValidated ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Loader2 className="w-3 h-3 text-slate-600 animate-spin" />}
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-white">Production Design</div>
                            <div className={`text-[9px] mt-1 font-medium ${validationStatusQuery.data?.pdValidated ? "text-green-400/70" : "text-slate-500"}`}>
                                {validationStatusQuery.data?.pdValidated ? "Validated & Ready" : "Processing in background…"}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Department requirement summaries */}
            {technicalScript && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="glass-panel p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 space-y-2">
                        <div className="flex items-center gap-2 text-blue-400 text-[10px] font-bold uppercase tracking-widest">
                            <Users className="w-3.5 h-3.5" /> Casting Requirements
                        </div>
                        <div className="text-xs text-slate-300 leading-relaxed overflow-y-auto max-h-40 pr-1 scrollbar-thin">
                            {renderSafe(technicalScript.castingRequirements)}
                        </div>
                    </div>
                    <div className="glass-panel p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 space-y-2">
                        <div className="flex items-center gap-2 text-purple-400 text-[10px] font-bold uppercase tracking-widest">
                            <Camera className="w-3.5 h-3.5" /> Cinematography
                        </div>
                        <div className="text-xs text-slate-300 leading-relaxed overflow-y-auto max-h-40 pr-1 scrollbar-thin">
                            {renderSafe(technicalScript.cinematographyRequirements)}
                        </div>
                    </div>
                    <div className="glass-panel p-4 rounded-2xl border border-orange-500/20 bg-orange-500/5 space-y-2">
                        <div className="flex items-center gap-2 text-orange-400 text-[10px] font-bold uppercase tracking-widest">
                            <Paintbrush className="w-3.5 h-3.5" /> Production Design
                        </div>
                        <div className="text-xs text-slate-300 leading-relaxed overflow-y-auto max-h-40 pr-1 scrollbar-thin">
                            {renderSafe(technicalScript.productionDesignRequirements)}
                        </div>
                    </div>
                </div>
            )}

            {/* Scene List (Flat) */}
            {technicalScript?.scenes && (
                <div className="space-y-8">
                    {technicalScript.scenes.map((scene: any) => (
                        <div key={scene.sceneNumber} className="glass-panel rounded-3xl overflow-hidden border border-white/10 bg-black/20">
                            <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary border border-primary/20">
                                        {scene.sceneNumber}
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm font-bold text-white uppercase tracking-widest">{scene.heading || `Scene ${scene.sceneNumber}`}</div>
                                        <div className="text-xs text-slate-400 mt-1">{scene.description}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="grid gap-6">
                                    {scene.shots?.map((shot: any) => (
                                        <div key={shot.shotNumber} className="flex gap-4 bg-white/[0.03] p-5 rounded-2xl border border-white/5">
                                            <div className="w-8 h-8 flex items-center justify-center bg-black/40 rounded-lg text-xs font-mono font-bold text-primary border border-white/5 flex-shrink-0">
                                                {shot.shotNumber}
                                            </div>
                                            <div className="flex-1 space-y-2 min-w-0">
                                                <p className="text-sm text-slate-200 leading-snug">{renderSafe(shot.visualDescription)}</p>
                                                <p className="text-xs text-slate-500 italic">{renderSafe(shot.emotionalObjective)}</p>
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    {shot.cinematographyNotes && <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-1 rounded font-bold uppercase">{renderSafe(shot.cinematographyNotes)}</span>}
                                                    {shot.castingRequirements && <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded font-bold uppercase">{renderSafe(shot.castingRequirements)}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {(!technicalScript && !breakdownMutation.isPending) && (
                <div className="py-20 text-center glass-panel rounded-[2rem] border-dashed border-white/10 opacity-30">
                    <Layout className="w-12 h-12 mx-auto mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest italic">
                        {scriptApproved ? "Run Technical Breakdown to begin." : "Approve the script in Command Center first."}
                    </p>
                </div>
            )}
        </div>
    );
}
