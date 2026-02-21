import { trpc } from '../../lib/trpc';
import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDown, Layout, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface DirectorViewProps {
    projectId: number;
}

export function DirectorView({ projectId }: DirectorViewProps) {
    const projectQuery = trpc.projects.get.useQuery({ id: projectId });
    const { data: scenes } = trpc.director.getScenes.useQuery({ projectId });
    const createScenes = trpc.director.createScenes.useMutation({
        onSuccess: () => {
            utils.director.getScenes.invalidate({ projectId });
            toast.success("Script analyzed and broken down into scenes.");
        }
    });
    const utils = trpc.useUtils();

    const handleCreateScenes = async () => {
        const script = projectQuery.data?.content?.script;
        if (!script) {
            toast.error("No script found to break down. Please generate a script in the Narrative Engine phase first.");
            return;
        }
        await createScenes.mutateAsync({ projectId, script });
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="production-node-title flex items-center gap-3">
                        <Layout className="w-6 h-6 text-primary" />
                        Director's Chair
                    </h2>
                    <p className="production-label text-primary">Technical Script Breakdown</p>
                </div>
                <Button
                    onClick={handleCreateScenes}
                    disabled={createScenes.isPending}
                    className="bg-primary hover:bg-primary/90 text-white font-bold h-10 px-6 rounded-xl shadow-lg shadow-primary/20"
                >
                    {createScenes.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    Auto-Breakdown Script
                </Button>
            </div>

            <Accordion.Root type="single" collapsible className="space-y-4">
                {scenes?.map((scene: any) => (
                    <Accordion.Item key={scene.id} value={`scene-${scene.id}`} className="glass-panel rounded-3xl overflow-hidden border-white/5 bg-white/[0.02]">
                        <Accordion.Header className="flex">
                            <Accordion.Trigger className="flex flex-1 items-center justify-between p-6 hover:bg-white/5 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary border border-primary/20">
                                        {scene.order}
                                    </div>
                                    <div className="text-left">
                                        <div className="text-xs font-bold text-white uppercase tracking-widest">{scene.title}</div>
                                        <div className="text-[10px] text-slate-500 uppercase tracking-tighter mt-1">{scene.location || "UNSPECIFIED LOCATION"}</div>
                                    </div>
                                </div>
                                <ChevronDown className="transform transition-transform duration-300 ease-in-out w-4 h-4 text-slate-500 group-data-[state=open]:rotate-180" />
                            </Accordion.Trigger>
                        </Accordion.Header>
                        <Accordion.Content className="p-8 border-t border-white/5 bg-black/20 animate-slide-down">
                            <div className="max-w-3xl">
                                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3">Narrative Context</h4>
                                <p className="text-slate-300 text-sm leading-relaxed mb-8">{scene.description}</p>
                                <ShotList sceneId={scene.id} />
                            </div>
                        </Accordion.Content>
                    </Accordion.Item>
                ))}
                {(!scenes || scenes.length === 0) && (
                    <div className="py-20 text-center glass-panel rounded-[2rem] border-dashed border-white/10 opacity-30">
                        <Layout className="w-12 h-12 mx-auto mb-4" />
                        <p className="text-sm font-bold uppercase tracking-widest italic">No scenes discovered. Initialize breakdown to activate.</p>
                    </div>
                )}
            </Accordion.Root>
        </div>
    );
}

import { Loader2 } from "lucide-react";

function ShotList({ sceneId }: { sceneId: number }) {
    const { data: shots } = trpc.director.getShots.useQuery({ sceneId });
    const createShots = trpc.director.createShotList.useMutation({
        onSuccess: () => {
            utils.director.getShots.invalidate({ sceneId });
            toast.success("Technical shot list generated.");
        }
    });
    const utils = trpc.useUtils();

    return (
        <div className="mt-12 pt-8 border-t border-white/5">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Technical Shot List</h3>
                </div>
                <Button
                    onClick={() => createShots.mutate({ sceneId })}
                    disabled={createShots.isPending}
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-widest px-4"
                >
                    {createShots.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Plus className="w-3 h-3 mr-2" />}
                    Generate Shots
                </Button>
            </div>
            <div className="grid gap-4">
                {shots?.map((shot: any) => (
                    <div key={shot.id} className="flex gap-6 bg-white/[0.03] p-5 rounded-2xl border border-white/5 group hover:border-primary/30 transition-all">
                        <div className="w-10 h-10 flex items-center justify-center bg-black/40 rounded-xl text-[10px] font-mono font-bold text-primary border border-white/5 flex-shrink-0 group-hover:scale-110 transition-transform">
                            {shot.order}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-200 leading-snug mb-2">{shot.visualDescription}</p>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1 h-1 rounded-full bg-slate-600" />
                                    <span className="text-[10px] font-mono text-slate-500 uppercase">{shot.cameraAngle || "Standard Angle"}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1 h-1 rounded-full bg-slate-600" />
                                    <span className="text-[10px] font-mono text-slate-500 uppercase">{shot.audioDescription || "Ambient Audio"}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {shots?.length === 0 && <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest italic text-center py-6 bg-white/[0.01] rounded-xl border border-dashed border-white/5">Workbench Standby</p>}
            </div>
        </div>
    )
}

import { Plus } from "lucide-react";
