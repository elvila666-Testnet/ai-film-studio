import { useState } from "react";
import { Button } from "@/components/ui/button";
// Card component available: @/components/ui/card
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Plus, Trash2 } from "lucide-react";

interface Transition {
  id: string;
  type: "crossfade" | "dissolve" | "wipe" | "slide" | "fade" | "zoom";
  duration: number;
  direction?: "left" | "right" | "up" | "down" | "diagonal";
}

interface Effect {
  id: string;
  type:
  | "colorgrade"
  | "blur"
  | "brightness"
  | "saturation"
  | "contrast"
  | "hue"
  | "sharpen";
  intensity: number;
}

interface TransitionsEffectsPanelProps {
  onTransitionAdd?: (transition: Transition) => void;
  onEffectAdd?: (effect: Effect) => void;
  onTransitionRemove?: (id: string) => void;
  onEffectRemove?: (id: string) => void;
}

const TRANSITIONS = [
  { type: "crossfade", name: "Crossfade", description: "Smooth fade between clips" },
  { type: "dissolve", name: "Dissolve", description: "Dissolve transition" },
  { type: "wipe", name: "Wipe", description: "Directional wipe effect" },
  { type: "slide", name: "Slide", description: "Slide in from direction" },
  { type: "fade", name: "Fade", description: "Fade to black" },
  { type: "zoom", name: "Zoom", description: "Zoom transition" },
];

const EFFECTS = [
  { type: "colorgrade", name: "Color Grade", icon: "🎨" },
  { type: "blur", name: "Blur", icon: "🌫️" },
  { type: "brightness", name: "Brightness", icon: "☀️" },
  { type: "saturation", name: "Saturation", icon: "🎭" },
  { type: "contrast", name: "Contrast", icon: "⚫" },
  { type: "hue", name: "Hue Shift", icon: "🌈" },
  { type: "sharpen", name: "Sharpen", icon: "✨" },
];

