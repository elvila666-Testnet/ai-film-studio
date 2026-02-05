import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload, Play, Pause, Volume2, Settings, Trash2, Plus, SkipBack, SkipForward } from "lucide-react";
import { toast } from "sonner";
import Timeline from "@/components/Timeline";

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
  const [newComment, setNewComment] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  const editorProjId = editorProjectId ? Number(editorProjectId) : 0;

  // Queries
  const editorProjectsQuery = trpc.editor.projects.list.useQuery({ projectId });
  const clipsQuery = trpc.editor.clips.list.useQuery(
    { editorProjectId: editorProjId },
    { enabled: !!editorProjectId }
  );
  const tracksQuery = trpc.editor.tracks.list.useQuery(
    { editorProjectId: editorProjId },
    { enabled: !!editorProjectId }
  );
  const commentsQuery = trpc.editor.comments.list.useQuery(
    { clipId: selectedClipId || 0 },
    { enabled: !!selectedClipId }
  );

  // Mutations
  const createEditorProjectMutation = trpc.editor.projects.create.useMutation({
    onSuccess: (data) => {
      setEditorProjectId(data.editorProjectId.toString());
      toast.success("Editor project created");
      editorProjectsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create editor project: ${error.message}`);
    },
  });

  const uploadClipMutation = trpc.editor.clips.upload.useMutation({
    onSuccess: () => {
      toast.success("Clip uploaded successfully");
      clipsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to upload clip: ${error.message}`);
    },
  });

  const deleteClipMutation = trpc.editor.clips.delete.useMutation({
    onSuccess: () => {
      toast.success("Clip deleted");
      clipsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete clip: ${error.message}`);
    },
  });
  const createCommentMutation = trpc.editor.comments.create.useMutation({
    onSuccess: () => {
      toast.success("Comment added");
      setNewComment("");
      commentsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to add comment: ${error.message}`);
    },
  });
  const populateFromStoryboardMutation = trpc.editor.populateFromStoryboard.useMutation({
    onSuccess: (data) => {
      toast.success(`Loaded ${data.clipsCreated} storyboard frames`);
      clipsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to load storyboard: ${error.message}`);
    },
  });

  const handleCreateEditorProject = () => {
    createEditorProjectMutation.mutate({
      projectId,
      title: `Editor Project - ${new Date().toLocaleDateString()}`,
      description: "Video editing project",
      fps: 24,
      resolution: "1920x1080",
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, trackId: number, fileType: "video" | "audio" | "image") => {
    const file = e.target.files?.[0];
    if (!file || !editorProjId) return;

    try {
      const fileUrl = URL.createObjectURL(file);
      const duration = await getMediaDuration(file, fileType === "audio");

      uploadClipMutation.mutate({
        editorProjectId: editorProjId,
        trackId,
        fileUrl,
        fileName: file.name,
        fileType,
        duration: Math.round(duration * 1000),
        order: (clipsQuery.data?.length || 0) + 1,
      });
    } catch (error) {
      toast.error("Failed to upload file");
    }
  };

  // Log clips data for debugging
  useEffect(() => {
    if (clipsQuery.data && clipsQuery.data.length > 0) {
      console.log("Clips loaded:", clipsQuery.data);
      console.log("First clip URL:", clipsQuery.data[0].fileUrl);
    }
  }, [clipsQuery.data]);

  const getMediaDuration = (file: File, isAudio: boolean): Promise<number> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const media = isAudio ? new Audio() : document.createElement("video");
      media.src = url;
      media.onloadedmetadata = () => resolve(media.duration);
      media.onerror = () => reject(new Error("Failed to load media"));
    });
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    console.log("Play/pause clicked, readyState:", videoRef.current.readyState);
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (videoRef.current.readyState >= 2) {
        videoRef.current.play().catch((err) => {
          console.error("Play error:", err);
          toast.error("Video not ready: " + err.message);
        });
        setIsPlaying(true);
      } else {
        console.warn("Video not ready, readyState:", videoRef.current.readyState);
        toast.error("Video loading...");
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  // Sync playback state with video element
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      console.log("Attempting to play, readyState:", videoRef.current.readyState);
      if (videoRef.current.readyState >= 2) {
        videoRef.current.play().catch((err) => {
          console.error("Play error:", err);
          setIsPlaying(false);
        });
      } else {
        console.warn("Video not ready to play, readyState:", videoRef.current.readyState);
      }
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  // Handle video source changes
  useEffect(() => {
    if (videoRef.current && clipsQuery.data && clipsQuery.data.length > 0) {
      const firstClip = clipsQuery.data[0];
      console.log("Loading video:", firstClip.fileUrl);
      console.log("Video ref current:", videoRef.current);
      setIsPlaying(false);
      setCurrentTime(0);
      
      // Check if URL is valid
      if (!firstClip.fileUrl || firstClip.fileUrl.trim() === "") {
        console.error("Invalid file URL");
        toast.error("Invalid video URL");
        return;
      }
      
      videoRef.current.src = firstClip.fileUrl;
      videoRef.current.load();
    }
  }, [clipsQuery.data]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Auto-select first editor project on load
  useEffect(() => {
    if (!editorProjectId && editorProjectsQuery.data && editorProjectsQuery.data.length > 0) {
      setEditorProjectId(editorProjectsQuery.data[0].id.toString());
    }
  }, [editorProjectsQuery.data, editorProjectId]);

  if (!editorProjectId && (!editorProjectsQuery.data || editorProjectsQuery.data.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">No Editor Project</h3>
          <p className="text-sm text-muted-foreground mb-4">Create a new editor project to start editing</p>
          <Button onClick={handleCreateEditorProject} disabled={createEditorProjectMutation.isPending}>
            <Plus className="w-4 h-4 mr-2" />
            Create Editor Project
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background text-foreground gap-0">
      {/* Top Toolbar */}
      <div className="bg-card border-b border-border px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">PROJECT:</span>
          {editorProjectsQuery.data && editorProjectsQuery.data.length > 0 && !editorProjectId && (
            <select
              className="px-2 py-1 border border-border rounded bg-background text-foreground text-sm"
              onChange={(e) => setEditorProjectId(e.target.value)}
              value={editorProjectId}
            >
              <option value="">Select Project</option>
              {editorProjectsQuery.data.map((proj) => (
                <option key={proj.id} value={proj.id.toString()}>
                  {proj.title}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="text-xs font-mono text-accent">{formatTime(currentTime)} / {formatTime(duration)}</div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handlePlayPause}>
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {editorProjectId && (
        <div className="flex flex-1 gap-0 overflow-hidden">
          {/* Left Panel - Media */}
          <div className="w-64 border-r border-border bg-card flex flex-col">
            <div className="border-b border-border px-3 py-2">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Media</h3>
            </div>

            <div className="flex-1 overflow-auto p-2 space-y-1">
              {clipsQuery.data?.map((clip) => (
                <div
                  key={clip.id}
                  draggable
                  onDragStart={(e) => {
                    const data = JSON.stringify({
                      type: "clip",
                      clipId: clip.id,
                      fileName: clip.fileName,
                      duration: clip.duration,
                      fileUrl: clip.fileUrl,
                    });
                    e.dataTransfer?.setData("application/json", data);
                    e.dataTransfer?.setData("text/plain", data);
                    e.dataTransfer!.effectAllowed = "copy";
                  }}
                  onClick={() => setSelectedClipId(clip.id)}
                  className={`p-2 rounded border cursor-move transition-colors ${
                    selectedClipId === clip.id
                      ? "bg-accent border-accent text-accent-foreground"
                      : "bg-background border-border hover:border-accent text-foreground"
                  }`}
                >
                  {/* Thumbnail Preview */}
                  {clip.fileType === "video" || clip.fileType === "image" ? (
                    <div className="w-full h-12 bg-slate-700 rounded mb-1 flex items-center justify-center overflow-hidden">
                      <video
                        src={clip.fileUrl}
                        className="w-full h-full object-cover"
                        onLoadedMetadata={(e) => {
                          const video = e.currentTarget;
                          video.currentTime = 0;
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-12 bg-slate-700 rounded mb-1 flex items-center justify-center text-xs text-muted-foreground">
                      Audio
                    </div>
                  )}
                  <p className="text-xs font-medium truncate">{clip.fileName}</p>
                  <p className="text-xs text-muted-foreground">{Math.round(clip.duration / 1000)}s</p>
                </div>
              ))}
            </div>

            <div className="border-t border-border p-2 space-y-2">
              <label className="flex items-center justify-center gap-2 cursor-pointer p-2 border-2 border-dashed border-border rounded hover:border-accent transition-colors">
                <Upload className="w-4 h-4" />
                <span className="text-xs">Upload</span>
                <input
                  type="file"
                  hidden
                  accept="video/*,audio/*,image/*"
                  onChange={(e) => handleFileUpload(e, 1, "video")}
                  disabled={uploadClipMutation.isPending}
                />
              </label>
            </div>
          </div>

          {/* Center Panel - Canvas/Preview */}
          <div className="flex-1 border-r border-border bg-black flex flex-col">
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              {clipsQuery.data && clipsQuery.data.length > 0 ? (
                <video
                  ref={videoRef}
                  className="w-full h-full object-contain"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  controls
                  controlsList="nodownload"
                  crossOrigin="anonymous"
                  style={{ backgroundColor: '#000' }}
                  preload="metadata"
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="text-muted-foreground text-sm">No clips loaded. Upload or drag clips from Media panel.</div>
              )}
            </div>

            {/* Canvas Toolbar */}
            <div className="border-t border-border bg-card px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Zoom:</span>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-32"
                />
                <span className="text-xs text-muted-foreground">{(zoom * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                <input type="range" min="0" max="100" defaultValue="80" className="w-20" />
              </div>
            </div>
          </div>

          {/* Right Panel - Inspector */}
          <div className="w-64 border-l border-border bg-card flex flex-col">
            <div className="border-b border-border px-3 py-2">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Inspector</h3>
            </div>

            <div className="flex-1 overflow-auto p-3 space-y-4">
              {selectedClipId && clipsQuery.data?.find((c) => c.id === selectedClipId) ? (
                <>
                  <div>
                    <label className="text-xs font-semibold text-foreground uppercase">Clip Name</label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {clipsQuery.data.find((c) => c.id === selectedClipId)?.fileName}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground uppercase">Duration</label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {Math.round((clipsQuery.data.find((c) => c.id === selectedClipId)?.duration || 0) / 1000)}s
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground uppercase">Volume</label>
                    <input type="range" min="0" max="100" defaultValue="100" className="w-full mt-2" />
                  </div>

                  <div className="pt-4 border-t border-border">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-full"
                      onClick={() => {
                        deleteClipMutation.mutate({ clipId: selectedClipId });
                        setSelectedClipId(null);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Clip
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Select a clip to view properties</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Panel - Timeline */}
      {editorProjectId && (
        <div className="h-48 border-t border-border bg-card flex flex-col">
          <div className="flex-1 overflow-auto">
            <Timeline
              editorProjectId={editorProjId}
              currentTime={currentTime}
              onTimeChange={setCurrentTime}
              isPlaying={isPlaying}
              duration={duration || 300}
            />
          </div>
        </div>
      )}
    </div>
  );
}
