import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Play, Download } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface VideoTabProps {
  projectId: number;
}

export default function VideoTab({ projectId }: VideoTabProps) {
  const [selectedProvider, setSelectedProvider] = useState<"sora" | "veo3">("sora");
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusCheckInterval, setStatusCheckInterval] = useState<NodeJS.Timeout | null>(null);

  const projectQuery = trpc.projects.get.useQuery({ id: projectId });
  const videosQuery = trpc.video.list.useQuery({ projectId });
  const createVideoMutation = trpc.video.create.useMutation();
  const updateStatusMutation = trpc.video.updateStatus.useMutation();

  // Poll for video status updates
  useEffect(() => {
    if (isGenerating && videosQuery.data) {
      const processingVideos = videosQuery.data.filter((v) => v.status === "pending" || v.status === "processing");
      if (processingVideos.length === 0) {
        setIsGenerating(false);
        if (statusCheckInterval) clearInterval(statusCheckInterval);
      }
    }
  }, [videosQuery.data, isGenerating, statusCheckInterval]);

  const handleGenerateVideo = async () => {
    const technicalShots = projectQuery.data?.content?.technicalShots;
    if (!technicalShots) {
      alert("Please generate technical shots first");
      return;
    }

    setIsGenerating(true);
    try {
      const shots = JSON.parse(technicalShots);
      if (!shots || shots.length === 0) {
        alert("No technical shots found");
        return;
      }

      // Create video generation task
      const result = await createVideoMutation.mutateAsync({
        projectId,
        provider: selectedProvider,
      });

      if (result.success) {
        videosQuery.refetch();
        // Start polling for status
        const interval = setInterval(() => {
          videosQuery.refetch();
        }, 5000); // Check every 5 seconds
        setStatusCheckInterval(interval);
      }
    } catch (error) {
      console.error("Failed to generate video:", error);
      alert("Failed to generate video. Please try again.");
      setIsGenerating(false);
    }
  };

  const handleDownloadVideo = (videoUrl: string) => {
    const link = document.createElement("a");
    link.href = videoUrl;
    link.download = `storyboard-video-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="production-node">
      <div className="production-node-header">
        <div className="production-node-title">Video Generation</div>
        <div className="text-xs text-muted-foreground">Stage 5 of 5</div>
      </div>
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-3">
              Video Provider
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedProvider("sora")}
                className={`flex-1 px-4 py-2 rounded-sm text-sm font-medium transition ${
                  selectedProvider === "sora"
                    ? "bg-accent text-accent-foreground"
                    : "bg-input text-foreground hover:bg-input/80"
                }`}
              >
                Sora 2
              </button>
              <button
                onClick={() => setSelectedProvider("veo3")}
                className={`flex-1 px-4 py-2 rounded-sm text-sm font-medium transition ${
                  selectedProvider === "veo3"
                    ? "bg-accent text-accent-foreground"
                    : "bg-input text-foreground hover:bg-input/80"
                }`}
              >
                Veo3
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {selectedProvider === "sora"
                ? "Sora 2: Fast, high-quality video generation with great motion"
                : "Veo3: Advanced cinematic quality with superior visual consistency"}
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-3">
              Generation Status
            </label>
            <div className="bg-input border border-border rounded-sm p-3">
              <div className="text-sm">
                {isGenerating ? (
                  <div className="flex items-center text-accent">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating video...
                  </div>
                ) : videosQuery.data && videosQuery.data.length > 0 ? (
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">Latest video:</div>
                    <div className="text-xs">
                      Status: <span className="text-accent font-bold">{videosQuery.data[0].status}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">No videos generated yet</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t border-border">
          <Button
            onClick={handleGenerateVideo}
            disabled={isGenerating || createVideoMutation.isPending}
            className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-sm"
            size="sm"
          >
            {createVideoMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Generate Video
          </Button>
        </div>

        {videosQuery.data && videosQuery.data.length > 0 && (
          <div className="border-t border-border pt-6">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-4">
              Generated Videos
            </label>
            <div className="space-y-3">
              {videosQuery.data.map((video, idx) => (
                <div key={video.id} className="bg-input border border-border rounded-sm p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-sm font-bold text-foreground">Video {idx + 1}</div>
                      <div className="text-xs text-muted-foreground">
                        Provider: {video.provider.toUpperCase()} • Status: {video.status}
                      </div>
                    </div>
                    <div className={`text-xs font-bold px-2 py-1 rounded-sm ${
                      video.status === "completed"
                        ? "bg-green-600/20 text-green-400"
                        : video.status === "failed"
                        ? "bg-red-600/20 text-red-400"
                        : "bg-yellow-600/20 text-yellow-400"
                    }`}>
                      {video.status}
                    </div>
                  </div>

                  {video.videoUrl && (
                    <div className="mt-3">
                      <video
                        src={video.videoUrl}
                        controls
                        className="w-full rounded-sm border border-border mb-2"
                        style={{ maxHeight: "300px" }}
                      />
                      <Button
                        onClick={() => handleDownloadVideo(video.videoUrl!)}
                        className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-sm"
                        size="sm"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Video
                      </Button>
                    </div>
                  )}

                  {video.error && (
                    <div className="mt-2 p-2 bg-red-600/10 border border-red-600/30 rounded-sm">
                      <div className="text-xs text-red-400">Error: {video.error}</div>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground mt-2">
                    Created: {new Date(video.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-border pt-6 bg-input/30 p-4 rounded-sm">
          <div className="text-xs text-muted-foreground space-y-2">
            <p className="font-bold text-foreground mb-2">Video Generation Info</p>
            <p>• Videos are generated from your storyboard shots and technical specifications</p>
            <p>• Generation may take 2-10 minutes depending on video length and provider</p>
            <p>• Sora 2 is optimized for speed and motion quality</p>
            <p>• Veo3 provides superior cinematic quality and visual consistency</p>
            <p>• Check back periodically to see your generated video</p>
          </div>
        </div>
      </div>
    </div>
  );
}
