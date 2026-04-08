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
  const updateClipMutation = trpc.editor.clips.update.useMutation();
  const splitClipMutation = trpc.editor.clips.split.useMutation();
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
  const pixelsPerMillisecond = (50 * zoom) / 1000; // 50 pixels per second at zoom 1

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

  const deleteTrackMutation = trpc.editor.tracks.delete.useMutation({
    onSuccess: () => {
      toast.success("Track deleted");
      tracksQuery.refetch();
      clipsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete track: ${error.message}`);
    },
  });

  const trimClipMutation = trpc.editor.clips.trim.useMutation({
    onSuccess: () => {
      toast.success("Trim saved");
      clipsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Trim failed: ${error.message}`);
    },
  });

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
          const durationMs = clip.duration || 5000;
          return {
            id: clip.id,
            trackId: clip.trackId || 0,
            startTime: clip.startTime || 0,
            duration: durationMs,
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

  const handleDeleteTrack = (trackId: number) => {
    deleteTrackMutation.mutate({ trackId });
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
    const deltaTime = deltaX / pixelsPerMillisecond;

    if (trimMode === "left") {
      const newStartTime = Math.max(0, Math.round(clip.startTime + deltaTime));
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
      const newDuration = Math.max(500, Math.round(clip.duration + deltaTime));
      setClips(
        clips.map((c) =>
          c.id === selectedClipId ? { ...c, duration: newDuration } : c
        )
      );
      setTrimStartX(e.clientX);
    }
  };

  const handleTrimEnd = () => {
    if (selectedClipId === null) return;
    const clip = clips.find((c) => c.id === selectedClipId);
    if (!clip) return;

    trimClipMutation.mutate(
      { clipId: clip.id, startTime: clip.startTime, duration: clip.duration },
      {
        onSuccess: () => {
          toast.success("Clip trimmed successfully");
          clipsQuery.refetch();
        },
        onError: (error) => {
          toast.error(`Failed to trim clip: ${error.message}`);
        },
      }
    );
    setTrimMode(null);
  };

  const handleCutClip = (clipId: number) => {
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;

    const cutPosition = currentTime; // currentTime is already in milliseconds
    if (cutPosition <= clip.startTime || cutPosition >= clip.startTime + clip.duration) {
      toast.error("Playhead must be inside the clip to cut");
      return;
    }

    const leftDuration = cutPosition - clip.startTime;

    // Update the original clip (left part)
    updateClipMutation.mutate(
      { clipId, duration: leftDuration },
      {
        onSuccess: () => {
          // Then create new clip for the right part
          splitClipMutation.mutate(
            { clipId, splitTime: cutPosition },
            {
              onSuccess: () => {
                toast.success("Clip cut successfully");
                clipsQuery.refetch();
              },
              onError: (error) => {
                toast.error(`Failed to create new clip after cut: ${error.message}`);
              },
            }
          );
        },
        onError: (error) => {
          toast.error(`Failed to update original clip before cut: ${error.message}`);
        },
      }
    );
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
    const deltaTime = deltaX / pixelsPerMillisecond;
    let newStartTime = Math.max(0, Math.round(dragStartTime + deltaTime));

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
    return Math.round(time / (gridSize * 1000)) * (gridSize * 1000);
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
          toast.success("Clips saved");
          setPendingUpdates(new Map());
          clipsQuery.refetch();
        },
        onError: (error) => {
          toast.error(`Failed to save clips: ${error.message}`);
        },
      }
    );
  };

  useEffect(() => {
    if (batchSaveTimeoutRef.current) {
      clearTimeout(batchSaveTimeoutRef.current);
    }
    if (pendingUpdates.size > 0) {
      batchSaveTimeoutRef.current = setTimeout(flushPendingUpdates, 1000);
    }
    return () => {
      if (batchSaveTimeoutRef.current) {
        clearTimeout(batchSaveTimeoutRef.current);
      }
    };
  }, [pendingUpdates]);

  const handleClipDragEnd = () => {
    if (draggedClipId === null) return;
    const clip = clips.find((c) => c.id === draggedClipId);
    if (!clip) return;

    // Add to pending updates for batch saving
    setPendingUpdates((prev) => new Map(prev).set(clip.id, clip.startTime));

    setDraggedClipId(null);
    setDragStartX(0);
    setDragStartTime(0);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, trackId: number) => {
    e.preventDefault();
    setDragOverTrackId(trackId);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, trackId: number) => {
    e.preventDefault();
    setDragOverTrackId(null);

    const clipData = e.dataTransfer.getData("text/plain");
    try {
      const droppedClip = JSON.parse(clipData);
      if (droppedClip && droppedClip.id) {
        // This is a clip being moved within the timeline
        const existingClip = clips.find((c) => c.id === droppedClip.id);
        if (existingClip) {
          const timelineRect = timelineRef.current?.getBoundingClientRect();
          if (!timelineRect) return;

          const dropX = e.clientX - timelineRect.left;
          let newStartTime = Math.round(dropX / pixelsPerMillisecond);

          // Snap to grid
          newStartTime = snapTime(newStartTime);

          setClips(
            clips.map((c) =>
              c.id === droppedClip.id ? { ...c, trackId, startTime: newStartTime } : c
            )
          );
          // Add to pending updates for batch saving
          setPendingUpdates((prev) => new Map(prev).set(droppedClip.id, newStartTime));
        }
      } else {
        // This is a new asset being dropped from the media pool
        // The EditorTab component handles adding new clips, so we just refetch
        clipsQuery.refetch();
      }
    } catch (error) {
      console.error("Failed to parse dropped clip data:", error);
      toast.error("Failed to add clip to timeline.");
    }
  };

  const handleDragLeave = () => {
    setDragOverTrackId(null);
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 0.5));

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const rs = s % 60;
    const f = Math.floor((ms % 1000) / 41.66);
    return `${m.toString().padStart(2, "0")}:${rs.toString().padStart(2, "0")}:${f.toString().padStart(2, "0")}`;
  };

  // Calculate total duration of all clips
  const totalDuration = clips.reduce((max, clip) => Math.max(max, clip.startTime + clip.duration), 0);

  // Update timeline width based on total duration and zoom
  const timelineWidth = Math.max(duration * pixelsPerMillisecond, 1000); // Minimum width of 1000px

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] text-white">
      {/* Timeline Controls */}
      <div className="flex items-center justify-between p-2 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleAddTrack("video")} className="text-primary hover:bg-primary/20">
            <VideoIcon className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleAddTrack("audio")} className="text-primary hover:bg-primary/20">
            <Music className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setEditMode(editMode === "select" ? "blade" : "select")} className="text-primary hover:bg-primary/20">
            {editMode === "select" ? <MousePointer2 className="w-4 h-4" /> : <Scissors className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleUndo} disabled={historyIndex <= 0} className="text-slate-400 hover:bg-white/5">
            Undo
          </Button>
          <Button variant="ghost" size="icon" onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="text-slate-400 hover:bg-white/5">
            Redo
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleZoomOut} className="text-slate-400 hover:bg-white/5">-</Button>
          <span className="text-xs text-slate-400">Zoom: {zoom.toFixed(1)}x</span>
          <Button variant="ghost" size="sm" onClick={handleZoomIn} className="text-slate-400 hover:bg-white/5">+</Button>
        </div>
      </div>

      {/* Timeline Tracks Area */}
      <div className="relative flex-1 overflow-x-auto" ref={timelineRef} onMouseMove={handleTrimMove} onMouseUp={handleTrimEnd} onMouseLeave={handleClipDragEnd}>
        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 pointer-events-none"
          style={{ left: `${currentTime * pixelsPerMillisecond}px` }}
        />

        {/* Time Ruler */}
        <div className="absolute top-0 left-0 right-0 h-6 bg-gray-800 border-b border-gray-700 flex items-center">
          {Array.from({ length: Math.ceil(totalDuration / 1000) + 1 }).map((_, i) => (
            <div
              key={i}
              className="absolute text-xs text-gray-400"
              style={{ left: `${i * 1000 * pixelsPerMillisecond}px` }}
            >
              {i}s
            </div>
          ))}
        </div>

        {/* Tracks */}
        <div className="mt-6">
          {tracks.map((track) => (
            <div
              key={track.id}
              className="relative h-20 border-b border-gray-700 bg-gray-900"
              onDragOver={(e) => handleDragOver(e, track.id)}
              onDrop={(e) => handleDrop(e, track.id)}
              onDragLeave={handleDragLeave}
            >
              <div className="absolute inset-y-0 left-0 w-24 bg-gray-800 flex items-center justify-between px-2 text-xs text-gray-400 border-r border-gray-700">
                <span>{track.name}</span>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="w-5 h-5 text-slate-500 hover:bg-white/5">
                    {track.isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="w-5 h-5 text-slate-500 hover:bg-white/5">
                    {track.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDeleteTrack(track.id)} className="w-5 h-5 text-red-500 hover:bg-white/5">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="ml-24 h-full relative">
                {clips
                  .filter((clip) => clip.trackId === track.id)
                  .map((clip) => (
                    <div
                      key={clip.id}
                      className={`absolute h-16 rounded-md cursor-grab ${selectedClipId === clip.id ? "border-2 border-yellow-400" : ""}`}
                      style={{
                        left: `${clip.startTime * pixelsPerMillisecond}px`,
                        width: `${clip.duration * pixelsPerMillisecond}px`,
                        top: "2px",
                        backgroundColor: clip.color,
                      }}
                      onClick={() => {
                        setSelectedClipId(clip.id);
                        if (editMode === "blade") {
                          handleCutClip(clip.id);
                        }
                      }}
                      onMouseDown={(e) => handleClipDragStart(e as any, clip.id)}
                    >
                      <span className="text-xs p-1">{clip.name}</span>
                      {/* Left trim handle */}
                      <div
                        className="absolute top-0 bottom-0 -left-1 w-2 cursor-col-resize hover:bg-blue-300/50"
                        onMouseDown={(e) => handleTrimStart(e, clip.id, "left")}
                      />
                      {/* Right trim handle */}
                      <div
                        className="absolute top-0 bottom-0 -right-1 w-2 cursor-col-resize hover:bg-blue-300/50"
                        onMouseDown={(e) => handleTrimStart(e, clip.id, "right")}
                      />
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
