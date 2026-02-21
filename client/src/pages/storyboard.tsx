
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Image as ImageIcon } from "lucide-react";

export default function StoryboardPage() {
    const [scriptInput, setScriptInput] = useState("");
    const [scenes, setScenes] = useState<any[]>([]);

    const generateMutation = trpc.ai.generateTechnicalShots.useMutation({
        onSuccess: (data) => {
            try {
                // Legacy API might return string or object
                const parsed = typeof data === 'string' ? JSON.parse(data) : data;
                setScenes(Array.isArray(parsed) ? parsed : []);
            } catch (e) {
                console.error("Failed to parse scenes", e);
            }
        }
    });

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Storyboard</h1>
                <p className="text-muted-foreground">Visualize your script scene by scene.</p>
            </div>

            <div className="grid gap-6">
                <div className="space-y-2">
                    <Label>Script Content</Label>
                    <Textarea
                        placeholder="Paste your script here..."
                        className="h-32"
                        value={scriptInput}
                        onChange={(e) => setScriptInput(e.target.value)}
                    />
                    <Button
                        onClick={() => generateMutation.mutate({ script: scriptInput, visualStyle: "Cinematic" })}
                        disabled={!scriptInput || generateMutation.isPending}
                    >
                        {generateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Generate Storyboard
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {generateMutation.isPending ? (
                        Array(3).fill(0).map((_, i) => (
                            <Card key={i} className="animate-pulse">
                                <div className="h-48 bg-muted rounded-t-lg" />
                                <CardContent className="h-24" />
                            </Card>
                        ))
                    ) : scenes.length > 0 ? (
                        scenes.map((scene: unknown, i: number) => (
                            <Card key={i} className="overflow-hidden">
                                <div className="h-48 bg-muted flex items-center justify-center">
                                    <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                                    {/* In real app, this would be the generated image */}
                                </div>
                                <CardContent className="p-4">
                                    <p className="font-medium text-sm mb-2">Scene {i + 1}</p>
                                    <p className="text-xs text-muted-foreground">{scene.description}</p>
                                    <p className="text-xs font-mono mt-2 text-primary">{scene.camera_angle}</p>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                            No scenes generated yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
