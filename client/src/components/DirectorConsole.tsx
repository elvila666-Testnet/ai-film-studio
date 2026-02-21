import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Zap,
    ChevronRight,
    ChevronLeft,
    Save,
    Loader2,
    ShieldCheck,
    UserCircle2,
    AlertCircle
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface DirectorConsoleProps {
    projectId: number;
}

export function DirectorConsole({ projectId }: DirectorConsoleProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [notes, setNotes] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const projectQuery = trpc.projects.get.useQuery({ id: projectId });
    const lockedCharQuery = trpc.characters.getLocked.useQuery({ projectId });
    const updateMutation = trpc.projects.updateContent.useMutation();

    useEffect(() => {
        if (projectQuery.data?.content?.globalDirectorNotes) {
            setNotes(projectQuery.data.content.globalDirectorNotes);
        }
    }, [projectQuery.data]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateMutation.mutateAsync({
                projectId,
                globalDirectorNotes: notes,
            });
            toast.success("Global directives synchronized");
        } catch (error) {
            toast.error("Failed to sync directives");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={`fixed top-[73px] right-0 h-[calc(100vh-73px)] z-50 transition-all duration-500 ease-in-out flex ${isOpen ? "w-[400px]" : "w-12"}`}>
            {/* Toggle Tab */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="h-full w-12 bg-black/60 backdrop-blur-3xl border-l border-white/5 flex flex-col items-center py-6 gap-8 group"
            >
                {isOpen ? <ChevronRight className="w-4 h-4 text-primary" /> : <ChevronLeft className="w-4 h-4 text-primary group-hover:scale-125 transition-transform" />}
                <div className="[writing-mode:vertical-lr] rotate-180 text-[10px] font-black tracking-[0.4em] text-slate-500 uppercase">
                    Director's Console
                </div>
                <Zap className={`w-4 h-4 ${isOpen ? "text-primary" : "text-slate-700"}`} />
            </button>

            {/* Main Panel */}
            <div className={`flex-1 bg-black/80 backdrop-blur-3xl border-l border-white/10 p-8 flex flex-col gap-8 overflow-hidden ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                <div className="space-y-2">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Global Intelligence</h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Master Directives & Locked Assets</p>
                </div>

                {/* Locked Character Status */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <UserCircle2 className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">Locked Character</span>
                    </div>

                    {lockedCharQuery.data ? (
                        <div className="p-4 bg-primary/10 border border-primary/30 rounded-2xl flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl border border-primary/50 overflow-hidden">
                                <img src={lockedCharQuery.data.imageUrl} className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <div className="text-xs font-black text-primary uppercase">{lockedCharQuery.data.name}</div>
                                <div className="text-[8px] text-primary/70 uppercase tracking-widest font-bold">Lock Active</div>
                            </div>
                            <ShieldCheck className="w-4 h-4 text-primary ml-auto" />
                        </div>
                    ) : (
                        <div className="p-4 bg-white/5 border border-dashed border-white/10 rounded-2xl text-center">
                            <p className="text-[8px] text-slate-600 uppercase tracking-widest font-black">No Hero Character Locked</p>
                        </div>
                    )}
                </div>

                {/* Global Notes */}
                <div className="flex-1 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Zap className="w-3 h-3 text-primary" />
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Creative DNA</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="h-6 px-2 text-[8px] font-black uppercase text-primary hover:bg-primary/10"
                        >
                            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                            Sync
                        </Button>
                    </div>
                    <div className="flex-1 glass-panel bg-white/5 p-4 rounded-2xl">
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Inject project-wide directives (e.g., 'Ensure all shots have anamorphic flares', 'Maintain a cold, sterile color palette throughout')..."
                            className="h-full bg-transparent border-none focus-visible:ring-0 text-xs italic text-slate-300 leading-relaxed resize-none p-0"
                        />
                    </div>
                </div>

                <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 flex gap-4">
                    <AlertCircle className="w-8 h-8 text-primary shrink-0" />
                    <p className="text-[9px] text-slate-400 leading-relaxed italic uppercase tracking-wider">
                        Directives added here will be injected into every AI generation cycle, ensuring total narrative and visual cohesion across all pipeline stages.
                    </p>
                </div>
            </div>
        </div>
    );
}
