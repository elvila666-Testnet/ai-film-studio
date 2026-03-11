/**
 * Brand Selector Component
 * Focuses on Active DNA Profile with secondary selection capability
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Trash2, Check, Link, Sparkles, Loader2, Search, Zap } from "lucide-react";
import { toast } from "sonner";

interface BrandSelectorProps {
  selectedBrandId?: string;
  onBrandSelect: (brandId: string) => void;
}

export function BrandSelector({ selectedBrandId, onBrandSelect }: BrandSelectorProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);

  const [urlInput, setUrlInput] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    targetCustomer: "",
    aesthetic: "",
    mission: "",
    coreMessaging: "",
  });

  // Fetch user's brands
  const brandsQuery = trpc.brand.list.useQuery();

  const scrapeDNAMutation = trpc.brand.scrapeDNA.useMutation({
    onSuccess: (data: any) => {
      setFormData(prev => ({
        ...prev,
        ...data,
      }));
      toast.success("Brand DNA extracted from digital footprint");
    },
    onError: (err: any) => {
      toast.error(`Extraction failed: ${err.message}`);
    }
  });

  const createBrandMutation = trpc.brand.create.useMutation({
    onSuccess: () => {
      brandsQuery.refetch();
      setIsCreating(false);
      setFormData({ name: "", targetCustomer: "", aesthetic: "", mission: "", coreMessaging: "" });
    },
  });

  const updateBrandMutation = trpc.brand.update.useMutation({
    onSuccess: () => {
      brandsQuery.refetch();
      setIsEditing(false);
      setEditingBrandId(null);
      setFormData({ name: "", targetCustomer: "", aesthetic: "", mission: "", coreMessaging: "" });
    },
  });

  const deleteBrandMutation = trpc.brand.delete.useMutation({
    onSuccess: () => {
      brandsQuery.refetch();
    },
  });

  const handleImportUrl = async () => {
    if (!urlInput.trim()) return;
    await scrapeDNAMutation.mutateAsync({ url: urlInput });
  };

  const handleCreateBrand = async () => {
    if (!formData.name.trim()) return;
    await createBrandMutation.mutateAsync(formData);
  };

  const handleUpdateBrand = async () => {
    if (!editingBrandId || !formData.name.trim()) return;
    await updateBrandMutation.mutateAsync({
      id: editingBrandId,
      ...formData,
    });
  };

  const handleEditBrand = (brand: any) => {
    setEditingBrandId(brand.id);
    setFormData({
      name: brand.name,
      targetCustomer: brand.targetCustomer || "",
      aesthetic: brand.aesthetic || "",
      mission: brand.mission || "",
      coreMessaging: brand.coreMessaging || "",
    });
    setIsEditing(true);
  };

  const selectedBrand = brandsQuery.data?.find((b: any) => b.id === selectedBrandId);

  return (
    <div className="space-y-6">
      {/* Active Brand Header / Selector */}
      <Card className="glass-panel overflow-hidden border-primary/30 bg-primary/[0.02] shadow-2xl shadow-primary/5">
        <CardHeader className="pb-6 border-b border-white/5 bg-white/[0.01]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em] italic">Active Intelligence Node</p>
              </div>
              <CardTitle className="text-2xl font-black text-white uppercase tracking-tighter italic flex items-center gap-3">
                {selectedBrand ? (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center border border-primary shadow-lg shadow-primary/20">
                      {selectedBrand.name.substring(0, 1).toUpperCase()}
                    </div>
                    DNA Profile: {selectedBrand.name}
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 text-slate-500">
                      <Zap className="w-5 h-5" />
                    </div>
                    No DNA Profile Active
                  </>
                )}
              </CardTitle>
            </div>

            <div className="flex items-center gap-3">
              <Dialog open={isSelecting} onOpenChange={setIsSelecting}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="h-11 rounded-xl bg-white/[0.02] border-white/10 text-[10px] uppercase font-black tracking-widest text-slate-400 hover:text-white hover:border-primary/50 transition-all px-6">
                    <Search className="w-3.5 h-3.5 mr-2" />
                    {selectedBrand ? "Switch DNA" : "Activate DNA"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl bg-slate-950 border-white/10 text-white shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-black uppercase italic tracking-tighter">Identity Repository</DialogTitle>
                    <DialogDescription className="text-slate-500 uppercase text-[9px] font-bold tracking-widest">
                      Select a brand DNA profile to activate intelligence for this project.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                      {brandsQuery.isLoading ? (
                        Array(3).fill(0).map((_, i) => (
                          <div key={i} className="h-16 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse" />
                        ))
                      ) : brandsQuery.data?.length === 0 ? (
                        <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl">
                          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">No profiles found</p>
                        </div>
                      ) : (
                        brandsQuery.data?.map((brand: any) => (
                          <div
                            key={brand.id}
                            className={`group relative flex items-center justify-between p-4 bg-white/[0.02] border rounded-2xl cursor-pointer transition-all hover:bg-white/[0.04] ${selectedBrandId === brand.id ? "border-primary/50 bg-primary/5 shadow-inner shadow-primary/10" : "border-white/5"}`}
                            onClick={() => {
                              onBrandSelect(brand.id);
                              setIsSelecting(false);
                            }}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border font-black text-xs ${selectedBrandId === brand.id ? "bg-primary text-white border-primary" : "bg-white/5 border-white/10 text-slate-400 group-hover:text-white"}`}>
                                {brand.name.substring(0, 1).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-white uppercase tracking-tight">{brand.name}</h4>
                                {selectedBrandId === brand.id && (
                                  <div className="flex items-center gap-1 text-[8px] font-black text-primary uppercase tracking-widest mt-0.5">
                                    <Check className="h-2 w-2" /> ACTIVE
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-slate-500 hover:text-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditBrand(brand);
                                }}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-slate-500 hover:text-red-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteBrandMutation.mutate({ id: brand.id });
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <Button
                      onClick={() => {
                        setIsSelecting(false);
                        setIsCreating(true);
                      }}
                      className="w-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white font-bold h-12 rounded-xl mt-2"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      FORGE NEW IDENTITY
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isCreating} onOpenChange={setIsCreating}>
                <DialogTrigger asChild>
                  <Button className="h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-widest px-8 shadow-lg shadow-primary/20 transition-all border border-primary/50">
                    <Plus className="w-4 h-4 mr-2" />
                    Forge New
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl bg-slate-950 border-white/10 text-white shadow-2xl">
                  <DialogHeader>
                    <div className="flex items-center gap-3 mb-1">
                      <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                        <Sparkles className="w-5 h-5 text-primary" />
                      </div>
                      <DialogTitle className="text-xl font-black uppercase italic tracking-tighter">Forge New Brand DNA</DialogTitle>
                    </div>
                    <DialogDescription className="text-slate-500 uppercase text-[10px] font-bold tracking-[0.2em]">
                      AI will synthesize the core brand architecture from your digital footprint.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 pt-6">
                    <div className="p-6 bg-white/[0.02] rounded-3xl border border-white/5 space-y-4 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Label htmlFor="brand-url" className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black relative z-10">Digital Footprint URL</Label>
                      <div className="flex gap-3 relative z-10">
                        <Input
                          id="brand-url"
                          placeholder="https://example.com"
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          className="bg-white/[0.03] border-white/10 text-white h-12 rounded-xl focus:border-primary/50"
                        />
                        <Button
                          onClick={handleImportUrl}
                          disabled={scrapeDNAMutation.isPending || !urlInput.trim()}
                          className="bg-primary hover:bg-primary/90 text-white font-bold h-12 px-8 rounded-xl shrink-0"
                        >
                          {scrapeDNAMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link className="h-4 w-4 mr-2" />}
                          INGEST
                        </Button>
                      </div>
                      <p className="text-[9px] text-slate-600 uppercase font-bold italic tracking-wider relative z-10">Neural extraction from live web assets.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="brand-name" className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Identity Name</Label>
                        <Input
                          id="brand-name"
                          placeholder="e.g., Apple, Nike, SpaceX"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="bg-white/[0.03] border-white/10 text-white h-14 rounded-2xl focus:border-primary/50 text-lg font-bold"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleCreateBrand}
                      disabled={createBrandMutation.isPending || !formData.name.trim()}
                      className="w-full bg-primary hover:bg-primary/90 text-white font-black h-16 rounded-2xl text-lg shadow-2xl shadow-primary/20 mt-4 uppercase tracking-[0.2em]"
                    >
                      {createBrandMutation.isPending ? "FORGING..." : "Seal Identity"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        {selectedBrand && (
          <CardContent className="p-8 lg:p-10 pt-8 lg:pt-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {selectedBrand.targetCustomer && (
                <div className="space-y-2 group/dna">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1 h-3 bg-primary/40 rounded-full group-hover/dna:bg-primary transition-colors" />
                    <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Demographic</h4>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed font-medium italic line-clamp-4 pl-3 border-l border-white/5 group-hover/dna:border-primary/20 transition-colors">
                    {selectedBrand.targetCustomer}
                  </p>
                </div>
              )}
              {selectedBrand.aesthetic && (
                <div className="space-y-2 group/dna">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1 h-3 bg-primary/40 rounded-full group-hover/dna:bg-primary transition-colors" />
                    <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Aesthetic</h4>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed font-medium italic line-clamp-4 pl-3 border-l border-white/5 group-hover/dna:border-primary/20 transition-colors">
                    {selectedBrand.aesthetic}
                  </p>
                </div>
              )}
              {selectedBrand.mission && (
                <div className="space-y-2 group/dna">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1 h-3 bg-primary/40 rounded-full group-hover/dna:bg-primary transition-colors" />
                    <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Strategic</h4>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed font-medium italic line-clamp-4 pl-3 border-l border-white/5 group-hover/dna:border-primary/20 transition-colors">
                    {selectedBrand.mission}
                  </p>
                </div>
              )}
              {selectedBrand.coreMessaging && (
                <div className="space-y-2 group/dna">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1 h-3 bg-primary/40 rounded-full group-hover/dna:bg-primary transition-colors" />
                    <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Narrative</h4>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed font-medium italic line-clamp-4 pl-3 border-l border-white/5 group-hover/dna:border-primary/20 transition-colors">
                    {selectedBrand.coreMessaging}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Edit Brand Dialog (Shared) */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl bg-slate-950 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase italic tracking-tighter">Edit Identity</DialogTitle>
            <DialogDescription className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Update brand DNA parameters</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-slate-500">Identity Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white/[0.03] border-white/10 h-12 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-slate-500">Target Demographic</Label>
              <Textarea
                value={formData.targetCustomer}
                onChange={(e) => setFormData({ ...formData, targetCustomer: e.target.value })}
                rows={3}
                className="bg-white/[0.03] border-white/10 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-slate-500">Brand Aesthetic</Label>
              <Textarea
                value={formData.aesthetic}
                onChange={(e) => setFormData({ ...formData, aesthetic: e.target.value })}
                rows={3}
                className="bg-white/[0.03] border-white/10 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Mission</Label>
                <Textarea
                  value={formData.mission}
                  onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
                  rows={4}
                  className="bg-white/[0.03] border-white/10 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Core Messaging</Label>
                <Textarea
                  value={formData.coreMessaging}
                  onChange={(e) => setFormData({ ...formData, coreMessaging: e.target.value })}
                  rows={4}
                  className="bg-white/[0.03] border-white/10 rounded-xl"
                />
              </div>
            </div>

            <Button
              onClick={handleUpdateBrand}
              disabled={updateBrandMutation.isPending}
              className="w-full bg-primary h-14 rounded-xl font-bold uppercase tracking-widest"
            >
              {updateBrandMutation.isPending ? "Updating..." : "Persist Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
