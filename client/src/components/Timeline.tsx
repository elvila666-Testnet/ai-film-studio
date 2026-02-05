import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Volume2, Eye, Lock, Copy } from "lucide-react";
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
  isPlaying,
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

  // Note: Delete track mutation not yet implemented in backend

  // Update local state from queries
  useEffect(() => {
    if (tracksQuery.data) {
      setTracks(
        tracksQuery.data.map((track: any) => ({
          id: track.id,
          name: track.name || `Track ${track.id}`,
          type: track.type || "video",
          isMuted: false,
          isSolo: false,
          isLocked: false,
          isVisible: true,
          height: 80,
        }))
      );
    }
  }, [tracksQuery.data]);

  useEffect(() => {
    if (clipsQuery.data) {
      setClips(
        clipsQuery.data.map((clip: any) => {
          // Convert duration from milliseconds to seconds if needed
          const durationSeconds = clip.duration > 1000 ? clip.duration / 1000 : clip.duration || 5;
          return {
            id: clip.id,
            trackId: clip.trackId || 0,
            startTime: clip.startTime || 0,
            duration: durationSeconds,
            name: clip.fileName || `Clip ${clip.id}`,
            color: `hsl(${Math.random() * 360}, 70%, 60%)`,
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

  const updateClipPositionMutation = trpc.editor.clips.updatePosition.useMutation();
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

  const handleToggleSolo = (trackId: number) => {
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
    <div className="w-full bg-slate-900 rounded-lg p-4 space-y-4">
      {/* Timeline Header with Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-white">Timeline</h3>
          <span className="text-sm text-slate-400">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-400">Zoom:</label>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
            className="h-8 w-8 p-0"
            title="Zoom Out"
          >
            −
          </Button>
          <input
            type="range"
            min="0.25"
            max="5"
            step="0.25"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-32"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom(Math.min(5, zoom + 0.25))}
            className="h-8 w-8 p-0"
            title="Zoom In"
          >
            +
          </Button>
          <span className="text-sm text-slate-400 w-12 text-right">{(zoom * 100).toFixed(0)}%</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom(1)}
            className="text-xs"
            title="Reset Zoom"
          >
            Reset
          </Button>
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
        <div className="flex border-b border-slate-700">
          <div className="w-48 bg-slate-700 border-r border-slate-600 flex-shrink-0" />
          <div className="flex-1 bg-slate-800 overflow-x-auto">
            <div
              className="flex relative h-8 border-b border-slate-600"
              style={{ width: `${duration * pixelsPerSecond}px` }}
            >
              {Array.from({ length: Math.ceil(duration) }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center justify-start flex-shrink-0 border-r border-slate-600"
                  style={{ width: `${pixelsPerSecond}px` }}
                >
                  <span className="text-xs text-slate-400 pt-1">
                    {formatTime(i)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tracks */}
        <div className="flex">
          {/* Track Controls */}
          <div className="w-48 bg-slate-700 border-r border-slate-600 flex-shrink-0 overflow-y-auto max-h-96">
            {tracks.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-sm">
                No tracks yet. Add one to get started.
              </div>
            ) : (
              tracks.map((track) => (
                <div
                  key={track.id}
                  className={`border-b border-slate-600 p-2 cursor-pointer transition-colors ${
                    selectedTrackId === track.id
                      ? "bg-slate-600"
                      : "hover:bg-slate-600"
                  }`}
                  onClick={() => setSelectedTrackId(track.id)}
                  style={{ height: `${track.height}px` }}
                >
                  <div className="flex flex-col gap-1 h-full">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white truncate">
                        {track.name}
                      </span>
                      <span className="text-xs text-slate-400 bg-slate-800 px-1 rounded">
                        {track.type}
                      </span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleMute(track.id);
                        }}
                        className={`p-1 rounded text-xs ${
                          track.isMuted
                            ? "bg-red-600 text-white"
                            : "bg-slate-600 text-slate-300"
                        }`}
                        title="Mute"
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleVisibility(track.id);
                        }}
                        className={`p-1 rounded text-xs ${
                          track.isVisible
                            ? "bg-slate-600 text-slate-300"
                            : "bg-slate-500 text-slate-400"
                        }`}
                        title="Toggle Visibility"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleLock(track.id);
                        }}
                        className={`p-1 rounded text-xs ${
                          track.isLocked
                            ? "bg-yellow-600 text-white"
                            : "bg-slate-600 text-slate-300"
                        }`}
                        title="Lock"
                      >
                        <Lock className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTrack(track.id);
                        }}
                        className="p-1 rounded text-xs bg-slate-600 text-red-400 hover:bg-red-600 hover:text-white"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Timeline Content */}
          <div className="flex-1 overflow-x-auto max-h-96">
            <div className="flex flex-col">
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className={`border-b border-slate-600 relative transition-colors ${
                    dragOverTrackId === track.id
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
                          draggable
                          onDragStart={(e) => handleClipDragStart(e, clip.id)}
                          onDragEnd={handleClipDragEnd}
                          className={`absolute top-1 bottom-1 rounded bg-opacity-80 border cursor-move hover:border-white transition-colors overflow-hidden group ${
                            draggedClipId === clip.id
                              ? "border-yellow-400 opacity-75 shadow-lg shadow-yellow-400"
                              : "border-slate-400"
                          }`}
                          style={{
                            left: `${clip.startTime * pixelsPerSecond}px`,
                            width: `${clipWidth}px`,
                            backgroundColor: clip.color,
                            minWidth: '50px',
                          }}
                          title={clip.name}
                        >
                          <div className="text-xs text-white truncate p-1">
                            {clip.name}
                          </div>
                          {/* Trim handles - only show if not dragging */}
                          {draggedClipId !== clip.id && (
                            <>
                              <div
                                className="absolute left-0 top-0 bottom-0 w-1 bg-white opacity-0 group-hover:opacity-100 cursor-ew-resize hover:bg-yellow-400"
                                onMouseDown={(e) => handleTrimStart(e, clip.id, "left")}
                              />
                              <div
                                className="absolute right-0 top-0 bottom-0 w-1 bg-white opacity-0 group-hover:opacity-100 cursor-ew-resize hover:bg-yellow-400"
                                onMouseDown={(e) => handleTrimStart(e, clip.id, "right")}
                              />
                            </>
                          )}
                          {/* Cut button on hover */}
                          <button
                            onClick={() => handleCutClip(clip.id)}
                            className="absolute top-0 right-6 opacity-0 group-hover:opacity-100 bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded transition-opacity"
                            title="Cut at playhead"
                          >
                            Cut
                          </button>
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

      {/* Timeline Info */}
      <div className="text-xs text-slate-400 space-y-1">
        <p>• Click on timeline to seek</p>
        <p>• Use zoom controls (−/+) to adjust timeline scale (0.25x - 5x)</p>
        <p>• Click track controls to mute, hide, or lock tracks</p>
        <p>• Drag clips from Media panel to timeline to add them</p>
        <p>• Hover over clips to see trim handles (white edges) - drag to trim duration</p>
        <p>• Click "Cut" button to split clip at playhead position</p>
      </div>
    </div>
  );
}
