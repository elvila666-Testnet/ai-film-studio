import React, { useState } from 'react';
import { Wand2 } from 'lucide-react';

interface EffectsPanelProps {
  clipId: number;
  onEffectsChange: (effects: Effect[]) => void;
}

export interface Effect {
  id: string;
  name: string;
  type: 'blur' | 'glow' | 'sepia' | 'grayscale' | 'invert' | 'pixelate' | 'vignette' | 'chromakey';
  intensity: number;
  enabled: boolean;
  parameters?: Record<string, any>;
}

const AVAILABLE_EFFECTS: Omit<Effect, 'id' | 'enabled' | 'intensity'>[] = [
  { name: 'Blur', type: 'blur', parameters: {} },
  { name: 'Glow', type: 'glow', parameters: {} },
  { name: 'Sepia', type: 'sepia', parameters: {} },
  { name: 'Grayscale', type: 'grayscale', parameters: {} },
  { name: 'Invert', type: 'invert', parameters: {} },
  { name: 'Pixelate', type: 'pixelate', parameters: {} },
  { name: 'Vignette', type: 'vignette', parameters: {} },
  { name: 'Chroma Key', type: 'chromakey', parameters: { keyColor: '#00ff00' } },
];

export const EffectsPanel: React.FC<EffectsPanelProps> = ({ clipId, onEffectsChange }) => {
  const [effects, setEffects] = useState<Effect[]>([]);
  const [selectedEffect, setSelectedEffect] = useState<string | null>(null);

  const addEffect = (effectTemplate: Omit<Effect, 'id' | 'enabled' | 'intensity'>) => {
    const newEffect: Effect = {
      id: `effect-${Date.now()}`,
      ...effectTemplate,
      enabled: true,
      intensity: 50,
    };
    const updated = [...effects, newEffect];
    setEffects(updated);
    onEffectsChange(updated);
  };

  const removeEffect = (effectId: string) => {
    const updated = effects.filter((e) => e.id !== effectId);
    setEffects(updated);
    onEffectsChange(updated);
  };

  const updateEffect = (effectId: string, updates: Partial<Effect>) => {
    const updated = effects.map((e) => (e.id === effectId ? { ...e, ...updates } : e));
    setEffects(updated);
    onEffectsChange(updated);
  };

  const toggleEffect = (effectId: string) => {
    const updated = effects.map((e) =>
      e.id === effectId ? { ...e, enabled: !e.enabled } : e
    );
    setEffects(updated);
    onEffectsChange(updated);
  };

  const getEffectPreview = (effect: Effect): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {};

    if (!effect.enabled) return baseStyle;

    const intensity = effect.intensity / 100;

    switch (effect.type) {
      case 'blur':
        return { filter: `blur(${intensity * 10}px)` };
      case 'glow':
        return { filter: `drop-shadow(0 0 ${intensity * 20}px rgba(255, 255, 255, 0.8))` };
      case 'sepia':
        return { filter: `sepia(${intensity})` };
      case 'grayscale':
        return { filter: `grayscale(${intensity})` };
      case 'invert':
        return { filter: `invert(${intensity})` };
      case 'pixelate':
        return { filter: `url(#pixelate)` };
      case 'vignette':
        return {
          boxShadow: `inset 0 0 ${intensity * 100}px rgba(0, 0, 0, ${intensity * 0.8})`,
        };
      default:
        return baseStyle;
    }
  };

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Wand2 className="w-5 h-5" />
        <h3 className="font-semibold">Effects</h3>
      </div>

      {/* Available Effects */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Add Effect</label>
        <div className="grid grid-cols-2 gap-2">
          {AVAILABLE_EFFECTS.map((effect) => (
            <button
              key={effect.type}
              onClick={() => addEffect(effect)}
              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition"
            >
              + {effect.name}
            </button>
          ))}
        </div>
      </div>

      {/* Applied Effects */}
      <div className="space-y-3">
        {effects.length === 0 ? (
          <p className="text-sm text-gray-500">No effects applied</p>
        ) : (
          effects.map((effect) => (
            <div key={effect.id} className="p-3 bg-gray-50 rounded border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={effect.enabled}
                    onChange={() => toggleEffect(effect.id)}
                    className="w-4 h-4"
                  />
                  <span className="font-medium text-sm">{effect.name}</span>
                </div>
                <button
                  onClick={() => removeEffect(effect.id)}
                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  Remove
                </button>
              </div>

              <div className="mb-2">
                <label className="text-xs font-medium">Intensity</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={effect.intensity}
                  onChange={(e) =>
                    updateEffect(effect.id, { intensity: parseInt(e.target.value) })
                  }
                  className="w-full"
                />
                <span className="text-xs text-gray-500">{effect.intensity}%</span>
              </div>

              {/* Preview */}
              <div
                className="w-full h-12 bg-gradient-to-r from-blue-400 to-purple-400 rounded"
                style={getEffectPreview(effect)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
