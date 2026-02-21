import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
    Palette,
    Upload,
    ShieldAlert,
    Zap,
    Plus,
    Info,
    ChevronRight,
    Target,
    Sparkles,
    Search,
    CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export function BrandDashboard() {
    const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
    const [sourceUrl, setSourceUrl] = useState("");
    const [isBrandDialogOpen, setIsBrandDialogOpen] = useState(false);
    const [newBrandName, setNewBrandName] = useState("");

    const brandsQuery = trpc.brand.list.useQuery();
    const ingestMutation = trpc.brand.ingestIdentity.useMutation({
        onSuccess: () => {
            toast.success("Brand DNA successfully extracted and synchronized.");
            brandsQuery.refetch();
        },
        onError: (err) => {
            toast.error(`Ingestion failed: ${err.message}`);
        }
    });

    const createBrandMutation = trpc.brand.create.useMutation({
        onSuccess: (result) => {
            toast.success("Brand created successfully");
            setNewBrandName("");
            setIsBrandDialogOpen(false);
            brandsQuery.refetch();
            if (result?.id) {
                setSelectedBrandId(result.id);
            }
        },
        onError: (err) => {
            toast.error(`Failed to create brand: ${err.message}`);
        }
    });

    const handleCreateBrand = async () => {
        if (!newBrandName.trim()) return;
        createBrandMutation.mutate({ name: newBrandName });
    };

    const selectedBrand = brandsQuery.data?.find((b: unknown) => b.id === selectedBrandId);

    return (
        <DashboardLayout>
            <div className="space-y-8 animate-fade-in pb-20">
                {/* Header Section */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic flex items-center gap-3">
                            <Palette className="w-8 h-8 text-primary" />
                            Brand Intelligence Center
                        </h1>
                        <p className="text-slate-400 mt-2 text-sm max-w-2xl font-medium">
                            Manage your brand identity guidelines. AI-powered DNA extraction ensures all
                            generations remain pixel-perfect and on-brand.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="glass-panel border-white/10 hover:bg-white/5 text-xs font-bold uppercase tracking-widest">
                            Export Style Guide
                        </Button>
                        <Dialog open={isBrandDialogOpen} onOpenChange={setIsBrandDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 text-xs font-bold uppercase tracking-widest gap-2">
                                    <Plus className="w-4 h-4" />
                                    New Brand
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px] bg-[#0a0a10] border-white/10 text-white">
                                <DialogHeader>
                                    <DialogTitle className="uppercase tracking-tighter italic font-black text-xl">Initialize Brand DNA</DialogTitle>
                                    <DialogDescription className="text-slate-400">
                                        Define a new brand identity. You can synchronize full DNA via URL later.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="dashboard-brand-name" className="text-xs font-bold uppercase tracking-widest text-slate-500">Brand Name</Label>
                                        <Input
                                            id="dashboard-brand-name"
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
                                        disabled={!newBrandName.trim() || createBrandMutation.isPending}
                                        className="bg-primary hover:bg-primary/90 text-white"
                                    >
                                        {createBrandMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Brand"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Sidebar / Brand List */}
                    <aside className="lg:col-span-3 space-y-4">
                        <div className="production-label px-2">Registered Brands</div>
                        <div className="space-y-2">
                            {brandsQuery.isLoading ? (
                                <div className="p-4 glass-panel rounded-2xl animate-pulse h-20" />
                            ) : brandsQuery.data?.map((brand: unknown) => (
                                <button
                                    key={brand.id}
                                    onClick={() => setSelectedBrandId(brand.id)}
                                    className={`
                    w-full p-4 rounded-2xl flex items-center gap-4 transition-all text-left border
                    ${selectedBrandId === brand.id
                                            ? "bg-primary border-primary text-white shadow-xl shadow-primary/20"
                                            : "glass-panel border-white/5 text-slate-400 hover:text-white hover:bg-white/5"}
                  `}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${selectedBrandId === brand.id ? "bg-white/20" : "bg-primary/10 text-primary"}`}>
                                        {brand.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-xs uppercase tracking-wider truncate">{brand.name}</div>
                                        <div className={`text-[10px] truncate ${selectedBrandId === brand.id ? "text-white/60" : "text-slate-500"}`}>
                                            {brand.id.split("-")[0]}...
                                        </div>
                                    </div>
                                    {selectedBrandId === brand.id && <ChevronRight className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    </aside>

                    {/* Main Dashboard Area */}
                    <main className="lg:col-span-9 space-y-8">
                        {selectedBrand ? (
                            <>
                                {/* Brand Identity Summary */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <Card className="glass-panel border-white/5 bg-white/[0.02]">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Target className="w-4 h-4 text-primary" />
                                                <CardTitle className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Target Audience</CardTitle>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-slate-200 line-clamp-3 leading-relaxed">
                                                {selectedBrand.targetAudience || "No audience data defined."}
                                            </p>
                                        </CardContent>
                                    </Card>

                                    <Card className="glass-panel border-white/5 bg-white/[0.02]">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Sparkles className="w-4 h-4 text-primary" />
                                                <CardTitle className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Brand Voice</CardTitle>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-slate-200 line-clamp-3 leading-relaxed">
                                                {selectedBrand.brandVoice || "No voice profile established."}
                                            </p>
                                        </CardContent>
                                    </Card>

                                    <Card className="glass-panel border-white/5 bg-white/[0.02]">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center gap-2 mb-2">
                                                <ShieldAlert className="w-4 h-4 text-destructive" />
                                                <CardTitle className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Negative Constraints</CardTitle>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-slate-200 line-clamp-3 leading-relaxed">
                                                {selectedBrand.negativeConstraints || "No restrictions defined."}
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* AI DNA Ingestion Portal */}
                                <div className="glass-panel border-primary/20 bg-primary/5 rounded-[2rem] p-8 overflow-hidden relative">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                                        <Zap className="w-32 h-32 text-primary" />
                                    </div>

                                    <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                                        <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/40 flex-shrink-0">
                                            <Sparkles className="w-10 h-10 text-white" />
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <h3 className="text-xl font-bold text-white tracking-tight italic uppercase">Identity Ingestion Engine</h3>
                                                <p className="text-slate-400 text-sm mt-1">
                                                    Point our AI analysis to your digital ecosystem. We'll analyze your website,
                                                    brand guidelines, and public presence to synchronize DNA.
                                                </p>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="flex-1 relative">
                                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                    <Input
                                                        value={sourceUrl}
                                                        onChange={(e) => setSourceUrl(e.target.value)}
                                                        placeholder="https://yourbrand.com/guidelines"
                                                        className="pl-12 bg-white/5 border-white/10 rounded-xl h-12 text-white"
                                                    />
                                                </div>
                                                <Button
                                                    onClick={() => ingestMutation.mutate({ brandId: selectedBrand.id, sourceUrl })}
                                                    disabled={ingestMutation.isPending || !sourceUrl}
                                                    className="h-12 px-8 bg-white text-black hover:bg-slate-200 font-bold uppercase tracking-widest text-xs"
                                                >
                                                    {ingestMutation.isPending ? "Extracting..." : "Sync DNA"}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Assets & Visuals */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="production-label px-2">Visual Core Guidelines</div>
                                        <Card className="glass-panel border-white/5 bg-white/[0.01] rounded-3xl">
                                            <CardContent className="p-0">
                                                <div className="p-6 border-b border-white/5">
                                                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">Master Color Palette</h4>
                                                    <div className="flex flex-wrap gap-4">
                                                        {/* Static demo colors if none extracted yet */}
                                                        <div className="group relative">
                                                            <div className="w-12 h-12 rounded-xl bg-primary shadow-lg border border-white/20 transition-transform group-hover:scale-110 cursor-help" />
                                                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">PRIMARY</div>
                                                        </div>
                                                        <div className="group relative">
                                                            <div className="w-12 h-12 rounded-xl bg-slate-900 shadow-lg border border-white/20 transition-transform group-hover:scale-110 cursor-help" />
                                                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">DEEP_STUDIO</div>
                                                        </div>
                                                        <div className="group relative">
                                                            <div className="w-12 h-12 rounded-xl bg-slate-400 shadow-lg border border-white/20 transition-transform group-hover:scale-110 cursor-help" />
                                                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">NEUTRAL</div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="p-6">
                                                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">Core Aesthetic Tags</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {selectedBrand.aesthetic?.split(",").map((tag: string, i: number) => (
                                                            <Badge key={i} variant="secondary" className="bg-white/5 border-white/10 text-slate-300 text-[10px] uppercase font-bold tracking-tight px-3 py-1">
                                                                {tag.trim()}
                                                            </Badge>
                                                        )) || <p className="text-xs text-slate-500 italic">No tags identified.</p>}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="production-label px-2">Brand Documentation</div>
                                        <div className="space-y-3">
                                            <div className="p-4 glass-panel border-white/5 bg-white/[0.02] rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-white/5 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                                                        <Upload className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-white uppercase tracking-wider">Brand Guideline PDF</div>
                                                        <div className="text-[10px] text-slate-500">Upload master style guide for analysis</div>
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-primary transition-colors" />
                                            </div>

                                            <div className="p-4 glass-panel border-white/5 bg-white/[0.02] rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-white/5 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                                        <Info className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-white uppercase tracking-wider">Tone of Voice Bible</div>
                                                        <div className="text-[10px] text-slate-500">Synchronized from {selectedBrand.name} digital footprint</div>
                                                    </div>
                                                </div>
                                                <CheckCircle2 className="w-4 h-4 text-primary" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="h-[60vh] flex flex-col items-center justify-center space-y-4 border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.01]">
                                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                                    <Palette className="w-10 h-10 text-slate-600" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-bold text-slate-400 uppercase tracking-widest italic">Intelligence Standby</h3>
                                    <p className="text-sm text-slate-500 mt-2">Select or create a brand to activate the Intelligence Engine.</p>
                                </div>
                                <Button
                                    onClick={() => setIsBrandDialogOpen(true)}
                                    className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 text-xs font-bold uppercase tracking-widest mt-4"
                                >
                                    Register New Brand
                                </Button>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </DashboardLayout>
    );
}
