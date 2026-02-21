import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, UploadCloud } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useCostGuard } from "@/components/FinOps/CostGuard";

interface CharacterTrainingDialogProps {
    projectId: number;
}

export function CharacterTrainingDialog({ projectId }: CharacterTrainingDialogProps) {
    const [trainName, setTrainName] = useState("");
    const [trainTrigger, setTrainTrigger] = useState("TOK");
    const [trainZipUrl, setTrainZipUrl] = useState("");
    const [isTrainingOpen, setIsTrainingOpen] = useState(false);

    const { requestApproval } = useCostGuard();
    const trainActorMutation = trpc.casting.actor.train.useMutation();

    const handleTrain = async () => {
        if (!trainName || !trainTrigger || !trainZipUrl) {
            toast.error("All fields required");
            return;
        }

        requestApproval(2.00, async () => {
            try {
                await trainActorMutation.mutateAsync({
                    projectId,
                    name: trainName,
                    triggerWord: trainTrigger,
                    zipUrl: trainZipUrl
                });
                toast.success("Training started! This will take ~20 minutes.");
                setIsTrainingOpen(false);
                setTrainName("");
                setTrainZipUrl("");
            } catch (e) {
                console.error(e);
                toast.error("Training initiation failed");
            }
        });
    };

    return (
        <Dialog open={isTrainingOpen} onOpenChange={setIsTrainingOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-cyan-500/50 text-cyan-400 bg-cyan-950/20 hover:bg-cyan-950/40">
                    <UploadCloud className="w-4 h-4 mr-2" />
                    Train New Actor Model ($2.00)
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle>Train Custom LoRA Model</DialogTitle>
                    <DialogDescription>Upload a zip file of 10-20 images to train a custom character.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <Input className="bg-white/5 border-white/10" placeholder="Model Name (e.g. Neo)" value={trainName} onChange={(e) => setTrainName(e.target.value)} />
                    <Input className="bg-white/5 border-white/10" placeholder="Trigger Word (e.g. TOK)" value={trainTrigger} onChange={(e) => setTrainTrigger(e.target.value)} />
                    <Input className="bg-white/5 border-white/10" placeholder="ZIP URL (e.g. https://...)" value={trainZipUrl} onChange={(e) => setTrainZipUrl(e.target.value)} />
                    <Button onClick={handleTrain} disabled={trainActorMutation.isPending} className="w-full bg-cyan-600 hover:bg-cyan-700 font-bold">
                        {trainActorMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Start Training ($2.00)
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
