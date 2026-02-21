import { Plus, Music } from "lucide-react";
import { Clip } from "@/features/Project/types";

interface ManifestSidebarProps {
    clips: Clip[];
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSelect: (id: number) => void;
    selectedId: number | null;
}

export function ManifestSidebar({
    clips,
    onUpload,
    onSelect,
    selectedId
}: ManifestSidebarProps) {
    return (
        <div className="w-64 glass-panel rounded-3xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
                <h3 className="production-label text-[10px!important] uppercase tracking-widest text-slate-500">Manifest</h3>
                <label className="cursor-pointer hover:text-primary transition-colors">
                    <Plus className="w-4 h-4" />
                    <input type="file" hidden accept="video/*,audio/*,image/*" onChange={onUpload} />
                    {/* Defaulting trackId to 1 for now as per original code */}
                </label>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {clips.map((clip) => (
                    <div
                        key={clip.id}
                        draggable
                        onDragStart={(e) => {
                            const data = JSON.stringify({
                                type: "clip",
                                clipId: clip.id,
                                fileName: clip.fileName,
                                duration: clip.duration,
                                fileUrl: clip.fileUrl
                            });
                            e.dataTransfer?.setData("application/json", data);
                        }}
                        onClick={() => onSelect(clip.id)}
                        className={`group glass-panel rounded-2xl p-2 transition-all cursor-move ${selectedId === clip.id ? "border-primary bg-primary/5" : "border-white/5 hover:bg-white/[0.02]"}`}
                    >
                        <div className="aspect-video rounded-xl overflow-hidden bg-black mb-2 relative">
                            {(clip.fileType === "video" || clip.fileType === "image") ? (
                                <video src={clip.fileUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-white/5">
                                    <Music className="w-6 h-6 text-slate-500" />
                                </div>
                            )}
                        </div>
                        <div className="px-2">
                            <div className="text-[10px] font-bold text-white uppercase truncate mb-1">{clip.fileName}</div>
                            <div className="text-[9px] font-mono text-slate-500">{Math.round(clip.duration / 1000)}s</div>
                        </div>
                    </div>
                ))}
                {clips.length === 0 && (
                    <div className="text-center py-8 opacity-20">
                        <Plus className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-[9px] font-black uppercase tracking-widest">No Assets</p>
                    </div>
                )}
            </div>
        </div>
    );
}
