import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Type definitions
interface Color {
  hex: string;
  rgb: string;
  name: string;
  usage: string;
  psychology: string;
}

interface Font {
  name: string;
  weight: string;
  style: string;
  characteristics: string;
  usage: string;
}

interface Texture {
  name: string;
  description: string;
  material: string;
  roughness: string;
  reflectivity: string;
  usage: string;
  imageUrl?: string;
}

interface VisualReference {
  id: string;
  imageUrl: string;
  description: string;
  colorAnalysis: string;
  composition: string;
  mood: string;
  confidence: number;
}

interface VisualStyleGuide {
  id: string;
  brandId: string;
  brandName: string;
  colorPalette: {
    primary: Color;
    secondary: Color;
    accent: Color;
    neutral: Color[];
    backgroundColors: Color[];
    psychology: string;
  };
  typography: {
    headingFont: Font;
    bodyFont: Font;
    accentFont: Font;
    hierarchy: unknown[];
    spacing: string;
    lineHeight: string;
  };
  textures: Texture[];
  composition: {
    aspectRatios: string[];
    gridSystem: string;
    whitespace: string;
    depthTechniques: string[];
    focusPoints: string;
    balanceStyle: string;
  };
  moodDescription: string;
  visualReferences: VisualReference[];
  generatedAt: Date;
}

interface VisualStyleGuidePreviewProps {
  styleGuide: VisualStyleGuide | null;
  loading?: boolean;
}

