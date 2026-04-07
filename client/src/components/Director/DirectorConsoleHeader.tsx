import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Zap,
    Save,
    Loader2,
    ShieldCheck,
    UserCircle2,
    AlertCircle
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DirectorConsoleHeaderProps {
    projectId: number;
}

export function DirectorConsoleHeader({ projectId }: DirectorConsoleHeaderProps) {
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
            setIsOpen(false);
        } catch (error) {
            toast.error("Failed to sync directives");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="border-primary/30 bg-primary/5 text-primary hover:bg-primary/20 hover:text-primary transition-all gap-2 h-9 px-4 rounded-full"
                >
                    <Zap className="w-4 h-4" />
                    <span className="font-bold tracking-tight uppercase">Director</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[600px] glass-panel border-white/10 p-0 overflow-hidden flex flex-col scale-in-center">
                <DialogHeader className="p-6 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                            <Zap className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold text-white tracking-tight uppercase italic">Director's Console</DialogTitle>
                            <DialogDescription className="text-slate-500 font-mono text-[10px] uppercase tracking-widest leading-none mt-1">
                                Master Directives & Command Center
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="max-h-[70vh]">
                    <div className="p-8 space-y-8">
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
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Zap className="w-3 h-3 text-primary" />
                                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">Global Creative DNA</span>
                                </div>
                            </div>
                            <div className="glass-panel bg-white/5 p-4 rounded-2xl min-h-[200px]">
                                <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Inject project-wide directives (e.g., 'Ensure all shots have anamorphic flares', 'Maintain a cold, sterile color palette throughout')..."
                                    className="min-h-[180px] bg-transparent border-none focus-visible:ring-0 text-xs italic text-slate-300 leading-relaxed resize-none p-0"
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 flex gap-4">
                            <AlertCircle className="w-8 h-8 text-primary shrink-0" />
                            <p className="text-[9px] text-slate-400 leading-relaxed italic uppercase tracking-wider">
                                Directives added here will be injected into every AI generation cycle, ensuring total narrative and visual cohesion across all pipeline stages.
                            </p>
                        </div>

                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-xl shadow-lg shadow-primary/20"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Sync Global Directives
                        </Button>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
