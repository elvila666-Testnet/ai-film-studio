import { Textarea } from "@/components/ui/textarea";
import { Sparkles, FileText } from "lucide-react";

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
        <div className="lg:col-span-2 space-y-8">
            {synopsis && (
                <div className="glass-panel p-1 rounded-3xl overflow-hidden group hover:border-amber-500/20 transition-all duration-500 bg-amber-500/[0.01]">
                    <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                        <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
                                <Sparkles className="w-4 h-4 text-amber-500" />
                            </div>
                            Narrative Synopsis
                        </h3>
                        <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest group-hover:text-amber-500 transition-colors italic">Phase 1: Story DNA</div>
                    </div>
                    <div className="p-8">
                        <Textarea
                            value={synopsis}
                            onChange={(e) => onSynopsisChange(e.target.value)}
                            disabled={isLocked}
                            className="min-h-[120px] bg-transparent border-none focus-visible:ring-0 text-slate-300 text-base leading-relaxed p-0 resize-none selection:bg-amber-500/30"
                        />
                    </div>
                </div>
            )}

            <div className="glass-panel p-1 rounded-[2.5rem] overflow-hidden group hover:border-primary/20 transition-all duration-500 relative bg-gradient-to-br from-white/[0.02] to-transparent">
                <div className="p-10 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-4 italic">
                        <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                            <FileText className="w-5 h-5 text-primary" />
                        </div>
                        The Screenplay
                    </h3>
                    <div className="flex items-center gap-4">
                        {isLocked && (
                             <div className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black uppercase text-[9px] tracking-[0.2em] flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                Vault Locked
                             </div>
                        )}
                        <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] group-hover:text-primary transition-colors">Phase 2: Technical Script</div>
                    </div>
                </div>
                
                <div className="relative">
                    {isLocked && (
                        <div className="absolute inset-0 z-10 bg-[#020205]/10 backdrop-blur-[2px] transition-all duration-700" />
                    )}
                    <Textarea
                        placeholder="Neural script engine ready. Use the Generator or start typing the screenplay..."
                        value={script}
                        onChange={(e) => onScriptChange(e.target.value)}
                        disabled={isLocked}
                        className="min-h-[700px] w-full bg-transparent border-none focus-visible:ring-0 text-slate-200 font-mono text-base leading-[2] p-12 lg:p-16 resize-none selection:bg-primary/30"
                    />
                </div>
            </div>
        </div>
    );
}
