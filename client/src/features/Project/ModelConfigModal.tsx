import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { AIModel } from "./types";

interface ModelConfigModalProps {
    model: AIModel;
    onClose: () => void;
    onSave: (model: AIModel) => void;
    isSaving: boolean;
}

export function ModelConfigModal({
    model,
    onClose,
    onSave,
    isSaving
}: ModelConfigModalProps) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-fade-in" onClick={onClose}>
            <div className="w-full max-w-lg glass-panel p-10 rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] border-primary/20 relative" onClick={e => e.stopPropagation()}>
                <div className="space-y-2 mb-10">
                    <h3 className="production-node-title !text-2xl">Refine Node Parameters</h3>
                    <p className="text-xs text-slate-500 font-medium">Fine-tune the neural bridge settings for {model.provider || "this provider"}.</p>
                </div>
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="production-label">Neural Provider</label>
                            <Input
                                defaultValue={model.provider}
                                onChange={e => model.provider = e.target.value}
                                placeholder="e.g., Luma AI"
                                className="bg-white/5 border-white/5 h-12"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="production-label">Node Identifier</label>
                            <Input
                                defaultValue={model.modelId}
                                onChange={e => model.modelId = e.target.value}
                                placeholder="e.g., dream-machine"
                                className="bg-white/5 border-white/5 h-12"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="production-label">Authentication Token</label>
                        <Input
                            type="password"
                            placeholder="Keep empty to preserve existing vault token"
                            onChange={e => model.apiKey = e.target.value}
                            className="bg-white/5 border-white/5 h-12"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="production-label">Gateway Endpoint</label>
                        <Input
                            defaultValue={model.apiEndpoint || ""}
                            placeholder="Standard Cloud Gateway"
                            onChange={e => model.apiEndpoint = e.target.value}
                            className="bg-white/5 border-white/5 h-12"
                        />
                    </div>

                    <div className="flex items-center gap-4 pt-8">
                        <Button
                            variant="ghost"
                            className="flex-1 h-14 rounded-2xl text-slate-500 font-bold uppercase tracking-widest"
                            onClick={onClose}
                        >
                            Abort
                        </Button>
                        <Button
                            className="flex-1 bg-primary hover:bg-primary/90 text-white h-14 rounded-2xl font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20"
                            onClick={() => onSave(model)}
                            disabled={isSaving}
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Deploy Matrix Changes"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
