import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// Feature Components
import { IdentityEditor } from "@/features/Brand/IdentityEditor";
import { StrategicBrief } from "@/features/Brand/StrategicBrief";

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

    const hasUnsavedChanges = useRef(false);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const brandDataRef = useRef(brandData);

    useEffect(() => {
        brandDataRef.current = brandData;
    }, [brandData]);

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
                hasUnsavedChanges.current = false;
            }
        }
    }, [projectQuery.data]);

    const autoSave = useCallback(async (data: BrandData) => {
        try {
            await updateMutation.mutateAsync({
                projectId,
                ...data,
                colorPalette: data.colorPalette ? JSON.parse(data.colorPalette) : {},
            });
            hasUnsavedChanges.current = false;
        } catch (e) {
            console.error("Auto-save failed:", e);
        }
    }, [projectId, updateMutation]);

    useEffect(() => {
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            if (hasUnsavedChanges.current) {
                const currentData = brandDataRef.current;
                updateMutation.mutate({
                    projectId,
                    ...currentData,
                    colorPalette: currentData.colorPalette ? JSON.parse(currentData.colorPalette) : {},
                });
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    const handleDataChange = useCallback((newData: Partial<BrandData>) => {
        setBrandData(prev => {
            const updated = { ...prev, ...newData };
            hasUnsavedChanges.current = true;
            
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            debounceTimer.current = setTimeout(() => {
                autoSave(updated);
            }, 2000);
            
            return updated;
        });
    }, [autoSave]);

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


            <div className="space-y-8">
                <IdentityEditor
                    brandVoice={brandData.brandVoice}
                    visualIdentity={brandData.visualIdentity}
                    onChange={(data) => handleDataChange(data)}
                />

                <StrategicBrief
                    brief={brandData.brief}
                    onChange={(brief) => handleDataChange({ brief })}
                />
            </div>
        </div>
    );
}
