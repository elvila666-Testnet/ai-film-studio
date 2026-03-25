import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Brain,
    Search,
    Save,
    Loader2,
    Globe,
    Upload,
    CheckCircle2,
    Plus,
    Trash2
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function BrandBrainOverlay({ initialBrandId }: { initialBrandId?: string | null }) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedBrandId, setSelectedBrandId] = useState<string | null>(initialBrandId || null);
    const [isDiscovering, setIsDiscovering] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [discoverUrl, setDiscoverUrl] = useState("");
    const [discoverName, setDiscoverName] = useState("");

    const brandsQuery = trpc.brand.list.useQuery();
    const brandQuery = trpc.brand.get.useQuery(
        { id: selectedBrandId || "" },
        { enabled: !!selectedBrandId }
    );

    const createMutation = trpc.brand.create.useMutation();
    const updateMutation = trpc.brand.update.useMutation();
    const deleteMutation = trpc.brand.delete.useMutation();
    const uploadMutation = trpc.brand.uploadProductImage.useMutation();
    const discoverMutation = trpc.brand.discover.useMutation();

    const [brandData, setBrandData] = useState({
        name: "",
        logoUrl: "",
        description: "",
        brandVoice: "",
        visualIdentity: "",
        targetAudience: "",
        negativeConstraints: "",
        colorPalette: "{}",
    });

    useEffect(() => {
        if (brandQuery.data) {
            const b = brandQuery.data;
            setBrandData({
                name: b.name || "",
                logoUrl: b.logoUrl || "",
                description: b.description || "",
                brandVoice: b.brandVoice || "",
                visualIdentity: b.visualIdentity || "",
                targetAudience: b.targetAudience || "",
                negativeConstraints: b.negativeConstraints || "",
                colorPalette: Array.isArray(b.colorPalette) 
                    ? b.colorPalette.join(", ") 
                    : (typeof b.colorPalette === 'string' ? b.colorPalette : JSON.stringify(b.colorPalette || {})),
            });
        }
    }, [brandQuery.data]);

    useEffect(() => {
        if (initialBrandId) {
            setSelectedBrandId(initialBrandId);
        }
    }, [initialBrandId]);

    const handleNewBrand = () => {
        setSelectedBrandId(null);
        setBrandData({
            name: "",
            logoUrl: "",
            description: "",
            brandVoice: "",
            visualIdentity: "",
            targetAudience: "",
            negativeConstraints: "",
            colorPalette: "{}",
        });
        setDiscoverUrl("");
        setDiscoverName("");
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            let parsedPalette: any = {};
            const rawPalette = brandData.colorPalette.trim();
            if (rawPalette) {
                try {
                    parsedPalette = JSON.parse(rawPalette);
                } catch {
                    parsedPalette = rawPalette.split(",").map(c => c.trim()).filter(Boolean);
                }
            }

            const data = {
                ...brandData,
                colorPalette: parsedPalette,
            };

            if (selectedBrandId) {
                await updateMutation.mutateAsync({ id: selectedBrandId, ...data });
                toast.success("Brand DNA updated");
            } else {
                const result = await createMutation.mutateAsync(data);
                setSelectedBrandId(result.id);
                toast.success("Brand DNA created");
            }
            brandsQuery.refetch();
        } catch (error) {
            console.error(error);
            toast.error("Failed to save brand DNA. Ensure Color Palette is valid JSON.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDiscover = async () => {
        const input = discoverUrl || discoverName;
        if (!input) {
            toast.error("Enter a Brand Name or URL to discover");
            return;
        }

        let brandId = selectedBrandId;
        const nameToUse = discoverName || discoverUrl.split('.')[0].replace('https://', '').replace('http://', '');

        setIsDiscovering(true);
        try {
            if (!brandId) {
                const result = await createMutation.mutateAsync({ name: nameToUse });
                brandId = result.id;
                setSelectedBrandId(brandId);
            }

            const dna: any = await discoverMutation.mutateAsync({
                brandId: brandId as string,
                name: input
            });

            if (dna) {
                setBrandData({
                    name: dna.name || brandData.name || nameToUse,
                    logoUrl: dna.logoUrl || brandData.logoUrl || "",
                    description: dna.description || "",
                    brandVoice: dna.brandVoice || "",
                    visualIdentity: dna.aesthetic || dna.visualIdentity || "",
                    targetAudience: dna.targetAudience || "",
                    negativeConstraints: dna.negativeConstraints || "",
                    colorPalette: Array.isArray(dna.colorPalette) 
                        ? dna.colorPalette.join(", ") 
                        : (typeof dna.colorPalette === 'string' ? dna.colorPalette : JSON.stringify(dna.colorPalette || {})),
                });
            }

            toast.success(`Brand Intelligence discovered for ${nameToUse}`);
            brandsQuery.refetch();
        } catch (error: any) {
            let errorMessage = error?.message || "Unknown error";
            try {
                // Sometime TRPC wraps the raw JSON. We can extract it for better UX.
                const parsed = JSON.parse(errorMessage.replace("Gemini API Error 503:", "").trim());
                if (parsed?.error?.message) {
                    errorMessage = parsed.error.message;
                }
            } catch (e) {
                // Ignore parse errors
            }
            toast.error(`Discovery failed: ${errorMessage}`);
        } finally {
            setIsDiscovering(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedBrandId) return;
        if (!confirm("Are you sure you want to purge this Brand DNA?")) return;

        try {
            await deleteMutation.mutateAsync({ id: selectedBrandId });
            setSelectedBrandId(null);
            brandsQuery.refetch();
            toast.success("Brand DNA purged");
        } catch (error) {
            toast.error("Failed to purge brand");
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingLogo(true);
        try {
            const reader = new FileReader();
            const base64 = await new Promise<string>((resolve) => {
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });

            const { url } = await uploadMutation.mutateAsync({
                base64,
                fileName: `logo-${Date.now()}-${file.name}`,
            });

            setBrandData({ ...brandData, logoUrl: url });
            toast.success("Logo uploaded successfully");
        } catch (error) {
            console.error("Logo upload failed:", error);
            toast.error("Failed to upload logo");
        } finally {
            setIsUploadingLogo(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="border-primary/30 bg-primary/5 text-primary hover:bg-primary/20 hover:text-primary transition-all gap-2 h-9 px-4 rounded-full max-w-[150px]"
                >
                    {brandQuery.data?.logoUrl ? (
                        <img src={brandQuery.data.logoUrl} alt="Logo" className="w-4 h-4 rounded-full object-cover shrink-0" />
                    ) : (
                        <Brain className="w-4 h-4 animate-pulse shrink-0" />
                    )}
                    <span className="font-bold tracking-tight truncate">{brandQuery.data?.name || "BRAND BRAIN"}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] lg:max-w-6xl max-h-[90vh] glass-panel border-white/10 p-0 overflow-hidden flex flex-col scale-in-center">
                <DialogHeader className="p-6 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                                {brandData.logoUrl ? (
                                    <img src={brandData.logoUrl} className="w-6 h-6 rounded-md object-cover" />
                                ) : (
                                    <Brain className="w-6 h-6 text-primary" />
                                )}
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold text-white tracking-tight uppercase">Brand Brain Instance</DialogTitle>
                                <DialogDescription className="text-slate-500 font-mono text-[10px] uppercase tracking-widest leading-none mt-1">
                                    Autonomous Identity & Compliance Hub
                                </DialogDescription>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <Select
                                value={selectedBrandId || "none"}
                                onValueChange={(val) => setSelectedBrandId(val === "none" ? null : val)}
                            >
                                <SelectTrigger className="w-[200px] bg-white/[0.03] border-white/10 text-xs text-slate-300">
                                    <SelectValue placeholder="Select Brand DNA" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-white">
                                    <SelectItem value="none">--- New Instance ---</SelectItem>
                                    {brandsQuery.data?.map((b: any) => (
                                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button
                                onClick={handleNewBrand}
                                variant="ghost"
                                size="sm"
                                className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white"
                            >
                                <Plus className="w-3 h-3 mr-1" /> New
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left Panel: Discovery & Assets */}
                    <div className="w-1/3 border-r border-white/5 p-6 space-y-6 bg-black/20">
                        <section className="space-y-4">
                            <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                <Globe className="w-4 h-4 text-primary" />
                                Web Discovery
                            </h3>
                            <div className="space-y-2">
                                <Input
                                    placeholder="Brand Name or URL..."
                                    value={discoverUrl || discoverName}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val.startsWith('http')) setDiscoverUrl(val);
                                        else setDiscoverName(val);
                                    }}
                                    className="bg-white/[0.03] border-white/10 text-xs"
                                />
                                <Button
                                    onClick={handleDiscover}
                                    disabled={isDiscovering}
                                    className="w-full bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 h-8 text-[10px] font-bold uppercase tracking-widest"
                                >
                                    {isDiscovering ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Search className="w-3 h-3 mr-2" />}
                                    Sync from Web
                                </Button>
                            </div>
                        </section>

                        <section className="space-y-4 pt-4 border-t border-white/5">
                            <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                <Upload className="w-4 h-4 text-primary" />
                                Knowledge Ingestion
                            </h3>
                            <div className="grid grid-cols-1 gap-2">
                                <Button variant="outline" className="justify-start border-white/5 bg-white/[0.02] text-slate-400 h-10 text-[10px] uppercase font-bold tracking-widest">
                                    <Upload className="w-3 h-3 mr-2" /> Upload PDF/Doc
                                </Button>
                                <Button variant="outline" className="justify-start border-white/5 bg-white/[0.02] text-slate-400 h-10 text-[10px] uppercase font-bold tracking-widest">
                                    <CheckCircle2 className="w-3 h-3 mr-2" /> Scan Brand Image
                                </Button>
                            </div>
                            <p className="text-[9px] text-slate-600 italic leading-relaxed">
                                Multi-modal ingestion: Upload brand bibles, videos, or assets to deep-train the Brand Brain.
                            </p>
                        </section>

                        {selectedBrandId && (
                            <Button
                                onClick={handleDelete}
                                variant="ghost"
                                className="w-full mt-auto text-destructive hover:bg-destructive/10 text-[10px] font-bold uppercase tracking-widest"
                            >
                                <Trash2 className="w-3 h-3 mr-2" /> Purge DNA
                            </Button>
                        )}
                    </div>

                    {/* Right Panel: Manual Edit & DNA */}
                    <ScrollArea className="flex-1 p-6">
                        <div className="space-y-6">
                            <div className="grid grid-cols-12 gap-4">
                                <div className="col-span-12 md:col-span-5 space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Brand Name</label>
                                    <Input
                                        value={brandData.name}
                                        onChange={(e) => setBrandData({ ...brandData, name: e.target.value })}
                                        placeholder="e.g., Nike, Tesla..."
                                        className="bg-white/[0.03] border-white/10"
                                    />
                                </div>
                                <div className="col-span-12 md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Logo</label>
                                    <div className="relative w-full h-10 border border-white/10 rounded-md bg-white/[0.03] hover:bg-white/[0.05] transition flex items-center justify-center overflow-hidden">
                                        {isUploadingLogo ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                        ) : brandData.logoUrl ? (
                                            <img src={brandData.logoUrl} className="w-full h-full object-contain opacity-60 hover:opacity-100" />
                                        ) : (
                                            <Upload className="w-4 h-4 text-slate-500" />
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={handleLogoUpload}
                                        />
                                    </div>
                                </div>
                                <div className="col-span-12 md:col-span-5 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Color Palette (Hex)</label>
                                        <div className="flex gap-1.5 items-center">
                                            {brandData.colorPalette.split(",")
                                                .map(c => c.trim().replace(/['"\[\]]/g, ''))
                                                .filter(c => /^#([0-9A-F]{3}){1,2}$/i.test(c))
                                                .map((color, i) => (
                                                    <div 
                                                        key={i} 
                                                        className="w-4 h-4 rounded-[4px] border border-white/20 shadow-sm shadow-black/50 transition-all hover:scale-110" 
                                                        style={{ backgroundColor: color }}
                                                        title={color}
                                                    />
                                                ))}
                                        </div>
                                    </div>
                                    <Input
                                        value={brandData.colorPalette}
                                        onChange={(e) => setBrandData({ ...brandData, colorPalette: e.target.value })}
                                        placeholder="#000000, #1A1A1A"
                                        className="bg-white/[0.03] border-white/10 font-mono text-[10px]"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Tabs defaultValue="voice" className="w-full">
                                    <TabsList className="bg-white/[0.03] border border-white/5 p-1">
                                        <TabsTrigger value="voice" className="text-[10px] uppercase font-bold px-4">Brand Voice</TabsTrigger>
                                        <TabsTrigger value="visual" className="text-[10px] uppercase font-bold px-4">Visual ID</TabsTrigger>
                                        <TabsTrigger value="audience" className="text-[10px] uppercase font-bold px-4">Audience</TabsTrigger>
                                        <TabsTrigger value="constraints" className="text-[10px] uppercase font-bold px-4">Negative</TabsTrigger>
                                    </TabsList>
                                    <div className="mt-4">
                                        <TabsContent value="voice">
                                            <Textarea
                                                placeholder="Define the soul and tone..."
                                                value={brandData.brandVoice}
                                                onChange={(e) => setBrandData({ ...brandData, brandVoice: e.target.value })}
                                                className="min-h-[200px] bg-white/[0.03] border-white/10"
                                            />
                                        </TabsContent>
                                        <TabsContent value="visual">
                                            <Textarea
                                                placeholder="Cinematographic codes, lighting, composition..."
                                                value={brandData.visualIdentity}
                                                onChange={(e) => setBrandData({ ...brandData, visualIdentity: e.target.value })}
                                                className="min-h-[200px] bg-white/[0.03] border-white/10"
                                            />
                                        </TabsContent>
                                        <TabsContent value="audience">
                                            <Textarea
                                                placeholder="Psychographics and target personas..."
                                                value={brandData.targetAudience}
                                                onChange={(e) => setBrandData({ ...brandData, targetAudience: e.target.value })}
                                                className="min-h-[200px] bg-white/[0.03] border-white/10"
                                            />
                                        </TabsContent>
                                        <TabsContent value="constraints">
                                            <Textarea
                                                placeholder="What we MUST avoid (taboos)..."
                                                value={brandData.negativeConstraints}
                                                onChange={(e) => setBrandData({ ...brandData, negativeConstraints: e.target.value })}
                                                className="min-h-[200px] bg-white/[0.03] border-white/10"
                                            />
                                        </TabsContent>
                                    </div>
                                </Tabs>
                            </div>

                            <Button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-xl shadow-lg shadow-primary/20"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                Seal DNA Identity
                            </Button>
                        </div>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}
