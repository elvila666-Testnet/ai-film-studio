import { Camera, Maximize2, Move } from "lucide-react";
import { CinemaPipelineShot } from "../types";

interface CinematographyManifestProps {
    shotBreakdown: CinemaPipelineShot[];
}

export function CinematographyManifest({ shotBreakdown }: CinematographyManifestProps) {
    if (shotBreakdown.length === 0) return null;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                <Camera className="w-3 h-3" />
                Optical & Lighting Manifest
            </h3>
            <div className="grid grid-cols-1 gap-4">
                {shotBreakdown.map((shot: any) => (
                    <div key={shot.shotNumber} className="glass-panel p-6 border-white/5 hover:border-primary/20 transition-all group relative overflow-hidden bg-gradient-to-r from-white/[0.01] to-transparent">
                        <div className="absolute top-0 right-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />

                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <span className="bg-primary/10 text-primary text-[10px] font-black px-3 py-1 rounded-full border border-primary/20 uppercase tracking-widest">
                                    Shot {shot.shotNumber}
                                </span>
                                <div className="flex gap-2">
                                    <span className="bg-white/5 text-slate-400 text-[9px] font-black px-2 py-1 rounded border border-white/5 uppercase">
                                        {shot.cameraSpecs?.shotType || "MID"}
                                    </span>
                                    <span className="bg-white/5 text-slate-400 text-[9px] font-black px-2 py-1 rounded border border-white/5 uppercase">
                                        {shot.cameraSpecs?.lensStrategy || "35MM"}
                                    </span>
                                </div>
                            </div>
                            <Maximize2 className="w-4 h-4 text-slate-700 group-hover:text-primary transition-colors" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[11px]">
                            <div className="space-y-4 col-span-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <span className="text-primary/60 font-black uppercase text-[8px] tracking-[0.2em]">Lighting Logic</span>
                                        <p className="text-slate-300 leading-relaxed bg-white/[0.02] p-3 rounded-xl border border-white/5">
                                            {shot.cameraSpecs?.lightingSpec || "Cinematic motivated lighting."}
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-primary/60 font-black uppercase text-[8px] tracking-[0.2em]">Movement Physics</span>
                                        <div className="flex items-start gap-2 bg-white/[0.02] p-3 rounded-xl border border-white/5 text-slate-300">
                                            <Move className="w-3 h-3 mt-0.5 text-primary/40" />
                                            <p>{shot.cameraSpecs?.movementLogic || "Static locked-off."}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <span className="text-primary/60 font-black uppercase text-[8px] tracking-[0.2em]">Psychological Defense</span>
                                    <p className="text-slate-400 italic">
                                        "{shot.cameraSpecs?.psychologicalIntent || "Serving the narrative arc."}"
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-3">
                                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                        <span className="text-[9px] text-slate-500 font-bold uppercase">Exposure</span>
                                        <span className="text-primary font-mono text-[10px]">{shot.cameraSpecs?.tStop || "T2.8"}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                        <span className="text-[9px] text-slate-500 font-bold uppercase">Sensor</span>
                                        <span className="text-slate-300 text-[9px] uppercase tracking-tighter">Full Frame 6K</span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                        <span className="text-[9px] text-slate-500 font-bold uppercase">Depth</span>
                                        <span className="text-slate-300 text-[9px] uppercase tracking-tighter">Multi-Plane</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
