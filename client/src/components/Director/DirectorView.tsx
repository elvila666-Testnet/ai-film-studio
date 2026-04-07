import { trpc } from "../../lib/trpc";
import { Layout, Sparkles, Loader2, CheckCircle2, AlertCircle, Lock, Users, Camera, Paintbrush, MessageSquare, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useCostGuard } from "@/components/FinOps/CostGuard";
import { VoiceInput } from "@/components/ui/VoiceInput";

interface DirectorViewProps {
    projectId: number;
}

function StatusBadge({ status }: { status?: string | null }) {
    if (!status || status === "draft") return <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-slate-800 text-slate-400 border border-white/10">Draft</span>;
    if (status === "pending_review") return <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1"><AlertCircle className="w-2.5 h-2.5" /> Pending Review</span>;
    return <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> Approved</span>;
}

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

    const saveProposalNotesMutation = trpc.directorV2.saveProposalNotes.useMutation({
        onSuccess: () => {
            projectQuery.refetch();
            toast.success("Proposal notes saved.");
        }
    });

    const updateShotFeedbackMutation = trpc.directorNew.updateShotFeedback.useMutation({
        onSuccess: () => {
            toast.success("Shot updated.");
            statusQuery.refetch();
        }
    });

    const shotsQuery = trpc.director.getFullProductionLayout.useQuery({ projectId }, {
        enabled: !!(statusQuery.data?.technicalScriptStatus === "approved")
    });

    const content = projectQuery.data?.content;
    const proposalContentData = (content as any)?.creativeProposal;
    const proposalContent = typeof proposalContentData === 'string' ? JSON.parse(proposalContentData) : proposalContentData;
    const proposalStatus = (content as any)?.proposalStatus;
    const proposalApproved = proposalStatus === "approved";
    const technicalStatus = statusQuery.data?.technicalScriptStatus;

    const handleBreakdown = () => {
        requestApproval(0.05, async () => {
            await breakdownMutation.mutateAsync({ projectId });
        });
    };

    return (
        <div className="space-y-8 animate-fade-in relative">
            {breakdownMutation.isPending && (
                <div className="absolute inset-0 z-50 bg-[#020205]/60 backdrop-blur-sm rounded-[2.5rem] flex items-center justify-center border border-primary/20">
                    <div className="flex flex-col items-center gap-6 bg-black/90 p-12 rounded-3xl border border-primary/30 shadow-2xl flex-shrink-0 animate-pulse">
                        <Sparkles className="w-16 h-16 text-primary animate-spin" />
                        <div className="text-center space-y-2">
                            <h3 className="text-primary font-black uppercase tracking-[0.3em] text-lg">Running Technical Breakdown</h3>
                            <p className="text-sm text-slate-300 font-mono">Parsing screenplay into departmental tasks...</p>
                        </div>
                    </div>
                </div>
            )}
            
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
                    {proposalStatus !== 'approved' && (
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

                    {proposalStatus === 'pending_review' && (
                        <Button
                            onClick={() => approveProposalMutation.mutate({ projectId })}
                            disabled={approveProposalMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black"
                        >
                            {approveProposalMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                            Approve Proposal
                        </Button>
                    )}

                    {proposalApproved && technicalStatus !== 'approved' && technicalStatus !== 'pending_review' && (
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

            {proposalContent && (
                <div className="space-y-4">
                    <div className="glass-panel p-8 rounded-[2rem] border border-cyan-500/30 bg-cyan-500/[0.03] shadow-2xl shadow-cyan-500/10">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-cyan-400 flex items-center gap-3">
                                <Layout className="w-5 h-5" />
                                Master Creative Proposal
                            </h3>
                            <StatusBadge status={proposalStatus} />
                        </div>

                        <div className="grid grid-cols-1 gap-6 mb-8">
                            {Object.entries(proposalContent).map(([key, value]) => (
                                <div key={key} className="space-y-3 p-6 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-cyan-500/30 transition-all group shadow-lg">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-4 bg-cyan-500 rounded-full" />
                                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                                    </div>
                                    <div className="text-sm text-slate-100 leading-relaxed font-medium pl-3 border-l-2 border-white/5 group-hover:border-cyan-500/20 transition-colors">
                                        {typeof value === 'object' ? (
                                            <pre className="text-xs font-mono bg-black/20 p-3 rounded-xl overflow-x-auto whitespace-pre-wrap">
                                                {JSON.stringify(value, null, 2)}
                                            </pre>
                                        ) : (
                                            <p className="whitespace-pre-wrap">{String(value)}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    Director's Revision Notes
                                </div>
                                <VoiceInput onResult={(text) => {
                                    const el = document.getElementById('proposal-notes') as HTMLTextAreaElement;
                                    if (el) el.value = (el.value + " " + text).trim();
                                }} />
                            </div>
                            <Textarea 
                                id="proposal-notes"
                                placeholder="Add specific notes to refine the creative proposal..."
                                className="min-h-[120px] bg-black/40 border-white/5 focus:border-cyan-500/50 rounded-2xl text-xs text-slate-300 transition-all font-mono p-4"
                                defaultValue={(content as any)?.proposalDirectorNotes || ""}
                                onBlur={(e) => saveProposalNotesMutation.mutate({ projectId, notes: e.target.value })}
                            />
                            <p className="text-[9px] text-slate-500 italic uppercase tracking-wider">Notes save automatically. Guidance for the next iteration.</p>
                        </div>
                    </div>
                </div>
            )}

            {technicalStatus === "approved" && shotsQuery.data && (
                <div className="space-y-12">
                     <div className="flex items-center justify-between px-2">
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white flex items-center gap-3">
                            <Camera className="w-5 h-5 text-primary" />
                            Approved Shot Breakdown
                        </h3>
                    </div>

                    {shotsQuery.data.map((scene: any) => (
                        <div key={scene.id} className="glass-panel rounded-[2.5rem] overflow-hidden border border-white/10 bg-black/40 shadow-2xl">
                            <div className="p-8 border-b border-white/5 bg-gradient-to-r from-primary/10 to-transparent flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center font-black text-xl text-primary border border-primary/30 shadow-lg">
                                        {scene.order}
                                    </div>
                                    <div className="text-left space-y-1">
                                        <div className="text-lg font-black text-white uppercase tracking-tight">{scene.title || `Scene ${scene.order}`}</div>
                                        <div className="text-xs text-slate-400 max-w-2xl">{scene.description}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 space-y-8">
                                {scene.shots?.map((shot: any) => (
                                    <div key={shot.id} className={`group flex flex-col md:flex-row gap-8 p-8 rounded-[2rem] border transition-all duration-500 ${shot.isApproved ? "bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_40px_-15px_rgba(16,185,129,0.1)]" : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] shadow-xl"}`}>
                                        <div className="flex flex-col items-center gap-4">
                                            <div className={`w-12 h-12 flex items-center justify-center rounded-2xl text-sm font-black border transition-all duration-500 ${shot.isApproved ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-black/40 border-white/10 text-primary"}`}>
                                                {shot.order}
                                            </div>
                                            <Button
                                                size="sm"
                                                variant={shot.isApproved ? "default" : "outline"}
                                                className={`rounded-full w-12 h-12 p-0 transition-all duration-500 ${shot.isApproved ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20" : "border-white/10 text-slate-500 hover:text-emerald-400 hover:border-emerald-500/30"}`}
                                                onClick={() => updateShotFeedbackMutation.mutate({ 
                                                    shotId: shot.id, 
                                                    isApproved: !shot.isApproved 
                                                })}
                                            >
                                                {shot.isApproved ? <ThumbsUp className="w-5 h-5" /> : <ThumbsUp className="w-5 h-5" />}
                                            </Button>
                                        </div>

                                        <div className="flex-1 space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/50">Visual Description</span>
                                                        <p className="text-xs text-slate-200 leading-relaxed font-medium">{shot.visualDescription}</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400/50 flex items-center gap-2">
                                                                <MessageSquare className="w-3 h-3" />
                                                                Director Feedback
                                                            </span>
                                                            <VoiceInput onResult={(text) => {
                                                                const el = document.getElementById(`shot-notes-${shot.id}`) as HTMLTextAreaElement;
                                                                if (el) el.value = (el.value + " " + text).trim();
                                                            }} />
                                                        </div>
                                                        <Textarea 
                                                            id={`shot-notes-${shot.id}`}
                                                            placeholder="Add specific comments for this shot..."
                                                            className="min-h-[80px] bg-black/40 border-white/5 focus:border-primary/50 rounded-2xl text-[11px] text-slate-300 transition-all font-mono resize-none focus:ring-1 focus:ring-primary/20 p-4"
                                                            defaultValue={shot.directorNotes || ""}
                                                            onBlur={(e) => updateShotFeedbackMutation.mutate({ 
                                                                shotId: shot.id, 
                                                                notes: e.target.value 
                                                            })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
