import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
    Loader2, Zap, Maximize2, X, Send, CheckCircle2, Volume2, VolumeX,
    Pause, Play, MessageSquare, RefreshCcw, ChevronUp, ChevronLeft,
    ChevronRight, Layers, Clapperboard, ChevronDown, Film
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useCostGuard } from "@/components/FinOps/CostGuard";
import { cn } from "@/lib/utils";

interface VideoGenerationGridProps {
    projectId: number;
}

interface ShotData {
    id: number;
    shotNumber: number;
    videoUrl?: string;
    imageUrl?: string;
    visualDescription?: string | null;
    prompt?: string | null;
}

// ─── Video Model Definitions ─────────────────────────────────────────────────
interface VideoModelDef {
    id: string;
    label: string;
    provider: string;
    modelId: string;
    available: boolean;
    badge?: string;
}

const VIDEO_MODELS: VideoModelDef[] = [
    { id: "kie-seedance", label: "Seedance 2.0 (Fast)", provider: "kie",  modelId: "kie-seedance-2-0",     available: true,  badge: "Default" },
    { id: "kie-kling",    label: "Kling 3.0 (Quality)", provider: "kie",  modelId: "kie-kling-3-0",        available: true,  badge: "HQ" },
    { id: "replicate-minimax", label: "Minimax Video-01", provider: "replicate", modelId: "minimax/video-01", available: true, badge: "Replicate" },
    { id: "veo3-fast",    label: "Veo 3 (Internal)",     provider: "veo3", modelId: "veo-3.0-generate-001",  available: true,  badge: "Legacy" },
    { id: "kie-wan",      label: "Wan 2.6",             provider: "kie",  modelId: "kie-wan-2-6",          available: true,  badge: "New" },
    { id: "sora",         label: "Sora",            provider: "sora", modelId: "sora-1.0",              available: false },
];

