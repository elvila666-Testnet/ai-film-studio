
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useSearch } from "wouter";

export default function VideoPage() {
    const search = useSearch();
    const params = new URLSearchParams(search);
    const projectId = params.get("projectId") ? parseInt(params.get("projectId")!) : undefined;

    const renderMutation = trpc.video.create.useMutation({
        onSuccess: () => {
            // Legacy API doesn't return ID, just success. 
            // In a real app we would poll video.list
            alert("Video generation started! Check back later.");
        }
    });

    // Optional: Poll for videos if projectId is present
    const { data: videos } = trpc.video.list.useQuery(
        { projectId: projectId! },
        { enabled: !!projectId, refetchInterval: 5000 }
    );

    // Show latest video status if available
    const latestVideo = videos && videos.length > 0 ? videos[videos.length - 1] : null;

    if (!projectId) {
        return <div className="text-center py-12">Please select a project from the Dashboard to create a video.</div>;
    }

    return (
        <div className="max-w-2xl mx-auto text-center space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Video Production</h1>
                <p className="text-muted-foreground">Render your storyboard into a final video.</p>
            </div>

            {!latestVideo || latestVideo.status === 'pending' ? (
                <div className="space-y-4">
                    <Button size="lg" onClick={() => renderMutation.mutate({ projectId, provider: "veo3" })} disabled={renderMutation.isPending}>
                        {renderMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Start Rendering (Veo3)
                    </Button>
                    {latestVideo && <div className="text-muted-foreground">Current Status: {latestVideo.status}</div>}
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="text-xl font-medium">Status: {latestVideo.status}</div>
                    {latestVideo.status === "completed" && latestVideo.videoUrl && (
                        <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
                            <a href={latestVideo.videoUrl} target="_blank" className="text-primary hover:underline">Download Video</a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
