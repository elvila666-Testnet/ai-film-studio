import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface BrandIntelligenceTabProps {
  projectId: number;
}

export default function BrandIntelligenceTab({ projectId }: BrandIntelligenceTabProps) {
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [aesthetic, setAesthetic] = useState("");
  const [mission, setMission] = useState("");
  const [coreMessaging, setCoreMessaging] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);

  const brandsQuery = trpc.brands.list.useQuery();
  const createBrandMutation = trpc.brands.create.useMutation();
  const getBrandQuery = trpc.brands.get.useQuery(
    { id: selectedBrandId! },
    { enabled: !!selectedBrandId }
  );

  const handleCreateBrand = async () => {
    if (!brandName.trim()) {
      alert("Please enter a brand name");
      return;
    }

    try {
      setIsCreatingBrand(true);
      const result = await createBrandMutation.mutateAsync({
        name: brandName,
        targetCustomer: targetCustomer.trim() || undefined,
        aesthetic: aesthetic.trim() || undefined,
        mission: mission.trim() || undefined,
        coreMessaging: coreMessaging.trim() || undefined,
      });

      setBrandName("");
      setTargetCustomer("");
      setAesthetic("");
      setMission("");
      setCoreMessaging("");
      setSelectedBrandId(result.brandId);
      brandsQuery.refetch();
    } catch (error) {
      console.error("Failed to create brand:", error);
      alert("Failed to create brand");
    } finally {
      setIsCreatingBrand(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Brand Selection */}
      {brandsQuery.data && brandsQuery.data.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Your Brands</CardTitle>
            <CardDescription>Select an existing brand or create a new one</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {brandsQuery.data.map((brand) => (
                <button
                  key={brand.id}
                  onClick={() => setSelectedBrandId(brand.id)}
                  className={`p-4 rounded-sm border-2 text-left transition-colors ${
                    selectedBrandId === brand.id
                      ? "border-accent bg-accent/10"
                      : "border-border bg-background hover:border-accent/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{brand.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {brand.targetCustomer || "No description"}
                      </p>
                    </div>
                    {selectedBrandId === brand.id && (
                      <Check className="w-5 h-5 text-accent" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Brand Details */}
      {selectedBrandId && getBrandQuery.data && (
        <Card className="bg-card border-border border-accent">
          <CardHeader>
            <CardTitle className="text-lg">{getBrandQuery.data.name}</CardTitle>
            <CardDescription>Brand Intelligence Details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {getBrandQuery.data.targetCustomer && (
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Target Customer
                </label>
                <p className="text-sm text-foreground mt-2">{getBrandQuery.data.targetCustomer}</p>
              </div>
            )}

            {getBrandQuery.data.aesthetic && (
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Aesthetic
                </label>
                <p className="text-sm text-foreground mt-2">{getBrandQuery.data.aesthetic}</p>
              </div>
            )}

            {getBrandQuery.data.mission && (
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Mission
                </label>
                <p className="text-sm text-foreground mt-2">{getBrandQuery.data.mission}</p>
              </div>
            )}

            {getBrandQuery.data.coreMessaging && (
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Core Messaging
                </label>
                <p className="text-sm text-foreground mt-2">{getBrandQuery.data.coreMessaging}</p>
              </div>
            )}

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                This brand will be used as the intelligence anchor for all generated content in this project.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create New Brand */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Create New Brand</CardTitle>
          <CardDescription>Define your brand intelligence for this project</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
              Brand Name *
            </label>
            <Input
              placeholder="e.g., TechCorp, LuxuryBrand, StartupXYZ"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="bg-background border-border"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
              Target Customer
            </label>
            <Textarea
              placeholder="Who is your ideal customer? E.g., 'Tech-savvy professionals aged 25-40, early adopters, high disposable income, value innovation and quality'"
              value={targetCustomer}
              onChange={(e) => setTargetCustomer(e.target.value)}
              className="bg-background border-border min-h-20"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
              Aesthetic
            </label>
            <Textarea
              placeholder="Describe your visual style. E.g., 'Minimalist design, cool blue and white palette, modern sans-serif fonts, clean compositions, bright lighting, cinematic depth'"
              value={aesthetic}
              onChange={(e) => setAesthetic(e.target.value)}
              className="bg-background border-border min-h-20"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
              Mission
            </label>
            <Textarea
              placeholder="What is your brand's purpose? E.g., 'To empower businesses with cutting-edge technology solutions that drive growth and innovation'"
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              className="bg-background border-border min-h-20"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
              Core Messaging
            </label>
            <Textarea
              placeholder="What are your key messages? E.g., 'Innovation, reliability, customer success, future-ready solutions'"
              value={coreMessaging}
              onChange={(e) => setCoreMessaging(e.target.value)}
              className="bg-background border-border min-h-20"
            />
          </div>

          <Button
            onClick={handleCreateBrand}
            disabled={isCreatingBrand || !brandName.trim()}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {isCreatingBrand ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Brand...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create Brand
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
