import { Box, Layers } from "lucide-react";
import { CinemaPipelineShot } from "../types";

interface ProductionDesignBlueprintProps {
    shotBreakdown: CinemaPipelineShot[];
}

export function ProductionDesignBlueprint({ shotBreakdown }: ProductionDesignBlueprintProps) {
    if (shotBreakdown.length === 0) return null;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                <Layers className="w-3 h-3" />
                Production Design Breakdown
            </h3>
            <div className="grid grid-cols-1 gap-4">
                {shotBreakdown.map((shot: any) => (
                    <div key={shot.shotNumber} className="glass-panel p-6 border-white/5 hover:border-primary/20 transition-all group relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <span className="bg-primary/10 text-primary text-[10px] font-black px-3 py-1 rounded-full border border-primary/20 uppercase tracking-widest">
                                    Shot {shot.shotNumber}
                                </span>
                                <h4 className="text-sm font-bold text-white tracking-tight uppercase tracking-wider">
                                    {shot.productionDesign?.environmentalAtmosphere || "ENVIRONMENT DEFINED"}
                                </h4>
                            </div>
                            <Box className="w-4 h-4 text-slate-700 group-hover:text-primary transition-colors" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-[11px] text-slate-400">
                            <div className="space-y-4">
                                <div>
                                    <span className="text-primary/60 font-black uppercase text-[9px] block mb-2 tracking-widest">Materials & Textures</span>
                                    <p className="text-slate-300 leading-relaxed bg-white/[0.02] p-3 rounded-lg border border-white/5">
                                        {shot.productionDesign?.textureSpecs || "Standard cinematic texture application."}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-primary/60 font-black uppercase text-[9px] block mb-2 tracking-widest">Set Objects & Props</span>
                                    <div className="flex flex-wrap gap-2">
                                        {shot.productionDesign?.physicalAssets?.length > 0 ? (
                                            shot.productionDesign.physicalAssets.map((asset: string, i: number) => (
                                                <span key={i} className="bg-primary/5 text-primary/80 px-2 py-1 rounded border border-primary/10 text-[10px]">
                                                    {asset}
                                                </span>
                                            ))
                                        ) : (
                                            <p className="text-slate-500 italic">No specific hero assets identified.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <span className="text-emerald-500/60 font-black uppercase text-[9px] block mb-2 tracking-widest">Wardrobe & Gear</span>
                                    <p className="text-slate-300 leading-relaxed bg-white/[0.02] p-3 rounded-lg border border-white/5 border-emerald-500/10">
                                        {shot.productionDesign?.wardrobeDetails || "Standard costume design aligned with tone."}
                                    </p>
                                </div>
                                {shot.productionDesign?.colorPalette && (
                                    <div>
                                        <span className="text-amber-500/60 font-black uppercase text-[9px] block mb-2 tracking-widest">Chromatic Logic</span>
                                        <div className="flex items-center gap-2 text-slate-300 font-mono text-[9px]">
                                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                            {shot.productionDesign.colorPalette}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-gradient-to-br from-white/[0.03] to-transparent p-5 rounded-2xl border border-white/5 relative overflow-hidden group-hover:border-primary/10 transition-colors h-full">
                                <div className="absolute -right-4 -bottom-4 opacity-[0.03] rotate-12">
                                    <Box className="w-24 h-24" />
                                </div>
                                <span className="text-primary/60 font-black uppercase text-[9px] block mb-2 tracking-widest">Atmosphere Note</span>
                                <p className="text-slate-200 italic leading-relaxed text-xs">
                                    "{shot.productionDesign?.environmentalAtmosphere || "Neutral world state with standard cinematic depth."}"
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
