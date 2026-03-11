import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, PlusCircle, Loader2, Upload } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface NewProjectPanelProps {
    brands: any[];
    onCreateProject: (data: {
        name: string;
        brandId: string | null;
        type: "spot" | "movie";
        targetDuration?: number;
        aspectRatio: string;
        brief: string;
        thumbnailUrl?: string;
    }) => void;
    onCreateBrand: (name: string) => Promise<{ id: string } | undefined>;
    createProjectPending: boolean;
    createBrandPending: boolean;
}

export function NewProjectPanel({
    brands,
    onCreateProject,
    onCreateBrand,
    createProjectPending,
    createBrandPending
}: NewProjectPanelProps) {
    const [projectName, setProjectName] = useState("");
    const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
    const [projectType, setProjectType] = useState<"spot" | "movie">("movie");
    const [targetDuration, setTargetDuration] = useState<number>(30);
    const [aspectRatio, setAspectRatio] = useState("16:9");
    const [brief, setBrief] = useState("");
    const [thumbnailUrl, setThumbnailUrl] = useState("");
    const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
    const [isBrandDialogOpen, setIsBrandDialogOpen] = useState(false);
    const [newBrandName, setNewBrandName] = useState("");
    const [, setLocation] = useLocation();

    const uploadMutation = trpc.projects.uploadThumbnail.useMutation();

    const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingThumbnail(true);
        try {
            const reader = new FileReader();
            const base64 = await new Promise<string>((resolve) => {
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });

            const { url } = await uploadMutation.mutateAsync({
                base64,
                fileName: `thumb-${Date.now()}-${file.name}`,
            });

            setThumbnailUrl(url);
            toast.success("Thumbnail uploaded successfully");
        } catch (error) {
            console.error("Thumbnail upload failed:", error);
            toast.error("Failed to upload thumbnail");
        } finally {
            setIsUploadingThumbnail(false);
        }
    };

    const handleCreateBrand = async () => {
        if (!newBrandName.trim()) return;
        const result = await onCreateBrand(newBrandName);
        if (result?.id) {
            setSelectedBrandId(result.id);
            setIsBrandDialogOpen(false);
            setNewBrandName("");
        }
    };

    return (
        <div className="pipeline-stage active p-8">
            <h3 className="production-node-title">New Production</h3>
            <p className="text-slate-400 text-sm mb-6">Initialize a new end-to-end AI film project.</p>
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Project Name</label>
                    <Input
                        placeholder="Project Title..."
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        className="h-10 bg-white/5 border-white/10"
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Brand Intelligence</label>
                        <Dialog open={isBrandDialogOpen} onOpenChange={setIsBrandDialogOpen}>
                            <div className="flex items-center gap-3">
                                <DialogTrigger asChild>
                                    <button className="text-[10px] font-mono text-primary hover:text-primary/80 uppercase tracking-widest flex items-center gap-1 transition-colors">
                                        <PlusCircle className="w-3 h-3" />
                                        New Brand
                                    </button>
                                </DialogTrigger>
                                <button
                                    onClick={() => setLocation("/brand")}
                                    className="text-[10px] font-mono text-slate-500 hover:text-primary uppercase tracking-widest flex items-center gap-1 transition-colors border-l border-white/10 pl-3"
                                >
                                    Manage in Studio
                                </button>
                            </div>
                            <DialogContent className="sm:max-w-[425px] bg-[#0a0a10] border-white/10 text-white">
                                <DialogHeader>
                                    <DialogTitle className="uppercase tracking-tighter italic font-black text-xl">Initialize Brand DNA</DialogTitle>
                                    <DialogDescription className="text-slate-400">
                                        Define a new brand identity. You can synchronize full DNA in the Brand Center later.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="brand-name" className="text-xs font-bold uppercase tracking-widest text-slate-500">Brand Name</Label>
                                        <Input
                                            id="brand-name"
                                            value={newBrandName}
                                            onChange={(e) => setNewBrandName(e.target.value)}
                                            placeholder="Enter brand name..."
                                            className="bg-white/5 border-white/10"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsBrandDialogOpen(false)}
                                        className="border-white/10 text-white hover:bg-white/5"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleCreateBrand}
                                        disabled={!newBrandName.trim() || createBrandPending}
                                        className="bg-primary hover:bg-primary/90 text-white"
                                    >
                                        {createBrandPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Brand"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <select
                        value={selectedBrandId || ""}
                        onChange={(e) => setSelectedBrandId(e.target.value ? e.target.value : null)}
                        className="w-full h-10 bg-white/5 border border-white/10 rounded-md text-xs text-white px-3 focus:outline-none focus:border-primary/50"
                    >
                        <option value="" className="bg-[#020205]">Select Brand Identity...</option>
                        {brands?.map((brand: any) => (
                            <option key={brand.id} value={brand.id} className="bg-[#020205]">{brand.name}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Production Type</label>
                        <select
                            value={projectType}
                            onChange={(e) => setProjectType(e.target.value as "spot" | "movie")}
                            className="w-full h-10 bg-white/5 border border-white/10 rounded-md text-xs text-white px-3 focus:outline-none focus:border-primary/50"
                        >
                            <option value="movie" className="bg-[#020205]">Feature Movie</option>
                            <option value="spot" className="bg-[#020205]">Commercial Spot</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Duration (sec)</label>
                        <Input
                            type="number"
                            value={targetDuration}
                            onChange={(e) => setTargetDuration(parseInt(e.target.value) || 0)}
                            className="h-10 bg-white/5 border-white/10"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Aspect Ratio</label>
                    <select
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value)}
                        className="w-full h-10 bg-white/5 border border-white/10 rounded-md text-xs text-white px-3 focus:outline-none focus:border-primary/50"
                    >
                        <option value="16:9" className="bg-[#020205]">16:9 (Landscape)</option>
                        <option value="9:16" className="bg-[#020205]">9:16 (Vertical)</option>
                        <option value="1:1" className="bg-[#020205]">1:1 (Square)</option>
                        <option value="2.35:1" className="bg-[#020205]">2.35:1 (Cinemascope)</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Creative Brief / Logline</label>
                    <textarea
                        value={brief}
                        onChange={(e) => setBrief(e.target.value)}
                        placeholder="Describe the production vision..."
                        className="w-full min-h-[80px] p-3 text-xs bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-primary/50"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Project Thumbnail</label>
                    <div className="relative w-full h-10 border border-white/10 rounded-md bg-white/[0.03] hover:bg-white/[0.05] transition flex items-center justify-center overflow-hidden">
                        {isUploadingThumbnail ? (
                            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        ) : thumbnailUrl ? (
                            <img src={thumbnailUrl} className="w-full h-full object-cover opacity-80 hover:opacity-100" />
                        ) : (
                            <div className="flex items-center gap-2 text-slate-500">
                                <Upload className="w-4 h-4" />
                                <span className="text-[10px] uppercase font-mono tracking-widest">Upload Cover</span>
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleThumbnailUpload}
                        />
                    </div>
                </div>

                <Button
                    onClick={() => {
                        onCreateProject({
                            name: projectName,
                            brandId: selectedBrandId,
                            type: projectType,
                            targetDuration,
                            aspectRatio,
                            brief,
                            thumbnailUrl
                        });
                        setProjectName("");
                        setBrief("");
                    }}
                    disabled={!projectName.trim() || createProjectPending}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold mt-4"
                >
                    {createProjectPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                            <Plus className="w-4 h-4 mr-2" />
                            Initialize Production
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
