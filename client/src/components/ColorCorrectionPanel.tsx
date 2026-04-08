import React, { useState } from 'react';
import { Palette } from 'lucide-react';

interface ColorCorrectionProps {
  clipId: number;
  onColorCorrectionChange: (correction: ColorCorrection) => void;
}

export interface ColorCorrection {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  temperature: number;
  tint: number;
  shadows: number;
  highlights: number;
  vibrance: number;
}

const DEFAULT_COLOR_CORRECTION: ColorCorrection = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  temperature: 0,
  tint: 0,
  shadows: 0,
  highlights: 0,
  vibrance: 0,
};

export const ColorCorrectionPanel: React.FC<ColorCorrectionProps> = ({ clipId, onColorCorrectionChange }) => {
  const [correction, setCorrection] = useState<ColorCorrection>(DEFAULT_COLOR_CORRECTION);
  const [presetMode, setPresetMode] = useState<'none' | 'warm' | 'cool' | 'vintage' | 'noir'>('none');

  const handleCorrectionChange = (key: keyof ColorCorrection, value: number) => {
    const updated = { ...correction, [key]: value };
    setCorrection(updated);
    onColorCorrectionChange(updated);
  };

  const applyPreset = (preset: 'warm' | 'cool' | 'vintage' | 'noir') => {
    let updated: ColorCorrection;

    switch (preset) {
      case 'warm':
        updated = {
          ...correction,
          temperature: 30,
          saturation: 15,
          brightness: 5,
        };
        break;
      case 'cool':
        updated = {
          ...correction,
          temperature: -30,
          saturation: 10,
          brightness: 0,
        };
        break;
      case 'vintage':
        updated = {
          ...correction,
          saturation: -20,
          contrast: -10,
          temperature: 20,
          highlights: 10,
        };
        break;
      case 'noir':
        updated = {
          ...correction,
          saturation: -100,
          contrast: 20,
          brightness: -5,
          shadows: -10,
        };
        break;
      default:
        updated = correction;
    }

    setCorrection(updated);
    setPresetMode(preset);
    onColorCorrectionChange(updated);
  };

  const resetCorrection = () => {
    setCorrection(DEFAULT_COLOR_CORRECTION);
    setPresetMode('none');
    onColorCorrectionChange(DEFAULT_COLOR_CORRECTION);
  };

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Palette className="w-5 h-5" />
        <h3 className="font-semibold">Color Correction</h3>
      </div>

      {/* Presets */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Presets</label>
        <div className="grid grid-cols-2 gap-2">
          {(['warm', 'cool', 'vintage', 'noir'] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-2 rounded text-sm font-medium transition ${
                presetMode === preset
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {preset.charAt(0).toUpperCase() + preset.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Reset Button */}
      <button
        onClick={resetCorrection}
        className="mt-4 w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded font-medium text-sm transition"
      >
        Reset to Default
      </button>
    </div>
  );
};
