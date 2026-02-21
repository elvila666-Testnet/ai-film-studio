import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, FileText, Sparkles, Upload, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface BrandIntelligenceTabProps {
    projectId: number;
}

interface BrandData {
    brief: string;
    brandVoice: string;
    visualIdentity: string;
    colorPalette: string;
}

export default function BrandIntelligenceTab({ projectId }: BrandIntelligenceTabProps) {
    const [productImages, setProductImages] = useState<string[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const projectQuery = trpc.projects.get.useQuery({ id: projectId });
    const utils = trpc.useUtils();
    const updateMutation = trpc.projects.updateContent.useMutation();
    const analyzeMutation = trpc.brand.analyzeBrand.useMutation();

    const [brandData, setBrandData] = useState<BrandData>({
        brief: "",
        brandVoice: "",
        visualIdentity: "",
        colorPalette: "{}",
    });

    useEffect(() => {
        if (projectQuery.data?.content) {
            const content = projectQuery.data.content;
            setBrandData({
                brief: content.brief || "",
                brandVoice: content.brandVoice || "",
                visualIdentity: content.visualIdentity || "",
                colorPalette: typeof content.colorPalette === 'string'
                    ? content.colorPalette
                    : JSON.stringify(content.colorPalette || {}, null, 2),
            });
        }
    }, [projectQuery.data]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateMutation.mutateAsync({
                projectId,
                ...brandData,
                colorPalette: brandData.colorPalette ? JSON.parse(brandData.colorPalette) : {},
            });
            utils.projects.get.invalidate({ id: projectId });
            toast.success("Brand intelligence synced");
        } catch (error) {
            console.error("Failed to save brand data:", error);
            toast.error("Sync failed");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAnalyze = async () => {
        if (productImages.length === 0) {
            toast.error("Upload product images first");
            return;
        }

        setIsAnalyzing(true);
        try {
            const analysis = await analyzeMutation.mutateAsync({
                productImageUrls: productImages,
            });

            setBrandData({
                brief: analysis.brandVoice,
                brandVoice: analysis.brandVoice,
                visualIdentity: analysis.visualIdentity,
                colorPalette: JSON.stringify(analysis.colorPalette, null, 2),
            });

            toast.success("Intelligence successfully extracted");
        } catch (error) {
            console.error("Analysis failed:", error);
            toast.error("AI Analysis failed");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const palette = (() => {
        try {
            const parsed = JSON.parse(brandData.colorPalette);
            if (Array.isArray(parsed)) return parsed;
            if (typeof parsed === 'object' && parsed !== null) {
                // Handle various object formats
                if (parsed.colors) return parsed.colors;
                if (parsed.palette) return parsed.palette;
                return Object.values(parsed).filter(v => typeof v === 'string' && v.startsWith('#'));
            }
            return [];
        } catch (e) { return []; }
    })();

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="production-node-title text-primary uppercase italic">Phase 1: Brand Intelligence</h2>
                    <p className="production-label text-slate-400">Deep analysis of brand DNA and visual codes.</p>
                </div>
                <div className="flex gap-4">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="inline-block">
                                    <Button
                                        onClick={handleAnalyze}
                                        disabled={isAnalyzing || productImages.length === 0}
                                        variant="outline"
                                        className="border-primary/30 text-primary hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isAnalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                        AI Analyze DNA
                                    </Button>
                                </div>
                            </TooltipTrigger>
                            {productImages.length === 0 && (
                                <TooltipContent className="bg-slate-900 border-white/10 text-white text-[10px] uppercase font-bold tracking-widest">
                                    <p>Scan Product Shards first to activate AI analysis</p>
                                </TooltipContent>
                            )}
                        </Tooltip>
                    </TooltipProvider>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-primary hover:bg-primary/90 text-white font-bold h-12 px-8 rounded-2xl shadow-lg shadow-primary/20"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Seal Intelligence
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-panel p-6 space-y-4">
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                            <Upload className="w-4 h-4 text-primary" />
                            Product Scan
                        </h3>
                        <div
                            className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-primary/50 transition-all cursor-pointer bg-white/[0.02]"
                            onClick={() => {
                                const mockImages = [
                                    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=512",
                                    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=512",
                                    "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&q=80&w=512"
                                ];
                                setProductImages([mockImages[Math.floor(Math.random() * mockImages.length)]]);
                                toast.info("Product source scan complete");
                            }}
                        >
                            {productImages.length > 0 ? (
                                <div className="relative group">
                                    <img src={productImages[0]} alt="Product" className="rounded-xl w-full aspect-square object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                                        <div className="text-[10px] text-white font-black uppercase tracking-widest flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> RESCAN
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <ImageIcon className="w-8 h-8 text-slate-700 mx-auto mb-4" />
                                    <p className="text-[10px] text-slate-500 uppercase font-mono tracking-widest">Drop Product Shards</p>
                                </>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed italic">
                            VISION SENSOR: Extracts visual DNA, color codes, and material textures.
                        </p>
                    </div>

                    {palette.length > 0 && (
                        <div className="glass-panel p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-primary to-emerald-400" />
                                DNA Color Codes
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {palette.map((color, i) => (
                                    <div key={i} className="group relative">
                                        <div
                                            className="w-10 h-10 rounded-xl border border-white/10 shadow-lg cursor-help transition-transform hover:scale-110 active:scale-90"
                                            style={{ backgroundColor: color }}
                                        />
                                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-2 py-1 rounded text-[8px] font-mono text-white whitespace-nowrap z-10">
                                            {color}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-3 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="glass-panel p-6 space-y-4">
                            <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" />
                                Brand Voice
                            </h3>
                            <Textarea
                                placeholder="Narrative tone, values, and soul..."
                                value={brandData.brandVoice}
                                onChange={(e) => setBrandData({ ...brandData, brandVoice: e.target.value })}
                                className="min-h-[150px] bg-white/[0.03] border-white/10 text-slate-300 focus:border-primary/40 transition-colors"
                            />
                        </div>
                        <div className="glass-panel p-6 space-y-4">
                            <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-primary" />
                                Visual Identity
                            </h3>
                            <Textarea
                                placeholder="Cinematographic style guides, lighting, and composition codes..."
                                value={brandData.visualIdentity}
                                onChange={(e) => setBrandData({ ...brandData, visualIdentity: e.target.value })}
                                className="min-h-[150px] bg-white/[0.03] border-white/10 text-slate-300 focus:border-primary/40 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="glass-panel p-1 rounded-[2rem] overflow-hidden group">
                        <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                            <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" />
                                Strategic Screenplay Brief
                            </h3>
                            <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest group-hover:text-primary transition-colors">Foundation Mode</div>
                        </div>
                        <Textarea
                            placeholder="Inject the narrative nucleus here. The AI will build the entire film upon this brief..."
                            value={brandData.brief}
                            onChange={(e) => setBrandData({ ...brandData, brief: e.target.value })}
                            className="min-h-[300px] w-full bg-transparent border-none focus-visible:ring-0 text-slate-200 text-lg leading-relaxed p-12 resize-none placeholder:text-slate-800"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
