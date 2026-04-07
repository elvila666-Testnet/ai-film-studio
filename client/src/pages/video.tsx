
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useSearch } from "wouter";

export default function VideoPage() {
    const search = useSearch();
    const params = new URLSearchParams(search);
    const projectId = params.get("projectId") ? parseInt(params.get("projectId")!) : undefined;

    const renderMutation = trpc.video.render.useMutation({
        onSuccess: () => {
            // Success
            alert("Video generation started! Check back later.");
        }
    });

    // Optional: Poll for videos if projectId is present
    const { data: videos } = trpc.video.list.useQuery(
        { projectId: projectId! },
        { enabled: !!projectId, refetchInterval: 5000 }
    );

    // Show latest video status if available
    const latestVideo = videos && (videos as any).length > 0 ? (videos as any)[(videos as any).length - 1] : null;

    if (!projectId) {
        return <div className="text-center py-12">Please select a project from the Dashboard to create a video.</div>;
    }

    return (
        <div className="max-w-2xl mx-auto text-center space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Video Production</h1>
                <p className="text-muted-foreground">Render your storyboard into a final video.</p>
            </div>

            {(!latestVideo || latestVideo.status === 'pending') ? (
                <div className="flex flex-col items-center gap-4">
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 gap-1">
                        <Button 
                            size="sm" 
                            variant={renderMutation.isPending ? "ghost" : "default"}
                            onClick={() => renderMutation.mutate({ projectId, storyboardId: "1" })}
                            disabled={renderMutation.isPending}
                        >
                            {renderMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Render with Veo3
                        </Button>
                        <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => renderMutation.mutate({ projectId, storyboardId: "1", provider: "kie", modelId: "kie-seedance-2-0" } as any)}
                            disabled={renderMutation.isPending}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            Render with KIE (Seedream)
                        </Button>
                    </div>
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
                    <Button variant="outline" onClick={() => renderMutation.reset()}>Start New Render</Button>
                </div>
            )}
        </div>
    );
}
