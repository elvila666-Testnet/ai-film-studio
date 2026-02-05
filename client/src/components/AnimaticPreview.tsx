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
      <div className="bg-black rounded aspect-video flex items-center justify-center overflow-hidden border border-border">
        {currentFrame?.imageUrl ? (
          <img
            src={currentFrame.imageUrl}
            alt={`Frame ${currentFrame.shotNumber}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-muted-foreground text-sm">No image for this frame</div>
        )}
      </div>

      {/* Playback Controls */}
      <div className="flex gap-2 items-center">
        <Button
          size="sm"
          variant="outline"
          onClick={handlePlayPause}
          className="border-border"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <div className="text-xs text-muted-foreground">
          {currentFrameIndex + 1} / {frames.length} frames
        </div>
        <div className="text-xs text-muted-foreground ml-auto">
          {Math.round(currentTime)}s / {Math.round(totalDuration)}s
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
                className={`flex-shrink-0 border-r border-border text-xs flex items-center justify-center transition-colors ${
                  isActive ? "bg-accent" : "bg-muted hover:bg-muted/80"
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
