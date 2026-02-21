import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, RefreshCw, Play, Pause, Settings } from "lucide-react";

export interface AutoCutSuggestion {
  clips: Array<{
    id: string;
    start: number;
    end: number;
    duration: number;
    reason: string;
    confidence: number;
    keyMoments: string[];
  }>;
  totalDuration: number;
  originalDuration: number;
  compressionRatio: number;
  pacing: "slow" | "moderate" | "fast";
  suggestedTitle: string;
  editingNotes: string;
  overallConfidence: number;
}

interface AutoCutPanelProps {
  suggestion: AutoCutSuggestion | null;
  isLoading: boolean;
  onApplyClip: (clipId: string) => void;
  onRejectClip: (clipId: string) => void;
  onApplyAll: () => void;
  onRefine: (feedback: string) => void;
  onPreviewClip: (start: number, end: number) => void;
}

export function AutoCutPanel({
  suggestion,
  isLoading,
  onApplyClip,
  onRejectClip,
  onApplyAll,
  onRefine,
  onPreviewClip,
}: AutoCutPanelProps) {
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [previewingClip, setPreviewingClip] = useState<string | null>(null);

  if (!suggestion) {
    return (
      <Card className="p-6 bg-slate-900 border-slate-700">
        <div className="text-center py-8">
          <p className="text-slate-400 mb-4">No auto-cut suggestion yet</p>
          <p className="text-sm text-slate-500">
            Select a video clip and click "Generate Auto-Cut" to analyze and suggest cuts
          </p>
        </div>
      </Card>
    );
  }

  const selectedClip = suggestion.clips.find((c) => c.id === selectedClipId);

  return (
    <div className="space-y-4 bg-slate-900 rounded-lg p-4">
      {/* Header with Summary */}
      <div className="space-y-3 border-b border-slate-700 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-cyan-400 text-lg">
              {suggestion.suggestedTitle}
            </h3>
            <p className="text-sm text-slate-400 mt-1">{suggestion.editingNotes}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="text-slate-400 hover:text-cyan-400"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-2 text-sm">
          <div className="bg-slate-800 rounded p-2">
            <p className="text-slate-500 text-xs">Original</p>
            <p className="text-cyan-400 font-mono">
              {formatTime(suggestion.originalDuration)}
            </p>
          </div>
          <div className="bg-slate-800 rounded p-2">
            <p className="text-slate-500 text-xs">Suggested</p>
            <p className="text-cyan-400 font-mono">{formatTime(suggestion.totalDuration)}</p>
          </div>
          <div className="bg-slate-800 rounded p-2">
            <p className="text-slate-500 text-xs">Compression</p>
            <p className="text-cyan-400 font-mono">
              {suggestion.compressionRatio.toFixed(2)}x
            </p>
          </div>
          <div className="bg-slate-800 rounded p-2">
            <p className="text-slate-500 text-xs">Confidence</p>
            <p className="text-cyan-400 font-mono">{suggestion.overallConfidence}%</p>
          </div>
        </div>

        {/* Pacing Badge */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Pacing:</span>
          <Badge
            variant={
              suggestion.pacing === "fast"
                ? "destructive"
                : suggestion.pacing === "slow"
                  ? "secondary"
                  : "default"
            }
            className="capitalize"
          >
            {suggestion.pacing}
          </Badge>
        </div>
      </div>

      {/* Tabs for Clips and Settings */}
      <Tabs defaultValue="clips" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-slate-800">
          <TabsTrigger value="clips" className="text-cyan-400">
            Clips ({suggestion.clips.length})
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-cyan-400">
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Clips Tab */}
        <TabsContent value="clips" className="space-y-3 mt-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin">
                <RefreshCw className="w-6 h-6 text-cyan-400" />
              </div>
              <p className="text-slate-400 mt-2">Analyzing video...</p>
            </div>
          ) : (
            <>
              {/* Clips List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {suggestion.clips.map((clip, idx) => (
                  <div
                    key={clip.id}
                    onClick={() => setSelectedClipId(clip.id)}
                    className={`p-3 rounded cursor-pointer transition-colors ${selectedClipId === clip.id
                        ? "bg-cyan-900 border border-cyan-500"
                        : "bg-slate-800 hover:bg-slate-700"
                      }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm text-cyan-400">
                        Clip {idx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <ConfidenceBar confidence={clip.confidence} />
                        <span className="text-xs text-slate-400">{clip.confidence}%</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-300 mb-2">
                      <p className="font-mono">
                        {formatTime(clip.start)} → {formatTime(clip.end)} ({formatTime(clip.duration)})
                      </p>
                      <p className="text-slate-400 mt-1">{clip.reason}</p>
                    </div>

                    {clip.keyMoments.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {clip.keyMoments.slice(0, 2).map((moment, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {moment.split(":")[0]}
                          </Badge>
                        ))}
                        {clip.keyMoments.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{clip.keyMoments.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Selected Clip Details */}
              {selectedClip && (
                <div className="border-t border-slate-700 pt-4 mt-4">
                  <h4 className="font-semibold text-slate-300 mb-3">Clip Details</h4>

                  {/* Timeline Visualization */}
                  <div className="bg-slate-800 rounded p-3 mb-3">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span>{formatTime(selectedClip.start)}</span>
                      <span className="font-mono">{formatTime(selectedClip.duration)}</span>
                      <span>{formatTime(selectedClip.end)}</span>
                    </div>
                    <div className="w-full h-8 bg-slate-700 rounded overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400"
                        style={{
                          width: `${(selectedClip.duration / suggestion.originalDuration) * 100}%`,
                          marginLeft: `${(selectedClip.start / suggestion.originalDuration) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Key Moments */}
                  {selectedClip.keyMoments.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-slate-400 mb-2">Key Moments:</p>
                      <div className="space-y-1">
                        {selectedClip.keyMoments.map((moment, i) => (
                          <p key={i} className="text-xs text-slate-300">
                            • {moment}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Clip Actions */}
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPreviewingClip(
                          previewingClip === selectedClip.id ? null : selectedClip.id
                        );
                        onPreviewClip(selectedClip.start, selectedClip.end);
                      }}
                      className="flex-1 border-cyan-600 text-cyan-400 hover:bg-cyan-900"
                    >
                      {previewingClip === selectedClip.id ? (
                        <>
                          <Pause className="w-3 h-3 mr-1" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 mr-1" />
                          Preview
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onApplyClip(selectedClip.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onRejectClip(selectedClip.id)}
                      className="flex-1"
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              )}

              {/* Apply All Button */}
              <Button
                onClick={onApplyAll}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold"
                disabled={isLoading}
              >
                Apply All Suggested Cuts
              </Button>
            </>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4 mt-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-300 block mb-2">Target Duration (seconds)</label>
              <Slider
                defaultValue={[suggestion.totalDuration]}
                min={10}
                max={suggestion.originalDuration}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-slate-500 mt-1">
                Current: {formatTime(suggestion.totalDuration)}
              </p>
            </div>

            <div>
              <label className="text-sm text-slate-300 block mb-2">Minimum Clip Length (seconds)</label>
              <Slider defaultValue={[1]} min={0.5} max={10} step={0.5} className="w-full" />
            </div>

            <div>
              <label className="text-sm text-slate-300 block mb-2">Maximum Clip Length (seconds)</label>
              <Slider defaultValue={[15]} min={5} max={60} step={1} className="w-full" />
            </div>

            <div>
              <label className="text-sm text-slate-300 block mb-2">Editing Style</label>
              <div className="grid grid-cols-2 gap-2">
                {["Documentary", "Commercial", "Narrative", "Music Video"].map((style) => (
                  <Button
                    key={style}
                    variant="outline"
                    size="sm"
                    className="text-xs border-slate-600 text-slate-300 hover:border-cyan-500 hover:text-cyan-400"
                  >
                    {style}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              onClick={() => onRefine("Settings updated")}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              <RefreshCw className="w-3 h-3 mr-2" />
              Regenerate with New Settings
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Confidence visualization bar
 */
function ConfidenceBar({ confidence }: { confidence: number }) {
  const getColor = (conf: number) => {
    if (conf >= 80) return "bg-green-500";
    if (conf >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="w-12 h-1.5 bg-slate-700 rounded overflow-hidden">
      <div
        className={`h-full transition-all ${getColor(confidence)}`}
        style={{ width: `${confidence}%` }}
      />
    </div>
  );
}

/**
 * Format seconds to MM:SS
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
