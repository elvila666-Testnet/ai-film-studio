import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, SkipBack, SkipForward, Loader2, Video, Maximize2, Zap } from "lucide-react";
import { toast } from "sonner";
import Timeline from "@/components/Timeline";
import { ManifestSidebar } from "@/features/Project/ManifestSidebar";
import { InspectorPanel } from "@/features/Project/InspectorPanel";
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
  const videoRef = useRef<HTMLVideoElement>(null);

  const editorProjId = editorProjectId ? Number(editorProjectId) : 0;
  const editorProjectsQuery = trpc.editor.projects.list.useQuery({ projectId });
  const clipsQuery = trpc.editor.clips.list.useQuery(
    { editorProjectId: editorProjId },
    { enabled: !!editorProjectId }
  );

  const utils = trpc.useUtils();

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        editorProjectId: editorProjId,
        trackId: 1, // Defaulting to track 1
        fileUrl: mediaUrl,
        fileName: file.name,
        fileType,
        duration: Math.round(mediaDuration * 1000),
        order: (clipsQuery.data?.length || 0) + 1,
      });
    } catch (error) { toast.error("File processing error"); }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const rs = s % 60;
    const f = Math.floor((ms % 1000) / 41.66);
    return `${m.toString().padStart(2, "0")}:${rs.toString().padStart(2, "0")}:${f.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (!editorProjectId && editorProjectsQuery.data?.length) {
      setEditorProjectId(editorProjectsQuery.data[0].id.toString());
    }
  }, [editorProjectsQuery.data]);

  const activeEditorProject = (editorProjectsQuery.data as any as EditorProject[])?.find(p => p.id === editorProjId);
  const clips = (clipsQuery.data as any as Clip[]) || [];
  const selectedClip = clips.find(c => c.id === selectedClipId) || null;

  return (
    <div className="flex flex-col h-full bg-[#020205] text-white animate-fade-in p-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="production-node-title">Studio Editor</h2>
          <p className="production-label text-primary">Stage 8: Final Assembly</p>
        </div>
      </div>

      {!editorProjectId && !editorProjectsQuery.data?.length ? (
        <div className="flex flex-col items-center justify-center flex-1 py-12">
          <div className="glass-panel p-12 text-center border-dashed border-white/10 max-w-md">
            <Zap className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tighter">Initialize Sequencer</h3>
            <p className="text-slate-500 text-sm mb-8">Establish a new editing sync point to assemble your cinematic assets.</p>
            <Button onClick={handleCreateEditorProject} disabled={createEditorProjectMutation.isPending} className="bg-white text-black hover:bg-primary hover:text-white h-12 px-8 rounded-2xl font-bold">
              {createEditorProjectMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Create Editor Sync"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="glass-panel px-6 py-3 flex items-center justify-between z-10">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 bg-primary/20 border border-primary/20 rounded-full text-[10px] font-black text-primary uppercase">Active Sync</div>
                <span className="text-xs font-mono text-white/40">{activeEditorProject?.title || "Untitled Sequence"}</span>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="px-4 py-2 bg-black/40 border border-white/5 rounded-xl font-mono text-primary text-sm tracking-wider shadow-inner">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" onClick={handlePlayPause} className="hover:bg-primary/20 text-primary">
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                </Button>
                <Button size="icon" variant="ghost" className="hover:bg-white/5 text-slate-500"><SkipBack className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" className="hover:bg-white/5 text-slate-500"><SkipForward className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden p-4 gap-4">
            <ManifestSidebar clips={clips} onUpload={handleFileUpload} onSelect={setSelectedClipId} selectedId={selectedClipId} />
            <div className="flex-1 glass-panel rounded-[2rem] flex flex-col overflow-hidden relative group">
              <div className="absolute top-6 left-6 z-10 flex gap-2">
                <div className="production-label bg-black/40 backdrop-blur px-3 py-1 rounded-full border border-white/10">Reference Monitor</div>
              </div>
              <div className="flex-1 bg-black flex items-center justify-center relative">
                {clips.length ? (
                  <video ref={videoRef} className="w-full h-full object-contain" onTimeUpdate={() => setCurrentTime((videoRef.current?.currentTime || 0) * 1000)} onLoadedMetadata={() => setDuration((videoRef.current?.duration || 0) * 1000)} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} crossOrigin="anonymous" preload="metadata" />
                ) : (
                  <div className="text-center space-y-4 opacity-10">
                    <Video className="w-24 h-24 mx-auto" />
                    <p className="text-sm font-black uppercase tracking-[0.3em]">No Layer Selected</p>
                  </div>
                )}
              </div>
              <div className="absolute bottom-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-black/60 backdrop-blur border border-white/5 rounded-2xl px-4 py-2 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Scale</span>
                    <input type="range" min="0.5" max="3" step="0.1" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-20 accent-primary" />
                  </div>
                  <Volume2 className="w-4 h-4 text-slate-500" />
                  <Maximize2 className="w-4 h-4 text-slate-500 cursor-pointer hover:text-white" />
                </div>
              </div>
            </div>
            <InspectorPanel clip={selectedClip} onDelete={(id) => { deleteClipMutation.mutate({ clipId: id }); setSelectedClipId(null); }} />
          </div>

          <div className="h-56 glass-panel m-4 mt-0 rounded-3xl overflow-hidden flex flex-col">
            <div className="px-6 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <h3 className="production-label text-[10px!important] uppercase tracking-widest text-slate-500">Assembler Timeline</h3>
              <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">24.00 FPS | Non-Destructive Sync</div>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <Timeline editorProjectId={editorProjId} currentTime={currentTime} onTimeChange={(t) => { setCurrentTime(t); if (videoRef.current) videoRef.current.currentTime = t / 1000; }} isPlaying={isPlaying} duration={duration || 300} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