export function TransitionsEffectsPanel({
  onTransitionAdd,
  onEffectAdd,
  onTransitionRemove,
  onEffectRemove,
}: TransitionsEffectsPanelProps) {
  const [selectedTransition, setSelectedTransition] = useState<string>("crossfade");
  const [transitionDuration, setTransitionDuration] = useState<number>(300);
  const [transitionDirection, setTransitionDirection] = useState<string>("right");
  const [selectedEffect, setSelectedEffect] = useState<string>("colorgrade");
  const [effectIntensity, setEffectIntensity] = useState<number>(50);
  const [appliedTransitions, setAppliedTransitions] = useState<Transition[]>([]);
  const [appliedEffects, setAppliedEffects] = useState<Effect[]>([]);

  const handleAddTransition = () => {
    const transition: Transition = {
      id: `trans-${Date.now()}`,
      type: selectedTransition as Transition["type"],
      duration: transitionDuration,
      direction: transitionDirection as Transition["direction"],
    };
    setAppliedTransitions([...appliedTransitions, transition]);
    onTransitionAdd?.(transition);
  };

  const handleAddEffect = () => {
    const effect: Effect = {
      id: `effect-${Date.now()}`,
      type: selectedEffect as Effect["type"],
      intensity: effectIntensity,
    };
    setAppliedEffects([...appliedEffects, effect]);
    onEffectAdd?.(effect);
  };

  const handleRemoveTransition = (id: string) => {
    setAppliedTransitions(appliedTransitions.filter((t) => t.id !== id));
    onTransitionRemove?.(id);
  };

  const handleRemoveEffect = (id: string) => {
    setAppliedEffects(appliedEffects.filter((e) => e.id !== id));
    onEffectRemove?.(id);
  };

  return (
    <div className="w-full bg-[#2a2a2a] rounded border border-[#404040] flex flex-col overflow-hidden">
      <div className="bg-[#1a1a1a] px-4 py-2 border-b border-[#404040] font-semibold text-sm">
        TRANSITIONS & EFFECTS
      </div>

      <Tabs defaultValue="transitions" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full rounded-none border-b border-[#404040] bg-[#1a1a1a]">
          <TabsTrigger value="transitions" className="flex-1">
            Transitions
          </TabsTrigger>
          <TabsTrigger value="effects" className="flex-1">
            Effects
          </TabsTrigger>
        </TabsList>

        {/* Transitions Tab */}
        <TabsContent value="transitions" className="flex-1 overflow-auto p-4 space-y-4">
          <div className="space-y-3">
            <label className="text-xs font-semibold text-gray-400">Select Transition</label>
            <div className="grid grid-cols-2 gap-2">
              {TRANSITIONS.map((trans) => (
                <button
                  key={trans.type}
                  onClick={() => setSelectedTransition(trans.type)}
                  className={`p-3 rounded text-left text-xs transition-colors ${selectedTransition === trans.type
                      ? "bg-cyan-600 text-white"
                      : "bg-[#3a3a3a] text-gray-300 hover:bg-[#404040]"
                    }`}
                >
                  <div className="font-semibold">{trans.name}</div>
                  <div className="text-xs text-gray-400">{trans.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400">Duration (ms)</label>
            <div className="flex items-center gap-2">
              <Slider
                value={[transitionDuration]}
                onValueChange={(value) => setTransitionDuration(value[0])}
                min={100}
                max={2000}
                step={100}
                className="flex-1"
              />
              <span className="text-xs text-gray-400 w-12">{transitionDuration}ms</span>
            </div>
          </div>

          {(selectedTransition === "wipe" || selectedTransition === "slide") && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400">Direction</label>
              <Select value={transitionDirection} onValueChange={setTransitionDirection}>
                <SelectTrigger className="bg-[#3a3a3a] border-[#404040]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#3a3a3a] border-[#404040]">
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                  <SelectItem value="up">Up</SelectItem>
                  <SelectItem value="down">Down</SelectItem>
                  <SelectItem value="diagonal">Diagonal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            onClick={handleAddTransition}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Transition
          </Button>

          {appliedTransitions.length > 0 && (
            <div className="border-t border-[#404040] pt-4 space-y-2">
              <label className="text-xs font-semibold text-gray-400">Applied Transitions</label>
              {appliedTransitions.map((trans) => (
                <div
                  key={trans.id}
                  className="flex items-center justify-between bg-[#3a3a3a] p-2 rounded text-xs"
                >
                  <div>
                    <div className="font-semibold capitalize">{trans.type}</div>
                    <div className="text-gray-400">{trans.duration}ms</div>
                  </div>
                  <button
                    onClick={() => handleRemoveTransition(trans.id)}
                    className="p-1 hover:bg-red-600 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Effects Tab */}
        <TabsContent value="effects" className="flex-1 overflow-auto p-4 space-y-4">
          <div className="space-y-3">
            <label className="text-xs font-semibold text-gray-400">Select Effect</label>
            <div className="grid grid-cols-2 gap-2">
              {EFFECTS.map((effect) => (
                <button
                  key={effect.type}
                  onClick={() => setSelectedEffect(effect.type)}
                  className={`p-3 rounded text-center text-xs transition-colors ${selectedEffect === effect.type
                      ? "bg-cyan-600 text-white"
                      : "bg-[#3a3a3a] text-gray-300 hover:bg-[#404040]"
                    }`}
                >
                  <div className="text-2xl mb-1">{effect.icon}</div>
                  <div className="font-semibold">{effect.name}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400">Intensity</label>
            <div className="flex items-center gap-2">
              <Slider
                value={[effectIntensity]}
                onValueChange={(value) => setEffectIntensity(value[0])}
                min={0}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="text-xs text-gray-400 w-8">{effectIntensity}%</span>
            </div>
          </div>

          <div className="bg-[#1a1a1a] p-3 rounded border border-[#404040]">
            <div className="text-xs text-gray-400 mb-2">Preview</div>
            <div className="aspect-video bg-[#0a0a0a] rounded flex items-center justify-center">
              <Play className="w-8 h-8 text-gray-500" />
            </div>
          </div>

          <Button
            onClick={handleAddEffect}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Effect
          </Button>

          {appliedEffects.length > 0 && (
            <div className="border-t border-[#404040] pt-4 space-y-2">
              <label className="text-xs font-semibold text-gray-400">Applied Effects</label>
              {appliedEffects.map((effect) => (
                <div
                  key={effect.id}
                  className="flex items-center justify-between bg-[#3a3a3a] p-2 rounded text-xs"
                >
                  <div>
                    <div className="font-semibold capitalize">{effect.type}</div>
                    <div className="text-gray-400">Intensity: {effect.intensity}%</div>
                  </div>
                  <button
                    onClick={() => handleRemoveEffect(effect.id)}
                    className="p-1 hover:bg-red-600 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
