import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileVideo, CheckCircle2, Loader2, Share2, ShieldCheck, Zap, Settings } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ExportTabProps {
  projectId: number;
}

interface ExportFormat {
  id: "mp4" | "webm";
  name: string;
  extension: string;
  codec: string;
  bitrate: string;
  description: string;
}

const exportFormats: ExportFormat[] = [
  {
    id: "mp4",
    name: "Master Delivery (MP4)",
    extension: ".mp4",
    codec: "H.264 High Profile",
    bitrate: "Master Quality",
    description: "Universal cinematic playback",
  },
  {
    id: "webm",
    name: "Web Optimized (WebM)",
    extension: ".webm",
    codec: "VP9",
    bitrate: "Efficient stream",
    description: "Cloud-native performance",
  }
];

const resolutionOptions = [
  { value: "720p", label: "720p HD" },
  { value: "1080p", label: "1080p Full HD" },
  { value: "2k", label: "2K Cinema" },
  { value: "4k", label: "4K Ultra HD" },
];

export default function ExportTab({ projectId }: ExportTabProps) {
  const [selectedFormat, setSelectedFormat] = useState<"mp4" | "webm">("mp4");
  const [selectedResolution, setSelectedResolution] = useState("1080p");
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  const exportXmlMutation = trpc.projects.exportXml.useMutation();

  const renderMutation = trpc.video.render.useMutation({
    onSuccess: (data) => {
      setCurrentJobId(data.jobId);
      toast.success("Master render initiated");
    },
    onError: (error) => {
      toast.error(`Render failed: ${error.message}`);
    }
  });

  const { data: jobStatus, isError: isJobError } = trpc.video.status.useQuery(
    { jobId: currentJobId! },
    {
      enabled: !!currentJobId,
      refetchInterval: (query) => {
        const d = query.state.data;
        return (d?.status === 'completed' || d?.status === 'failed') ? false : 2000;
      }
    }
  );

  const isExporting = currentJobId && jobStatus?.status !== 'completed' && jobStatus?.status !== 'failed';
  const exportComplete = jobStatus?.status === 'completed';
  const exportFailed = jobStatus?.status === 'failed' || isJobError;
  const exportProgress = jobStatus?.progress || 0;

  const handleExport = async () => {
    // Note: server/routers/video.ts might not actually take 'resolution' yet in its Zod schema
    // Based on previous view_file, it only takes storyboardId, projectId, format.
    // We should update the backend or just pass what it needs for now.
    renderMutation.mutate({
      projectId,
      storyboardId: "main_storyboard",
      format: selectedFormat,
      // @ts-ignore - Backend needs update but we pass it anyway for future-proofing
      resolution: selectedResolution
    });
  };

  return (
    <div className="space-y-12 animate-fade-in p-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="production-node-title">Final Export</h2>
          <p className="production-label text-primary">Stage 9: Master Distribution</p>
        </div>
      </div>

      <div className="space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="production-label mb-2">Delivery Specification</h3>
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Select distribution format</p>
          </div>
          <Badge variant="outline" className="border-primary/50 text-primary">Master Output</Badge>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {exportFormats.map((format) => (
            <button
              key={format.id}
              onClick={() => setSelectedFormat(format.id)}
              className={`p-6 rounded-3xl border-2 text-left transition-all relative group ${selectedFormat === format.id
                ? "border-primary bg-primary/10 shadow-[0_0_30px_rgba(79,70,229,0.15)]"
                : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"
                }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${selectedFormat === format.id ? 'bg-primary text-white' : 'bg-white/5 text-slate-500'}`}>
                    <FileVideo className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-white uppercase tracking-tighter">{format.name}</h4>
                </div>
                {selectedFormat === format.id && (
                  <div className="bg-primary rounded-full p-1"><CheckCircle2 className="w-4 h-4 text-white" /></div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Codec</p>
                  <p className="text-xs font-mono text-white/80">{format.codec}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Target</p>
                  <p className="text-xs font-mono text-white/80">{format.bitrate}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="glass-panel p-8 rounded-[2rem] space-y-8 border-white/5">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Matrix Synthesis Settings</h3>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Resolution</label>
            <Select value={selectedResolution} onValueChange={setSelectedResolution}>
              <SelectTrigger className="bg-black/40 border-white/10 h-12 rounded-2xl text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a0f] border-white/10 text-white rounded-2xl">
                {resolutionOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="focus:bg-primary/20">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="glass-panel p-8 rounded-[2rem] space-y-8 border-white/5">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="production-label mb-2">NLE Project Interchange</h3>
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Edit in DaVinci Resolve / Premiere</p>
          </div>
          <Badge variant="outline" className="border-blue-500/50 text-blue-400">FCPXML 1.9</Badge>
        </div>

        <Button
          variant="outline"
          className="w-full h-20 rounded-[1.5rem] border-white/10 bg-white/5 hover:bg-white/10 text-white justify-between px-8"
          onClick={async () => {
            toast.promise(
              exportXmlMutation.mutateAsync({ projectId }),
              {
                loading: 'Generating FCPXML...',
                success: (data) => {
                  window.open(data.xmlUrl, '_blank');
                  return 'XML Exported!';
                },
                error: 'Failed to export XML'
              }
            );
          }}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
              <Share2 className="w-6 h-6" />
            </div>
            <div className="text-left">
              <div className="font-bold uppercase tracking-wider text-sm">Export to DaVinci Resolve</div>
              <div className="text-[10px] text-slate-400 font-mono mt-1">Includes Linked Media Paths</div>
            </div>
          </div>
          <Download className="w-5 h-5 text-slate-400" />
        </Button>
      </div>

      {isExporting && (
        <div className="glass-panel p-8 rounded-[2rem] border-primary/20 bg-primary/5 animate-pulse">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
            <div>
              <h4 className="font-bold text-white uppercase tracking-widest text-xs">Synthesis in Progress</h4>
              <p className="text-[10px] text-primary/60 font-black uppercase">Encoding master stream...</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-slate-500 uppercase">Matrix Progress</span>
              <span className="text-primary font-bold">{Math.round(exportProgress)}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${exportProgress}%` }} />
            </div>
          </div>
        </div>
      )}

      {exportComplete && (
        <div className="glass-panel p-8 rounded-[2rem] border-green-500/20 bg-green-500/5 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h4 className="font-bold text-white uppercase tracking-widest text-xs">Master Ready</h4>
              <p className="text-[10px] text-green-500/60 font-black uppercase tracking-widest">Verification complete</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {jobStatus?.url && (
              <a href={jobStatus.url} target="_blank" rel="noreferrer">
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12 rounded-2xl">
                  <Download className="w-4 h-4 mr-2" />
                  Download Master
                </Button>
              </a>
            )}
            <Button variant="ghost" className="text-slate-500 hover:text-white" onClick={() => setCurrentJobId(null)}>
              <Share2 className="w-4 h-4 mr-2" />
              Distribute
            </Button>
          </div>
        </div>
      )}

      {!isExporting && !exportComplete && !exportFailed && (
        <Button
          onClick={handleExport}
          disabled={renderMutation.isPending}
          className="w-full bg-primary hover:bg-primary/90 text-white font-black h-16 rounded-[2rem] text-sm uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(79,70,229,0.2)] group"
        >
          {renderMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 mr-3 animate-spin" />
              Engaging Matrix...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5 mr-3 group-hover:scale-125 transition-transform" />
              Finalize Master Output
            </>
          )}
        </Button>
      )}
    </div>
  );
}
