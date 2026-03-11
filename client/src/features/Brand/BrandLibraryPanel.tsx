import { BrandAssetLibrary } from "@/components/BrandAssetLibrary";
import { CheckCircle2, Upload, ImageIcon, Loader2, Sparkles } from "lucide-react";

interface BrandLibraryPanelProps {
    brandId: string | null;
    palette: string[];
    isUploading: boolean;
    productImages: string[];
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function BrandLibraryPanel({
    brandId,
    palette,
    isUploading,
    productImages,
    onFileUpload
}: BrandLibraryPanelProps) {
    return (
        <div className="lg:col-span-1 space-y-6">
            {brandId ? (
                <div className="glass-panel p-1 rounded-3xl overflow-hidden shadow-2xl shadow-primary/5">
                    <div className="bg-white/[0.01] p-6 lg:p-8">
                        <BrandAssetLibrary brandId={brandId} />
                    </div>
                </div>
            ) : (
                <div className="glass-panel overflow-hidden rounded-3xl group">
                    <div className="p-1.5 bg-gradient-to-br from-primary/20 via-transparent to-transparent">
                        <div className="p-6 lg:p-8 space-y-6 bg-[#020205]/40 backdrop-blur-xl rounded-[calc(1.5rem-1px)]">
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-primary uppercase tracking-[0.3em] italic mb-1">Volatile Memory</p>
                                <h3 className="text-lg font-black text-white uppercase tracking-tighter italic flex items-center gap-2">
                                    <Upload className="w-4 h-4 text-primary" />
                                    Quick Ingest
                                </h3>
                            </div>
                            
                            <div className="relative group/upload">
                                <input
                                    type="file"
                                    id="product-upload"
                                    className="hidden"
                                    onChange={onFileUpload}
                                    accept="image/*"
                                    disabled={isUploading}
                                />
                                <label
                                    htmlFor="product-upload"
                                    className={`relative block border-2 border-dashed border-white/5 rounded-2xl p-8 text-center hover:border-primary/40 transition-all cursor-pointer bg-white/[0.02] overflow-hidden ${isUploading ? 'opacity-50 cursor-wait' : ''}`}
                                >
                                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/upload:opacity-100 transition-opacity" />
                                    {productImages.length > 0 ? (
                                        <div className="relative z-10 transition-transform group-hover/upload:scale-[1.02]">
                                            <img src={productImages[0]} alt="Product" className="rounded-xl w-full aspect-square object-cover shadow-2xl" />
                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover/upload:opacity-100 transition-opacity rounded-b-xl">
                                                <div className="text-[9px] text-white font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                                    <ImageIcon className="w-3 h-3" /> RE-SCAN SHARD
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-4 relative z-10">
                                            {isUploading ? (
                                                <Loader2 className="w-10 h-10 text-primary mx-auto mb-4 animate-spin" />
                                            ) : (
                                                <div className="relative w-12 h-12 mx-auto mb-6">
                                                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                                                    <ImageIcon className="w-12 h-12 text-slate-700 relative z-10 transition-colors group-hover/upload:text-primary" />
                                                </div>
                                            )}
                                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                                                {isUploading ? "ANALYZING..." : "Drop Product Shard"}
                                            </p>
                                        </div>
                                    )}
                                </label>
                            </div>
                            <p className="text-[9px] text-slate-500 leading-relaxed italic text-center font-medium">
                                Link a brand DNA profile for permanent asset persistence.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="glass-panel p-1 rounded-3xl overflow-hidden">
                <div className="p-6 lg:p-8 bg-white/[0.01] space-y-4">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </div>
                        Compliance Node
                    </h3>
                    <p className="text-[10px] text-slate-500 leading-relaxed italic font-medium">
                        The Brand Brain is monitoring active background. All narrative briefs are automatically cross-referenced for brand alignment.
                    </p>
                </div>
            </div>

            {palette.length > 0 && (
                <div className="glass-panel p-1 rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <div className="p-6 lg:p-8 bg-white/[0.01] space-y-5">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-primary to-emerald-400 shadow-lg shadow-primary/20 flex items-center justify-center">
                                <Sparkles className="w-3 h-3 text-white" />
                            </div>
                            DNA Color Codes
                        </h3>
                        <div className="grid grid-cols-4 gap-2.5">
                            {palette.map((color: string, i: number) => (
                                <div key={i} className="group relative">
                                    <div
                                        className="w-full aspect-square rounded-xl border border-white/5 shadow-2xl cursor-help transition-all duration-300 hover:scale-110 active:scale-95 hover:rotate-6 ring-0 hover:ring-2 ring-primary/40 ring-offset-2 ring-offset-[#020205]"
                                        style={{ backgroundColor: color }}
                                    />
                                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all bg-black/90 px-3 py-1.5 rounded-lg text-[9px] font-mono text-white whitespace-nowrap z-20 border border-white/10 translate-y-2 group-hover:translate-y-0.5 pointer-events-none shadow-2xl">
                                        {color.toUpperCase()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
