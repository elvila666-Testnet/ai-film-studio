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
        <div className="glass-panel rounded-3xl p-8 space-y-6">
            <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-primary" />
                    Director Notes
                </h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-4">
                    Influence the next iteration
                </p>
                <Textarea
                    placeholder="e.g. 'Make the dialogue more tense', 'Add more visual description to the opening'..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={disabled}
                    className="min-h-[200px] bg-white/[0.03] border-white/5 text-sm"
                />
            </div>

            <Button
                onClick={handleRefine}
                disabled={isPending || !notes.trim() || disabled}
                className="w-full bg-white text-black hover:bg-primary hover:text-white font-bold h-12"
            >
                {isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                )}
                Refine with AI
            </Button>

            <div className="pt-6 border-t border-white/5">
                <div className="text-[10px] font-mono text-slate-600 uppercase leading-loose">
                    Refinement maintains your core structure while evolving specific elements based on your instructions.
                </div>
            </div>
        </div>
    );
}
