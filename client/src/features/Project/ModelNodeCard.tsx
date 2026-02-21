import { Button } from "@/components/ui/button";
import { Key, Globe, Trash2 } from "lucide-react";
import { AIModel } from "./types";

interface ModelNodeCardProps {
    model: AIModel;
    onEnable: (id: number) => void;
    onConfigure: (model: AIModel) => void;
    onDelete: (id: number) => void;
    isEnablePending: boolean;
}

export function ModelNodeCard({
    model,
    onEnable,
    onConfigure,
    onDelete,
    isEnablePending
}: ModelNodeCardProps) {
    return (
        <div
            className={`glass-panel p-6 rounded-3xl transition-all group relative ${model.isActive ? 'border-primary shadow-[0_0_30px_rgba(79,70,229,0.1)]' : 'border-white/5 hover:border-white/20'}`}
        >
            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="text-lg font-bold text-white uppercase tracking-tight">{model.modelId}</div>
                    <div className="production-label !text-[8px]">{model.provider} API</div>
                </div>
                {model.isActive && (
                    <div className="px-2 py-0.5 bg-primary/20 border border-primary/20 rounded text-[8px] font-black text-primary uppercase italic tracking-widest">
                        Primary
                    </div>
                )}
            </div>

            <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
                    <Key className="w-3 h-3 text-primary" />
                    <span className="truncate">{model.apiKey ? "SECURELY ENCRYPTED" : "UNAUTHENTICATED"}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
                    <Globe className="w-3 h-3 text-primary" />
                    <span className="truncate">{model.apiEndpoint || "Standard Gateway"}</span>
                </div>
            </div>

            <div className="flex gap-2">
                {!model.isActive && (
                    <Button
                        size="sm"
                        className="flex-1 bg-white/5 text-slate-300 hover:bg-primary hover:text-white rounded-xl h-9 text-[10px] font-black uppercase tracking-widest"
                        onClick={() => onEnable(model.id)}
                        disabled={isEnablePending}
                    >
                        Enable
                    </Button>
                )}
                <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-white/5 bg-transparent hover:bg-white/5 rounded-xl h-9 text-[10px] font-black uppercase tracking-widest"
                    onClick={() => onConfigure(model)}
                >
                    Configure
                </Button>
                {!model.isBuiltIn && (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:bg-red-500/10 rounded-xl h-9 px-3"
                        onClick={() => onDelete(model.id)}
                    >
                        <Trash2 className="w-3 h-3" />
                    </Button>
                )}
            </div>
        </div>
    );
}
