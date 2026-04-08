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
    const [playbackTime, setPlaybackTime] = useState(0);
    const [currentTime, setCurrentTime] = useState(0); // in milliseconds
    const [duration, setDuration] = useState(0); // in milliseconds
    const [selectedClipId, setSelectedClipId] = useState<number | null>(null);
    const [zoom, setZoom] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string>("");
<<<<<<< HEAD
    const [sourcePreviewUrl, setSourcePreviewUrl] = useState<string>("");
    const [isMuted, setIsMuted] = useState(false);
    const [lightboxClip, setLightboxClip] = useState<Clip | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const sourceVideoRef = useRef<HTMLVideoElement>(null);
=======
    const [currentPlayingClip, setCurrentPlayingClip] = useState<Clip | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [lightboxClip, setLightboxClip] = useState<Clip | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
>>>>>>> 125637c (feat: Implement full editor functionality)
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
        clipsQuery.refetch(); // Refetch clips after adding one
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
        clipsQuery.refetch(); // Refetch clips after adding one
    }, [editorProjId, clipsQuery.data, uploadClipMutation]);

    const handlePlayPause = () => {
<<<<<<< HEAD
        setIsPlaying(prev => !prev);
=======
        if (isPlaying) {
            setIsPlaying(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (videoRef.current) videoRef.current.pause();
        } else {
            setIsPlaying(true);
            if (videoRef.current) videoRef.current.play();
            intervalRef.current = setInterval(() => {
                setPlaybackTime(prev => prev + 100); // Update every 100ms
            }, 100);
        }
>>>>>>> 125637c (feat: Implement full editor functionality)
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

<<<<<<< HEAD
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
=======
    // Sequencer Monitor Logic
    useEffect(() => {
        if (!isPlaying) return;

        const activeClip = clips.find(
            (c) => playbackTime >= c.startTime && playbackTime < c.startTime + c.duration
        );

        if (activeClip && activeClip.id !== currentPlayingClip?.id) {
            setCurrentPlayingClip(activeClip);
            if (videoRef.current) {
                videoRef.current.src = activeClip.fileUrl;
                videoRef.current.currentTime = (playbackTime - activeClip.startTime) / 1000;
                videoRef.current.play();
>>>>>>> 125637c (feat: Implement full editor functionality)
            }
        } else if (!activeClip && currentPlayingClip) {
            // No active clip, pause video and clear current playing clip
            if (videoRef.current) videoRef.current.pause();
            setCurrentPlayingClip(null);
        }

        // Loop playback if end of timeline is reached
        if (playbackTime >= duration) {
            setPlaybackTime(0);
            if (videoRef.current) videoRef.current.currentTime = 0;
        }

    }, [playbackTime, isPlaying, clips, duration, currentPlayingClip]);

    // Update duration when clips change
    useEffect(() => {
        if (clips.length > 0) {
            const maxEndTime = Math.max(...clips.map(c => c.startTime + c.duration));
            setDuration(maxEndTime);
        } else {
            setDuration(0);
        }
    }, [clips]);

    // Sync video player time with timeline current time
    useEffect(() => {
        if (videoRef.current) {
            const handleVideoTimeUpdate = () => {
                setCurrentTime(Math.round(videoRef.current!.currentTime * 1000));
            };
            videoRef.current.addEventListener("timeupdate", handleVideoTimeUpdate);
            return () => {
                videoRef.current?.removeEventListener("timeupdate", handleVideoTimeUpdate);
            };
        }
    }, []);

    // Cleanup interval on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

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
<<<<<<< HEAD
                
                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-1">Master Timecode</span>
                        <div className="px-4 py-1.5 bg-black/60 border border-white/10 rounded-xl font-mono text-primary text-xl tracking-tighter shadow-inner ring-1 ring-white/5">
                            {formatTime(currentTime)}
                        </div>
=======
                <div className="flex items-center gap-4">
                    <div className="px-3 py-1.5 bg-black/40 border border-white/5 rounded-lg font-mono text-primary text-[11px] tracking-wider">
                        {formatTime(playbackTime)} / {formatTime(duration)}
>>>>>>> 125637c (feat: Implement full editor functionality)
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
                            <input type="file" className="sr-only" onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    const file = e.target.files[0];
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                        if (event.target?.result) {
                                            uploadClipMutation.mutate({
                                                editorProjectId: editorProjId,
                                                trackId: 1, // Default to track 1 for now
                                                fileUrl: event.target.result as string,
                                                fileName: file.name,
                                                fileType: file.type.startsWith("video") ? "video" : file.type.startsWith("audio") ? "audio" : "image",
                                                duration: 5000, // Default duration for now
                                                order: (clipsQuery.data?.length || 0) + 1,
                                                startTime: (clipsQuery.data && clipsQuery.data.length > 0) ? ((clipsQuery.data[clipsQuery.data.length - 1].startTime || 0) + (clipsQuery.data[clipsQuery.data.length - 1].duration || 0)) : 0,
                                            });
                                        }
                                    };
                                    reader.readAsDataURL(file);
                                }
                            }} />
                        </label>
                    </div>
