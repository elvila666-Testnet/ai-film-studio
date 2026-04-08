import React, { useState } from 'react';
import { Type, AlignLeft, AlignCenter, AlignRight, Copy } from 'lucide-react';

interface TextOverlayProps {
  clipId: number;
  onTextChange: (text: string, properties: TextProperties) => void;
}

export interface TextProperties {
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor: string;
  opacity: number;
  alignment: 'left' | 'center' | 'right';
  x: number;
  y: number;
  duration: number;
}

const DEFAULT_TEXT_PROPERTIES: TextProperties = {
  text: 'Add text here',
  fontSize: 24,
  fontFamily: 'Arial',
  color: '#ffffff',
  backgroundColor: '#000000',
  opacity: 1,
  alignment: 'center',
  x: 50,
  y: 50,
  duration: 5000,
};

export const TextOverlayPanel: React.FC<TextOverlayProps> = ({ clipId, onTextChange }) => {
  const [properties, setProperties] = useState<TextProperties>(DEFAULT_TEXT_PROPERTIES);
  const [previewMode, setPreviewMode] = useState(false);

  const handlePropertyChange = (key: keyof TextProperties, value: any) => {
    const updated = { ...properties, [key]: value };
    setProperties(updated);
    onTextChange(updated.text, updated);
  };

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Type className="w-5 h-5" />
        <h3 className="font-semibold">Text Overlay</h3>
      </div>

      {/* Text Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Text Content</label>
        <textarea
          value={properties.text}
          onChange={(e) => handlePropertyChange('text', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          rows={3}
        />
      </div>

      {/* Font Settings */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-2">Font Size</label>
          <input
            type="range"
            min="8"
            max="72"
            value={properties.fontSize}
            onChange={(e) => handlePropertyChange('fontSize', parseInt(e.target.value))}
            className="w-full"
          />
          <span className="text-xs text-gray-500">{properties.fontSize}px</span>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Font Family</label>
          <select
            value={properties.fontFamily}
            onChange={(e) => handlePropertyChange('fontFamily', e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          >
            <option>Arial</option>
            <option>Helvetica</option>
            <option>Times New Roman</option>
            <option>Courier New</option>
            <option>Georgia</option>
          </select>
        </div>
      </div>

      {/* Color Settings */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-2">Text Color</label>
          <input
            type="color"
            value={properties.color}
            onChange={(e) => handlePropertyChange('color', e.target.value)}
            className="w-full h-10 border border-gray-300 rounded cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Background Color</label>
          <input
            type="color"
            value={properties.backgroundColor}
            onChange={(e) => handlePropertyChange('backgroundColor', e.target.value)}
            className="w-full h-10 border border-gray-300 rounded cursor-pointer"
          />
        </div>
      </div>

      {/* Opacity */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Opacity</label>
        <input
          type="range"
          min="0"
          max="100"
          value={properties.opacity * 100}
          onChange={(e) => handlePropertyChange('opacity', parseInt(e.target.value) / 100)}
          className="w-full"
        />
        <span className="text-xs text-gray-500">{Math.round(properties.opacity * 100)}%</span>
      </div>

      {/* Alignment */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Alignment</label>
        <div className="flex gap-2">
          <button
            onClick={() => handlePropertyChange('alignment', 'left')}
            className={`p-2 rounded ${properties.alignment === 'left' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => handlePropertyChange('alignment', 'center')}
            className={`p-2 rounded ${properties.alignment === 'center' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            onClick={() => handlePropertyChange('alignment', 'right')}
            className={`p-2 rounded ${properties.alignment === 'right' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            <AlignRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Position */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-2">X Position (%)</label>
          <input
            type="range"
            min="0"
            max="100"
            value={properties.x}
            onChange={(e) => handlePropertyChange('x', parseInt(e.target.value))}
            className="w-full"
          />
          <span className="text-xs text-gray-500">{properties.x}%</span>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Y Position (%)</label>
          <input
            type="range"
            min="0"
            max="100"
            value={properties.y}
            onChange={(e) => handlePropertyChange('y', parseInt(e.target.value))}
            className="w-full"
          />
          <span className="text-xs text-gray-500">{properties.y}%</span>
        </div>
      </div>

      {/* Duration */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Duration (ms)</label>
        <input
          type="number"
          value={properties.duration}
          onChange={(e) => handlePropertyChange('duration', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
        />
      </div>

      {/* Preview */}
      <div className="p-4 bg-gray-100 rounded mb-4 relative h-32 overflow-hidden">
        <div
          style={{
            position: 'absolute',
            left: `${properties.x}%`,
            top: `${properties.y}%`,
            fontSize: `${properties.fontSize}px`,
            fontFamily: properties.fontFamily,
            color: properties.color,
            backgroundColor: properties.backgroundColor,
            opacity: properties.opacity,
            textAlign: properties.alignment,
            padding: '8px',
            borderRadius: '4px',
          }}
        >
          {properties.text}
        </div>
      </div>
    </div>
  );
};
