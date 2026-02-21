import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { X, Mic, Music, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useCostGuard } from '../FinOps/CostGuard';
import { toast } from 'sonner';

interface StoryboardPanelProps {
    projectId: number;
    shotId: number;
    initialPrompt: string;
    sceneId?: number;
}

export function StoryboardPanel({ projectId, shotId, initialPrompt, sceneId }: StoryboardPanelProps) {
    const [prompt, setPrompt] = useState(initialPrompt);
    const [ttsText, setTtsText] = useState('');
    const [sfxPrompt, setSfxPrompt] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    // Generators
    const generateImage = trpc.generator.createAsset.useMutation();
    const generateTTS = trpc.audio.generateTTS.useMutation();
    const generateSFX = trpc.audio.generateSFX.useMutation();

    const { requestApproval } = useCostGuard();

    const handleGenerateImage = async (force: boolean = false) => {
        try {
            await generateImage.mutateAsync({
                projectId,
                shotId,
                modelId: 'black-forest-labs/flux-schnell',
                prompt,
                force
            });
            setIsOpen(false);
            toast.success("Image generation started");
        } catch (error: unknown) {
            if (error.message.includes("Cost limit exceeded")) {
                const costMatch = error.message.match(/Estimated: \$([0-9.]+)/);
                const estimatedCost = costMatch ? parseFloat(costMatch[1]) : 0.003;
                requestApproval(estimatedCost, () => handleGenerateImage(true));
            } else {
                toast.error(`Error: ${error.message}`);
            }
        }
    };

    const handleGenerateTTS = async () => {
        if (!ttsText) return;
        try {
            await generateTTS.mutateAsync({
                projectId,
                sceneId,
                text: ttsText,
            });
            toast.success("Voiceover generated!");
            setTtsText('');
        } catch (error: unknown) {
            toast.error(`TTS Failed: ${error.message}`);
        }
    };

    const handleGenerateSFX = async () => {
        if (!sfxPrompt) return;
        try {
            await generateSFX.mutateAsync({
                projectId,
                sceneId,
                prompt: sfxPrompt,
            });
            toast.success("SFX generated!");
            setSfxPrompt('');
        } catch (error: unknown) {
            toast.error(`SFX Failed: ${error.message}`);
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
            <Dialog.Trigger asChild>
                <button className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1 rounded flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> Create
                </button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="bg-black/50 fixed inset-0 backdrop-blur-sm" />
                <Dialog.Content className="fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-slate-950 p-0 shadow-2xl border border-slate-800 focus:outline-none overflow-hidden">
                    <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-900">
                        <Dialog.Title className="text-white text-md font-medium">
                            Generate Assets
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button className="text-gray-400 hover:text-white" aria-label="Close">
                                <X className="w-4 h-4" />
                            </button>
                        </Dialog.Close>
                    </div>

                    <Tabs.Root defaultValue="visuals" className="flex flex-col w-full h-full">
                        <Tabs.List className="flex border-b border-slate-800 bg-slate-900/50">
                            <Tabs.Trigger value="visuals" className="flex-1 px-4 py-3 text-sm text-slate-400 data-[state=active]:text-purple-400 data-[state=active]:border-b-2 data-[state=active]:border-purple-500 hover:text-slate-200 transition-colors">
                                <span className="flex items-center justify-center gap-2"><ImageIcon className="w-4 h-4" /> Visuals</span>
                            </Tabs.Trigger>
                            <Tabs.Trigger value="audio" className="flex-1 px-4 py-3 text-sm text-slate-400 data-[state=active]:text-purple-400 data-[state=active]:border-b-2 data-[state=active]:border-purple-500 hover:text-slate-200 transition-colors">
                                <span className="flex items-center justify-center gap-2"><Mic className="w-4 h-4" /> Audio & FX</span>
                            </Tabs.Trigger>
                        </Tabs.List>

                        <div className="p-6 bg-slate-950">
                            <Tabs.Content value="visuals" className="space-y-4 outline-none">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-400">Image Prompt</label>
                                    <textarea
                                        className="w-full h-32 bg-slate-900 border border-slate-800 rounded p-3 text-white text-sm focus:ring-1 focus:ring-purple-500 outline-none resize-none"
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder="Describe the shot..."
                                    />
                                </div>
                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={() => handleGenerateImage(false)}
                                        disabled={generateImage.isPending}
                                        className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2"
                                    >
                                        {generateImage.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {generateImage.isPending ? 'Generating...' : 'Generate Shot'}
                                    </button>
                                </div>
                            </Tabs.Content>

                            <Tabs.Content value="audio" className="space-y-6 outline-none">
                                {/* TTS Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-slate-200 text-sm font-medium">
                                        <Mic className="w-4 h-4 text-purple-400" /> Voiceover (TTS)
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            className="flex-1 bg-slate-900 border border-slate-800 rounded px-3 py-2 text-white text-sm focus:ring-1 focus:ring-purple-500 outline-none"
                                            value={ttsText}
                                            onChange={(e) => setTtsText(e.target.value)}
                                            placeholder="Dialogue text..."
                                        />
                                        <button
                                            onClick={handleGenerateTTS}
                                            disabled={generateTTS.isPending || !ttsText}
                                            className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white px-3 py-2 rounded text-xs font-medium transition-colors"
                                        >
                                            {generateTTS.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate'}
                                        </button>
                                    </div>
                                </div>

                                <div className="h-px bg-slate-800 my-2" />

                                {/* SFX Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-slate-200 text-sm font-medium">
                                        <Music className="w-4 h-4 text-purple-400" /> Sound Effect (SFX)
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            className="flex-1 bg-slate-900 border border-slate-800 rounded px-3 py-2 text-white text-sm focus:ring-1 focus:ring-purple-500 outline-none"
                                            value={sfxPrompt}
                                            onChange={(e) => setSfxPrompt(e.target.value)}
                                            placeholder="e.g. Explosion, footsteps..."
                                        />
                                        <button
                                            onClick={handleGenerateSFX}
                                            disabled={generateSFX.isPending || !sfxPrompt}
                                            className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white px-3 py-2 rounded text-xs font-medium transition-colors"
                                        >
                                            {generateSFX.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate'}
                                        </button>
                                    </div>
                                </div>
                            </Tabs.Content>
                        </div>
                    </Tabs.Root>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