<<<<<<< HEAD

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
=======
                    <div className="flex-1 overflow-y-auto p-3">
                        {clipsQuery.data?.map((clip) => (
                            <div
                                key={clip.id}
                                className={`relative group mb-2 rounded-lg overflow-hidden cursor-pointer border ${selectedClipId === clip.id ? "border-primary" : "border-white/10 hover:border-white/20"}`}
                                onClick={() => setSelectedClipId(clip.id)}
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.setData("text/plain", JSON.stringify(clip));
                                    e.dataTransfer.effectAllowed = "move";
                                }}
                            >
                                {clip.fileType === "video" && (
                                    <video src={clip.fileUrl} className="w-full h-24 object-cover" muted />
                                )}
                                {clip.fileType === "image" && (
                                    <img src={clip.fileUrl} alt={clip.fileName} className="w-full h-24 object-cover" />
                                )}
                                {clip.fileType === "audio" && (
                                    <div className="w-full h-24 bg-slate-700 flex items-center justify-center text-slate-400">
                                        <Music className="w-8 h-8" />
                                    </div>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-xs font-medium">
                                    {clip.fileName}
                                </div>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="absolute top-1 right-1 w-6 h-6 text-white/70 hover:text-white hover:bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteClipMutation.mutate({ clipId: clip.id });
                                    }}
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        ))}
                        <div className="mt-4">
                            <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Storyboard Shots</h4>
                            {storyboardShots.map((shot) => (
                                <div
                                    key={shot.id}
                                    className="relative group mb-2 rounded-lg overflow-hidden cursor-pointer border border-white/10 hover:border-white/20"
                                    onClick={() => handleAddStoryboardShot(shot)}
                                >
                                    {shot.videoUrl && (
                                        <video src={shot.videoUrl} className="w-full h-24 object-cover" muted />
                                    )}
                                    {!shot.videoUrl && shot.imageUrl && (
                                        <img src={shot.imageUrl} alt={`Shot ${shot.shotNumber}`} className="w-full h-24 object-cover" />
                                    )}
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-xs font-medium">
                                        Shot {shot.shotNumber}
                                    </div>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="absolute top-1 right-1 w-6 h-6 text-white/70 hover:text-white hover:bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Handle deletion if needed
                                        }}
                                    >
                                        <Plus className="w-3 h-3" />
>>>>>>> 125637c (feat: Implement full editor functionality)
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ─── Preview Panel ─── */}
                <div className="flex-1 flex flex-col items-center justify-center bg-black relative">
                    <video
                        ref={videoRef}
                        className="max-w-full max-h-full object-contain"
                        onLoadedMetadata={() => {
                            if (videoRef.current) {
                                // This duration is for the current playing clip, not the whole timeline
                            }
                        }}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        crossOrigin="anonymous"
                        preload="metadata"
                        muted={isMuted}
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        className="absolute bottom-4 left-4 w-8 h-8 text-white/70 hover:text-white hover:bg-black/50"
                        onClick={() => setIsMuted(!isMuted)}
                    >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </Button>
                </div>

                {/* ─── Inspector Panel (Right Sidebar) ─── */}
                <div className="w-56 flex-shrink-0 border-l border-white/5 bg-[#0a0a0f]">
                    <div className="px-3 py-2 border-b border-white/5">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Inspector</span>
                    </div>
                    <div className="p-3 text-sm text-slate-400">
                        {selectedClipId ? (
                            <div className="space-y-2">
                                <p>Clip ID: {selectedClipId}</p>
                                <p>File: {clips.find(c => c.id === selectedClipId)?.fileName}</p>
                                <p>Start: {formatTime(clips.find(c => c.id === selectedClipId)?.startTime || 0)}</p>
                                <p>Duration: {formatTime(clips.find(c => c.id === selectedClipId)?.duration || 0)}</p>
                            </div>
                        ) : (
                            <p>Select a clip to inspect</p>
                        )}
                    </div>
                </div>
            </div>

