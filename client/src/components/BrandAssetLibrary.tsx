import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "./ui/button";
import { Loader2, Plus, Trash2, FileText, Link, Image as ImageIcon, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";

interface BrandAssetLibraryProps {
    brandId: string;
}

export function BrandAssetLibrary({ brandId }: BrandAssetLibraryProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [isAddingUrl, setIsAddingUrl] = useState(false);
    const [url, setUrl] = useState("");
    const [description, setDescription] = useState("");
    const [isIngesting, setIsIngesting] = useState<number | null>(null);

    const assetsQuery = trpc.brand.listAssets.useQuery({ brandId });
    const addAssetMutation = trpc.brand.addAsset.useMutation();
    const deleteAssetMutation = trpc.brand.deleteAsset.useMutation();
    const uploadAssetMutation = trpc.brand.uploadAsset.useMutation();
    const ingestDNAMutation = trpc.brand.ingestAssetDNA.useMutation();
    const utils = trpc.useUtils();

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

            const assetType = file.type.includes("image") ? "IMG" : "PDF";

            const { url: gcsUrl } = await uploadAssetMutation.mutateAsync({
                base64,
                fileName: file.name,
                mimeType: file.type
            });

            await addAssetMutation.mutateAsync({
                brandId,
                assetType,
                url: gcsUrl,
                description: file.name
            });

            utils.brand.listAssets.invalidate({ brandId });
            toast.success("Asset added to library");
        } catch (error) {
            console.error("Upload failed", error);
            toast.error("Upload failed");
        } finally {
            setIsUploading(false);
        }
    };

    const handleAddUrl = async () => {
        if (!url) return;
        setIsAddingUrl(true);
        try {
            await addAssetMutation.mutateAsync({
                brandId,
                assetType: "URL",
                url,
                description: description || url
            });
            setUrl("");
            setDescription("");
            utils.brand.listAssets.invalidate({ brandId });
            toast.success("URL linked to brand");
        } catch (error) {
            toast.error("Failed to add URL");
        } finally {
            setIsAddingUrl(false);
        }
    };

    const handleDelete = async (assetId: number) => {
        try {
            await deleteAssetMutation.mutateAsync({ assetId });
            utils.brand.listAssets.invalidate({ brandId });
            toast.success("Asset removed");
        } catch (error) {
            toast.error("Delete failed");
        }
    };

    const handleIngestDNA = async (assetId: number, url: string) => {
        setIsIngesting(assetId);
        try {
            await ingestDNAMutation.mutateAsync({ brandId, url });
            utils.brand.get.invalidate();
            toast.success("Digital DNA successfully merged into identity");
        } catch (error) {
            toast.error("DNA Ingestion failed");
        } finally {
            setIsIngesting(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 border-b border-white/5 pb-6">
                <div className="space-y-1">
                    <p className="text-[9px] font-black text-primary uppercase tracking-[0.4em] italic mb-1.5 opacity-80">Knowledge Vault</p>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                            <FileText className="w-5 h-5 text-primary" />
                        </div>
                        Cognitive Library
                    </h3>
                </div>
                <div className="flex gap-2">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="flex-1 h-11 rounded-xl bg-white/[0.02] border-white/10 text-[9px] uppercase font-bold tracking-widest text-slate-400 hover:text-white hover:border-primary/50 transition-all">
                                <Link className="w-3.5 h-3.5 mr-2" /> Bind URL
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-950 border-white/10 text-white shadow-2xl shadow-primary/10">
                            <DialogHeader>
                                <DialogTitle className="text-lg font-black uppercase italic tracking-tighter">Connect Source Resource</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-slate-500">Resource URL</label>
                                    <Input
                                        placeholder="https://brand-guidelines.com/style"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        className="bg-white/[0.03] border-white/10 text-white focus:border-primary/50 h-12 rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-slate-500">Display Name</label>
                                    <Input
                                        placeholder="Moodboard 2024"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="bg-white/[0.03] border-white/10 text-white focus:border-primary/50 h-12 rounded-xl"
                                    />
                                </div>
                                <Button onClick={handleAddUrl} disabled={isAddingUrl} className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-xl mt-4 shadow-lg shadow-primary/20">
                                    {isAddingUrl ? <Loader2 className="animate-spin" /> : "Bind Resource"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Button variant="outline" className="flex-1 h-11 rounded-xl bg-white/[0.02] border-white/10 text-[9px] uppercase font-bold tracking-widest text-slate-400 hover:text-white hover:border-primary/50 relative overflow-hidden transition-all">
                        <Plus className="w-3.5 h-3.5 mr-2" />
                        {isUploading ? "INGESTING..." : "Ingest File"}
                        <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleFileUpload}
                            accept=".pdf,image/*"
                            disabled={isUploading}
                        />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 max-h-[600px] overflow-y-auto pr-3 scrollbar-thin scrollbar-thumb-white/10 pt-2 pb-4">
                {assetsQuery.isLoading ? (
                    Array(3).fill(0).map((_, i) => (
                        <div key={i} className="h-20 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse" />
                    ))
                ) : assetsQuery.data?.length === 0 ? (
                    <div className="col-span-full border border-dashed border-white/10 rounded-2xl py-16 text-center bg-white/[0.01]">
                        <ImageIcon className="w-10 h-10 text-slate-800 mx-auto mb-4 opacity-40" />
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black italic">No neural data segments detected</p>
                    </div>
                ) : (
                    assetsQuery.data?.map((asset: any) => (
                        <div key={asset.id} className="relative group overflow-hidden bg-white/[0.02] border border-white/5 rounded-2xl p-4 hover:border-primary/40 transition-all duration-500 hover:bg-white/[0.04] shadow-sm hover:shadow-primary/5">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner">
                                    {asset.assetType === "IMG" ? (
                                        <img src={asset.gcsPath} alt={asset.description} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-1">
                                            {asset.assetType === "PDF" && <FileText className="w-6 h-6 text-orange-500/80" />}
                                            {asset.assetType === "URL" && <Link className="w-6 h-6 text-emerald-400/80" />}
                                            <span className="text-[6px] font-black text-slate-500 uppercase tracking-tighter">{asset.assetType}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="grow min-w-0 pr-8">
                                    <p className="text-[11px] font-black text-white uppercase truncate tracking-tight mb-1">{asset.description || 'Unnamed Fragment'}</p>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${asset.assetType === 'PDF' ? 'text-orange-400 bg-orange-400/10 border-orange-400/20' :
                                                asset.assetType === 'URL' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' :
                                                    'text-primary bg-primary/10 border-primary/20'
                                            }`}>
                                            {asset.assetType}
                                        </span>
                                        <span className="text-[9px] text-slate-600 uppercase font-mono tracking-tighter truncate max-w-[100px] opacity-60">
                                            {asset.gcsPath.startsWith('http') ? new URL(asset.gcsPath).hostname.replace('www.', '') : 'cloud-storage'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute top-4 right-4 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                                {asset.assetType === "URL" && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleIngestDNA(asset.id, asset.gcsPath)}
                                        disabled={isIngesting === asset.id}
                                        className="h-7 w-7 rounded-lg bg-primary/20 text-primary border border-primary/30 hover:bg-primary hover:text-white transition-all scale-90"
                                    >
                                        {isIngesting === asset.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                    </Button>
                                )}
                                <a href={asset.gcsPath} target="_blank" rel="noreferrer" className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/10 border border-white/10 text-slate-400 hover:text-white hover:border-white/30 transition-all scale-90">
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(asset.id)}
                                    className="h-7 w-7 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all scale-90"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
