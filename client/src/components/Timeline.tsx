import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Plus, Trash2, Volume2, Eye, EyeOff, Lock, Unlock, 
  Scissors, MousePointer2, Music, Video as VideoIcon 
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface TimelineProps {
  editorProjectId: number;
  currentTime: number;
  onTimeChange: (time: number) => void;
  isPlaying: boolean;
  duration: number;
  onClipSelect?: (clipId: number | null) => void;
  selectedClipId?: number | null;
}

interface Track {
  id: number;
  name: string;
  type: "video" | "audio" | "text";
  isMuted: boolean;
  isSolo: boolean;
  isLocked: boolean;
  isVisible: boolean;
  height: number;
}

interface TimelineClip {
  id: number;
  trackId: number;
  startTime: number;
  duration: number;
  name: string;
  color: string;
}

export default function Timeline({
  editorProjectId,
  currentTime,
  onTimeChange,
  isPlaying: _isPlaying,
  duration,
  onClipSelect,
  selectedClipId: externalSelectedClipId,
}: TimelineProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [clips, setClips] = useState<TimelineClip[]>([]);
  const [internalSelectedClipId, setInternalSelectedClipId] = useState<number | null>(null);
  const [dragOverTrackId, setDragOverTrackId] = useState<number | null>(null);
  
  const selectedClipId = externalSelectedClipId !== undefined ? externalSelectedClipId : internalSelectedClipId;

  const updateClipMutation = trpc.editor.clips.update.useMutation();
  const splitClipMutation = trpc.editor.clips.split.useMutation();
  const [zoom, setZoom] = useState(1);
  const [trimMode, setTrimMode] = useState<"left" | "right" | null>(null);
  const [trimStartX, setTrimStartX] = useState(0);
  const [draggedClipId, setDraggedClipId] = useState<number | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(0.5); // in seconds
  const [editMode, setEditMode] = useState<"select" | "blade">("select");
  const timelineRef = useRef<HTMLDivElement>(null);
  const pixelsPerMillisecond = (50 * zoom) / 1000;

  const tracksQuery = trpc.editor.tracks.list.useQuery(
    { editorProjectId },
    { enabled: !!editorProjectId }
  );

  const clipsQuery = trpc.editor.clips.list.useQuery(
    { editorProjectId },
    { enabled: !!editorProjectId }
  );

  const createTrackMutation = trpc.editor.tracks.create.useMutation({
    onSuccess: () => {
      toast.success("Track created");
      tracksQuery.refetch();
    },
    onError: (error) => toast.error(`Failed to create track: ${error.message}`),
  });

  const deleteTrackMutation = trpc.editor.tracks.delete.useMutation({
    onSuccess: () => {
      toast.success("Track deleted");
      tracksQuery.refetch();
      clipsQuery.refetch();
    },
    onError: (error) => toast.error(`Failed to delete track: ${error.message}`),
  });

  const trimClipMutation = trpc.editor.clips.trim.useMutation({
    onSuccess: () => {
      clipsQuery.refetch();
    },
    onError: (error) => toast.error(`Trim failed: ${error.message}`),
  });

  useEffect(() => {
    if (tracksQuery.data) {
      setTracks(
        tracksQuery.data.map((track: any) => ({
          id: track.id,
          name: track.name || `Track ${track.id}`,
          type: track.trackType || "video",
          isMuted: false,
          isSolo: false,
          isLocked: false,
          isVisible: true,
          height: 60,
        }))
      );
    }
  }, [tracksQuery.data]);

  useEffect(() => {
    if (clipsQuery.data) {
      setClips(
        clipsQuery.data.map((clip: any) => ({
          id: clip.id,
          trackId: clip.trackId || 0,
          startTime: clip.startTime || 0,
          duration: clip.duration || 5000,
          name: clip.fileName || `Clip ${clip.id}`,
          color: clip.fileType === 'audio' ? '#1e40af' : '#15803d',
        }))
      );
    }
  }, [clipsQuery.data]);

  const handleClipSelect = (id: number | null) => {
    if (onClipSelect) {
      onClipSelect(id);
    } else {
      setInternalSelectedClipId(id);
    }
  };

  const handleTrimStart = (e: React.MouseEvent, clipId: number, side: "left" | "right") => {
    e.stopPropagation();
    handleClipSelect(clipId);
    setTrimMode(side);
    setTrimStartX(e.clientX);
  };

  const handleTrimMove = (e: MouseEvent) => {
    if (!trimMode || selectedClipId === null) return;
    const clip = clips.find((c) => c.id === selectedClipId);
    if (!clip) return;

    const deltaX = e.clientX - trimStartX;
    const deltaTime = deltaX / pixelsPerMillisecond;

    if (trimMode === "left") {
      const newStartTime = Math.max(0, Math.round(clip.startTime + deltaTime));
      const newDuration = clip.duration - (newStartTime - clip.startTime);
      if (newDuration > 500) {
        setClips(clips.map((c) => c.id === selectedClipId ? { ...c, startTime: newStartTime, duration: newDuration } : c));
        setTrimStartX(e.clientX);
      }
    } else {
      const newDuration = Math.max(500, Math.round(clip.duration + deltaTime));
      setClips(clips.map((c) => c.id === selectedClipId ? { ...c, duration: newDuration } : c));
      setTrimStartX(e.clientX);
    }
  };

  const handleTrimEnd = () => {
    if (selectedClipId === null) return;
    const clip = clips.find((c) => c.id === selectedClipId);
    if (clip) {
      trimClipMutation.mutate({ clipId: clip.id, startTime: clip.startTime, duration: clip.duration });
    }
    setTrimMode(null);
  };

  const handleCutClip = (clipId: number) => {
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;
    if (currentTime <= clip.startTime || currentTime >= clip.startTime + clip.duration) {
      toast.error("Playhead must be inside the clip to cut");
      return;
    }
    splitClipMutation.mutate({ clipId, splitTime: currentTime }, {
      onSuccess: () => {
        toast.success("Clip cut");
        clipsQuery.refetch();
      }
    });
  };

  const handleClipDragStart = (e: React.MouseEvent, clipId: number) => {
    if (editMode === "blade") return;
    e.stopPropagation();
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;

    setDraggedClipId(clipId);
    setDragStartX(e.clientX);
    setDragStartTime(clip.startTime);
    handleClipSelect(clipId);
  };

  const handleClipDragMove = (e: MouseEvent) => {
    if (draggedClipId === null) return;
    const deltaX = e.clientX - dragStartX;
    const deltaTime = deltaX / pixelsPerMillisecond;
    let newStartTime = Math.max(0, Math.round(dragStartTime + deltaTime));
    
    if (snapToGrid) {
      newStartTime = Math.round(newStartTime / (gridSize * 1000)) * (gridSize * 1000);
    }

    setClips(clips.map((c) => c.id === draggedClipId ? { ...c, startTime: newStartTime } : c));
  };

  const handleDragOver = (e: React.DragEvent, trackId: number) => {
    e.preventDefault();
    setDragOverTrackId(trackId);
  };

  const handleDrop = (e: React.DragEvent, trackId: number) => {
    e.preventDefault();
    if (draggedClipId !== null) {
      setClips(clips.map(c => c.id === draggedClipId ? { ...c, trackId } : c));
      updateClipMutation.mutate({ clipId: draggedClipId, trackId });
    }
    setDragOverTrackId(null);
  };

  const handleDragLeave = () => {
    setDragOverTrackId(null);
  };

  const handleClipDragEnd = () => {
    if (draggedClipId !== null) {
      const clip = clips.find(c => c.id === draggedClipId);
      if (clip) {
        updateClipMutation.mutate({ clipId: clip.id, startTime: clip.startTime });
      }
    }
    setDraggedClipId(null);
  };

  const handleDeleteTrack = (trackId: number) => {
    deleteTrackMutation.mutate({ trackId });
  };

  const handleAddTrack = (type: "video" | "audio") => {
    const trackNumber = tracks.length + 1;
    createTrackMutation.mutate({ editorProjectId, name: `New ${type} Track`, trackType: type, trackNumber });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (trimMode) handleTrimMove(e);
      if (draggedClipId !== null) handleClipDragMove(e);
    };
    const handleMouseUp = () => {
      if (trimMode) handleTrimEnd();
      if (draggedClipId !== null) handleClipDragEnd();
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [trimMode, draggedClipId, clips, selectedClipId]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] text-white">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant={editMode === "select" ? "default" : "ghost"} 
            className="h-7 w-7 p-0"
            onClick={() => setEditMode("select")}
          >
            <MousePointer2 className="w-4 h-4" />
          </Button>
          <Button 
            size="sm" 
            variant={editMode === "blade" ? "default" : "ghost"} 
            className="h-7 w-7 p-0"
            onClick={() => setEditMode("blade")}
          >
            <Scissors className="w-4 h-4" />
          </Button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <Button size="sm" variant="ghost" className="h-7 text-[9px] uppercase font-bold" onClick={() => handleAddTrack("video")}>
            + Video
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-[9px] uppercase font-bold" onClick={() => handleAddTrack("audio")}>
            + Audio
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-slate-500 uppercase">Zoom</span>
            <input type="range" min="0.1" max="5" step="0.1" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="w-20 h-1 accent-primary" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto relative" ref={timelineRef}>
        <div className="absolute top-0 left-0 w-full h-6 bg-[#0a0a0f] border-b border-white/5 z-20 flex">
          <div className="w-24 border-r border-white/5 flex-shrink-0" />
          <div 
            className="flex-1 relative cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const time = x / pixelsPerMillisecond;
              onTimeChange(Math.max(0, Math.min(duration, time)));
            }}
          >
            {Array.from({ length: Math.ceil(duration / 1000) + 1 }).map((_, i) => (
              <div key={i} className="absolute top-0 text-[8px] font-mono text-slate-600 border-l border-white/5 h-full pl-1" style={{ left: i * 1000 * pixelsPerMillisecond }}>
                {i}s
              </div>
            ))}
          </div>
        </div>

        <div className="pt-6">
          {tracks.map((track) => (
            <div key={track.id} className="flex border-b border-white/5 min-h-[60px] group/track">
              <div className="w-24 border-r border-white/5 bg-[#0a0a0f] p-2 flex flex-col justify-between flex-shrink-0">
                <span className="text-[9px] font-bold text-slate-400 truncate uppercase tracking-tighter">{track.name}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover/track:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="w-5 h-5 rounded hover:bg-white/5"><Eye className="w-3 h-3 text-slate-500" /></Button>
                  <Button size="icon" variant="ghost" className="w-5 h-5 rounded hover:bg-white/5"><Lock className="w-3 h-3 text-slate-500" /></Button>
                  <Button size="icon" variant="ghost" className="w-5 h-5 rounded hover:bg-red-500/10" onClick={() => handleDeleteTrack(track.id)}><Trash2 className="w-3 h-3 text-red-500/50 hover:text-red-500" /></Button>
                </div>
              </div>
              <div 
                className={`flex-1 relative h-[60px] cursor-crosshair transition-colors ${dragOverTrackId === track.id ? 'bg-primary/10' : 'bg-white/[0.01]'}`}
                onDragOver={(e) => handleDragOver(e, track.id)}
                onDrop={(e) => handleDrop(e, track.id)}
                onDragLeave={handleDragLeave}
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const time = x / pixelsPerMillisecond;
                    onTimeChange(Math.max(0, Math.min(duration, time)));
                  }
                }}
              >
                {clips.filter(c => c.trackId === track.id).map(clip => (
                  <div
                    key={clip.id}
                    className={`absolute top-1 bottom-1 rounded-md border shadow-lg transition-all cursor-pointer flex flex-col overflow-hidden ${selectedClipId === clip.id ? 'border-primary ring-1 ring-primary ring-offset-2 ring-offset-black z-10' : 'border-white/10 hover:border-white/30'}`}
                    style={{
                      left: clip.startTime * pixelsPerMillisecond,
                      width: clip.duration * pixelsPerMillisecond,
                      backgroundColor: clip.color + '44',
                    }}
                    draggable
                    onDragStart={(e) => {
                      const img = new Image();
                      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                      e.dataTransfer.setDragImage(img, 0, 0);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClipSelect(clip.id);
                      if (editMode === 'blade') handleCutClip(clip.id);
                    }}
                    onMouseDown={(e) => handleClipDragStart(e, clip.id)}
                  >
                    <div className="px-2 py-1 flex items-center gap-1.5 border-b border-white/5 bg-white/5">
                      {track.type === 'audio' ? <Music className="w-3 h-3 text-blue-400" /> : <VideoIcon className="w-3 h-3 text-green-400" />}
                      <span className="text-[9px] font-bold truncate text-white/80">{clip.name}</span>
                    </div>
                    
                    <div className="absolute top-0 bottom-0 left-0 w-1.5 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => handleTrimStart(e, clip.id, 'left')} />
                    <div className="absolute top-0 bottom-0 right-0 w-1.5 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => handleTrimStart(e, clip.id, 'right')} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Playhead */}
        <div 
          className="absolute top-0 bottom-0 w-px bg-red-500 z-30 pointer-events-none"
          style={{ left: 96 + (currentTime * pixelsPerMillisecond) }}
        >
          <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rotate-45" />
        </div>
      </div>
    </div>
  );
}
