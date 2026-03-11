import { Textarea } from "@/components/ui/textarea";
import { FileText } from "lucide-react";

interface StrategicBriefProps {
    brief: string;
    onChange: (brief: string) => void;
}

export function StrategicBrief({ brief, onChange }: StrategicBriefProps) {
    return (
        <div className="glass-panel p-1 rounded-[2rem] overflow-hidden group hover:border-primary/20 transition-all duration-500 bg-gradient-to-br from-white/[0.01] to-transparent">
            <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary animate-pulse" />
                    Strategic Screenplay Brief
                </h3>
                <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest group-hover:text-primary transition-colors">Foundation Mode</div>
            </div>
            <Textarea
                placeholder="Inject the narrative nucleus here. The AI will build the entire film upon this brief..."
                value={brief}
                onChange={(e) => onChange(e.target.value)}
                className="min-h-[350px] w-full bg-transparent border-none focus-visible:ring-0 text-slate-200 text-lg leading-relaxed p-12 resize-none placeholder:text-slate-800 selection:bg-primary/30"
            />
        </div>
    );
}
