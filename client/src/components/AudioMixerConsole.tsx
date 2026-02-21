import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Volume2 } from "lucide-react";

interface AudioTrack {
  id: string;
  name: string;
  volume: number; // dB
  pan: number; // -100 to 100
  muted: boolean;
  solo: boolean;
  level: number; // 0-100 for visualization
}

interface AudioMixerConsoleProps {
  tracks?: AudioTrack[];
  onVolumeChange?: (trackId: string, volume: number) => void;
  onPanChange?: (trackId: string, pan: number) => void;
  onMuteToggle?: (trackId: string) => void;
  onSoloToggle?: (trackId: string) => void;
  onTrackRemove?: (trackId: string) => void;
}

const DEFAULT_TRACKS: AudioTrack[] = [
  { id: "voiceover", name: "Voiceover", volume: 0, pan: 0, muted: false, solo: false, level: 65 },
  { id: "music", name: "Music", volume: -6, pan: 0, muted: false, solo: false, level: 45 },
  { id: "sfx", name: "Sound Effects", volume: -3, pan: 0, muted: false, solo: false, level: 55 },
];

export function AudioMixerConsole({
  tracks = DEFAULT_TRACKS,
  onVolumeChange,
  onPanChange,
  onMuteToggle,
  onSoloToggle,
  onTrackRemove: _onTrackRemove,
}: AudioMixerConsoleProps) {
  const [selectedTrack, setSelectedTrack] = useState<string>(tracks[0]?.id || "");
  const [eqMode, setEqMode] = useState<"voiceover" | "music" | "sfx">("music");
  const [localTracks, setLocalTracks] = useState<AudioTrack[]>(tracks);

  const currentTrack = localTracks.find((t) => t.id === selectedTrack);

  const handleVolumeChange = (trackId: string, volume: number) => {
    setLocalTracks(localTracks.map((t) => (t.id === trackId ? { ...t, volume } : t)));
    onVolumeChange?.(trackId, volume);
  };

  const handlePanChange = (trackId: string, pan: number) => {
    setLocalTracks(localTracks.map((t) => (t.id === trackId ? { ...t, pan } : t)));
    onPanChange?.(trackId, pan);
  };

  const handleMuteToggle = (trackId: string) => {
    setLocalTracks(
      localTracks.map((t) => (t.id === trackId ? { ...t, muted: !t.muted } : t))
    );
    onMuteToggle?.(trackId);
  };

  const handleSoloToggle = (trackId: string) => {
    setLocalTracks(
      localTracks.map((t) => (t.id === trackId ? { ...t, solo: !t.solo } : t))
    );
    onSoloToggle?.(trackId);
  };

  return (
    <div className="w-full bg-[#2a2a2a] rounded border border-[#404040] flex flex-col overflow-hidden">
      <div className="bg-[#1a1a1a] px-4 py-2 border-b border-[#404040] font-semibold text-sm flex items-center gap-2">
        <Volume2 className="w-4 h-4" />
        AUDIO MIXER
      </div>

      <Tabs defaultValue="mixer" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full rounded-none border-b border-[#404040] bg-[#1a1a1a]">
          <TabsTrigger value="mixer" className="flex-1">
            Mixer
          </TabsTrigger>
          <TabsTrigger value="eq" className="flex-1">
            EQ
          </TabsTrigger>
          <TabsTrigger value="compression" className="flex-1">
            Compression
          </TabsTrigger>
        </TabsList>

        {/* Mixer Tab */}
        <TabsContent value="mixer" className="flex-1 overflow-auto p-4">
          <div className="space-y-4">
            {/* Track Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400">SELECT TRACK</label>
              <div className="grid grid-cols-3 gap-2">
                {localTracks.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => setSelectedTrack(track.id)}
                    className={`p-2 rounded text-xs font-semibold transition-colors ${selectedTrack === track.id
                        ? "bg-cyan-600 text-white"
                        : "bg-[#3a3a3a] text-gray-300 hover:bg-[#404040]"
                      }`}
                  >
                    {track.name}
                  </button>
                ))}
              </div>
            </div>

            {currentTrack && (
              <div className="border-t border-[#404040] pt-4 space-y-4">
                {/* Volume Control */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-400">Volume</label>
                    <span className="text-xs text-cyan-400 font-mono">{currentTrack.volume.toFixed(1)} dB</span>
                  </div>
                  <Slider
                    value={[currentTrack.volume]}
                    onValueChange={(value) =>
                      handleVolumeChange(currentTrack.id, value[0])
                    }
                    min={-96}
                    max={12}
                    step={0.1}
                    className="w-full"
                  />
                  {/* Level Meter */}
                  <div className="h-2 bg-[#1a1a1a] rounded overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all"
                      style={{ width: `${currentTrack.level}%` }}
                    />
                  </div>
                </div>

                {/* Pan Control */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-400">Pan</label>
                    <span className="text-xs text-cyan-400 font-mono">
                      {currentTrack.pan > 0 ? `R${currentTrack.pan}` : currentTrack.pan < 0 ? `L${Math.abs(currentTrack.pan)}` : "C"}
                    </span>
                  </div>
                  <Slider
                    value={[currentTrack.pan]}
                    onValueChange={(value) =>
                      handlePanChange(currentTrack.id, value[0])
                    }
                    min={-100}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* Mute / Solo Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleMuteToggle(currentTrack.id)}
                    variant={currentTrack.muted ? "default" : "outline"}
                    size="sm"
                    className={`flex-1 ${currentTrack.muted ? "bg-red-600 hover:bg-red-700" : ""
                      }`}
                  >
                    {currentTrack.muted ? "Muted" : "Mute"}
                  </Button>
                  <Button
                    onClick={() => handleSoloToggle(currentTrack.id)}
                    variant={currentTrack.solo ? "default" : "outline"}
                    size="sm"
                    className={`flex-1 ${currentTrack.solo ? "bg-yellow-600 hover:bg-yellow-700" : ""
                      }`}
                  >
                    {currentTrack.solo ? "Solo On" : "Solo"}
                  </Button>
                </div>
              </div>
            )}

            {/* All Tracks Overview */}
            <div className="border-t border-[#404040] pt-4 space-y-2">
              <label className="text-xs font-semibold text-gray-400">TRACK LEVELS</label>
              {localTracks.map((track) => (
                <div
                  key={track.id}
                  className={`p-2 rounded bg-[#3a3a3a] text-xs ${track.muted ? "opacity-50" : ""
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold">{track.name}</span>
                    <span className="text-gray-400">{track.volume.toFixed(1)} dB</span>
                  </div>
                  <div className="h-1.5 bg-[#1a1a1a] rounded overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                      style={{ width: `${track.level}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* EQ Tab */}
        <TabsContent value="eq" className="flex-1 overflow-auto p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400">EQ PRESET</label>
            <Select value={eqMode} onValueChange={(value: unknown) => setEqMode(value)}>
              <SelectTrigger className="bg-[#3a3a3a] border-[#404040]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#3a3a3a] border-[#404040]">
                <SelectItem value="voiceover">Voiceover</SelectItem>
                <SelectItem value="music">Music</SelectItem>
                <SelectItem value="sfx">Sound Effects</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* EQ Bands */}
          <div className="space-y-3">
            {[
              { freq: "80 Hz", label: "Low Cut" },
              { freq: "250 Hz", label: "Low Mid" },
              { freq: "2 kHz", label: "Mid" },
              { freq: "12 kHz", label: "High Shelf" },
            ].map((band, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-400">{band.label}</label>
                  <span className="text-xs text-cyan-400">{band.freq}</span>
                </div>
                <Slider
                  defaultValue={[0]}
                  min={-12}
                  max={12}
                  step={0.1}
                  className="w-full"
                />
              </div>
            ))}
          </div>

          {/* EQ Visualization */}
          <div className="bg-[#1a1a1a] p-3 rounded border border-[#404040] h-32 flex items-center justify-center">
            <div className="text-xs text-gray-500">EQ Curve Visualization</div>
          </div>
        </TabsContent>

        {/* Compression Tab */}
        <TabsContent value="compression" className="flex-1 overflow-auto p-4 space-y-4">
          <div className="space-y-3">
            {[
              { label: "Threshold", value: -18, min: -60, max: 0, unit: "dB" },
              { label: "Ratio", value: 3, min: 1, max: 20, unit: ":1" },
              { label: "Attack", value: 8, min: 0.1, max: 100, unit: "ms" },
              { label: "Release", value: 80, min: 10, max: 1000, unit: "ms" },
              { label: "Makeup Gain", value: 3, min: 0, max: 24, unit: "dB" },
            ].map((param, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-400">{param.label}</label>
                  <span className="text-xs text-cyan-400 font-mono">
                    {param.value}{param.unit}
                  </span>
                </div>
                <Slider
                  defaultValue={[param.value]}
                  min={param.min}
                  max={param.max}
                  step={0.1}
                  className="w-full"
                />
              </div>
            ))}
          </div>

          {/* Compression Visualization */}
          <div className="bg-[#1a1a1a] p-3 rounded border border-[#404040] h-32 flex items-center justify-center">
            <div className="text-xs text-gray-500">Compression Graph</div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
