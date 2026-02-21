import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Camera, Plus, UserMinus, CheckCircle2, AlertCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Shot, Actor } from "@/features/Project/types";

interface ShotCardProps {
    shot: Shot;
    isGenerating: boolean;
    isRegenerating?: boolean;
    isApproving?: boolean;
    onGenerate: (shotId: number) => void;
    onRegenerate?: (shotId: number, prompt: string) => void;
    onApprove?: (shotId: number, imageId: number, imageUrl: string) => void;
    onBindActor: (shotId: number, actorId: number) => void;
    onUnbindActor: (shotId: number, actorId: number) => void;
    availableActors: Actor[];
    onClick: (shotId: number) => void;
}

export function ShotCard({
    shot,
    isGenerating,
    isRegenerating,
    isApproving,
    onGenerate,
    onRegenerate,
    onApprove,
    onBindActor,
    onUnbindActor,
    availableActors,
    onClick
}: ShotCardProps) {
    const displayImageUrl = shot.masterImageUrl || shot.imageUrl;

    return (
        <div className="glass-panel group overflow-hidden border-white/5 hover:border-primary/40 hover:shadow-[0_0_30px_-10px_rgba(var(--primary),0.3)] transition-all duration-700 ease-out">
            <div className="aspect-[16/9] relative overflow-hidden bg-black/40 cursor-pointer" onClick={() => displayImageUrl && onClick(shot.id)}>
                {(isGenerating || isRegenerating || isApproving) && (
                    <div className="absolute inset-0 z-30 bg-black/80 flex flex-col items-center justify-center backdrop-blur-md transition-all duration-500">
                        <div className="relative">
                            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                            <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
                        </div>
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.5em] animate-pulse">
                            {isApproving ? "Upscaling 4k..." : "Materializing..."}
                        </span>
                    </div>
                )}

                {displayImageUrl ? (
                    <div className="relative w-full h-full group-hover:scale-105 transition-transform duration-[2.5s] ease-out">
                        <img src={displayImageUrl} className="w-full h-full object-cover" alt={`Shot ${shot.order}`} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />

                        {shot.masterImageUrl && (
                            <div className="absolute top-4 right-4 z-20 bg-emerald-500/90 text-white px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase shadow-lg shadow-emerald-500/20 backdrop-blur-md">
                                4K MASTER
                            </div>
                        )}

                        {!shot.masterImageUrl && shot.isConsistencyLocked && (
                            <div className="absolute top-4 right-4 z-20 bg-emerald-500/20 backdrop-blur-xl border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-emerald-500/10">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Consistency Locked
                            </div>
                        )}
                        {!shot.masterImageUrl && !shot.isConsistencyLocked && shot.consistencyScore !== undefined && shot.consistencyScore !== null && (
                            <div className={cn(
                                "absolute top-4 right-4 z-20 px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 backdrop-blur-xl border shadow-lg",
                                shot.consistencyScore > 80 ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400 shadow-emerald-500/10" :
                                    shot.consistencyScore > 50 ? "bg-yellow-500/20 border-yellow-500/30 text-yellow-400 shadow-yellow-500/10" :
                                        "bg-red-500/20 border-red-500/30 text-red-400 shadow-red-500/10"
                            )}>
                                {shot.consistencyScore > 50 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                                Consistency: {shot.consistencyScore}%
                            </div>
                        )}

                        {!shot.masterImageUrl && shot.imageUrl && (
                            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 to-transparent flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-40">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="bg-black/60 border-white/20 text-white hover:bg-white/20 h-8 text-[10px] font-bold tracking-widest uppercase"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRegenerate && onRegenerate(shot.id, shot.visualDescription || "");
                                    }}
                                >
                                    Regenerate
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-[0_0_15px_rgba(16,185,129,0.3)] h-8 text-[10px] font-bold tracking-widest uppercase transition-all"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onApprove && shot.imageId && shot.imageUrl) {
                                            onApprove(shot.id, shot.imageId, shot.imageUrl);
                                        }
                                    }}
                                >
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    Approve & Upscale
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center group-hover:bg-primary/[0.02] transition-colors duration-700">
                        <div className="relative group/camera">
                            <Camera className="w-16 h-16 text-slate-900 transition-all duration-700 group-hover:text-primary group-hover:scale-110 group-hover:blur-[0.5px]" />
                            <div className="absolute inset-0 blur-3xl bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        </div>
                        <div className="mt-6 text-[9px] font-black text-slate-700 group-hover:text-slate-500 uppercase tracking-[0.6em] transition-colors duration-500">Unmaterialized</div>
                    </div>
                )}

                {!shot.masterImageUrl && (
                    <div className="absolute top-4 left-4 z-20 pointer-events-none">
                        <div className="px-3 py-1.5 bg-black/60 backdrop-blur-xl rounded-md border border-white/10 text-[9px] font-black text-white uppercase tracking-widest group-hover:border-primary/30 transition-colors">
                            SHT_{String(shot.order).padStart(3, '0')}
                        </div>
                    </div>
                )}

                {!shot.imageUrl && !isGenerating && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-[2px]">
                        <Button
                            onClick={(e) => { e.stopPropagation(); onGenerate(shot.id); }}
                            className="bg-primary hover:bg-white hover:text-black font-black h-12 px-8 rounded-full shadow-[0_10px_30px_-5px_rgba(var(--primary),0.5)] transition-all duration-300 hover:scale-105 active:scale-95 text-[10px] uppercase tracking-widest"
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Materialize Frame
                        </Button>
                    </div>
                )}
            </div>

            <div className="p-6 space-y-4 bg-[#0a0a0a]/40 group-hover:bg-[#0a0a0a]/60 transition-colors duration-500">
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Visual Direction</label>
                        <div className="flex gap-1.5">
                            {shot.cameraAngle && <span className="text-[8px] text-slate-600 font-bold uppercase">{shot.cameraAngle}</span>}
                        </div>
                    </div>
                    <p className="text-sm text-slate-300/80 leading-relaxed line-clamp-2 transition-colors group-hover:text-slate-200">{shot.visualDescription}</p>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Talent Casting</label>
                        <span className="text-[8px] text-slate-600 font-bold uppercase">{shot.actors?.length || 0} Assigned</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {shot.actors?.map((actor) => (
                            <div key={actor.actorId} className="flex items-center gap-2 pl-2 pr-1 py-1 bg-primary/[0.03] border border-primary/10 rounded-full group/actor hover:bg-primary/[0.08] hover:border-primary/30 transition-all">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight group-hover/actor:text-primary transition-colors">{actor.name}</span>
                                <Button
                                    variant="ghost"
                                    onClick={() => onUnbindActor(shot.id, actor.actorId)}
                                    className="h-5 w-5 p-0 rounded-full hover:bg-red-500/20 hover:text-red-400 transition-all text-slate-600"
                                >
                                    <UserMinus className="w-3 h-3" />
                                </Button>
                            </div>
                        ))}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 px-3 bg-white/[0.02] border border-dashed border-white/10 hover:border-primary/40 rounded-full text-slate-400 text-[9px] font-black uppercase tracking-widest hover:text-primary transition-all">
                                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Discovery
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-[#0a0a0a] border-white/10 text-white min-w-[160px] p-2 backdrop-blur-2xl">
                                <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-2 py-1.5 mb-1 border-b border-white/5">Available Talent</div>
                                {availableActors?.length > 0 ? (
                                    availableActors.map((actor) => (
                                        <DropdownMenuItem key={actor.id} onClick={() => onBindActor(shot.id, actor.id)} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 focus:bg-primary focus:text-white rounded-md transition-all h-9 px-3">
                                            {actor.name}
                                        </DropdownMenuItem>
                                    ))
                                ) : (
                                    <div className="text-[9px] text-slate-600 italic px-2 py-3">No talent in library...</div>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </div>
    );
}
