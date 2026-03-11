import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { BrandSelector } from "@/components/BrandSelector";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// Feature Components
import { IdentityEditor } from "@/features/Brand/IdentityEditor";
import { StrategicBrief } from "@/features/Brand/StrategicBrief";
import { BrandLibraryPanel } from "@/features/Brand/BrandLibraryPanel";

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
    const [isUploading, setIsUploading] = useState(false);
    const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);

    const utils = trpc.useUtils();
    const projectQuery = trpc.projects.get.useQuery({ id: projectId });
    const updateMutation = trpc.projects.updateContent.useMutation();
    const analyzeMutation = trpc.brand.analyzeBrand.useMutation();
    const uploadMutation = trpc.brand.uploadProductImage.useMutation();
    const linkMutation = trpc.brand.linkToProject.useMutation();

    const [brandData, setBrandData] = useState<BrandData>({
        brief: "",
        brandVoice: "",
        visualIdentity: "",
        colorPalette: "{}",
    });

    useEffect(() => {
        if (projectQuery.data) {
            setSelectedBrandId(projectQuery.data.project?.brandId || null);
            if (projectQuery.data.content) {
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
            console.error("Save failed:", error);
            toast.error("Sync failed");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            let imagesToAnalyze = [...productImages];

            if (selectedBrandId) {
                const assets = await utils.brand.listAssets.fetch({ brandId: selectedBrandId });
                const brandImages = assets.filter((a: any) => a.assetType === 'IMG').map((a: any) => a.gcsPath);
                imagesToAnalyze = [...new Set([...imagesToAnalyze, ...brandImages])];
            }

            if (imagesToAnalyze.length === 0) {
                toast.error("Upload product images or add to library first");
                setIsAnalyzing(false);
                return;
            }

            const analysis = await analyzeMutation.mutateAsync({
                productImageUrls: imagesToAnalyze,
                brandId: selectedBrandId || undefined,
            });

            setBrandData(prev => ({
                ...prev,
                brief: analysis.brandVoice,
                brandVoice: analysis.brandVoice,
                visualIdentity: analysis.visualIdentity,
                colorPalette: JSON.stringify(analysis.colorPalette, null, 2),
            }));

            toast.success("Intelligence successfully extracted and persisted");
            utils.brand.get.invalidate();
        } catch (error) {
            console.error("Analysis failed:", error);
            toast.error("AI Analysis failed");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const reader = new FileReader();
            const base64 = await new Promise<string>((resolve) => {
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });

            const { url } = await uploadMutation.mutateAsync({
                base64,
                fileName: file.name,
            });

            setProductImages([url]);
            toast.success("Product Shard ingested successfully");
        } catch (error) {
            console.error("Upload failed:", error);
            toast.error("Failed to ingest product shard");
        } finally {
            setIsUploading(false);
        }
    };

    const handleBrandSelect = async (id: string) => {
        try {
            await linkMutation.mutateAsync({ projectId, brandId: id });
            setSelectedBrandId(id);
            utils.projects.get.invalidate({ id: projectId });
            toast.success("Project linked to brand DNA");
        } catch (error) {
            toast.error("Failed to link brand");
        }
    };

    const palette = (() => {
        try {
            const parsed = JSON.parse(brandData.colorPalette);
            if (Array.isArray(parsed)) return parsed;
            if (typeof parsed === 'object' && parsed !== null) {
                if (parsed.colors) return parsed.colors;
                if (parsed.palette) return parsed.palette;
                return Object.values(parsed).filter(v => typeof v === 'string' && v.startsWith('#'));
            }
            return [];
        } catch (e) { return []; }
    })();

    return (
        <div className="space-y-8 animate-fade-in mb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-8 gap-6">
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-1 italic">Genesis Node</p>
                    <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">
                        Phase 1: Brand Intelligence
                    </h2>
                    <p className="text-[11px] text-slate-500 uppercase font-bold tracking-widest mt-2">
                        Deep analysis of brand DNA and visual codes.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing}
                                    variant="outline"
                                    className="h-12 border-primary/30 text-primary hover:bg-primary/10 rounded-xl px-8 font-black uppercase text-[10px] tracking-widest transition-all"
                                >
                                    {isAnalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                    Run Deep Scan
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-900 border-white/10 text-white text-[10px] uppercase font-bold tracking-widest px-4 py-2">
                                <p>Scan Product Shards or use Library to activate DNA analysis</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-primary hover:bg-primary/90 text-white font-black h-12 px-10 rounded-xl shadow-lg shadow-primary/20 backdrop-blur-sm uppercase text-[10px] tracking-widest transition-all"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Seal DNA
                    </Button>
                </div>
            </div>

            <BrandSelector
                selectedBrandId={selectedBrandId || undefined}
                onBrandSelect={handleBrandSelect}
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <BrandLibraryPanel
                    brandId={selectedBrandId}
                    palette={palette}
                    isUploading={isUploading}
                    productImages={productImages}
                    onFileUpload={handleFileUpload}
                />

                <div className="lg:col-span-3 space-y-8">
                    <IdentityEditor
                        brandVoice={brandData.brandVoice}
                        visualIdentity={brandData.visualIdentity}
                        onChange={(data) => setBrandData(prev => ({ ...prev, ...data }))}
                    />

                    <StrategicBrief
                        brief={brandData.brief}
                        onChange={(brief) => setBrandData(prev => ({ ...prev, brief }))}
                    />
                </div>
            </div>
        </div>
    );
}
