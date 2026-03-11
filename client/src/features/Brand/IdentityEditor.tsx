import { Textarea } from "@/components/ui/textarea";
import { FileText, Sparkles } from "lucide-react";

interface IdentityEditorProps {
    brandVoice: string;
    visualIdentity: string;
    onChange: (data: { brandVoice?: string; visualIdentity?: string }) => void;
}

export function IdentityEditor({ brandVoice, visualIdentity, onChange }: IdentityEditorProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass-panel p-1 rounded-3xl overflow-hidden group hover:border-primary/20 transition-all duration-500">
                <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                            <FileText className="w-4 h-4 text-primary" />
                        </div>
                        Narrative Tone
                    </h3>
                    <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest group-hover:text-primary transition-colors">Vocal DNA</div>
                </div>
                <div className="p-6">
                    <Textarea
                        placeholder="Define the brand's narrative tone, values, and psychological signature..."
                        value={brandVoice}
                        onChange={(e) => onChange({ brandVoice: e.target.value })}
                        className="min-h-[180px] bg-transparent border-none focus-visible:ring-0 text-slate-300 text-sm leading-relaxed resize-none selection:bg-primary/30"
                    />
                </div>
            </div>

            <div className="glass-panel p-1 rounded-3xl overflow-hidden group hover:border-primary/20 transition-all duration-500">
                <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                            <Sparkles className="w-4 h-4 text-primary" />
                        </div>
                        Visual Codes
                    </h3>
                    <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest group-hover:text-primary transition-colors">Optic DNA</div>
                </div>
                <div className="p-6">
                    <Textarea
                        placeholder="Cinematographic style guides, lighting schemes, and compositional rules..."
                        value={visualIdentity}
                        onChange={(e) => onChange({ visualIdentity: e.target.value })}
                        className="min-h-[180px] bg-transparent border-none focus-visible:ring-0 text-slate-300 text-sm leading-relaxed resize-none selection:bg-primary/30"
                    />
                </div>
            </div>
        </div>
    );
}
