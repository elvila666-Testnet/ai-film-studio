import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Volume2, Eye, Lock, Scissors, MousePointer2, Music, Video as VideoIcon } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface TimelineProps {
  editorProjectId: number;
  currentTime: number;
  onTimeChange: (time: number) => void;
  isPlaying: boolean;
  duration: number;
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
}: TimelineProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [clips, setClips] = useState<TimelineClip[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [dragOverTrackId, setDragOverTrackId] = useState<number | null>(null);
  const [selectedClipId, setSelectedClipId] = useState<number | null>(null);
  const [trimMode, setTrimMode] = useState<"left" | "right" | null>(null);
  const [trimStartX, setTrimStartX] = useState(0);
  const [draggedClipId, setDraggedClipId] = useState<number | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(0.5); // in seconds
  const [history, setHistory] = useState<Array<{ clips: TimelineClip[]; timestamp: number }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [pendingUpdates, setPendingUpdates] = useState<Map<number, number>>(new Map());
  const [editMode, setEditMode] = useState<"select" | "blade">("select");
  const timelineRef = useRef<HTMLDivElement>(null);
  const batchSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pixelsPerSecond = 50 * zoom;

  // Mutations for adding clips
  const addClipMutation = trpc.editor.clips.upload.useMutation({
    onSuccess: () => {
      toast.success("Clip added to timeline");
      clipsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to add clip: ${error.message}`);
    },
  });

  // Queries
  const tracksQuery = trpc.editor.tracks.list.useQuery(
    { editorProjectId },
    { enabled: !!editorProjectId }
  );

  const clipsQuery = trpc.editor.clips.list.useQuery(
    { editorProjectId },
    { enabled: !!editorProjectId }
  );

  // Mutations
  const createTrackMutation = trpc.editor.tracks.create.useMutation({
    onSuccess: () => {
      toast.success("Track created");
      tracksQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create track: ${error.message}`);
    },
  });

  const splitClipMutation = trpc.editor.clips.split.useMutation({
    onSuccess: () => {
      toast.success("Clip split successfully");
      clipsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Split failed: ${error.message}`);
    },
  });

  // Note: Delete track mutation not yet implemented in backend

  // Update local state from queries
  useEffect(() => {
    if (tracksQuery.data) {
      setTracks(
        tracksQuery.data.map((track: Record<string, any>) => ({
          id: track.id,
          name: track.name || `Track ${track.id}`,
          type: track.type || "video",
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
        clipsQuery.data.map((clip: Record<string, any>) => {
          // Clips from DB are already in seconds or milliseconds?
          // Looking at handles, they are passed as ms. 
          // But our duration state is now SECONDS.
          // Standardizing: Any duration > 1000 is likely ms, convert to s.
          const dur = clip.duration > 1000 ? clip.duration / 1000 : clip.duration || 5;
          return {
            id: clip.id,
            trackId: clip.trackId || 0,
            startTime: clip.startTime || 0,
            duration: dur,
            name: clip.fileName || `Clip ${clip.id}`,
            color: `hsl(${(clip.id * 137) % 360}, 70%, 60%)`, // Stable color
          };
        })
      );
    }
  }, [clipsQuery.data]);

  const handleAddTrack = (type: "video" | "audio") => {
    createTrackMutation.mutate({
      editorProjectId,
      trackType: type,
      trackNumber: tracks.length,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Track ${tracks.length + 1}`,
    });
  };

  const handleDeleteTrack = (_trackId: number) => {
    // Delete track functionality to be implemented
    toast.info("Delete track feature coming soon");
  };

  const handleTrimStart = (e: React.MouseEvent, clipId: number, side: "left" | "right") => {
    e.stopPropagation();
    setSelectedClipId(clipId);
    setTrimMode(side);
    setTrimStartX(e.clientX);
  };

  const handleTrimMove = (e: React.MouseEvent) => {
    if (!trimMode || selectedClipId === null) return;

    const clip = clips.find((c) => c.id === selectedClipId);
    if (!clip) return;

    const deltaX = e.clientX - trimStartX;
    const deltaTime = deltaX / pixelsPerSecond;

    if (trimMode === "left") {
      const newStartTime = Math.max(0, clip.startTime + deltaTime);
      const newDuration = clip.duration - (newStartTime - clip.startTime);
      if (newDuration > 0.5) {
        setClips(
          clips.map((c) =>
            c.id === selectedClipId
              ? { ...c, startTime: newStartTime, duration: newDuration }
              : c
          )
        );
        setTrimStartX(e.clientX);
      }
    } else if (trimMode === "right") {
      const newDuration = Math.max(0.5, clip.duration + deltaTime);
      setClips(
        clips.map((c) =>
          c.id === selectedClipId ? { ...c, duration: newDuration } : c
        )
      );
      setTrimStartX(e.clientX);
    }
  };

  const handleTrimEnd = () => {
    setTrimMode(null);
    toast.success("Clip trimmed successfully");
  };

  const handleCutClip = (clipId: number) => {
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;

    const cutPosition = currentTime;
    if (cutPosition <= clip.startTime || cutPosition >= clip.startTime + clip.duration) {
      toast.error("Playhead must be inside the clip to cut");
      return;
    }

    // Create new clip for the right part
    const rightClipDuration = clip.startTime + clip.duration - cutPosition;
    const newClip: TimelineClip = {
      id: Math.max(...clips.map((c) => c.id), 0) + 1,
      trackId: clip.trackId,
      startTime: cutPosition,
      duration: rightClipDuration,
      name: `${clip.name} (Part 2)`,
      color: clip.color,
    };

    // Update left clip
    const leftDuration = cutPosition - clip.startTime;
    setClips([
      ...clips.map((c) =>
        c.id === clipId ? { ...c, duration: leftDuration, name: `${clip.name} (Part 1)` } : c
      ),
      newClip,
    ]);

    toast.success("Clip cut successfully");
  };

  const handleClipDragStart = (e: React.DragEvent<HTMLDivElement>, clipId: number) => {
    e.stopPropagation();
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;

    setDraggedClipId(clipId);
    setDragStartX(e.clientX);
    setDragStartTime(clip.startTime);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", clipId.toString());
  };

  const handleClipDragMove = (e: MouseEvent) => {
    if (draggedClipId === null) return;

    const clip = clips.find((c) => c.id === draggedClipId);
    if (!clip) return;

    const deltaX = (e as any).clientX - dragStartX;
    const deltaTime = deltaX / pixelsPerSecond;
    let newStartTime = Math.max(0, dragStartTime + deltaTime);

    // Apply snap to grid
    newStartTime = snapTime(newStartTime);

    setClips(
      clips.map((c) =>
        c.id === draggedClipId ? { ...c, startTime: newStartTime } : c
      )
    );
  };

  const _updateClipPositionMutation = trpc.editor.clips.updatePosition.useMutation();
  void _updateClipPositionMutation;
  const batchUpdateClipsMutation = trpc.editor.clips.batchUpdatePositions.useMutation();

  // Snap to grid helper
  const snapTime = (time: number): number => {
    if (!snapToGrid) return time;
    return Math.round(time / gridSize) * gridSize;
  };

  // Add to history for undo/redo
  const addToHistory = (newClips: TimelineClip[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ clips: newClips, timestamp: Date.now() });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Undo handler
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setClips(history[newIndex].clips);
      toast.success("Undo");
    }
  };

  // Redo handler
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setClips(history[newIndex].clips);
      toast.success("Redo");
    }
  };

  // Batch save pending updates
  const flushPendingUpdates = () => {
    if (pendingUpdates.size === 0) return;

    const updates = Array.from(pendingUpdates.entries()).map(([clipId, startTime]) => ({
      clipId,
      startTime,
    }));

    batchUpdateClipsMutation.mutate(
      { updates },
      {
        onSuccess: () => {
          toast.success(`Saved ${updates.length} clip(s)`);
          setPendingUpdates(new Map());
        },
        onError: (error) => {
          console.error("Failed to save clips:", error);
          toast.error("Failed to save clips");
        },
      }
    );
  };

  // Schedule batch save
  const scheduleBatchSave = () => {
    if (batchSaveTimeoutRef.current) {
      clearTimeout(batchSaveTimeoutRef.current);
    }
    batchSaveTimeoutRef.current = setTimeout(() => {
      flushPendingUpdates();
    }, 1000);
  };

  const handleClipDragEnd = () => {
    if (draggedClipId !== null) {
      const draggedClip = clips.find((c) => c.id === draggedClipId);
      if (draggedClip) {
        // Add to pending updates for batch save
        const newPending = new Map(pendingUpdates);
        newPending.set(draggedClipId, draggedClip.startTime);
        setPendingUpdates(newPending);

        // Add to history
        addToHistory(clips);

        // Schedule batch save
        scheduleBatchSave();
      }
    }
    setDraggedClipId(null);
  };

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  const handleToggleMute = (trackId: number) => {
    setTracks(
      tracks.map((track) =>
        track.id === trackId ? { ...track, isMuted: !track.isMuted } : track
      )
    );
  };

  const _handleToggleSolo = (trackId: number) => {
    void _handleToggleSolo;
    setTracks(
      tracks.map((track) =>
        track.id === trackId
          ? { ...track, isSolo: !track.isSolo }
          : { ...track, isSolo: false }
      )
    );
  };

  const handleToggleLock = (trackId: number) => {
    setTracks(
      tracks.map((track) =>
        track.id === trackId ? { ...track, isLocked: !track.isLocked } : track
      )
    );
  };

  const handleToggleVisibility = (trackId: number) => {
    setTracks(
      tracks.map((track) =>
        track.id === trackId
          ? { ...track, isVisible: !track.isVisible }
          : track
      )
    );
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = clickX / pixelsPerSecond;
    onTimeChange(newTime);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, trackId: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setDragOverTrackId(trackId);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setDragOverTrackId(null);
    }
  };

  const handleDropClip = (e: React.DragEvent<HTMLDivElement>, trackId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTrackId(null);

    try {
      let clipData = null;
      const jsonData = e.dataTransfer?.getData("application/json");

      if (jsonData) {
        try {
          clipData = JSON.parse(jsonData);
        } catch (parseError) {
          console.error("Failed to parse JSON:", parseError);
        }
      }

      if (!clipData) {
        const textData = e.dataTransfer?.getData("text/plain");
        if (textData) {
          try {
            clipData = JSON.parse(textData);
          } catch (parseError) {
            console.error("Failed to parse text data:", parseError);
          }
        }
      }

      if (!clipData || clipData.type !== "clip") {
        console.warn("Invalid clip data received", clipData);
        toast.error("Invalid clip data");
        return;
      }

      if (!clipData.fileUrl || !clipData.fileName) {
        console.error("Missing required clip fields", clipData);
        toast.error("Clip missing required information");
        return;
      }

      const timelineContainer = e.currentTarget;
      const rect = timelineContainer.getBoundingClientRect();
      const dropX = e.clientX - rect.left;
      const startTime = Math.max(0, dropX / pixelsPerSecond);

      console.log("Dropping clip:", clipData.fileName, "to track", trackId);

      addClipMutation.mutate(
        {
          editorProjectId,
          trackId,
          fileUrl: clipData.fileUrl,
          fileName: clipData.fileName,
          fileType: "video",
          duration: clipData.duration,
          order: clips.filter((c) => c.trackId === trackId).length + 1,
          startTime,
        },
        {
          onSuccess: () => {
            toast.success("Clip added to timeline");
          },
          onError: (error) => {
            console.error("Mutation error:", error);
            toast.error("Failed to add clip");
          },
        }
      );
    } catch (error) {
      console.error("Failed to drop clip:", error);
      toast.error("Failed to add clip to timeline");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (trimMode) {
      document.addEventListener("mousemove", handleTrimMove as any);
      document.addEventListener("mouseup", handleTrimEnd);
      return () => {
        document.removeEventListener("mousemove", handleTrimMove as any);
        document.removeEventListener("mouseup", handleTrimEnd);
      };
    }
  }, [trimMode, selectedClipId, trimStartX, clips, pixelsPerSecond]);

  useEffect(() => {
    if (draggedClipId !== null) {
      document.addEventListener("mousemove", handleClipDragMove as any);
      document.addEventListener("mouseup", handleClipDragEnd);
      return () => {
        document.removeEventListener("mousemove", handleClipDragMove as any);
        document.removeEventListener("mouseup", handleClipDragEnd);
      };
    }
  }, [draggedClipId, dragStartX, dragStartTime, clips, pixelsPerSecond, snapToGrid, gridSize]);

  return (
    <div className="w-full h-full bg-slate-900 rounded-lg p-2 flex flex-col gap-2 overflow-hidden">
      {/* Timeline Header with Controls */}
      <div className="flex items-center justify-between bg-black/40 p-4 rounded-xl border border-white/5">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Current Position</h3>
            <span className="text-xl font-mono font-black text-primary tracking-tighter">
              {formatTime(currentTime)}
            </span>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="flex flex-col">
            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Total Duration</h3>
            <span className="text-xl font-mono font-black text-slate-400 tracking-tighter">
                {formatTime(duration)}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Timeline Zoom</h3>
                <div className="flex items-center gap-3">
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
                        className="h-8 w-8 hover:bg-white/5 text-slate-500 rounded-lg"
                    >
                        −
                    </Button>
                    <div className="relative w-32 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="absolute top-0 left-0 h-full bg-primary" style={{ width: `${(zoom / 5) * 100}%` }} />
                        <input
                            type="range"
                            min="0.25"
                            max="5"
                            step="0.25"
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                    </div>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setZoom(Math.min(5, zoom + 0.25))}
                        className="h-8 w-8 hover:bg-white/5 text-slate-500 rounded-lg"
                    >
                        +
                    </Button>
                </div>
            </div>
        </div>
      </div>

      {/* Snap to Grid and Undo/Redo Controls */}
      <div className="flex items-center gap-4 bg-slate-800 p-3 rounded">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-400">Snap to Grid:</label>
          <input
            type="checkbox"
            checked={snapToGrid}
            onChange={(e) => setSnapToGrid(e.target.checked)}
            className="w-4 h-4"
          />
          {snapToGrid && (
            <>
              <label className="text-sm text-slate-400">Size:</label>
              <select
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
                className="bg-slate-700 text-white text-sm px-2 py-1 rounded"
              >
                <option value={0.25}>0.25s</option>
                <option value={0.5}>0.5s</option>
                <option value={1}>1s</option>
                <option value={2}>2s</option>
              </select>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Button
            size="sm"
            variant="outline"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="Undo (Ctrl+Z)"
          >
            ↶ Undo
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            title="Redo (Ctrl+Y)"
          >
            ↷ Redo
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={flushPendingUpdates}
            disabled={pendingUpdates.size === 0}
            title="Save all pending changes"
          >
            💾 Save ({pendingUpdates.size})
          </Button>
        </div>
      </div>

      {/* NEW: Tool Selector */}
      <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl w-fit border border-white/5">
        <Button
          size="sm"
          variant={editMode === "select" ? "default" : "ghost"}
          onClick={() => setEditMode("select")}
          className={`h-8 px-3 rounded-lg gap-2 text-[10px] uppercase font-black tracking-widest transition-all ${editMode === "select" ? "bg-primary text-black" : "text-slate-500"}`}
        >
          <MousePointer2 className="w-3.5 h-3.5" />
          Select
        </Button>
        <Button
          size="sm"
          variant={editMode === "blade" ? "default" : "ghost"}
          onClick={() => setEditMode("blade")}
          className={`h-8 px-3 rounded-lg gap-2 text-[10px] uppercase font-black tracking-widest transition-all ${editMode === "blade" ? "bg-red-600 text-white hover:bg-red-500" : "text-slate-500"}`}
        >
          <Scissors className="w-3.5 h-3.5" />
          Blade
        </Button>
      </div>

      {/* Add Track Buttons */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAddTrack("video")}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Video Track
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAddTrack("audio")}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Audio Track
        </Button>

      </div>

      {/* Tracks Panel */}
      <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-800">
        {/* Timeline Ruler */}
        <div className="flex border-b border-white/5 bg-[#050508]">
          <div className="w-56 bg-black border-r border-white/5 flex-shrink-0" />
          <div className="flex-1 overflow-x-auto scroller-hidden">
            <div
              className="flex relative h-10 border-b border-white/5"
              style={{ width: `${duration * pixelsPerSecond}px` }}
            >
              {/* Show ticks every N seconds based on zoom level to avoid DOM bloat */}
              {Array.from({ length: Math.ceil(duration / (zoom < 0.5 ? 10 : 1)) }).map((_, i) => {
                const time = i * (zoom < 0.5 ? 10 : 1);
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center justify-start flex-shrink-0 border-r border-white/10"
                    style={{ 
                      width: `${pixelsPerSecond * (zoom < 0.5 ? 10 : 1)}px`,
                      position: 'absolute',
                      left: `${time * pixelsPerSecond}px`
                    }}
                  >
                    <div className="h-2 w-px bg-white/20 mb-1" />
                    <span className="text-[9px] font-mono text-white/40">
                      {formatTime(time)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tracks */}
        <div className="flex">
          {/* Track Controls */}
          <div className="w-56 bg-[#050508] border-r border-white/5 flex-shrink-0 overflow-y-auto">
            {tracks.length === 0 ? (
              <div className="p-8 text-center text-slate-600">
                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center mx-auto mb-3">
                    <Plus className="w-5 h-5" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest">No tracks</p>
              </div>
            ) : (
              tracks.map((track) => (
                <div
                  key={track.id}
                  className={`border-b border-white/5 p-3 cursor-pointer transition-all relative group ${selectedTrackId === track.id
                    ? "bg-white/[0.03]"
                    : "hover:bg-white/[0.02]"
                    }`}
                  onClick={() => setSelectedTrackId(track.id)}
                  style={{ height: `${track.height}px` }}
                >
                  <div className="flex flex-col justify-between h-full relative z-10">
                    <div className="flex items-center justify-between gap-2">
                       <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${track.type === 'audio' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {track.type === 'audio' ? <Music className="w-3.5 h-3.5" /> : <VideoIcon className="w-3.5 h-3.5" />}
                          </div>
                          <span className="text-[10px] items-center gap-2 font-black text-white/80 truncate uppercase tracking-widest">
                            {track.name}
                          </span>
                       </div>
                       <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleToggleMute(track.id); }}
                                className={`p-1.5 rounded-lg transition-colors ${track.isMuted ? "bg-red-500 text-white" : "bg-white/5 text-slate-500 hover:text-white"}`}
                            >
                                <Volume2 className="w-3 h-3" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleToggleLock(track.id); }}
                                className={`p-1.5 rounded-lg transition-colors ${track.isLocked ? "bg-amber-500 text-white" : "bg-white/5 text-slate-500 hover:text-white"}`}
                            >
                                <Lock className="w-3 h-3" />
                            </button>
                       </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${track.isVisible ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-slate-600'}`} />
                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">{track.type} Track</span>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteTrack(track.id); }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-all flex-shrink-0"
                            title="Delete"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                  </div>
                  {selectedTrackId === track.id && (
                     <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Timeline Content */}
          <div className="flex-1 overflow-x-auto">
            <div className="flex flex-col">
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className={`border-b border-slate-600 relative transition-colors ${dragOverTrackId === track.id
                    ? "bg-slate-700 border-accent"
                    : "bg-slate-800"
                    }`}
                  style={{ height: `${track.height}px` }}
                  ref={track.id === tracks[0]?.id ? timelineRef : null}
                  onClick={handleTimelineClick}
                  onDragOver={(e) => handleDragOver(e, track.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDropClip(e, track.id)}
                >
                  {/* Clips for this track */}
                  {clips
                    .filter((clip) => clip.trackId === track.id)
                    .map((clip) => {
                      const clipWidth = Math.max(50, clip.duration * pixelsPerSecond); // Minimum 50px width
                      return (
                        <div
                          key={clip.id}
                          draggable={editMode === "select"}
                          onDragStart={(e) => editMode === "select" && handleClipDragStart(e, clip.id)}
                          onDragEnd={handleClipDragEnd}
                          onClick={(e) => {
                            if (editMode === "blade") {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                const splitPointX = e.clientX - rect.left;
                                const splitTimeMs = (splitPointX / pixelsPerSecond) * 1000;
                                splitClipMutation.mutate({ clipId: clip.id, splitTime: Math.round(splitTimeMs) });
                            }
                          }}
                          className={`absolute top-1 bottom-1 rounded-xl border cursor-pointer transition-all overflow-hidden group shadow-2xl ${
                            editMode === "blade" ? "hover:ring-2 hover:ring-red-500 hover:scale-[1.02]" : ""
                          } ${
                            draggedClipId === clip.id
                                ? "border-yellow-400 z-50 ring-4 ring-yellow-400/20 scale-105"
                                : "border-white/10"
                            } ${
                                track.type === 'audio' 
                                    ? "bg-gradient-to-br from-purple-600/40 to-indigo-900/60" 
                                    : "bg-gradient-to-br from-blue-600/40 to-cyan-900/60"
                            }`}
                          style={{
                            left: `${clip.startTime * pixelsPerSecond}px`,
                            width: `${clipWidth}px`,
                            minWidth: '20px',
                          }}
                          title={clip.name}
                        >
                           {/* Premium Glass Effect Overlay */}
                          <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                          
                          <div className="relative z-10 flex flex-col h-full justify-center px-2">
                             <div className="flex items-center gap-1.5 min-w-0">
                                {track.type === 'audio' ? <Music className="w-3 h-3 text-purple-300 flex-shrink-0" /> : <VideoIcon className="w-3 h-3 text-blue-300 flex-shrink-0" />}
                                <span className="text-[10px] font-black text-white/90 truncate uppercase tracking-tighter">
                                    {clip.name}
                                </span>
                             </div>
                             <div className="text-[8px] font-mono text-white/40 mt-0.5">{(clip.duration).toFixed(1)}s</div>
                          </div>

                          {/* Trim handles - only show if selection mode and not dragging */}
                          {editMode === "select" && draggedClipId !== clip.id && (
                            <>
                              <div
                                className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 transition-colors"
                                onMouseDown={(e) => handleTrimStart(e, clip.id, "left")}
                              />
                              <div
                                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 transition-colors"
                                onMouseDown={(e) => handleTrimStart(e, clip.id, "right")}
                              />
                            </>
                          )}

                          {/* Blade Indicator Overlay */}
                          {editMode === "blade" && (
                             <div className="absolute inset-0 bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity border-x border-red-500/50 pointer-events-none flex items-center justify-center">
                                <Scissors className="w-4 h-4 text-red-500 animate-pulse" />
                             </div>
                          )}
                        </div>
                      );
                    })}

                  {/* Playhead indicator (only on first track) */}
                  {track.id === tracks[0]?.id && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none"
                      style={{ left: `${currentTime * pixelsPerSecond}px` }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}
