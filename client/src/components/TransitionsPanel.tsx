import React, { useState } from 'react';
import { GitBranch } from 'lucide-react';

interface TransitionsPanelProps {
  clipId: number;
  onTransitionChange: (transition: Transition | null) => void;
}

export interface Transition {
  id: string;
  type: 'crossfade' | 'wipe' | 'slide' | 'fade' | 'dissolve' | 'push' | 'reveal' | 'zoom';
  duration: number; // in milliseconds
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  direction?: 'left' | 'right' | 'up' | 'down';
  parameters?: Record<string, any>;
}

const AVAILABLE_TRANSITIONS: Omit<Transition, 'id' | 'duration' | 'easing'>[] = [
  { type: 'crossfade', parameters: {} },
  { type: 'wipe', direction: 'right', parameters: {} },
  { type: 'slide', direction: 'left', parameters: {} },
  { type: 'fade', parameters: {} },
  { type: 'dissolve', parameters: {} },
  { type: 'push', direction: 'right', parameters: {} },
  { type: 'reveal', direction: 'left', parameters: {} },
  { type: 'zoom', parameters: {} },
];

export const TransitionsPanel: React.FC<TransitionsPanelProps> = ({ clipId, onTransitionChange }) => {
  const [transition, setTransition] = useState<Transition | null>(null);
  const [duration, setDuration] = useState(300);
  const [easing, setEasing] = useState<Transition['easing']>('ease-in-out');
  const [direction, setDirection] = useState<'left' | 'right' | 'up' | 'down'>('right');

  const applyTransition = (template: Omit<Transition, 'id' | 'duration' | 'easing'>) => {
    const newTransition: Transition = {
      id: `transition-${Date.now()}`,
      ...template,
      duration,
      easing,
    };
    setTransition(newTransition);
    onTransitionChange(newTransition);
  };

  const removeTransition = () => {
    setTransition(null);
    onTransitionChange(null);
  };

  const updateTransitionDuration = (newDuration: number) => {
    setDuration(newDuration);
    if (transition) {
      const updated = { ...transition, duration: newDuration };
      setTransition(updated);
      onTransitionChange(updated);
    }
  };

  const updateTransitionEasing = (newEasing: Transition['easing']) => {
    setEasing(newEasing);
    if (transition) {
      const updated = { ...transition, easing: newEasing };
      setTransition(updated);
      onTransitionChange(updated);
    }
  };

  const updateTransitionDirection = (newDirection: 'left' | 'right' | 'up' | 'down') => {
    setDirection(newDirection);
    if (transition) {
      const updated = { ...transition, direction: newDirection };
      setTransition(updated);
      onTransitionChange(updated);
    }
  };

  const getTransitionPreview = (trans: Transition): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      transition: `all ${trans.duration}ms ${trans.easing}`,
    };

    switch (trans.type) {
      case 'crossfade':
        return { ...baseStyle, opacity: 0.5 };
      case 'wipe':
        return { ...baseStyle, clipPath: 'inset(0 50% 0 0)' };
      case 'slide':
        return { ...baseStyle, transform: 'translateX(-50%)' };
      case 'fade':
        return { ...baseStyle, opacity: 0 };
      case 'dissolve':
        return { ...baseStyle, opacity: 0.3 };
      case 'push':
        return { ...baseStyle, transform: 'translateX(100%)' };
      case 'reveal':
        return { ...baseStyle, transform: 'translateX(-100%)' };
      case 'zoom':
        return { ...baseStyle, transform: 'scale(0.5)', opacity: 0 };
      default:
        return baseStyle;
    }
  };

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <GitBranch className="w-5 h-5" />
        <h3 className="font-semibold">Transitions</h3>
      </div>

      {/* Available Transitions */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Select Transition</label>
        <div className="grid grid-cols-2 gap-2">
          {AVAILABLE_TRANSITIONS.map((trans) => (
            <button
              key={trans.type}
              onClick={() => applyTransition(trans)}
              className={`px-3 py-2 rounded text-sm font-medium transition ${
                transition?.type === trans.type
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {trans.type.charAt(0).toUpperCase() + trans.type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Transition Settings */}
      {transition && (
        <>
          {/* Duration */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Duration (ms)</label>
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={duration}
              onChange={(e) => updateTransitionDuration(parseInt(e.target.value))}
              className="w-full"
            />
            <span className="text-xs text-gray-500">{duration}ms</span>
          </div>

          {/* Easing */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Easing</label>
            <select
              value={easing}
              onChange={(e) => updateTransitionEasing(e.target.value as Transition['easing'])}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="linear">Linear</option>
              <option value="ease-in">Ease In</option>
              <option value="ease-out">Ease Out</option>
              <option value="ease-in-out">Ease In Out</option>
            </select>
          </div>

          {/* Direction (for directional transitions) */}
          {['wipe', 'slide', 'push', 'reveal'].includes(transition.type) && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Direction</label>
              <div className="grid grid-cols-4 gap-2">
                {(['left', 'right', 'up', 'down'] as const).map((dir) => (
                  <button
                    key={dir}
                    onClick={() => updateTransitionDirection(dir)}
                    className={`px-3 py-2 rounded text-sm font-medium transition ${
                      direction === dir
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {dir.charAt(0).toUpperCase() + dir.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="mb-4 p-4 bg-gray-50 rounded border border-gray-200">
            <div className="text-xs font-medium mb-2">Preview</div>
            <div className="w-full h-24 bg-gradient-to-r from-blue-400 to-purple-400 rounded overflow-hidden">
              <div
                className="w-full h-full bg-gradient-to-r from-purple-400 to-pink-400"
                style={getTransitionPreview(transition)}
              />
            </div>
          </div>

          {/* Remove Button */}
          <button
            onClick={removeTransition}
            className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded font-medium text-sm transition"
          >
            Remove Transition
          </button>
        </>
      )}

      {!transition && (
        <p className="text-sm text-gray-500 text-center py-4">Select a transition to apply</p>
      )}
    </div>
  );
};
