import { Button } from "@/components/ui/button";
import { Trash2, Video, Music, Image as ImageIcon, Settings } from "lucide-react";
import { Clip } from "@/features/Project/types";

interface InspectorPanelProps {
    clip: Clip | null;
    onDelete: (id: number) => void;
}

export function InspectorPanel({
    clip,
    onDelete
}: InspectorPanelProps) {
    return (
        <div className="w-64 glass-panel rounded-3xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5">
                <h3 className="production-label text-[10px!important] uppercase tracking-widest text-slate-500">Inspector</h3>
            </div>
            <div className="flex-1 p-6 space-y-8">
                {clip ? (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Asset Name</label>
                            <p className="text-sm font-bold border-b border-white/5 pb-2 truncate">{clip.fileName}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Duration</label>
                                <p className="text-xs font-mono text-primary">{Math.round(clip.duration / 1000)}s</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Type</label>
                                <div className="flex items-center gap-2 text-xs">
                                    {clip.fileType === 'audio' ? <Music className="w-4 h-4" /> : clip.fileType === 'video' ? <Video className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                                    <span className="uppercase font-bold tracking-tighter">{clip.fileType} Stream</span>
                                </div>
                            </div>
                        </div>
                        <div className="pt-8 space-y-3">
                            <Button
                                size="sm"
                                variant="destructive"
                                className="w-full h-10 rounded-xl font-bold uppercase text-[10px] tracking-widest"
                                onClick={() => onDelete(clip.id)}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Purge Asset
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                        <Settings className="w-12 h-12 mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Select Layer node</p>
                    </div>
                )}
            </div>
        </div>
    );
}
