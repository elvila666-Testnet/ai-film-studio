
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function ScriptPage() {
    const { toast } = useToast();
    const [topic, setTopic] = useState("");
    const [genre, setGenre] = useState("Cinematic");
    const [script, setScript] = useState<string | null>(null);
    const [generatedCharacters, setGeneratedCharacters] = useState<any>(null);

    const generateMutation = trpc.ai.generateScript.useMutation({
        onSuccess: (data) => {
            const scriptContent = typeof data === 'string' ? data : data.content;
            setScript(scriptContent);
            setGeneratedCharacters(null); // Character extraction requires separate call
            toast({ title: "Script Generated", description: "Your script is ready!" });
        },
        onError: (error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    const handleGenerate = () => {
        if (!topic) return;
        generateMutation.mutate({ brief: `${topic} (Genre: ${genre})` });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[calc(100vh-8rem)]">
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">Script Generation</h1>
                    <p className="text-muted-foreground">Describe your idea, and AI will write the screenplay.</p>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Topic / Premise</Label>
                        <Textarea
                            placeholder="A detective in 2050 solving a crime involving a rogue android..."
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            className="h-32"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Genre</Label>
                        <Select value={genre} onValueChange={setGenre}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Cinematic">Cinematic</SelectItem>
                                <SelectItem value="Sci-Fi">Sci-Fi</SelectItem>
                                <SelectItem value="Horror">Horror</SelectItem>
                                <SelectItem value="Comedy">Comedy</SelectItem>
                                <SelectItem value="Documentary">Documentary</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button
                        onClick={handleGenerate}
                        disabled={!topic || generateMutation.isPending}
                        className="w-full"
                    >
                        {generateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Generate Script
                    </Button>
                </div>

                {generatedCharacters && (
                    <Card>
                        <CardHeader><CardTitle>Characters Detected</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-2 text-sm">
                                {Object.entries(generatedCharacters).map(([name, desc]: unknown) => (
                                    <div key={name} className="flex flex-col">
                                        <span className="font-bold">{name}</span>
                                        <span className="text-muted-foreground">{desc.substring(0, 100)}...</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <div className="bg-card border rounded-lg p-6 overflow-y-auto font-mono text-sm whitespace-pre-wrap">
                {script ? script : <div className="text-muted-foreground flex items-center justify-center h-full">Script will appear here...</div>}
            </div>
        </div>
    );
}