<<<<<<< HEAD
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
=======
            {/* ─── Timeline ─── */}
            <div className="flex-shrink-0 h-[calc(50%-48px)] border-t border-white/5 bg-[#0a0a0f]">
                <Timeline
                    editorProjectId={editorProjId}
                    currentTime={playbackTime}
                    onTimeChange={(t) => {
                        setPlaybackTime(t);
                        if (videoRef.current) {
                            const activeClip = clips.find(
                                (c) => t >= c.startTime && t < c.startTime + c.duration
                            );
                            if (activeClip) {
                                videoRef.current.src = activeClip.fileUrl;
                                videoRef.current.currentTime = (t - activeClip.startTime) / 1000;
                                if (isPlaying) videoRef.current.play();
                            } else {
                                videoRef.current.pause();
                                videoRef.current.removeAttribute("src"); // Clear source
                            }
                        }
                    }}
                    isPlaying={isPlaying}
                    duration={duration || 300000} // Default to 5 minutes if no clips
                />
>>>>>>> 125637c (feat: Implement full editor functionality)
            </div>
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
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    }, [isPlaying]);

    const toggleMute = useCallback(() => {
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted(videoRef.current.muted);
        }
    }, []);

    useEffect(() => {
        if (clip.fileUrl && videoRef.current) {
            videoRef.current.src = clip.fileUrl;
            videoRef.current.load();
            videoRef.current.onloadedmetadata = () => {
                if (videoRef.current) {
                    setProgress(0);
                    videoRef.current.currentTime = 0;
                    if (hasInteracted.current) {
                        videoRef.current.play();
                        setIsPlaying(true);
                    }
                }
            };
        }
    }, [clip.fileUrl]);

    useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement) return;

        const updateProgress = () => {
            if (videoElement.duration) {
                setProgress((videoElement.currentTime / videoElement.duration) * 100);
            }
        };

        videoElement.addEventListener('timeupdate', updateProgress);
        return () => {
            videoElement.removeEventListener('timeupdate', updateProgress);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div className="relative" onClick={(e) => e.stopPropagation()}>
                {clip.fileType === "video" && (
                    <video
                        ref={videoRef}
                        src={clip.fileUrl}
                        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
                        autoPlay
                        loop
                        muted={isMuted}
                        onClick={togglePlay}
                        onLoadedData={() => hasInteracted.current = true}
                    />
                )}
                {clip.fileType === "image" && (
                    <img
                        src={clip.fileUrl}
                        alt={clip.fileName}
                        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
                    />
                )}
                {clip.fileType === "audio" && (
                    <div className="max-w-[90vw] max-h-[90vh] w-[800px] h-[450px] bg-slate-900 flex flex-col items-center justify-center rounded-lg p-8">
                        <Music className="w-24 h-24 text-primary mb-4" />
                        <p className="text-xl font-bold text-white mb-2">{clip.fileName}</p>
                        <audio
                            ref={videoRef}
                            src={clip.fileUrl}
                            controls
                            autoPlay
                            loop
                            muted={isMuted}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onVolumeChange={(e) => setIsMuted(e.currentTarget.muted)}
                        />
                    </div>
                )}

                <div className="absolute top-4 right-4">
                    <Button size="icon" variant="ghost" onClick={onClose} className="text-white/70 hover:text-white">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {clip.fileType === "video" && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full">
                        <Button size="icon" variant="ghost" onClick={togglePlay} className="text-white/70 hover:text-white">
                            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={toggleMute} className="text-white/70 hover:text-white">
                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </Button>
                        <div className="w-40 h-1 bg-white/20 rounded-full">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