export function VideoGenerationGrid({ projectId }: VideoGenerationGridProps) {
    const { requestApproval } = useCostGuard();
    const storyboardQuery = trpc.storyboard.getImages.useQuery({ projectId });
    const animateFrameMutation = trpc.video.animateFrame.useMutation();
    const directorRevisionMutation = trpc.video.directorRevision.useMutation();
    const editorProjectsQuery = trpc.editor.projects.list.useQuery({ projectId });
    const createEditorProjectMutation = trpc.editor.projects.create.useMutation();
    const uploadClipMutation = trpc.editor.clips.upload.useMutation();
    const saveNotesMutation = trpc.editor.saveFrameNotes.useMutation();
    const utils = trpc.useUtils();

    const [lightboxShot, setLightboxShot] = useState<ShotData | null>(null);
    const [sentToEditor, setSentToEditor] = useState<Set<number>>(new Set());
    const [notesOpen, setNotesOpen] = useState<number | null>(null);
    const [noteText, setNoteText] = useState("");
    const [versionPanel, setVersionPanel] = useState<number | null>(null);
    const [shotModels, setShotModels] = useState<Record<number, string>>({});
    const [modelDropdown, setModelDropdown] = useState<number | null>(null);

    const getSelectedModel = (shotId: number): VideoModelDef => {
        const modelId = shotModels[shotId] || "kie-seedance";
        return VIDEO_MODELS.find(m => m.id === modelId) || VIDEO_MODELS[0];
    };

    const handleAnimate = async (shotNumber: number, motionPrompt: string, shotId: number) => {
        const model = getSelectedModel(shotId);
        let costEstimate = 0.25;
        if (model.provider === "kie") {
            if (model.id === "kie-kling") costEstimate = 0.18 * 5;
            else costEstimate = 0.15 * 5;
        } else if (model.provider === "veo3") {
            costEstimate = 0.055 * 8;
        }

        requestApproval(costEstimate, async () => {
            try {
                await animateFrameMutation.mutateAsync({
                    projectId, shotNumber, motionPrompt,
                    provider: model.provider as any,
                    modelId: model.modelId,
                    characterLocked: true, force: true
                });
                toast.success(`${model.label} synthesis engaged for Shot ${shotNumber}`);
                utils.storyboard.getImages.invalidate({ projectId });
            } catch (e: unknown) {
                toast.error(`Synthesis failed: ${e instanceof Error ? e.message : String(e)}`);
            }
        });
    };

    const handleDirectorRevision = async (shot: ShotData) => {
        if (!noteText.trim()) {
            toast.error("Add director notes before triggering revision.");
            return;
        }

        // Save notes for history
        try {
            await saveNotesMutation.mutateAsync({
                projectId, shotNumber: shot.shotNumber,
                notes: noteText,
                metadata: { type: "director_revision", timestamp: new Date().toISOString() }
            });
        } catch { /* non-blocking */ }

        const notes = noteText;
        setNotesOpen(null);
        setNoteText("");

        // Estimate cost: image regen (~$0.04) + video regen (~$0.25)
        requestApproval(0.30, async () => {
            try {
                toast.info(`🎬 Director revision starting for Shot ${shot.shotNumber}...`);
                const result = await directorRevisionMutation.mutateAsync({
                    projectId,
                    shotNumber: shot.shotNumber,
                    directorNotes: notes,
                    regenerateImage: true,
                    regenerateVideo: true,
                });
                toast.success(result.message);
                utils.storyboard.getImages.invalidate({ projectId });
            } catch (e: unknown) {
                toast.error(`Director revision failed: ${e instanceof Error ? e.message : String(e)}`);
            }
        });
    };

    const handleSendToEditor = async (shot: ShotData) => {
        const fileUrl = shot.videoUrl || shot.imageUrl;
        if (!fileUrl) { toast.error("No media available."); return; }
        try {
            let editorProjectId: number;
            const existing = editorProjectsQuery.data;
            if (existing && existing.length > 0) {
                editorProjectId = (existing[0] as { id: number }).id;
            } else {
                const result = await createEditorProjectMutation.mutateAsync({ projectId, title: "Main Timeline" });
                editorProjectId = result.editorProjectId;
                utils.editor.projects.list.invalidate({ projectId });
            }
            const clips = await utils.editor.clips.list.fetch({ editorProjectId });
            await uploadClipMutation.mutateAsync({
                editorProjectId, trackId: 1, fileUrl,
                fileName: `SHT_${String(shot.shotNumber).padStart(3, "0")}`,
                fileType: shot.videoUrl ? "video" : "image",
                duration: shot.videoUrl ? 8000 : 2000,
                order: (clips as unknown[])?.length + 1 || 1,
            });
            setSentToEditor(prev => new Set(prev).add(shot.id));
            toast.success(`Shot ${shot.shotNumber} sent to Editor timeline`);
        } catch (e: unknown) {
            toast.error(`Failed: ${e instanceof Error ? e.message : String(e)}`);
        }
    };

    const isRevising = directorRevisionMutation.isPending;
    const revisingShot = directorRevisionMutation.variables?.shotNumber;

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {storyboardQuery.data?.map((shot: ShotData) => (
                    <div key={shot.id} className="glass-panel group overflow-hidden border-white/5 hover:border-primary/40 hover:shadow-[0_0_40px_-15px_rgba(var(--primary),0.2)] transition-all duration-700 flex flex-col">
                        {/* ─── Media Preview ─── */}
                        <div className="aspect-video relative bg-black/40 overflow-hidden cursor-pointer"
                            onClick={() => (shot.videoUrl || shot.imageUrl) && setLightboxShot(shot)}>

                            {/* Synthesizing overlay */}
                            {((animateFrameMutation.isPending && animateFrameMutation.variables?.shotNumber === shot.shotNumber) ||
                              (isRevising && revisingShot === shot.shotNumber)) && (
                                <div className="absolute inset-0 z-20 bg-black/80 flex flex-col items-center justify-center backdrop-blur-md">
                                    <div className="relative">
                                        <Loader2 className="w-10 h-10 animate-spin text-primary mb-3" />
                                        <div className="absolute inset-0 blur-lg bg-primary/20 animate-pulse rounded-full" />
                                    </div>
                                    <span className="text-[9px] font-black text-white uppercase tracking-[0.5em] animate-pulse">
                                        {isRevising && revisingShot === shot.shotNumber ? "Director Revision..." : "Synthesizing..."}
                                    </span>
                                </div>
                            )}

                            {shot.videoUrl ? (
                                <div className="relative w-full h-full">
                                    <video src={shot.videoUrl} controls={false} autoPlay muted loop className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent group-hover:opacity-40 transition-opacity" />
                                    <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <div className="p-1.5 bg-black/60 backdrop-blur-xl rounded-lg border border-white/20">
                                            <Maximize2 className="w-3.5 h-3.5 text-white" />
                                        </div>
                                    </div>
                                    <div className="absolute bottom-2 right-2">
                                        <div className="px-2 py-0.5 bg-emerald-500/20 backdrop-blur-xl border border-emerald-500/30 text-emerald-400 rounded-full text-[7px] font-black uppercase tracking-widest">
                                            Materialized
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <img src={shot.imageUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-[2s]" alt={`Shot ${shot.shotNumber}`} />
                            )}

                            <div className="absolute top-3 left-3 z-10">
                                <div className="px-2.5 py-1 bg-black/60 backdrop-blur-xl rounded-md border border-white/10 text-[9px] font-black text-white uppercase tracking-widest">
                                    SHT_{String(shot.shotNumber).padStart(3, '0')}
                                </div>
                            </div>
                        </div>

                        {/* ─── Card Body ─── */}
                        <div className="p-4 flex-1 flex flex-col gap-3 bg-[#0a0a0a]/40 group-hover:bg-[#0a0a0a]/60 transition-colors duration-500">
                            {/* ─── Model Selector ─── */}
                            <div className="relative">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setModelDropdown(modelDropdown === shot.id ? null : shot.id); }}
                                    className="w-full flex items-center justify-between px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg hover:border-white/15 transition-all text-left group/dd"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Film className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                        <span className="text-[10px] font-bold text-slate-300 truncate">{getSelectedModel(shot.id).label}</span>
                                        {getSelectedModel(shot.id).badge && (
                                            <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/20 flex-shrink-0">{getSelectedModel(shot.id).badge}</span>
                                        )}
                                    </div>
                                    <ChevronDown className={cn("w-3 h-3 text-slate-600 transition-transform flex-shrink-0", modelDropdown === shot.id && "rotate-180")} />
                                </button>
                                {modelDropdown === shot.id && (
                                    <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-[#0c0c14] border border-white/10 rounded-xl shadow-2xl shadow-black/60 overflow-hidden animate-fade-in">
                                        {VIDEO_MODELS.map(m => (
                                            <button
                                                key={m.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShotModels(prev => ({ ...prev, [shot.id]: m.id }));
                                                    setModelDropdown(null);
                                                    if (!m.available) toast.info(`${m.label} selected (coming soon)`);
                                                }}
                                                className={cn(
                                                    "w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/5 transition-colors",
                                                    (shotModels[shot.id] || "veo3-fast") === m.id && "bg-primary/10 border-l-2 border-l-primary"
                                                )}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className={cn("text-[10px] font-bold", m.available ? "text-white" : "text-slate-500")}>{m.label}</span>
                                                    {m.badge && <span className="text-[7px] font-black uppercase px-1 py-0.5 rounded bg-primary/15 text-primary">{m.badge}</span>}
                                                </div>
                                                {!m.available && <span className="text-[7px] font-black uppercase tracking-widest text-slate-600">Soon</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Motion Directives</label>
                                <div className="text-[11px] text-slate-400/80 line-clamp-2 h-9 leading-relaxed group-hover:text-slate-200 transition-colors">
                                    {shot.visualDescription || "No cinematic directives available"}
                                </div>
                            </div>

                            {/* ─── Director Notes Panel ─── */}
                            {notesOpen === shot.id && (
                                <div className="space-y-2 animate-fade-in">
                                    <label className="text-[9px] font-black text-amber-400/80 uppercase tracking-widest flex items-center gap-1.5">
                                        <MessageSquare className="w-3 h-3" /> Director's Notes
                                    </label>
                                    <textarea
                                        value={noteText}
                                        onChange={(e) => setNoteText(e.target.value)}
                                        placeholder="e.g. 'Slower pan, warmer lighting, actor faces left...'"
                                        className="w-full h-20 bg-white/5 border border-white/10 rounded-xl p-3 text-[11px] text-slate-300 placeholder:text-slate-600 focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 focus:outline-none resize-none"
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => handleDirectorRevision(shot)}
                                            disabled={isRevising || !noteText.trim()}
                                            className="flex-1 h-8 text-[9px] uppercase font-black tracking-widest bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 rounded-full"
                                        >
                                            <Clapperboard className="w-3 h-3 mr-1.5" /> Full Revision (Image+Video)
                                        </Button>
                                        <Button
                                            onClick={() => { setNotesOpen(null); setNoteText(""); }}
                                            className="h-8 px-3 text-[9px] bg-white/5 border border-white/10 text-slate-500 hover:text-white rounded-full"
                                        >
                                            <ChevronUp className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* ─── Version Switcher ─── */}
                            {versionPanel === shot.id && (
                                <VersionSwitcher projectId={projectId} shot={shot} onSelect={(url) => {
                                    // Update the displayed shot in the grid
                                    setVersionPanel(null);
                                    utils.storyboard.getImages.invalidate({ projectId });
                                }} />
                            )}

                            {/* ─── Action Buttons ─── */}
                            <div className="flex gap-1.5">
                                <Button
                                    onClick={() => handleAnimate(shot.shotNumber, shot.visualDescription || shot.prompt || "Cinematic animation", shot.id)}
                                    disabled={animateFrameMutation.isPending || isRevising}
                                    className={cn(
                                        "flex-1 h-9 text-[9px] uppercase font-black tracking-[0.12em] transition-all duration-300 rounded-full",
                                        shot.videoUrl
                                            ? "bg-white/5 border border-white/10 text-slate-400 hover:bg-white hover:text-black"
                                            : "bg-primary text-white shadow-[0_5px_15px_-5px_rgba(var(--primary),0.4)] hover:scale-[1.02] active:scale-[0.98]"
                                    )}
                                >
                                    {animateFrameMutation.isPending && animateFrameMutation.variables?.shotNumber === shot.shotNumber
                                        ? <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                        : <Zap className="w-3 h-3 mr-1" />}
                                    {shot.videoUrl ? "Re-Synth" : "Animate"}
                                </Button>

                                {/* Director Notes */}
                                <Button
                                    onClick={() => { setNotesOpen(notesOpen === shot.id ? null : shot.id); setNoteText(""); setVersionPanel(null); }}
                                    className={cn("h-9 px-2 rounded-full transition-all", notesOpen === shot.id
                                        ? "bg-amber-500/20 border border-amber-500/40 text-amber-400"
                                        : "bg-white/5 border border-white/10 text-slate-500 hover:text-amber-400"
                                    )}
                                    title="Director notes → full pipeline revision"
                                >
                                    <MessageSquare className="w-3 h-3" />
                                </Button>

                                {/* Versions */}
                                <Button
                                    onClick={() => { setVersionPanel(versionPanel === shot.id ? null : shot.id); setNotesOpen(null); }}
                                    className={cn("h-9 px-2 rounded-full transition-all", versionPanel === shot.id
                                        ? "bg-purple-500/20 border border-purple-500/40 text-purple-400"
                                        : "bg-white/5 border border-white/10 text-slate-500 hover:text-purple-400"
                                    )}
                                    title="Browse shot versions"
                                >
                                    <Layers className="w-3 h-3" />
                                </Button>

                                {/* Send to Editor */}
                                {(shot.videoUrl || shot.imageUrl) && (
                                    <Button
                                        onClick={(e) => { e.stopPropagation(); handleSendToEditor(shot); }}
                                        disabled={uploadClipMutation.isPending || sentToEditor.has(shot.id)}
                                        className={cn("h-9 px-2 rounded-full transition-all", sentToEditor.has(shot.id)
                                            ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                                            : "bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20"
                                        )}
                                        title="Send to Editor"
                                    >
                                        {uploadClipMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" />
                                            : sentToEditor.has(shot.id) ? <CheckCircle2 className="w-3 h-3" />
                                            : <Send className="w-3 h-3" />}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ─── Lightbox Modal ─── */}
            {lightboxShot && (
                <VideoLightbox
                    projectId={projectId}
                    shot={lightboxShot}
                    onClose={() => setLightboxShot(null)}
                    onSendToEditor={() => handleSendToEditor(lightboxShot)}
                    isSent={sentToEditor.has(lightboxShot.id)}
                    onDirectorRevision={(notes) => {
                        setLightboxShot(null);
                        setNoteText(notes);
                        // Trigger director revision directly
                        requestApproval(0.30, async () => {
                            try {
                                toast.info(`🎬 Director revision starting...`);
                                const result = await directorRevisionMutation.mutateAsync({
                                    projectId,
                                    shotNumber: lightboxShot.shotNumber,
                                    directorNotes: notes,
                                    regenerateImage: true,
                                    regenerateVideo: true,
                                });
                                toast.success(result.message);
                                utils.storyboard.getImages.invalidate({ projectId });
                            } catch (e: unknown) {
                                toast.error(`Revision failed: ${e instanceof Error ? e.message : String(e)}`);
                            }
                        });
                    }}
                    onRegenerate={(notes) => {
                        const basePrompt = lightboxShot.visualDescription || lightboxShot.prompt || "Cinematic animation";
                        const enhanced = notes ? `${basePrompt}\n\n[DIRECTOR NOTES]: ${notes}` : basePrompt;
                        setLightboxShot(null);
                        handleAnimate(lightboxShot.shotNumber, enhanced, lightboxShot.id);
                    }}
                />
            )}
        </>
    );
}

/* ─────────────────────────────────────────────────────── */
/*  Version Switcher                                       */
/* ─────────────────────────────────────────────────────── */
function VersionSwitcher({ projectId, shot, onSelect }: { projectId: number; shot: ShotData; onSelect: (url: string) => void }) {
    const historyQuery = trpc.video.getVideoHistory.useQuery({ projectId, shotNumber: shot.shotNumber });
    const variants = historyQuery.data?.variants || [];
    const [currentIdx, setCurrentIdx] = useState(0);

    if (historyQuery.isLoading) {
        return <div className="flex items-center justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-purple-400" /></div>;
    }

    if (variants.length <= 1) {
        return <div className="text-[9px] text-slate-500 text-center py-2 uppercase tracking-widest">No previous versions</div>;
    }

    const current = variants[currentIdx];

    return (
        <div className="space-y-2 animate-fade-in">
            <div className="flex items-center justify-between">
                <label className="text-[9px] font-black text-purple-400/80 uppercase tracking-widest flex items-center gap-1.5">
                    <Layers className="w-3 h-3" /> Versions ({variants.length})
                </label>
                <span className="text-[9px] text-slate-500 font-mono">v{(current?.variant ?? 0) + 1}</span>
            </div>

            {/* Thumbnail strip */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                    disabled={currentIdx === 0}
                    className="p-1 rounded bg-white/5 text-slate-500 hover:text-white disabled:opacity-30"
                >
                    <ChevronLeft className="w-3 h-3" />
                </button>

                <div className="flex-1 grid grid-cols-4 gap-1">
                    {variants.slice(Math.max(0, currentIdx - 1), currentIdx + 3).map((v: any, i: number) => (
                        <button
                            key={v.id}
                            onClick={() => setCurrentIdx(variants.indexOf(v))}
                            className={cn(
                                "aspect-video rounded-md overflow-hidden border-2 transition-all",
                                variants.indexOf(v) === currentIdx
                                    ? "border-purple-500 shadow-[0_0_10px_-3px_rgba(168,85,247,0.4)]"
                                    : "border-transparent opacity-60 hover:opacity-100"
                            )}
                        >
                            {v.videoUrl ? (
                                <video src={v.videoUrl} muted className="w-full h-full object-cover" />
                            ) : v.imageUrl ? (
                                <img src={v.imageUrl} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <div className="w-full h-full bg-slate-800" />
                            )}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => setCurrentIdx(Math.min(variants.length - 1, currentIdx + 1))}
                    disabled={currentIdx === variants.length - 1}
                    className="p-1 rounded bg-white/5 text-slate-500 hover:text-white disabled:opacity-30"
                >
                    <ChevronRight className="w-3 h-3" />
                </button>
            </div>

            {current?.videoUrl && (
                <Button
                    onClick={() => onSelect(current.videoUrl!)}
                    className="w-full h-7 text-[8px] uppercase font-black tracking-widest bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 rounded-full"
                >
                    Use This Version
                </Button>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────────────── */
/*  Lightbox Component                                     */
/* ─────────────────────────────────────────────────────── */
interface VideoLightboxProps {
    projectId: number;
    shot: ShotData;
    onClose: () => void;
    onSendToEditor: () => void;
    isSent: boolean;
    onDirectorRevision: (notes: string) => void;
    onRegenerate: (notes?: string) => void;
}

function VideoLightbox({ projectId, shot, onClose, onSendToEditor, isSent, onDirectorRevision, onRegenerate }: VideoLightboxProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(true);
    const [progress, setProgress] = useState(0);
    const [showNotes, setShowNotes] = useState(false);
    const [directorNote, setDirectorNote] = useState("");
    const hasInteracted = useRef(false);

    // Version cycling inside lightbox
    const historyQuery = trpc.video.getVideoHistory.useQuery({ projectId, shotNumber: shot.shotNumber });
    const variants = (historyQuery.data?.variants || []).filter((v: { videoUrl: string | null }) => v.videoUrl);
    const [versionIdx, setVersionIdx] = useState(0);
    const activeVideoUrl = variants.length > 0 ? variants[versionIdx]?.videoUrl || shot.videoUrl : shot.videoUrl;

    const togglePlay = useCallback(() => {
        if (!videoRef.current) return;
        if (!hasInteracted.current) {
            hasInteracted.current = true;
            videoRef.current.muted = false;
            setIsMuted(false);
        }
        if (videoRef.current.paused) { videoRef.current.play(); setIsPlaying(true); }
        else { videoRef.current.pause(); setIsPlaying(false); }
    }, []);

    const toggleMute = useCallback(() => {
        if (!videoRef.current) return;
        videoRef.current.muted = !videoRef.current.muted;
        setIsMuted(videoRef.current.muted);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === " " && !showNotes) { e.preventDefault(); togglePlay(); }
            if (e.key === "m" && !showNotes) toggleMute();
            if (e.key === "ArrowLeft" && variants.length > 1) setVersionIdx(i => Math.max(0, i - 1));
            if (e.key === "ArrowRight" && variants.length > 1) setVersionIdx(i => Math.min(variants.length - 1, i + 1));
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose, showNotes, togglePlay, toggleMute, variants.length]);

    const handleTimeUpdate = useCallback(() => {
        if (!videoRef.current) return;
        setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
    }, []);

    const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!videoRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        videoRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * videoRef.current.duration;
    }, []);

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center animate-fade-in" onClick={onClose}>
            {/* Close */}
            <button onClick={onClose} className="absolute top-6 right-6 z-[110] p-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 transition-all group">
                <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            </button>

            {/* Shot label + version indicator */}
            <div className="absolute top-6 left-6 z-[110] flex items-center gap-3">
                <div className="px-4 py-2 bg-black/60 backdrop-blur-xl rounded-xl border border-white/10">
                    <span className="text-[11px] font-black text-white uppercase tracking-[0.3em]">
                        SHT_{String(shot.shotNumber).padStart(3, '0')}
                    </span>
                </div>
                {variants.length > 1 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 backdrop-blur-xl rounded-xl border border-purple-500/20">
                        <button onClick={(e) => { e.stopPropagation(); setVersionIdx(i => Math.max(0, i - 1)); }}
                            disabled={versionIdx === 0}
                            className="text-purple-400 disabled:opacity-30 hover:text-white"><ChevronLeft className="w-3.5 h-3.5" /></button>
                        <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">
                            v{versionIdx + 1}/{variants.length}
                        </span>
                        <button onClick={(e) => { e.stopPropagation(); setVersionIdx(i => Math.min(variants.length - 1, i + 1)); }}
                            disabled={versionIdx === variants.length - 1}
                            className="text-purple-400 disabled:opacity-30 hover:text-white"><ChevronRight className="w-3.5 h-3.5" /></button>
                    </div>
                )}
            </div>

            {/* Video container */}
            <div className="relative max-w-[90vw] max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl shadow-black/50" onClick={(e) => e.stopPropagation()}>
                {activeVideoUrl ? (
                    <>
                        <video key={activeVideoUrl} ref={videoRef} src={activeVideoUrl} autoPlay muted={isMuted} loop onTimeUpdate={handleTimeUpdate} onClick={togglePlay} className="max-w-[90vw] max-h-[75vh] object-contain cursor-pointer" />

                        {/* Controls */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
                            <div className="w-full h-1 bg-white/20 rounded-full mb-4 cursor-pointer group" onClick={handleProgressClick}>
                                <div className="h-full bg-primary rounded-full relative transition-all group-hover:h-1.5" style={{ width: `${progress}%` }}>
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <button onClick={togglePlay} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
                                        {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
                                    </button>
                                    <button onClick={toggleMute} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
                                        {isMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
                                    </button>
                                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider max-w-[200px] truncate">
                                        {shot.visualDescription?.substring(0, 50) || "Cinematic clip"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button onClick={() => setShowNotes(!showNotes)}
                                        className={cn("h-9 px-4 text-[10px] uppercase font-black tracking-widest rounded-full transition-all",
                                            showNotes ? "bg-amber-500/20 border border-amber-500/40 text-amber-400" : "bg-white/10 border border-white/20 text-slate-400 hover:text-amber-400"
                                        )}>
                                        <MessageSquare className="w-3.5 h-3.5 mr-2" /> Notes
                                    </Button>
                                    <Button onClick={() => onRegenerate(directorNote || undefined)}
                                        className="h-9 px-4 text-[10px] uppercase font-black tracking-widest rounded-full bg-white/10 border border-white/20 text-slate-300 hover:bg-primary/20 hover:text-primary">
                                        <RefreshCcw className="w-3.5 h-3.5 mr-2" /> Re-Synth
                                    </Button>
                                    <Button onClick={onSendToEditor} disabled={isSent}
                                        className={cn("h-9 px-4 text-[10px] uppercase font-black tracking-widest rounded-full transition-all",
                                            isSent ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400" : "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/30"
                                        )}>
                                        {isSent ? <><CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Sent</> : <><Send className="w-3.5 h-3.5 mr-2" /> Editor</>}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : shot.imageUrl ? (
                    <img src={shot.imageUrl} className="max-w-[90vw] max-h-[80vh] object-contain" alt={`Shot ${shot.shotNumber}`} />
                ) : null}

                {/* Director Notes Panel */}
                {showNotes && (
                    <div className="absolute top-4 right-4 w-80 bg-black/80 backdrop-blur-2xl rounded-2xl border border-amber-500/20 p-4 space-y-3 animate-fade-in z-20 shadow-2xl">
                        <label className="text-[9px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                            <MessageSquare className="w-3 h-3" /> Director's Feedback
                        </label>
                        <textarea value={directorNote} onChange={(e) => setDirectorNote(e.target.value)}
                            placeholder="e.g. 'Slower dolly, warmer grade, actor faces right...'"
                            className="w-full h-28 bg-white/5 border border-white/10 rounded-xl p-3 text-[11px] text-slate-300 placeholder:text-slate-600 focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 focus:outline-none resize-none"
                            onClick={(e) => e.stopPropagation()} />
                        <Button onClick={() => { onDirectorRevision(directorNote); }} disabled={!directorNote.trim()}
                            className="w-full h-9 text-[9px] uppercase font-black tracking-widest bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 rounded-full">
                            <Clapperboard className="w-3 h-3 mr-1.5" /> Full Pipeline Revision
                        </Button>
                    </div>
                )}
            </div>

            {/* Keyboard hints */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 text-[9px] text-slate-600 uppercase tracking-widest font-bold">
                <span>Space — Play/Pause</span>
                <span>M — Mute</span>
                {variants.length > 1 && <span>←/→ — Versions</span>}
                <span>Esc — Close</span>
            </div>
        </div>
    );
}
