import { Textarea } from "@/components/ui/textarea";

interface ScreenplayEditorProps {
    synopsis: string;
    onSynopsisChange: (val: string) => void;
    script: string;
    onScriptChange: (val: string) => void;
    isLocked: boolean;
}

export function ScreenplayEditor({
    synopsis,
    onSynopsisChange,
    script,
    onScriptChange,
    isLocked
}: ScreenplayEditorProps) {
    return (
        <div className="lg:col-span-2 space-y-6">
            {synopsis && (
                <div className="space-y-2">
                    <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest pl-2">
                        Phase 1: Story Synopsis
                    </label>
                    <div className="glass-panel rounded-2xl p-6 bg-amber-500/5 border-amber-500/10">
                        <Textarea
                            value={synopsis}
                            onChange={(e) => onSynopsisChange(e.target.value)}
                            disabled={isLocked}
                            className="min-h-[100px] w-full bg-transparent border-none focus-visible:ring-0 text-slate-300 text-sm leading-relaxed p-0 resize-none"
                        />
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest pl-2">
                    Phase 2: Full Screenplay
                </label>
                <div className={`glass-panel rounded-3xl p-1 overflow-hidden transition-all relative ${isLocked ? 'opacity-80 grayscale-[0.3]' : ''}`}>
                    {isLocked && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                            <div className="bg-black/50 backdrop-blur-[1px] px-6 py-3 rounded-xl border border-white/10 text-white/50 font-mono uppercase tracking-widest text-sm flex items-center gap-2">
                                <span className="text-xl">🔒</span> Script is Locked
                            </div>
                        </div>
                    )}
                    <Textarea
                        placeholder="Script content will appear here..."
                        value={script}
                        onChange={(e) => onScriptChange(e.target.value)}
                        disabled={isLocked}
                        className="min-h-[600px] w-full bg-transparent border-none focus-visible:ring-0 text-slate-200 font-mono text-sm leading-relaxed p-8 resize-none"
                    />
                </div>
            </div>
        </div>
    );
}
