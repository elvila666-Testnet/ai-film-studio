import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RotateCw, Check, ChevronLeft, ChevronRight } from "lucide-react";
// Types for character archetype
interface CharacterVariant {
  id: string;
  imageUrl: string;
  description: string;
  style: string;
  confidence: number;
  generatedAt: Date;
}

interface CharacterArchetype {
  id: string;
  name: string;
  description: string;
  personality: string;
  targetAudience: string;
  archetypeType: string;
  visualDescription: string;
  brandAlignment: number;
  reasoning: string;
  imageUrl?: string;
  variants: CharacterVariant[];
}

interface CharacterArchetypeSelectorProps {
  archetypes: CharacterArchetype[];
  loading?: boolean;
  onSelectHero: (archetype: CharacterArchetype, variantId: string) => void;
  onRetake?: (archetypeId: string) => void;
  onGenerateMore?: () => void;
}

export function CharacterArchetypeSelector({
  archetypes,
  loading = false,
  onSelectHero,
  onRetake,
  onGenerateMore,
}: CharacterArchetypeSelectorProps) {
  const [selectedArchetypeId, setSelectedArchetypeId] = useState<string | null>(
    archetypes[0]?.id || null
  );
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<Record<string, number>>({});
  const [heroSelected, setHeroSelected] = useState<string | null>(null);

  const selectedArchetype = archetypes.find((a) => a.id === selectedArchetypeId);
  const selectedVariant = selectedArchetype
    ? selectedArchetype.variants[selectedVariantIndex[selectedArchetypeId || ""] || 0]
    : null;

  const handleRetake = async (archetypeId: string) => {
    if (onRetake) {
      onRetake(archetypeId);
      // Reset variant index after retake
      setSelectedVariantIndex((prev) => ({ ...prev, [archetypeId]: 0 }));
    }
  };

  const handleSelectHero = () => {
    if (selectedArchetype && selectedVariant) {
      onSelectHero(selectedArchetype, selectedVariant.id);
      setHeroSelected(selectedArchetype.id);
    }
  };

  const nextVariant = () => {
    if (!selectedArchetype) return;
    const currentIndex = selectedVariantIndex[selectedArchetypeId || ""] || 0;
    const nextIndex = (currentIndex + 1) % selectedArchetype.variants.length;
    setSelectedVariantIndex((prev) => ({ ...prev, [selectedArchetypeId || ""]: nextIndex }));
  };

  const prevVariant = () => {
    if (!selectedArchetype) return;
    const currentIndex = selectedVariantIndex[selectedArchetypeId || ""] || 0;
    const prevIndex =
      currentIndex === 0 ? selectedArchetype.variants.length - 1 : currentIndex - 1;
    setSelectedVariantIndex((prev) => ({ ...prev, [selectedArchetypeId || ""]: prevIndex }));
  };

  return (
    <div className="space-y-6">
      {/* Main Preview */}
      <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
        <div className="space-y-4">
          {/* Character Preview */}
          {selectedVariant?.imageUrl ? (
            <div className="relative aspect-square bg-gradient-to-b from-slate-800 to-slate-900 rounded-lg overflow-hidden border border-slate-700">
              <img
                src={selectedVariant.imageUrl}
                alt={selectedArchetype?.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              {heroSelected === selectedArchetypeId && (
                <div className="absolute top-4 right-4 bg-cyan-500 text-black px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2">
                  <Check size={16} />
                  Hero Selected
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-square bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700">
              <Loader2 className="animate-spin text-cyan-500" size={32} />
            </div>
          )}

          {/* Variant Navigation */}
          {selectedArchetype && selectedArchetype.variants.length > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={prevVariant}
                className="border-slate-600 hover:bg-slate-800"
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="text-sm text-slate-400">
                {(selectedVariantIndex[selectedArchetypeId || ""] || 0) + 1} /{" "}
                {selectedArchetype.variants.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={nextVariant}
                className="border-slate-600 hover:bg-slate-800"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          )}

          {/* Character Info */}
          {selectedArchetype && (
            <div className="space-y-3">
              <div>
                <h3 className="text-xl font-bold text-white">{selectedArchetype.name}</h3>
                <p className="text-sm text-slate-400">{selectedArchetype.archetypeType}</p>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Description</p>
                  <p className="text-sm text-slate-300">{selectedArchetype.description}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Target Audience</p>
                  <p className="text-sm text-slate-300">{selectedArchetype.targetAudience}</p>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Brand Alignment</p>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                        style={{ width: `${selectedArchetype.brandAlignment}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-cyan-400">
                      {selectedArchetype.brandAlignment}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSelectHero}
                  disabled={heroSelected === selectedArchetypeId}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold"
                >
                  {heroSelected === selectedArchetypeId ? "✓ Hero Selected" : "Select as Hero"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRetake(selectedArchetypeId || "")}
                  className="border-slate-600 hover:bg-slate-800"
                  title="Generate a new image for this character"
                >
                  <RotateCw size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Archetype Grid */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">
          All Archetypes
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {archetypes.map((archetype) => (
            <Card
              key={archetype.id}
              className={`cursor-pointer overflow-hidden border-2 transition-all ${selectedArchetypeId === archetype.id
                ? "border-cyan-500 bg-slate-800"
                : "border-slate-700 hover:border-slate-600 bg-slate-900"
                }`}
              onClick={() => {
                setSelectedArchetypeId(archetype.id);
                if (!selectedVariantIndex[archetype.id]) {
                  setSelectedVariantIndex((prev) => ({ ...prev, [archetype.id]: 0 }));
                }
              }}
            >
              <div className="aspect-square bg-slate-800 relative overflow-hidden">
                {archetype.imageUrl ? (
                  <img
                    src={archetype.imageUrl}
                    alt={archetype.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="animate-spin text-cyan-500" size={20} />
                  </div>
                )}
                {heroSelected === archetype.id && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Check className="text-cyan-400" size={24} />
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="text-xs font-semibold text-white truncate">{archetype.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <Badge variant="secondary" className="text-xs bg-slate-700">
                    {archetype.brandAlignment}%
                  </Badge>
                  <span className="text-xs text-slate-400">{archetype.variants.length}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Generate More Button */}
      {onGenerateMore && (
        <Button
          onClick={onGenerateMore}
          disabled={loading}
          className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600"
          variant="outline"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 animate-spin" size={16} />
              Generating Archetypes...
            </>
          ) : (
            "Generate More Archetypes"
          )}
        </Button>
      )}
    </div>
  );
}