export function VisualStyleGuidePreview({
  styleGuide,
  loading: _loading = false,
}: VisualStyleGuidePreviewProps) {
  const [selectedTab, setSelectedTab] = useState("colors");

  if (!styleGuide) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-lg p-6 border border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-2">{styleGuide.brandName || "Style Guide"}</h2>
        <p className="text-slate-400 mb-4">{styleGuide.moodDescription || "No description available"}</p>
        <div className="flex flex-wrap gap-2">
          {styleGuide.composition?.balanceStyle && (
            <Badge className="bg-slate-700">
              {styleGuide.composition.balanceStyle} Balance
            </Badge>
          )}
          {styleGuide.composition?.gridSystem && (
            <Badge className="bg-slate-700">{styleGuide.composition.gridSystem}</Badge>
          )}
          {styleGuide.composition?.aspectRatios && (
            <Badge className="bg-slate-700">
              {styleGuide.composition.aspectRatios.join(", ")}
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-900 border border-slate-700">
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="textures">Textures</TabsTrigger>
          <TabsTrigger value="references">References</TabsTrigger>
        </TabsList>

        {/* Colors Tab */}
        <TabsContent value="colors" className="space-y-4">
          {/* Primary Color */}
          {styleGuide.colorPalette?.primary && (
            <Card className="bg-slate-900 border-slate-700 overflow-hidden">
              <div className="flex">
                <div
                  className="w-24 h-24"
                  style={{ backgroundColor: styleGuide.colorPalette.primary.hex }}
                />
                <div className="flex-1 p-4">
                  <h3 className="font-semibold text-white">Primary</h3>
                  <p className="text-sm text-slate-400">{styleGuide.colorPalette.primary.name}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    {styleGuide.colorPalette.primary.hex}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {styleGuide.colorPalette.primary.psychology}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Secondary Color */}
          {styleGuide.colorPalette?.secondary && (
            <Card className="bg-slate-900 border-slate-700 overflow-hidden">
              <div className="flex">
                <div
                  className="w-24 h-24"
                  style={{ backgroundColor: styleGuide.colorPalette.secondary.hex }}
                />
                <div className="flex-1 p-4">
                  <h3 className="font-semibold text-white">Secondary</h3>
                  <p className="text-sm text-slate-400">{styleGuide.colorPalette.secondary.name}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    {styleGuide.colorPalette.secondary.hex}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {styleGuide.colorPalette.secondary.psychology}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Accent Color */}
          {styleGuide.colorPalette?.accent && (
            <Card className="bg-slate-900 border-slate-700 overflow-hidden">
              <div className="flex">
                <div
                  className="w-24 h-24"
                  style={{ backgroundColor: styleGuide.colorPalette.accent.hex }}
                />
                <div className="flex-1 p-4">
                  <h3 className="font-semibold text-white">Accent</h3>
                  <p className="text-sm text-slate-400">{styleGuide.colorPalette.accent.name}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    {styleGuide.colorPalette.accent.hex}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {styleGuide.colorPalette.accent.psychology}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Neutral Colors */}
          {styleGuide.colorPalette?.neutral && styleGuide.colorPalette.neutral.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">Neutral Palette</h3>
              <div className="grid grid-cols-2 gap-2">
                {styleGuide.colorPalette.neutral.map((color, idx) => (
                  <Card key={idx} className="bg-slate-900 border-slate-700 p-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded"
                        style={{ backgroundColor: color.hex }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{color.name}</p>
                        <p className="text-xs text-slate-500">{color.hex}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Color Psychology */}
          {styleGuide.colorPalette?.psychology && (
            <Card className="bg-slate-900 border-slate-700 p-4">
              <h3 className="font-semibold text-white mb-2">Color Psychology</h3>
              <p className="text-sm text-slate-300">{styleGuide.colorPalette.psychology}</p>
            </Card>
          )}
        </TabsContent>

        {/* Typography Tab */}
        <TabsContent value="typography" className="space-y-4">
          {/* Heading Font */}
          {styleGuide.typography?.headingFont && (
            <Card className="bg-slate-900 border-slate-700 p-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Heading Font
              </h3>
              <div
                className="text-3xl font-bold text-white mb-3"
                style={{
                  fontFamily: styleGuide.typography.headingFont.name,
                  fontWeight: styleGuide.typography.headingFont.weight,
                }}
              >
                The Quick Brown Fox
              </div>
              <div className="space-y-1 text-sm text-slate-400">
                <p>
                  <span className="text-slate-500">Font:</span>{" "}
                  {styleGuide.typography.headingFont.name}
                </p>
                <p>
                  <span className="text-slate-500">Weight:</span>{" "}
                  {styleGuide.typography.headingFont.weight}
                </p>
                <p>
                  <span className="text-slate-500">Characteristics:</span>{" "}
                  {styleGuide.typography.headingFont.characteristics}
                </p>
              </div>
            </Card>
          )}

          {/* Body Font */}
          {styleGuide.typography?.bodyFont && (
            <Card className="bg-slate-900 border-slate-700 p-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Body Font
              </h3>
              <div
                className="text-base text-white mb-3 leading-relaxed"
                style={{ fontFamily: styleGuide.typography.bodyFont.name }}
              >
                The quick brown fox jumps over the lazy dog. This is the body text that will be used
                throughout the design system.
              </div>
              <div className="space-y-1 text-sm text-slate-400">
                <p>
                  <span className="text-slate-500">Font:</span> {styleGuide.typography.bodyFont.name}
                </p>
                <p>
                  <span className="text-slate-500">Weight:</span>{" "}
                  {styleGuide.typography.bodyFont.weight}
                </p>
                <p>
                  <span className="text-slate-500">Line Height:</span>{" "}
                  {styleGuide.typography.lineHeight}
                </p>
              </div>
            </Card>
          )}

          {/* Accent Font */}
          {styleGuide.typography?.accentFont && (
            <Card className="bg-slate-900 border-slate-700 p-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Accent Font
              </h3>
              <div
                className="text-2xl font-bold text-cyan-400 mb-3"
                style={{ fontFamily: styleGuide.typography.accentFont.name }}
              >
                Accent Text
              </div>
              <div className="space-y-1 text-sm text-slate-400">
                <p>
                  <span className="text-slate-500">Font:</span>{" "}
                  {styleGuide.typography.accentFont.name}
                </p>
                <p>
                  <span className="text-slate-500">Weight:</span>{" "}
                  {styleGuide.typography.accentFont.weight}
                </p>
                <p>
                  <span className="text-slate-500">Characteristics:</span>{" "}
                  {styleGuide.typography.accentFont.characteristics}
                </p>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Textures Tab */}
        <TabsContent value="textures" className="space-y-4">
          {styleGuide.textures && styleGuide.textures.length > 0 ? (
            styleGuide.textures.map((texture, idx) => (
              <Card key={idx} className="bg-slate-900 border-slate-700 overflow-hidden">
                {texture.imageUrl && (
                  <div className="w-full h-32 bg-slate-800 overflow-hidden">
                    <img
                      src={texture.imageUrl}
                      alt={texture.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-white mb-2">{texture.name}</h3>
                  <div className="space-y-1 text-sm text-slate-400">
                    <p>
                      <span className="text-slate-500">Description:</span> {texture.description}
                    </p>
                    <p>
                      <span className="text-slate-500">Material:</span> {texture.material}
                    </p>
                    <p>
                      <span className="text-slate-500">Roughness:</span> {texture.roughness}
                    </p>
                    <p>
                      <span className="text-slate-500">Usage:</span> {texture.usage}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="bg-slate-900 border-slate-700 p-4">
              <p className="text-slate-400">No textures defined</p>
            </Card>
          )}
        </TabsContent>

        {/* References Tab */}
        <TabsContent value="references" className="space-y-4">
          {styleGuide.visualReferences && styleGuide.visualReferences.length > 0 ? (
            styleGuide.visualReferences.map((ref) => (
              <Card key={ref.id} className="bg-slate-900 border-slate-700 overflow-hidden">
                <div className="w-full h-48 bg-slate-800 overflow-hidden">
                  <img
                    src={ref.imageUrl}
                    alt={ref.description}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-white mb-2">{ref.description}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Confidence</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-500"
                            style={{ width: `${ref.confidence}%` }}
                          />
                        </div>
                        <span className="text-cyan-400 font-semibold">{ref.confidence}%</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-400">
                      <span className="text-slate-500">Color Analysis:</span> {ref.colorAnalysis}
                    </p>
                    <p className="text-sm text-slate-400">
                      <span className="text-slate-500">Composition:</span> {ref.composition}
                    </p>
                    <p className="text-sm text-slate-400">
                      <span className="text-slate-500">Mood:</span> {ref.mood}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="bg-slate-900 border-slate-700 p-4">
              <p className="text-slate-400">No visual references available</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Composition Guidelines */}
      {styleGuide.composition && (
        <Card className="bg-slate-900 border-slate-700 p-4">
          <h3 className="font-semibold text-white mb-3">Composition Guidelines</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {styleGuide.composition.aspectRatios && (
              <div>
                <p className="text-slate-500 mb-1">Aspect Ratios</p>
                <p className="text-slate-300">{styleGuide.composition.aspectRatios.join(", ")}</p>
              </div>
            )}
            {styleGuide.composition.gridSystem && (
              <div>
                <p className="text-slate-500 mb-1">Grid System</p>
                <p className="text-slate-300">{styleGuide.composition.gridSystem}</p>
              </div>
            )}
            {styleGuide.composition.whitespace && (
              <div>
                <p className="text-slate-500 mb-1">Whitespace</p>
                <p className="text-slate-300">{styleGuide.composition.whitespace}</p>
              </div>
            )}
            {styleGuide.composition.focusPoints && (
              <div>
                <p className="text-slate-500 mb-1">Focus Points</p>
                <p className="text-slate-300">{styleGuide.composition.focusPoints}</p>
              </div>
            )}
            {styleGuide.composition.depthTechniques && (
              <div className="col-span-2">
                <p className="text-slate-500 mb-1">Depth Techniques</p>
                <div className="flex flex-wrap gap-2">
                  {styleGuide.composition.depthTechniques.map((technique, idx) => (
                    <Badge key={idx} className="bg-slate-700">
                      {technique}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
