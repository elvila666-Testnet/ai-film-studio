import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, PenTool, Sparkles } from "lucide-react";

interface ScriptRefinementPanelProps {
    onRefine: (notes: string) => Promise<void>;
    isPending: boolean;
    disabled: boolean;
}

export function ScriptRefinementPanel({
    onRefine,
    isPending,
    disabled
}: ScriptRefinementPanelProps) {
    const [notes, setNotes] = useState("");

    const handleRefine = async () => {
        if (!notes.trim()) return;
        await onRefine(notes);
        setNotes("");
    };

    return (
        <div className="glass-panel p-1 rounded-3xl overflow-hidden group hover:border-primary/20 transition-all duration-500 bg-white/[0.01]">
            <div className="p-8 space-y-8">
                <div className="space-y-2">
                    <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] flex items-center gap-3 italic">
                        <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                            <PenTool className="w-4 h-4 text-primary" />
                        </div>
                        Director Notes
                    </h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                        Influence the next iteration
                    </p>
                </div>

                <Textarea
                    placeholder="e.g. 'Make the dialogue more tense', 'Add more visual description to the opening'..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={disabled}
                    className="min-h-[250px] bg-white/[0.03] border-white/5 text-slate-300 text-sm leading-relaxed p-6 rounded-2xl focus-visible:ring-1 focus-visible:ring-primary/30 resize-none selection:bg-primary/30"
                />

                <Button
                    onClick={handleRefine}
                    disabled={isPending || !notes.trim() || disabled}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-black h-14 rounded-xl shadow-lg shadow-primary/20 backdrop-blur-sm uppercase text-[10px] tracking-[0.2em] transition-all"
                >
                    {isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Refine with AI
                </Button>

                <div className="pt-8 border-t border-white/5">
                    <div className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 animate-pulse" />
                        <div className="text-[10px] font-black text-slate-600 uppercase leading-relaxed tracking-tight">
                            Refinement maintains your core structure while evolving specific elements based on your instructions.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
