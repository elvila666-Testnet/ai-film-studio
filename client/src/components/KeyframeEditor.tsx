import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface KeyframeEditorProps {
  clipId: number;
  clipDuration: number;
  onKeyframesChange: (keyframes: Keyframe[]) => void;
}

export interface Keyframe {
  id: string;
  time: number; // in milliseconds
  property: 'opacity' | 'scale' | 'rotation' | 'x' | 'y' | 'volume';
  value: number;
}

export const KeyframeEditor: React.FC<KeyframeEditorProps> = ({
  clipId,
  clipDuration,
  onKeyframesChange,
}) => {
  const [keyframes, setKeyframes] = useState<Keyframe[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Keyframe['property']>('opacity');
  const [currentTime, setCurrentTime] = useState(0);
  const [currentValue, setCurrentValue] = useState(100);

  const properties: Keyframe['property'][] = ['opacity', 'scale', 'rotation', 'x', 'y', 'volume'];

  const addKeyframe = () => {
    const newKeyframe: Keyframe = {
      id: `kf-${Date.now()}`,
      time: currentTime,
      property: selectedProperty,
      value: currentValue,
    };

    const updated = [...keyframes, newKeyframe].sort((a, b) => a.time - b.time);
    setKeyframes(updated);
    onKeyframesChange(updated);
  };

  const removeKeyframe = (keyframeId: string) => {
    const updated = keyframes.filter((kf) => kf.id !== keyframeId);
    setKeyframes(updated);
    onKeyframesChange(updated);
  };

  const updateKeyframe = (keyframeId: string, updates: Partial<Keyframe>) => {
    const updated = keyframes
      .map((kf) => (kf.id === keyframeId ? { ...kf, ...updates } : kf))
      .sort((a, b) => a.time - b.time);
    setKeyframes(updated);
    onKeyframesChange(updated);
  };

  const getPropertyRange = (property: Keyframe['property']) => {
    switch (property) {
      case 'opacity':
      case 'volume':
        return { min: 0, max: 100 };
      case 'scale':
        return { min: 0, max: 200 };
      case 'rotation':
        return { min: -360, max: 360 };
      case 'x':
      case 'y':
        return { min: -100, max: 100 };
      default:
        return { min: 0, max: 100 };
    }
  };

  const getPropertyUnit = (property: Keyframe['property']) => {
    switch (property) {
      case 'opacity':
      case 'volume':
        return '%';
      case 'scale':
        return '%';
      case 'rotation':
        return '°';
      case 'x':
      case 'y':
        return 'px';
      default:
        return '';
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = ms % 1000;
    return `${seconds}.${String(milliseconds).padStart(3, '0')}s`;
  };

  const range = getPropertyRange(selectedProperty);

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="font-semibold mb-4">Keyframe Editor</h3>

      {/* Property Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Property</label>
        <select
          value={selectedProperty}
          onChange={(e) => setSelectedProperty(e.target.value as Keyframe['property'])}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
        >
          {properties.map((prop) => (
            <option key={prop} value={prop}>
              {prop.charAt(0).toUpperCase() + prop.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Time and Value Input */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-2">Time (ms)</label>
          <input
            type="range"
            min="0"
            max={clipDuration}
            value={currentTime}
            onChange={(e) => setCurrentTime(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-gray-500 mt-1">{formatTime(currentTime)}</div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Value ({getPropertyUnit(selectedProperty)})
          </label>
          <input
            type="range"
            min={range.min}
            max={range.max}
            value={currentValue}
            onChange={(e) => setCurrentValue(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-gray-500 mt-1">
            {currentValue}
            {getPropertyUnit(selectedProperty)}
          </div>
        </div>
      </div>

      {/* Add Keyframe Button */}
      <button
        onClick={addKeyframe}
        className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium text-sm transition flex items-center justify-center gap-2 mb-4"
      >
        <Plus className="w-4 h-4" />
        Add Keyframe
      </button>

      {/* Keyframes List */}
      <div className="space-y-2">
        {keyframes.length === 0 ? (
          <p className="text-sm text-gray-500">No keyframes added</p>
        ) : (
          keyframes.map((kf) => (
            <div
              key={kf.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200"
            >
              <div className="flex-1">
                <div className="font-medium text-sm">
                  {kf.property.charAt(0).toUpperCase() + kf.property.slice(1)}
                </div>
                <div className="text-xs text-gray-500">
                  {formatTime(kf.time)} → {kf.value}
                  {getPropertyUnit(kf.property)}
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="range"
                  min={range.min}
                  max={range.max}
                  value={kf.value}
                  onChange={(e) =>
                    updateKeyframe(kf.id, { value: parseInt(e.target.value) })
                  }
                  className="w-20"
                />
                <button
                  onClick={() => removeKeyframe(kf.id)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Timeline Visualization */}
      <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
        <div className="text-xs font-medium mb-2">Timeline</div>
        <div className="w-full h-8 bg-gray-200 rounded relative">
          {keyframes.map((kf) => (
            <div
              key={kf.id}
              className="absolute top-0 w-1 h-full bg-blue-500 rounded"
              style={{ left: `${(kf.time / clipDuration) * 100}%` }}
              title={`${kf.property} at ${formatTime(kf.time)}`}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0s</span>
          <span>{formatTime(clipDuration)}</span>
        </div>
      </div>
    </div>
  );
};
