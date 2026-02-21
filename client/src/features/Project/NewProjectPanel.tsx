import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, PlusCircle, Loader2 } from "lucide-react";
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
    onCreateProject: (name: string, brandId: string | null) => void;
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
    const [isBrandDialogOpen, setIsBrandDialogOpen] = useState(false);
    const [newBrandName, setNewBrandName] = useState("");

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
                            <DialogTrigger asChild>
                                <button className="text-[10px] font-mono text-primary hover:text-primary/80 uppercase tracking-widest flex items-center gap-1 transition-colors">
                                    <PlusCircle className="w-3 h-3" />
                                    New Brand
                                </button>
                            </DialogTrigger>
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
                    <p className="text-[9px] text-slate-500">
                        *Selected brand will govern narrative and visual style.
                    </p>
                </div>

                <Button
                    onClick={() => {
                        onCreateProject(projectName, selectedBrandId);
                        setProjectName("");
                        setSelectedBrandId(null);
                    }}
                    disabled={!projectName.trim() || createProjectPending}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold mt-4"
                >
                    {createProjectPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                            <Plus className="w-4 h-4 mr-2" />
                            Initialize
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
