import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2 } from "lucide-react";

interface Frame {
  shotNumber: number;
  imageUrl?: string;
  duration: number;
}

interface AnimaticPreviewProps {
  frames: Frame[];
  onFrameDurationChange: (shotNumber: number, duration: number) => void;
  audioUrl?: string;
  audioVolume?: number;
  onAudioVolumeChange?: (volume: number) => void;
  onExport: () => void;
  isExporting?: boolean;
}

export function AnimaticPreview({
  frames,
  onFrameDurationChange,
  audioUrl,
  audioVolume = 100,
  onAudioVolumeChange,
  onExport,
  isExporting = false,
}: AnimaticPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isCinematic, setIsCinematic] = useState(true);

  const totalDuration = frames.reduce((sum, frame) => sum + frame.duration, 0);
  const currentFrame = frames[currentFrameIndex];

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    const newTime = percentage * totalDuration;
    setCurrentTime(newTime);

    // Find which frame we're on
    let time = 0;
    for (let i = 0; i < frames.length; i++) {
      if (time + frames[i].duration >= newTime) {
        setCurrentFrameIndex(i);
        break;
      }
      time += frames[i].duration;
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="text-sm font-semibold text-foreground">Animatic Preview</div>

      {/* Preview Area */}
      <div className="relative group">
        <div className={`bg-black rounded-xl aspect-video flex items-center justify-center overflow-hidden border border-white/10 shadow-2xl transition-all duration-500 ${isCinematic ? 'scale-105 ring-4 ring-primary/20' : ''}`}>
          {currentFrame?.imageUrl ? (
            <div className="relative w-full h-full">
              <img
                src={currentFrame.imageUrl}
                alt={`Frame ${currentFrame.shotNumber}`}
                className="w-full h-full object-cover"
              />
              {/* Cinematic Letterboxing */}
              <div className="absolute top-0 left-0 w-full h-[10%] bg-black/80 backdrop-blur-sm transition-opacity duration-500 opacity-100" />
              <div className="absolute bottom-0 left-0 w-full h-[10%] bg-black/80 backdrop-blur-sm transition-opacity duration-500 opacity-100" />

              <div className="absolute top-4 left-4 flex gap-2">
                <div className="px-3 py-1 bg-primary/20 backdrop-blur-md border border-primary/40 rounded-full text-[10px] font-black text-primary uppercase italic tracking-widest">
                  SHOT {currentFrame.shotNumber}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 opacity-20">
              <div className="w-12 h-px bg-white/20" />
              <div className="text-[10px] font-black uppercase tracking-[0.3em]">Signal Lost</div>
              <div className="w-12 h-px bg-white/20" />
            </div>
          )}
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex gap-2 items-center">
        <Button
          size="sm"
          variant="outline"
          onClick={handlePlayPause}
          className="border-border rounded-full hover:bg-primary/10"
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsCinematic(!isCinematic)}
          className={`text-[10px] font-black uppercase tracking-tighter ${isCinematic ? 'text-primary' : 'text-slate-500'}`}
        >
          Cinematic
        </Button>
        <div className="text-[10px] font-mono text-slate-500">
          {currentFrameIndex + 1} / {frames.length}
        </div>
        <div className="text-[10px] font-mono text-slate-500 ml-auto">
          {currentTime.toFixed(1)}s / {totalDuration.toFixed(1)}s
        </div>
      </div>

      {/* Timeline */}
      <div
        className="bg-input border border-border rounded h-8 cursor-pointer relative overflow-hidden"
        onClick={handleTimelineClick}
      >
        <div className="flex h-full">
          {frames.map((frame, index) => {
            const width = (frame.duration / totalDuration) * 100;
            const isActive = index === currentFrameIndex;
            return (
              <div
                key={index}
                className={`flex-shrink-0 border-r border-border text-xs flex items-center justify-center transition-colors ${isActive ? "bg-accent" : "bg-muted hover:bg-muted/80"
                  }`}
                style={{ width: `${width}%` }}
                title={`Shot ${frame.shotNumber}: ${frame.duration}s`}
              >
                {frame.duration > 1 && <span className="text-foreground/60">{frame.duration}s</span>}
              </div>
            );
          })}
        </div>
        {/* Progress indicator */}
        <div
          className="absolute top-0 left-0 h-full w-1 bg-accent pointer-events-none"
          style={{ left: `${(currentTime / totalDuration) * 100}%` }}
        />
      </div>

      {/* Frame Duration Controls */}
      <div className="space-y-2 max-h-32 overflow-y-auto">
        <div className="text-xs font-semibold text-muted-foreground uppercase">Frame Durations</div>
        {frames.map((frame) => (
          <div key={frame.shotNumber} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-12">Shot {frame.shotNumber}:</span>
            <Slider
              value={[frame.duration]}
              onValueChange={(value) => onFrameDurationChange(frame.shotNumber, value[0])}
              min={0.5}
              max={5}
              step={0.1}
              className="flex-1"
            />
            <span className="text-xs text-foreground w-10 text-right">{frame.duration.toFixed(1)}s</span>
          </div>
        ))}
      </div>

      {/* Audio Controls */}
      {audioUrl && (
        <div className="border-t border-border pt-3 space-y-2">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Audio Volume</span>
            <Slider
              value={[audioVolume]}
              onValueChange={(value) => onAudioVolumeChange?.(value[0])}
              min={0}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-xs text-foreground w-8 text-right">{audioVolume}%</span>
          </div>
        </div>
      )}

      {/* Export Button */}
      <Button
        onClick={onExport}
        disabled={isExporting}
        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-sm"
        size="sm"
      >
        {isExporting ? "Exporting..." : "Export Animatic"}
      </Button>

      {/* Duration Summary */}
      <div className="bg-muted rounded p-2 text-xs text-muted-foreground">
        <div>Total Duration: {Math.round(totalDuration)}s</div>
        <div>Frames: {frames.length}</div>
        {audioUrl && <div>Audio: Included</div>}
      </div>
    </div>
  );
}
