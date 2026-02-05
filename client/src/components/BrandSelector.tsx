/**
 * Brand Selector Component
 * Allows users to select a brand and view brand details
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Trash2, Check } from "lucide-react";

interface BrandSelectorProps {
  selectedBrandId?: number;
  onBrandSelect: (brandId: number) => void;
}

export function BrandSelector({ selectedBrandId, onBrandSelect }: BrandSelectorProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingBrandId, setEditingBrandId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    targetCustomer: "",
    aesthetic: "",
    mission: "",
    coreMessaging: "",
  });

  // Fetch user's brands
  const brandsQuery = trpc.brands.list.useQuery();
  const createBrandMutation = trpc.brands.create.useMutation({
    onSuccess: () => {
      brandsQuery.refetch();
      setIsCreating(false);
      setFormData({ name: "", targetCustomer: "", aesthetic: "", mission: "", coreMessaging: "" });
    },
  });

  const updateBrandMutation = trpc.brands.update.useMutation({
    onSuccess: () => {
      brandsQuery.refetch();
      setIsEditing(false);
      setEditingBrandId(null);
      setFormData({ name: "", targetCustomer: "", aesthetic: "", mission: "", coreMessaging: "" });
    },
  });

  const deleteBrandMutation = trpc.brands.delete.useMutation({
    onSuccess: () => {
      brandsQuery.refetch();
      if (selectedBrandId === editingBrandId) {
        onBrandSelect(0);
      }
    },
  });

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
      {/* Brand Selection Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Your Brands</h2>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Brand
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Brand</DialogTitle>
                <DialogDescription>
                  Define your brand's identity, target customer, aesthetic, mission, and core messaging
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="brand-name">Brand Name</Label>
                  <Input
                    id="brand-name"
                    placeholder="e.g., Nike, Apple, Coca-Cola"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="target-customer">Target Customer</Label>
                  <Textarea
                    id="target-customer"
                    placeholder="Describe your ideal customer: demographics, interests, pain points, aspirations..."
                    value={formData.targetCustomer}
                    onChange={(e) => setFormData({ ...formData, targetCustomer: e.target.value })}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="aesthetic">Aesthetic</Label>
                  <Textarea
                    id="aesthetic"
                    placeholder="Describe your visual style: minimalist, bold, playful, luxury, modern, vintage, etc."
                    value={formData.aesthetic}
                    onChange={(e) => setFormData({ ...formData, aesthetic: e.target.value })}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="mission">Mission</Label>
                  <Textarea
                    id="mission"
                    placeholder="What is your brand's purpose? What problem do you solve? What values do you stand for?"
                    value={formData.mission}
                    onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="core-messaging">Core Messaging</Label>
                  <Textarea
                    id="core-messaging"
                    placeholder="What are your key messages? How do you want to be perceived? What's your unique value proposition?"
                    value={formData.coreMessaging}
                    onChange={(e) => setFormData({ ...formData, coreMessaging: e.target.value })}
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleCreateBrand}
                  disabled={createBrandMutation.isPending || !formData.name.trim()}
                  className="w-full"
                >
                  {createBrandMutation.isPending ? "Creating..." : "Create Brand"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {brandsQuery.isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading brands...</div>
        ) : brandsQuery.data?.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-4">No brands yet. Create your first brand to get started.</p>
              <Button onClick={() => setIsCreating(true)}>Create First Brand</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {brandsQuery.data?.map((brand: any) => (
              <Card
                key={brand.id}
                className={`cursor-pointer transition-all ${
                  selectedBrandId === brand.id ? "ring-2 ring-primary" : "hover:shadow-lg"
                }`}
                onClick={() => onBrandSelect(brand.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{brand.name}</CardTitle>
                      {selectedBrandId === brand.id && (
                        <div className="flex items-center gap-1 text-xs text-primary mt-1">
                          <Check className="h-3 w-3" />
                          Selected
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditBrand(brand);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteBrandMutation.mutate({ id: brand.id });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {brand.targetCustomer && (
                    <div>
                      <p className="font-semibold text-xs text-muted-foreground">Target Customer</p>
                      <p className="line-clamp-2">{brand.targetCustomer}</p>
                    </div>
                  )}
                  {brand.aesthetic && (
                    <div>
                      <p className="font-semibold text-xs text-muted-foreground">Aesthetic</p>
                      <p className="line-clamp-2">{brand.aesthetic}</p>
                    </div>
                  )}
                  {brand.mission && (
                    <div>
                      <p className="font-semibold text-xs text-muted-foreground">Mission</p>
                      <p className="line-clamp-2">{brand.mission}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Selected Brand Details */}
      {selectedBrand && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle>Brand Details: {selectedBrand.name}</CardTitle>
            <CardDescription>Brand Brain AI is analyzing this brand's parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedBrand.targetCustomer && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Target Customer</h4>
                  <p className="text-sm text-muted-foreground">{selectedBrand.targetCustomer}</p>
                </div>
              )}
              {selectedBrand.aesthetic && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Aesthetic</h4>
                  <p className="text-sm text-muted-foreground">{selectedBrand.aesthetic}</p>
                </div>
              )}
              {selectedBrand.mission && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Mission</h4>
                  <p className="text-sm text-muted-foreground">{selectedBrand.mission}</p>
                </div>
              )}
              {selectedBrand.coreMessaging && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Core Messaging</h4>
                  <p className="text-sm text-muted-foreground">{selectedBrand.coreMessaging}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Brand Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Brand</DialogTitle>
            <DialogDescription>Update your brand's identity and guidelines</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-brand-name">Brand Name</Label>
              <Input
                id="edit-brand-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-target-customer">Target Customer</Label>
              <Textarea
                id="edit-target-customer"
                value={formData.targetCustomer}
                onChange={(e) => setFormData({ ...formData, targetCustomer: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="edit-aesthetic">Aesthetic</Label>
              <Textarea
                id="edit-aesthetic"
                value={formData.aesthetic}
                onChange={(e) => setFormData({ ...formData, aesthetic: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="edit-mission">Mission</Label>
              <Textarea
                id="edit-mission"
                value={formData.mission}
                onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="edit-core-messaging">Core Messaging</Label>
              <Textarea
                id="edit-core-messaging"
                value={formData.coreMessaging}
                onChange={(e) => setFormData({ ...formData, coreMessaging: e.target.value })}
                rows={3}
              />
            </div>

            <Button
              onClick={handleUpdateBrand}
              disabled={updateBrandMutation.isPending || !formData.name.trim()}
              className="w-full"
            >
              {updateBrandMutation.isPending ? "Updating..." : "Update Brand"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
