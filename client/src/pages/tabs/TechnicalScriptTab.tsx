import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Camera, Sparkles, Save, Info, Clapperboard, ChevronDown, ChevronRight, Wand2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useCostGuard } from "@/components/FinOps/CostGuard";

interface TechnicalScriptTabProps {
  projectId: number;
}

export default function TechnicalScriptTab({ projectId }: TechnicalScriptTabProps) {
  const [expandedScene, setExpandedScene] = useState<string | null>(null);
  const { requestApproval } = useCostGuard();

  // Queries
  const scenesQuery = trpc.director.getScenes.useQuery({ projectId });
  const [activeSceneId, setActiveSceneId] = useState<number | null>(null);

  // We use a separate query for shots that updates when activeSceneId changes
  // Ideally we would fetch all shots for the project or trpc batching
  const shotsQuery = trpc.director.getShots.useQuery(
    { sceneId: activeSceneId! },
    { enabled: !!activeSceneId }
  );

  const createShotListMutation = trpc.director.createShotList.useMutation();
  const generateShotImageMutation = trpc.director.generateShotImage.useMutation();

  const handleGenerateShotImage = async (shotId: number) => {
    requestApproval(0.04, async () => {
      try {
        toast.info("Generating visual preview...");
        await generateShotImageMutation.mutateAsync({ shotId });
        toast.success("Visual generated!");
        shotsQuery.refetch();
      } catch (e) {
        console.error(e);
        toast.error("Failed to generate visual");
      }
    });
  };

  const handleGenerateShots = async (sceneId: number, sceneTitle: string) => {
    // Cost: $0.02 per scene
    requestApproval(0.02, async () => {
      try {
        toast.info(`Generating shots for ${sceneTitle}...`);
        await createShotListMutation.mutateAsync({ sceneId });
        toast.success("Shots generated!");
        if (activeSceneId === sceneId) shotsQuery.refetch();
      } catch (e) {
        console.error(e);
        toast.error("Failed to generate shots");
      }
    });
  };

  const handleAccordionChange = (value: string) => {
    setExpandedScene(value);
    if (value) {
      setActiveSceneId(parseInt(value));
    } else {
      setActiveSceneId(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="production-node-title">Technical Script</h2>
          <p className="production-label text-primary">Stage 3: Shot List & Cinematography</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 rounded-lg border border-white/5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] uppercase text-emerald-400 font-bold tracking-widest">Live Director Mode</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Scenes List */}
        <div className="lg:col-span-4 space-y-4">
          {scenesQuery.isLoading && <div className="text-center py-20"><Loader2 className="w-8 h-8 animate-spin mx-auto opacity-20" /></div>}

          {!scenesQuery.isLoading && scenesQuery.data?.length === 0 && (
            <div className="text-center py-20 glass-panel border-dashed border-white/10">
              <Clapperboard className="w-12 h-12 mx-auto text-slate-700 mb-4" />
              <p className="text-slate-500 font-mono text-sm uppercase">No Scenes Found</p>
              <p className="text-xs text-slate-600 mt-2">Go to the Script tab and click "Analyze & Break Down"</p>
            </div>
          )}

          <Accordion type="single" collapsible value={expandedScene || ""} onValueChange={handleAccordionChange}>
            {scenesQuery.data?.map((scene) => (
              <AccordionItem key={scene.id} value={scene.id.toString()} className="glass-panel border-white/5 data-[state=open]:border-primary/30 mb-4 px-4 rounded-xl overflow-hidden transition-all duration-300">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-4 text-left w-full">
                    <span className="text-2xl font-black text-white/10 font-mono w-8 text-right">#{scene.order}</span>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-white tracking-tight">{scene.title}</h3>
                      <p className="text-xs text-slate-500 line-clamp-1 font-mono uppercase tracking-wider">{scene.description}</p>
                    </div>
                    <div className="mr-4">
                      {scene.status === 'draft' && <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded">Draft</span>}
                      {scene.status === 'planned' && <span className="text-[10px] bg-indigo-900/50 text-indigo-300 px-2 py-1 rounded">Planned</span>}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6 pt-2">
                  <div className="pl-14 pr-4">
                    <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                      <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Shot List</h4>
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleGenerateShots(scene.id, scene.title || "Scene"); }}
                        disabled={createShotListMutation.isPending}
                        className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 h-8 text-[10px] uppercase font-bold tracking-widest"
                      >
                        {createShotListMutation.isPending && activeSceneId === scene.id ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Wand2 className="w-3 h-3 mr-2" />}
                        Generate Shot List ($0.02)
                      </Button>
                    </div>

                    {activeSceneId === scene.id && shotsQuery.isLoading && <div className="py-8 text-center text-xs text-slate-600 uppercase animate-pulse">Loading Shots...</div>}

                    {activeSceneId === scene.id && shotsQuery.data && shotsQuery.data.length === 0 && (
                      <div className="py-8 text-center text-xs text-slate-600 uppercase border border-dashed border-white/5 rounded-lg">
                        No shots generated yet.
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-3">
                      {activeSceneId === scene.id && shotsQuery.data?.map((shot: unknown) => (
                        <div key={shot.id} className="bg-black/20 p-4 rounded-lg border border-white/5 flex gap-4 items-start group hover:border-white/10 transition-colors">
                          <div className="bg-white/5 w-8 h-8 flex items-center justify-center rounded text-xs font-mono text-slate-400 shrink-0">{shot.order}</div>

                          {/* Visual Preview */}
                          <div className="w-32 aspect-video bg-black rounded overflow-hidden shrink-0 border border-white/5 relative">
                            {shot.imageUrl ? (
                              <img src={shot.imageUrl} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Camera className="w-4 h-4 text-slate-700" />
                              </div>
                            )}

                            {!shot.imageUrl && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleGenerateShotImage(shot.id)}
                                  className="h-8 w-8 rounded-full bg-primary text-white hover:bg-primary/80"
                                  disabled={generateShotImageMutation.isPending && generateShotImageMutation.variables?.shotId === shot.id}
                                >
                                  {generateShotImageMutation.isPending && generateShotImageMutation.variables?.shotId === shot.id ?
                                    <Loader2 className="w-3 h-3 animate-spin" /> :
                                    <Sparkles className="w-3 h-3" />
                                  }
                                </Button>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="text-[9px] text-slate-600 uppercase font-bold block mb-1">Visual</label>
                              <p className="text-sm text-slate-300 leading-relaxed line-clamp-3">{shot.visualDescription}</p>
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-600 uppercase font-bold block mb-1">Audio</label>
                              <p className="text-xs text-slate-400 line-clamp-3">{shot.audioDescription || "—"}</p>
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-600 uppercase font-bold block mb-1">Tech</label>
                              <div className="flex flex-wrap gap-2">
                                {shot.cameraAngle && <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-cyan-300 border border-cyan-900/30">{shot.cameraAngle}</span>}
                                {shot.movement && <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-purple-300 border border-purple-900/30">{shot.movement}</span>}
                                {shot.lens && <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-amber-300 border border-amber-900/30">{shot.lens}</span>}
                                {shot.lighting && <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-orange-300 border border-orange-900/30">{shot.lighting}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div >
  );
}
