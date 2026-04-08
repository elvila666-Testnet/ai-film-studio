import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
    Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Loader2, Video,
    Maximize2, Minimize2, Zap, Plus, Music, Image as ImageIcon, Trash2,
    GripVertical, X, ChevronDown, Palette, Wand2, Type, GitBranch, Key
} from "lucide-react";
import { toast } from "sonner";
import Timeline from "@/components/Timeline";
import { EditorProject, Clip } from "@/features/Project/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

// Advanced Components
import { ColorCorrectionPanel, ColorCorrection } from "@/components/ColorCorrectionPanel";
import { EffectsPanel, Effect } from "@/components/EffectsPanel";
import { TextOverlayPanel, TextProperties } from "@/components/TextOverlayPanel";
import { KeyframeEditor, Keyframe } from "@/components/KeyframeEditor";
import { TransitionsPanel, Transition } from "@/components/TransitionsPanel";
import { AudioWaveformVisualization } from "@/components/AudioWaveformVisualization";

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
    const [currentPlayingClip, setCurrentPlayingClip] = useState<Clip | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [lightboxClip, setLightboxClip] = useState<Clip | null>(null);
    const [activeInspectorTab, setActiveInspectorTab] = useState("info");
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
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
        return raw.map(c => ({
            ...c,
            duration: c.duration, // Keep in ms for internal logic
            startTime: c.startTime, // Keep in ms for internal logic
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

    const updateClipMutation = trpc.editor.clips.update.useMutation({
        onSuccess: () => {
            clipsQuery.refetch();
        },
        onError: (error) => toast.error(`Update failed: ${error.message}`),
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
        const existingClips = clips;
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
    }, [editorProjId, clips, uploadClipMutation]);

    const handleAddStoryboardShot = useCallback((shot: { imageUrl?: string; videoUrl?: string; shotNumber: number }) => {
        if (!editorProjId) return;
        const fileUrl = shot.videoUrl || shot.imageUrl;
        if (!fileUrl) return;
        const existingClips = clips;
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
    }, [editorProjId, clips, uploadClipMutation]);

    const handlePlayPause = () => {
        if (isPlaying) {
            setIsPlaying(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (videoRef.current) videoRef.current.pause();
        } else {
            setIsPlaying(true);
            if (videoRef.current) videoRef.current.play();
            intervalRef.current = setInterval(() => {
                setPlaybackTime(prev => prev + 100);
            }, 100);
        }
    };

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const milliseconds = Math.floor((ms % 1000) / 10);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(milliseconds).padStart(2, '0')}`;
    };

    // Sequencer Monitor Logic
    useEffect(() => {
        const activeClip = clips.find(
            (c) => playbackTime >= c.startTime && playbackTime < c.startTime + c.duration
        );

        if (activeClip) {
            if (activeClip.id !== currentPlayingClip?.id) {
                setCurrentPlayingClip(activeClip);
                if (videoRef.current) {
                    videoRef.current.src = activeClip.fileUrl;
                    videoRef.current.currentTime = (playbackTime - activeClip.startTime) / 1000;
                    if (isPlaying) videoRef.current.play();
                }
            } else if (!isPlaying && videoRef.current) {
                // Synchronize time when seeking while paused
                const targetTime = (playbackTime - activeClip.startTime) / 1000;
                if (Math.abs(videoRef.current.currentTime - targetTime) > 0.1) {
                    videoRef.current.currentTime = targetTime;
                }
            }
        } else if (!activeClip && currentPlayingClip) {
            if (videoRef.current) videoRef.current.pause();
            setCurrentPlayingClip(null);
        }

        if (playbackTime >= duration && duration > 0) {
            setPlaybackTime(0);
            setIsPlaying(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (videoRef.current) videoRef.current.pause();
        }

    }, [playbackTime, isPlaying, clips, duration, currentPlayingClip]);

    useEffect(() => {
        if (clips.length > 0) {
            const maxEndTime = Math.max(...clips.map(c => c.startTime + c.duration));
            setDuration(maxEndTime);
        } else {
            setDuration(0);
        }
    }, [clips]);

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const selectedClip = useMemo(() => 
        clips.find(c => c.id === selectedClipId), 
    [clips, selectedClipId]);

    return (
        <div ref={containerRef} className="flex flex-col h-screen bg-[#050508] text-white overflow-hidden select-none font-sans">
            {/* ─── Top Header ─── */}
            <header className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-[#0a0a0f] flex-shrink-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                            <Zap className="w-4 h-4 text-black fill-current" />
                        </div>
                        <h1 className="text-xs font-black uppercase tracking-[0.2em] text-white/90">Studio Editor <span className="text-primary/50 ml-1">v1.2</span></h1>
                    </div>
                    
                    <div className="h-4 w-px bg-white/10" />
                    
                    <div className="flex items-center gap-3">
                        <select 
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-primary/50"
                            value={editorProjectId}
                            onChange={(e) => setEditorProjectId(e.target.value)}
                        >
                            <option value="">Select Timeline</option>
                            {editorProjectsQuery.data?.map(p => (
                                <option key={p.id} value={p.id}>{p.title}</option>
                            ))}
                        </select>
                        {!editorProjectId && (
                            <Button size="sm" onClick={handleCreateEditorProject} className="h-7 text-[9px] font-black uppercase tracking-widest rounded-lg">
                                <Plus className="w-3 h-3 mr-1.5" /> New Sequence
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 mr-4">
                        <div className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                            {formatTime(playbackTime)}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                            / {formatTime(duration)}
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-white/5" onClick={handlePlayPause}>
                        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                    </Button>
                </div>
            </header>

            {/* ─── Main Workspace ─── */}
            <div className="flex-1 flex min-h-0">
                {/* ─── Assets Library (Left Sidebar) ─── */}
                <div className="w-64 flex-shrink-0 border-r border-white/5 flex flex-col bg-[#0a0a0f]">
                    <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Project Assets</span>
                        <ChevronDown className="w-3 h-3 text-slate-600" />
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {storyboardShots.map((shot) => (
                            <div 
                                key={shot.id} 
                                className="group flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer"
                                onClick={() => handleAddStoryboardShot(shot)}
                            >
                                <div className="w-16 h-10 rounded-lg overflow-hidden bg-black/40 flex-shrink-0 border border-white/5">
                                    {shot.imageUrl ? (
                                        <img src={shot.imageUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center"><Video className="w-4 h-4 text-slate-700" /></div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-bold text-white/70 group-hover:text-white truncate transition-colors">SHT_{String(shot.shotNumber).padStart(3, '0')}</div>
                                    <div className="text-[8px] text-slate-600 font-mono uppercase tracking-tighter">Storyboard Frame</div>
                                </div>
                                <Plus className="w-3 h-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* ─── Center Preview Monitor ─── */}
                <div className="flex-1 bg-black relative flex items-center justify-center group/monitor overflow-hidden">
                    <div className="absolute top-4 left-4 z-10 pointer-events-none">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-red-500 animate-pulse' : 'bg-slate-700'}`} />
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em]">Program Monitor</span>
                        </div>
                    </div>
                    
                    <div className="w-full h-full flex items-center justify-center relative">
                        <video
                            ref={videoRef}
                            className="max-w-full max-h-full object-contain shadow-[0_0_100px_rgba(0,0,0,0.5)]"
                            crossOrigin="anonymous"
                            preload="metadata"
                            muted={isMuted}
                            style={(() => {
                                const clip = currentPlayingClip || selectedClip;
                                if (!clip) return {};
                                
                                let filters = "";
                                if (clip.colorCorrection) {
                                    const cc = clip.colorCorrection as any;
                                    filters += `brightness(${100 + (cc.brightness || 0)}%) `;
                                    filters += `contrast(${100 + (cc.contrast || 0)}%) `;
                                    filters += `saturate(${100 + (cc.saturation || 0)}%) `;
                                    filters += `hue-rotate(${cc.hue || 0}deg) `;
                                }
                                
                                if (clip.effects && Array.isArray(clip.effects)) {
                                    (clip.effects as any[]).forEach((fx: any) => {
                                        if (!fx.enabled) return;
                                        switch (fx.type) {
                                            case 'blur': filters += `blur(${fx.intensity}px) `; break;
                                            case 'sepia': filters += `sepia(${fx.intensity}%) `; break;
                                            case 'grayscale': filters += `grayscale(${fx.intensity}%) `; break;
                                            case 'invert': filters += `invert(${fx.intensity}%) `; break;
                                        }
                                    });
                                }
                                
                                return { filter: filters.trim() };
                            })()}
                        />
                        
                        {/* Text Overlay Layer */}
                        {(currentPlayingClip || selectedClip)?.textOverlay && (
                            <div 
                                className="absolute pointer-events-none"
                                style={{
                                    left: `${((currentPlayingClip || selectedClip)!.textOverlay as any).x}%`,
                                    top: `${((currentPlayingClip || selectedClip)!.textOverlay as any).y}%`,
                                    fontSize: `${((currentPlayingClip || selectedClip)!.textOverlay as any).fontSize}px`,
                                    fontFamily: ((currentPlayingClip || selectedClip)!.textOverlay as any).fontFamily,
                                    color: ((currentPlayingClip || selectedClip)!.textOverlay as any).color,
                                    backgroundColor: ((currentPlayingClip || selectedClip)!.textOverlay as any).backgroundColor,
                                    opacity: ((currentPlayingClip || selectedClip)!.textOverlay as any).opacity,
                                    textAlign: ((currentPlayingClip || selectedClip)!.textOverlay as any).alignment as any,
                                    padding: '8px',
                                    borderRadius: '4px',
                                    transform: 'translate(-50%, -50%)'
                                }}
                            >
                                {((currentPlayingClip || selectedClip)!.textOverlay as any).text}
                            </div>
                        )}
                    </div>

                    {/* Quick Monitor Controls */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-2 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-full opacity-0 group-hover/monitor:opacity-100 transition-all transform translate-y-2 group-hover/monitor:translate-y-0">
                         <Button size="icon" variant="ghost" className="w-8 h-8 hover:bg-white/10 rounded-full" onClick={() => setPlaybackTime(Math.max(0, playbackTime - 1000))}>
                            <SkipBack className="w-4 h-4 text-white" />
                         </Button>
                         <Button size="icon" variant="ghost" className="w-10 h-10 bg-primary hover:bg-primary/80 rounded-full" onClick={handlePlayPause}>
                            {isPlaying ? <Pause className="w-5 h-5 text-black fill-current" /> : <Play className="w-5 h-5 text-black fill-current" />}
                         </Button>
                         <Button size="icon" variant="ghost" className="w-8 h-8 hover:bg-white/10 rounded-full" onClick={() => setPlaybackTime(Math.min(duration, playbackTime + 1000))}>
                            <SkipForward className="w-4 h-4 text-white" />
                         </Button>
                         <div className="w-px h-4 bg-white/10" />
                         <Button size="icon" variant="ghost" className="w-8 h-8 hover:bg-white/10 rounded-full" onClick={() => setIsMuted(!isMuted)}>
                            {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-white" />}
                         </Button>
                    </div>
                </div>

                {/* ─── Advanced Inspector (Right Sidebar) ─── */}
                <div className="w-80 flex-shrink-0 border-l border-white/5 flex flex-col bg-[#0a0a0f] z-40">
                    <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inspector</span>
                        {selectedClipId && (
                            <Button variant="ghost" size="icon" className="w-6 h-6 rounded-md hover:bg-red-500/20 text-slate-500 hover:text-red-500" onClick={() => setSelectedClipId(null)}>
                                <X className="w-3.5 h-3.5" />
                            </Button>
                        )}
                    </div>

                    <ScrollArea className="flex-1">
                        {selectedClip ? (
                            <Tabs value={activeInspectorTab} onValueChange={setActiveInspectorTab} className="w-full">
                                <TabsList className="w-full h-10 bg-transparent border-b border-white/5 rounded-none p-0">
                                    <TabsTrigger value="info" className="flex-1 rounded-none data-[state=active]:bg-white/5 data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary transition-all text-[9px] font-bold uppercase tracking-widest">Info</TabsTrigger>
                                    <TabsTrigger value="color" className="flex-1 rounded-none data-[state=active]:bg-white/5 data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary transition-all text-[9px] font-bold uppercase tracking-widest"><Palette className="w-3.5 h-3.5" /></TabsTrigger>
                                    <TabsTrigger value="fx" className="flex-1 rounded-none data-[state=active]:bg-white/5 data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary transition-all text-[9px] font-bold uppercase tracking-widest"><Wand2 className="w-3.5 h-3.5" /></TabsTrigger>
                                    <TabsTrigger value="text" className="flex-1 rounded-none data-[state=active]:bg-white/5 data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary transition-all text-[9px] font-bold uppercase tracking-widest"><Type className="w-3.5 h-3.5" /></TabsTrigger>
                                    <TabsTrigger value="keys" className="flex-1 rounded-none data-[state=active]:bg-white/5 data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary transition-all text-[9px] font-bold uppercase tracking-widest"><Key className="w-3.5 h-3.5" /></TabsTrigger>
                                </TabsList>

                                <div className="p-4">
                                    <TabsContent value="info" className="mt-0 space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Filename</label>
                                            <p className="text-xs font-bold text-white/90 truncate bg-white/5 p-2 rounded-lg border border-white/5">{selectedClip.fileName}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">In Point</label>
                                                <p className="text-xs font-mono text-primary bg-primary/5 p-2 rounded-lg border border-primary/10">{formatTime(selectedClip.startTime)}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Duration</label>
                                                <p className="text-xs font-mono text-primary bg-primary/5 p-2 rounded-lg border border-primary/10">{formatTime(selectedClip.duration)}</p>
                                            </div>
                                        </div>
                                        
                                        {selectedClip.fileType === 'audio' && (
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Waveform</label>
                                                <AudioWaveformVisualization 
                                                    audioUrl={selectedClip.fileUrl} 
                                                    height={60} 
                                                    color="#3b82f6"
                                                />
                                            </div>
                                        )}

                                        <div className="pt-4">
                                            <Button variant="destructive" className="w-full h-9 text-[10px] font-black uppercase tracking-widest rounded-xl"
                                                onClick={() => { deleteClipMutation.mutate({ clipId: selectedClip.id }); setSelectedClipId(null); }}>
                                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Remove Clip
                                            </Button>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="color" className="mt-0 animate-in fade-in slide-in-from-right-2 duration-300">
                                        <ColorCorrectionPanel 
                                            clipId={selectedClip.id} 
                                            onColorCorrectionChange={(correction) => {
                                                updateClipMutation.mutate({ clipId: selectedClip.id, colorCorrection: correction });
                                            }} 
                                        />
                                    </TabsContent>

                                    <TabsContent value="fx" className="mt-0 animate-in fade-in slide-in-from-right-2 duration-300">
                                        <EffectsPanel 
                                            clipId={selectedClip.id} 
                                            onEffectsChange={(effects) => {
                                                updateClipMutation.mutate({ clipId: selectedClip.id, effects: effects });
                                            }} 
                                        />
                                    </TabsContent>

                                    <TabsContent value="text" className="mt-0 animate-in fade-in slide-in-from-right-2 duration-300">
                                        <TextOverlayPanel 
                                            clipId={selectedClip.id} 
                                            onTextChange={(text, props) => {
                                                updateClipMutation.mutate({ clipId: selectedClip.id, textOverlay: props });
                                            }} 
                                        />
                                    </TabsContent>

                                    <TabsContent value="keys" className="mt-0 animate-in fade-in slide-in-from-right-2 duration-300">
                                        <KeyframeEditor 
                                            clipId={selectedClip.id} 
                                            clipDuration={selectedClip.duration}
                                            onKeyframesChange={(keyframes) => {
                                                // Keyframes would typically be saved to the new editorKeyframes table
                                                // For now we could also store them in the clip metadata
                                                updateClipMutation.mutate({ clipId: selectedClip.id, effects: { ...selectedClip.effects as any, keyframes } });
                                            }} 
                                        />
                                    </TabsContent>
                                </div>
                            </Tabs>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-20 space-y-4">
                                <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-500 flex items-center justify-center">
                                    <GripVertical className="w-8 h-8 text-slate-500" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest">No Selection</p>
                                    <p className="text-[8px] font-medium leading-relaxed">Select a clip in the timeline to modify properties</p>
                                </div>
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </div>

            {/* ─── Timeline (Bottom 40%) ─── */}
            <div className="h-[40%] border-t border-white/5 bg-[#0a0a0f] flex flex-col overflow-hidden">
                <div className="px-4 py-1.5 border-b border-white/5 flex items-center justify-between flex-shrink-0 bg-white/[0.01]">
                    <div className="flex items-center gap-4">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Master Timeline</span>
                        <div className="h-3 w-px bg-white/10" />
                        <div className="flex items-center gap-2">
                            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Zoom</span>
                            <input 
                                type="range" 
                                min="0.1" 
                                max="5" 
                                step="0.1" 
                                value={zoom} 
                                onChange={(e) => setZoom(parseFloat(e.target.value))}
                                className="w-24 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">24 FPS | PRO_RES_RAW</span>
                    </div>
                </div>
                <div className="flex-1 overflow-hidden">
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
                                    if (videoRef.current.src !== activeClip.fileUrl) {
                                        videoRef.current.src = activeClip.fileUrl;
                                    }
                                    videoRef.current.currentTime = (t - activeClip.startTime) / 1000;
                                }
                            }
                        }}
                        isPlaying={isPlaying}
                        duration={duration || 30000}
                        onClipSelect={setSelectedClipId}
                        selectedClipId={selectedClipId}
                    />
                </div>
            </div>
        </div>
    );
}
