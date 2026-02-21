import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, User } from 'lucide-react';
import { toast } from 'sonner';

export const ActorManager = () => {
    const [name, setName] = useState('');
    const [triggerWord, setTriggerWord] = useState('TOK');
    const [files, setFiles] = useState<File[]>([]);

    // TODO: Implement file upload logic (to GCS via signed URL or API)
    // For now, we'll mock the zip URL or just use the UI state

    const trainMutation = trpc.director.trainActor.useMutation({
        onSuccess: () => {
            toast.success("Actor training started! This will take some time.");
            setName('');
            setFiles([]);
        },
        onError: (error) => {
            toast.error(`Training failed: ${error.message}`);
        }
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleTrain = async () => {
        if (!name || files.length < 5) {
            toast.error("Please provide a name and at least 5 photos.");
            return;
        }

        // Mocking the zip upload for this phase
        // In real app: upload files -> zip -> get URL -> call mutation
        toast.info("Uploading images... (Simulated)");

        await new Promise(resolve => setTimeout(resolve, 1000));

        // Passing dummy URL for MVP since we haven't built the client-side uploader yet
        const dummyZipUrl = "https://storage.googleapis.com/ai-film-studio-assets/training/dummy.zip";

        trainMutation.mutate({
            name,
            triggerWord,
            zipUrl: dummyZipUrl
        });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            <Card>
                <CardHeader>
                    <CardTitle>Recruit New Talent</CardTitle>
                    <CardDescription>Train a custom AI model (LoRA) for a consistent character.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Actor Name</Label>
                        <Input
                            placeholder="e.g. John Doe, Cyberpunk Hero"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Trigger Word (e.g. TOK)</Label>
                        <Input
                            placeholder="TOK"
                            value={triggerWord}
                            onChange={(e) => setTriggerWord(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Training Photos (10-20)</Label>
                        <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                className="hidden"
                                id="photo-upload"
                                onChange={handleFileChange}
                            />
                            <Label htmlFor="photo-upload" className="cursor-pointer flex flex-col items-center">
                                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                <span className="text-sm text-gray-400">Click to upload photos</span>
                            </Label>
                        </div>
                        {files.length > 0 && (
                            <p className="text-xs text-green-400">{files.length} photos selected</p>
                        )}
                    </div>

                    <Button
                        className="w-full"
                        onClick={handleTrain}
                        disabled={trainMutation.isPending}
                    >
                        {trainMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : <User className="mr-2" />}
                        Start Training
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Casting Call</CardTitle>
                    <CardDescription>Available AI Actors</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-gray-500 text-center py-10">
                        Top actors will appear here...
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
