import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
    Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Loader2, Video,
    Maximize2, Minimize2, Zap, Plus, Music, Image as ImageIcon, Trash2,
    GripVertical, X, ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import Timeline from "@/components/Timeline";
import { EditorProject, Clip } from "@/features/Project/types";

interface EditorTabProps {
    projectId: number;
}

export default function EditorTab({ projectId }: EditorTabProps) {
    const [editorProjectId, setEditorProjectId] = useState<string>("");
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [selectedClipId, setSelectedClipId] = useState<number | null>(null);
    const [zoom, setZoom] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string>("");
    const [sourcePreviewUrl, setSourcePreviewUrl] = useState<string>("");
    const [isMuted, setIsMuted] = useState(false);
    const [lightboxClip, setLightboxClip] = useState<Clip | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const sourceVideoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const editorProjId = editorProjectId ? Number(editorProjectId) : 0;
    const editorProjectsQuery = trpc.editor.projects.list.useQuery({ projectId });
    const clipsQuery = trpc.editor.clips.list.useQuery(
        { editorProjectId: editorProjId },
        { enabled: !!editorProjectId }
    );
    const storyboardQuery = trpc.storyboard.getImages.useQuery({ projectId });
    const utils = trpc.useUtils();
    
    const clips = useMemo(() => {
        const raw = (clipsQuery.data as unknown as Clip[]) || [];
        // Normalize: DB stores both duration AND startTime in ms.
        // Our sequencer works entirely in seconds.
        return raw.map(c => ({
            ...c,
            duration: c.duration > 1000 ? c.duration / 1000 : c.duration || 5,
            startTime: c.startTime > 1000 ? c.startTime / 1000 : c.startTime || 0,
        }));
    }, [clipsQuery.data]);
    const storyboardShots = useMemo(() => storyboardQuery.data || [], [storyboardQuery.data]);

    const createEditorProjectMutation = trpc.editor.projects.create.useMutation({
        onSuccess: (data) => {
            setEditorProjectId(data.editorProjectId.toString());
            toast.success("Timeline initialized");
            utils.editor.projects.list.invalidate({ projectId });
        },
        onError: (error) => toast.error(`Initialization failed: ${error.message}`),
    });

    const uploadClipMutation = trpc.editor.clips.upload.useMutation({
        onSuccess: () => {
            toast.success("Asset ingested");
            clipsQuery.refetch();
        },
        onError: (error) => toast.error(`Ingestion failed: ${error.message}`),
    });

    const deleteClipMutation = trpc.editor.clips.delete.useMutation({
        onSuccess: () => {
            toast.success("Asset removed");
            clipsQuery.refetch();
        },
        onError: (error) => toast.error(`Removal failed: ${error.message}`),
    });

    const handleCreateEditorProject = () => {
        createEditorProjectMutation.mutate({
            projectId,
            title: `Final Sync - ${new Date().toLocaleDateString()}`,
            description: "Film Studio Editor",
            fps: 24,
            resolution: "1920x1080",
        });
    };

    const handleAddToTimeline = useCallback((clip: Clip) => {
        if (!editorProjId) return;
        const existingClips = (clipsQuery.data as unknown as Clip[]) || [];
        const nextOrder = existingClips.length + 1;
        const lastClip = existingClips[existingClips.length - 1];
        const startTime = lastClip ? (lastClip.startTime || 0) + (lastClip.duration || 2000) : 0;

        uploadClipMutation.mutate({
            editorProjectId: editorProjId,
            trackId: 1,
            fileUrl: clip.fileUrl,
            fileName: clip.fileName,
            fileType: clip.fileType as "video" | "audio" | "image",
            duration: clip.duration,
            order: nextOrder,
            startTime,
        });
    }, [editorProjId, clipsQuery.data, uploadClipMutation]);

    // Add storyboard shot to timeline
    const handleAddStoryboardShot = useCallback((shot: { imageUrl?: string; videoUrl?: string; shotNumber: number }) => {
        if (!editorProjId) return;
        const fileUrl = shot.videoUrl || shot.imageUrl;
        if (!fileUrl) return;
        const existingClips = (clipsQuery.data as unknown as Clip[]) || [];
        const nextOrder = existingClips.length + 1;
        const lastClip = existingClips[existingClips.length - 1];
        const startTime = lastClip ? (lastClip.startTime || 0) + (lastClip.duration || 2000) : 0;

        uploadClipMutation.mutate({
            editorProjectId: editorProjId,
            trackId: 1,
            fileUrl,
            fileName: `SHT_${String(shot.shotNumber).padStart(3, '0')}`,
            fileType: shot.videoUrl ? "video" : "image",
            duration: shot.videoUrl ? 8000 : 2000,
            order: nextOrder,
            startTime,
        });
    }, [editorProjId, clipsQuery.data, uploadClipMutation]);

    const handlePlayPause = () => {
        setIsPlaying(prev => !prev);
    };

    const toggleFullscreen = () => {
        if (!isFullscreen) {
            containerRef.current?.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
        setIsFullscreen(!isFullscreen);
    };

    useEffect(() => {
        const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", handleFsChange);
        return () => document.removeEventListener("fullscreenchange", handleFsChange);
    }, []);

    // Source Monitor Sync: Preview selected clip
    useEffect(() => {
        if (selectedClipId && clipsQuery.data) {
            const clip = (clipsQuery.data as unknown as Clip[])?.find(c => c.id === selectedClipId);
            if (clip?.fileUrl) {
                setSourcePreviewUrl(clip.fileUrl);
                if (sourceVideoRef.current) {
                    sourceVideoRef.current.src = clip.fileUrl;
                    sourceVideoRef.current.play().catch(() => {});
                }
            }
        }
    }, [selectedClipId, clipsQuery.data]);

    // Ref-based video sync (called directly from tick loop, NOT via useEffect)
    // This avoids 60fps React re-renders and eliminates stutter.
    const activeClipRef = useRef<string>("");

    const syncVideoToMasterTime = useCallback((time: number) => {
        if (!videoRef.current || !clips.length) return;

        const activeClip = clips.find(c =>
            time >= c.startTime && time < (c.startTime + c.duration)
        );

        if (activeClip) {
            // Only change source when we enter a NEW clip
            if (activeClipRef.current !== activeClip.fileUrl) {
                activeClipRef.current = activeClip.fileUrl;
                videoRef.current.src = activeClip.fileUrl;
                setPreviewUrl(activeClip.fileUrl);
                videoRef.current.play().catch(() => {});
            }

            // Let the video play naturally — only seek if drift is large (>300ms)
            const localTime = time - activeClip.startTime;
            if (Math.abs(videoRef.current.currentTime - localTime) > 0.3) {
                videoRef.current.currentTime = localTime;
            }
        } else {
            if (activeClipRef.current) {
                activeClipRef.current = "";
                videoRef.current.pause();
                videoRef.current.removeAttribute('src');
                setPreviewUrl("");
            }
        }
    }, [clips]);

    // Handle play/pause state sync (only when isPlaying changes, not every frame)
    useEffect(() => {
        if (!videoRef.current) return;
        if (isPlaying && activeClipRef.current) {
            videoRef.current.play().catch(() => {});
        } else if (!isPlaying) {
            videoRef.current.pause();
        }
    }, [isPlaying]);

    const formatTime = (seconds: number) => {
        const s = Math.floor(seconds);
        const m = Math.floor(s / 60);
        const rs = s % 60;
        const f = Math.floor((seconds % 1) * 24); // 24 fps
        return `${m.toString().padStart(2, "0")}:${rs.toString().padStart(2, "0")}:${f.toString().padStart(2, "0")}`;
    };

    // Calculate total duration based on clips (already normalized to SECONDS)
    useEffect(() => {
        if (clips.length) {
            const maxDuration = Math.max(...clips.map(c => c.startTime + c.duration));
            // Safety cap: never allow more than 3600s (1 hour) to prevent DOM catastrophe
            setDuration(Math.min(maxDuration, 3600)); 
        } else {
            setDuration(30); // 30s default if empty
        }
    }, [clips]);

    // Master Clock: High-precision timer using refs, throttled state updates for UI
    const lastTickRef = useRef<number>(0);
    const playbackTimerRef = useRef<number | null>(null);
    const masterTimeRef = useRef<number>(0);
    const lastUIUpdateRef = useRef<number>(0);
    const durationRef = useRef<number>(duration);
    durationRef.current = duration;
    const clipsRef = useRef(clips);
    clipsRef.current = clips;

    const tick = useCallback((timestamp: number) => {
        if (!lastTickRef.current) lastTickRef.current = timestamp;
        const delta = (timestamp - lastTickRef.current) / 1000;
        lastTickRef.current = timestamp;

        masterTimeRef.current += delta;

        // End of sequence
        if (masterTimeRef.current >= durationRef.current) {
            masterTimeRef.current = durationRef.current;
            setCurrentTime(durationRef.current);
            setIsPlaying(false);
            return;
        }

        // Sync video element directly at 60fps (no React re-render)
        syncVideoToMasterTime(masterTimeRef.current);

        // Throttle React state updates to ~15fps for UI (timecode display, playhead)
        if (timestamp - lastUIUpdateRef.current > 66) {
            setCurrentTime(masterTimeRef.current);
            lastUIUpdateRef.current = timestamp;
        }

        playbackTimerRef.current = requestAnimationFrame(tick);
    }, [syncVideoToMasterTime]);

    useEffect(() => {
        if (isPlaying) {
            lastTickRef.current = 0;
            masterTimeRef.current = currentTime; // sync ref to state on play start
            playbackTimerRef.current = requestAnimationFrame(tick);
        } else if (playbackTimerRef.current) {
            cancelAnimationFrame(playbackTimerRef.current);
        }
        return () => {
            if (playbackTimerRef.current) cancelAnimationFrame(playbackTimerRef.current);
        };
    }, [isPlaying, tick]);

    useEffect(() => {
        if (!editorProjectId && editorProjectsQuery.data?.length) {
            setEditorProjectId(editorProjectsQuery.data[0].id.toString());
        }
    }, [editorProjectsQuery.data, editorProjectId]);

    const activeEditorProject = (editorProjectsQuery.data as unknown as EditorProject[])?.find(p => p.id === editorProjId);

    if (!editorProjectId && !editorProjectsQuery.data?.length) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <div className="glass-panel p-12 text-center border-dashed border-white/10 max-w-md">
                    <Zap className="w-12 h-12 text-primary mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tighter">Initialize Sequencer</h3>
                    <p className="text-slate-500 text-sm mb-8">Establish a new editing sync point to assemble your cinematic assets.</p>
                    <Button onClick={handleCreateEditorProject} disabled={createEditorProjectMutation.isPending} className="bg-white text-black hover:bg-primary hover:text-white h-12 px-8 rounded-2xl font-bold">
                        {createEditorProjectMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Create Editor Sync"}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={`flex flex-col bg-[#020205] text-white ${isFullscreen ? "h-screen" : "h-full"}`}>
            {/* ─── Top Bar ─── */}
            <div className="bg-[#050508]/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between flex-shrink-0 border-b border-white/5 shadow-2xl relative z-20">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="px-2 py-0.5 bg-primary/20 border border-primary/30 rounded-full text-[8px] font-black text-primary uppercase tracking-[0.2em]">Active Project</div>
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                        </div>
                        <h1 className="text-sm font-black text-white/90 uppercase tracking-widest">{activeEditorProject?.title || "SEQUENCER_UNNAMED"}</h1>
                    </div>
                </div>
                
                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-1">Master Timecode</span>
                        <div className="px-4 py-1.5 bg-black/60 border border-white/10 rounded-xl font-mono text-primary text-xl tracking-tighter shadow-inner ring-1 ring-white/5">
                            {formatTime(currentTime)}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
                        <Button size="icon" variant="ghost" className="w-10 h-10 hover:bg-white/5 text-slate-500 rounded-xl transition-all active:scale-95"><SkipBack className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={handlePlayPause} className="w-12 h-12 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-all active:scale-95 border border-primary/20">
                            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="w-10 h-10 hover:bg-white/5 text-slate-500 rounded-xl transition-all active:scale-95"><SkipForward className="w-4 h-4" /></Button>
                    </div>
                    
                    <div className="w-px h-8 bg-white/10 mx-2" />
                    
                    <Button size="icon" variant="ghost" onClick={toggleFullscreen} className="w-10 h-10 hover:bg-white/5 text-slate-400 rounded-xl transition-all">
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </Button>
                </div>
            </div>

            {/* ─── Main Content (Media Pool + Preview + Inspector) ─── */}
            <div className="flex overflow-hidden" style={{ height: "50%" }}>
                {/* ─── Media Pool (Left Sidebar) ─── */}
                <div className="w-56 flex-shrink-0 border-r border-white/5 flex flex-col bg-[#0a0a0f]">
                    <div className="px-3 py-2 border-b border-white/5 flex justify-between items-center flex-shrink-0">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Media Pool</span>
                        <label className="cursor-pointer hover:text-primary transition-colors text-slate-500">
                            <Plus className="w-3.5 h-3.5" />
                            <input type="file" hidden accept="video/*,audio/*,image/*" onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file || !editorProjId) return;
                                try {
                                    const isAudio = file.type.startsWith("audio/");
                                    const fileType = isAudio ? "audio" : file.type.startsWith("image/") ? "image" : "video";
                                    const mediaUrl = URL.createObjectURL(file);
                                    const mediaDuration = await new Promise<number>((resolve, reject) => {
                                        const media = isAudio ? new Audio() : document.createElement("video");
                                        media.src = mediaUrl;
                                        media.onloadedmetadata = () => resolve(media.duration);
                                        media.onerror = () => reject(new Error("Metadata error"));
                                    });
                                    uploadClipMutation.mutate({
                                        editorProjectId: editorProjId, trackId: 1, fileUrl: mediaUrl,
                                        fileName: file.name, fileType, duration: Math.round(mediaDuration * 1000),
                                        order: (clipsQuery.data?.length || 0) + 1,
                                    });
                                } catch { toast.error("File processing error"); }
                            }} />
                        </label>
                    </div>

                    {/* Storyboard shots section */}
                    <div className="flex-1 overflow-y-auto">
                        {storyboardShots.length > 0 && (
                            <div className="border-b border-white/5">
                                <div className="px-3 py-1.5 text-[8px] font-black text-slate-600 uppercase tracking-widest bg-white/[0.02]">
                                    Storyboard Shots
                                </div>
                                {storyboardShots.map((shot: { id: number; shotNumber: number; imageUrl?: string; videoUrl?: string; prompt?: string | null }) => (
                                    <div
                                        key={shot.id}
                                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/[0.03] cursor-pointer transition-colors group border-b border-white/[0.02]"
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer?.setData("application/json", JSON.stringify({
                                                type: "clip",
                                                clipId: shot.id,
                                                fileName: `SHT_${String(shot.shotNumber).padStart(3, '0')}`,
                                                duration: shot.videoUrl ? 8000 : 2000,
                                                fileUrl: shot.videoUrl || shot.imageUrl
                                            }));
                                        }}
                                        onClick={() => {
                                            setSourcePreviewUrl(shot.videoUrl || shot.imageUrl || "");
                                            if (sourceVideoRef.current) {
                                                sourceVideoRef.current.src = shot.videoUrl || shot.imageUrl || "";
                                                sourceVideoRef.current.play().catch(() => {});
                                            }
                                        }}
                                        onDoubleClick={() => {
                                            handleAddStoryboardShot(shot);
                                            setLightboxClip({
                                                id: shot.id,
                                                fileName: `SHT_${String(shot.shotNumber).padStart(3, '0')}`,
                                                fileUrl: shot.videoUrl || shot.imageUrl || "",
                                                fileType: shot.videoUrl ? "video" : "image",
                                                duration: shot.videoUrl ? 8000 : 2000,
                                                editorProjectId: editorProjId,
                                                trackId: 1,
                                                order: 0,
                                            } as Clip);
                                        }}
                                    >
                                        <div className="w-12 h-7 rounded overflow-hidden bg-black/40 flex-shrink-0">
                                            {(shot.imageUrl || shot.videoUrl) ? (
                                                <img src={shot.imageUrl || shot.videoUrl} className="w-full h-full object-cover" alt="" loading="lazy" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center"><Video className="w-3 h-3 text-slate-600" /></div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[9px] font-bold text-white truncate">SHT_{String(shot.shotNumber).padStart(3, '0')}</div>
                                            <div className="text-[8px] text-slate-600 font-mono">{shot.videoUrl ? "Video" : "Frame"}</div>
                                        </div>
                                        <Plus className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Removed Timeline Clips section per user request */}

                        {clips.length === 0 && storyboardShots.length === 0 && (
                            <div className="text-center py-12 opacity-20">
                                <Plus className="w-8 h-8 mx-auto mb-2" />
                                <p className="text-[9px] font-black uppercase tracking-widest">No Assets</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Dual Monitor Section ─── */}
                <div className="flex-1 grid grid-cols-2 gap-4 bg-[#020205] p-6 relative group/monitor overflow-hidden">
                    
                    {/* Source Monitor (Left) */}
                    <div className="flex flex-col min-h-0 min-w-0 relative rounded-2xl border border-white/5 bg-black shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden group/source">
                        <div className="absolute top-4 left-4 z-10 pointer-events-none">
                            <div className="flex items-center gap-2">
                                <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.3em]">Source Monitor</span>
                            </div>
                        </div>
                        
                        <div className="flex-1 flex items-center justify-center relative">
                            {sourcePreviewUrl ? (
                                <video
                                    ref={sourceVideoRef}
                                    src={sourcePreviewUrl}
                                    className="max-w-full max-h-full object-contain"
                                    muted
                                    loop
                                    autoPlay
                                />
                            ) : (
                                <div className="text-center opacity-5">
                                    <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                                    <p className="text-[8px] font-black uppercase tracking-widest">No Source Selected</p>
                                </div>
                            )}
                        </div>
                        
                        {/* Source Controls */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-1.5 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full opacity-0 group-hover/source:opacity-100 transition-all">
                             <Button size="icon" variant="ghost" className="w-6 h-6 hover:bg-white/10 rounded-full" onClick={() => sourceVideoRef.current?.paused ? sourceVideoRef.current.play() : sourceVideoRef.current?.pause()}>
                                <Play className="w-3 h-3 text-white fill-current" />
                             </Button>
                        </div>
                    </div>

                    {/* Program Monitor (Right) */}
                    <div className="flex flex-col min-h-0 min-w-0 relative rounded-2xl border border-primary/20 bg-black shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden group/program">
                        <div className="absolute top-4 left-4 z-10 pointer-events-none">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-[8px] font-black text-primary uppercase tracking-[0.3em]">Timeline Preview</span>
                            </div>
                        </div>

                        <div className="flex-1 flex items-center justify-center relative">
                            {previewUrl || clips.length ? (
                                <div className="relative w-full h-full flex items-center justify-center">
                                    <video
                                        ref={videoRef}
                                        className="max-w-full max-h-full object-contain"
                                        crossOrigin="anonymous"
                                        preload="metadata"
                                        muted={isMuted}
                                    />
                                    <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.4)]" />
                                </div>
                            ) : (
                                <div className="text-center opacity-5">
                                    <Video className="w-12 h-12 mx-auto mb-2" />
                                    <p className="text-[8px] font-black uppercase tracking-widest">No Program Signal</p>
                                </div>
                            )}
                        </div>

                        {/* Program Stats Overlay */}
                        <div className="absolute bottom-4 left-6 pointer-events-none">
                            <div className="text-[9px] font-mono text-primary/50 uppercase tracking-widest">
                                PROGRAM_OUT: {formatTime(currentTime)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── Inspector (Right Sidebar) ─── */}
                <div className="w-48 flex-shrink-0 border-l border-white/5 flex flex-col bg-[#0a0a0f]">
                    <div className="px-3 py-2 border-b border-white/5 flex-shrink-0">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Inspector</span>
                    </div>
                    <div className="flex-1 p-3 overflow-y-auto">
                        {selectedClipId && clips.find(c => c.id === selectedClipId) ? (() => {
                            const clip = clips.find(c => c.id === selectedClipId)!;
                            return (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Name</label>
                                        <p className="text-[10px] font-bold text-white truncate">{clip.fileName}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Duration</label>
                                        <p className="text-[10px] font-mono text-primary">{Math.round(clip.duration)}s</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Type</label>
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                            {clip.fileType === 'audio' ? <Music className="w-3 h-3" /> : clip.fileType === 'video' ? <Video className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                                            <span className="uppercase font-bold tracking-tighter">{clip.fileType}</span>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="destructive" className="w-full h-8 text-[9px] rounded-lg font-bold uppercase tracking-widest mt-4"
                                        onClick={() => { deleteClipMutation.mutate({ clipId: clip.id }); setSelectedClipId(null); }}>
                                        <Trash2 className="w-3 h-3 mr-1.5" /> Remove
                                    </Button>
                                </div>
                            );
                        })() : (
                            <div className="h-full flex flex-col items-center justify-center opacity-15">
                                <ChevronDown className="w-8 h-8 mb-2" />
                                <p className="text-[8px] font-black uppercase tracking-widest text-center">Select a clip</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── Timeline (Bottom 50%) ─── */}
            <div className="border-t border-white/5 bg-[#0a0a0f] flex flex-col overflow-hidden" style={{ height: "50%" }}>
                <div className="px-4 py-1 border-b border-white/5 flex items-center justify-between flex-shrink-0 bg-white/[0.015]">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Assembler Timeline</span>
                    <span className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">24 FPS | Non-Destructive</span>
                </div>
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    <Timeline
                        editorProjectId={editorProjId}
                        currentTime={currentTime}
                        onTimeChange={(t) => { setCurrentTime(t); if (videoRef.current) videoRef.current.currentTime = t; }}
                        isPlaying={isPlaying}
                        duration={duration || 30}
                    />
                </div>
            </div>

            {/* ─── Clip Lightbox (same as Motion Synthesis) ─── */}
            {lightboxClip && (
                <ClipLightbox clip={lightboxClip} onClose={() => setLightboxClip(null)} />
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────────────── */
/*  Clip Lightbox (mirrors Motion Synthesis lightbox)      */
/* ─────────────────────────────────────────────────────── */
function ClipLightbox({ clip, onClose }: { clip: Clip; onClose: () => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(true);
    const [progress, setProgress] = useState(0);
    const hasInteracted = useRef(false);

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
            if (e.key === " ") { e.preventDefault(); togglePlay(); }
            if (e.key === "m") toggleMute();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose, togglePlay, toggleMute]);

    const handleTimeUpdate = useCallback(() => {
        if (!videoRef.current) return;
        setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
    }, []);

    const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!videoRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        videoRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * videoRef.current.duration;
    }, []);

    const isVideo = clip.fileType === "video";

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center animate-fade-in" onClick={onClose}>
            <button onClick={onClose} className="absolute top-6 right-6 z-[110] p-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 group">
                <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            </button>
            <div className="absolute top-6 left-6 z-[110]">
                <div className="px-4 py-2 bg-black/60 backdrop-blur-xl rounded-xl border border-white/10">
                    <span className="text-[11px] font-black text-white uppercase tracking-[0.3em]">{clip.fileName}</span>
                </div>
            </div>

            <div className="relative max-w-[90vw] max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                {isVideo ? (
                    <>
                        <video ref={videoRef} src={clip.fileUrl} autoPlay muted={isMuted} loop onTimeUpdate={handleTimeUpdate} onClick={togglePlay}
                            className="max-w-[90vw] max-h-[75vh] object-contain cursor-pointer" />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
                            <div className="w-full h-1 bg-white/20 rounded-full mb-4 cursor-pointer group" onClick={handleProgressClick}>
                                <div className="h-full bg-primary rounded-full relative" style={{ width: `${progress}%` }}>
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={togglePlay} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
                                    {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
                                </button>
                                <button onClick={toggleMute} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
                                    {isMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
                                </button>
                                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{clip.fileName}</span>
                            </div>
                        </div>
                    </>
                ) : clip.fileType === "image" ? (
                    <img src={clip.fileUrl} className="max-w-[90vw] max-h-[80vh] object-contain" alt={clip.fileName} />
                ) : (
                    <div className="w-96 h-48 bg-black/60 flex items-center justify-center">
                        <Music className="w-12 h-12 text-slate-500" />
                    </div>
                )}
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 text-[9px] text-slate-600 uppercase tracking-widest font-bold">
                <span>Space — Play/Pause</span>
                <span>M — Mute</span>
                <span>Esc — Close</span>
            </div>
        </div>
    );
}
