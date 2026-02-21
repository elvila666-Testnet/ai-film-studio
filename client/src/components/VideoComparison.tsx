import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Volume2, VolumeX } from "lucide-react";

interface VideoComparisonProps {
  shotNumber: number;
  frameDescriptor: {
    composition: string;
    cameraLanguage: string;
    mood: string;
    duration: number;
  };
  flow: {
    status: string;
    videoUrl: string;
    processingTime: number;
    error?: string;
  };
  sora: {
    status: string;
    videoUrl: string;
    processingTime: number;
    error?: string;
  };
  comparison: {
    recommendation: "flow" | "sora" | "both" | "neither";
    reasoning: string;
    flowScore: number;
    soraScore: number;
  };
  onSelect?: (type: "flow" | "sora") => void;
}

export function VideoComparison({
  shotNumber,
  frameDescriptor,
  flow,
  sora,
  comparison,
  onSelect,
}: VideoComparisonProps) {
  const [, setPlayingFlow] = useState(false);
  const [, setPlayingSora] = useState(false);
  const [muteFlow, setMuteFlow] = useState(false);
  const [muteSora, setMuteSora] = useState(false);

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case "flow":
        return "bg-blue-500";
      case "sora":
        return "bg-purple-500";
      case "both":
        return "bg-green-500";
      default:
        return "bg-red-500";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Shot {shotNumber} - Auto-Bambos Comparison</CardTitle>
            <CardDescription>
              {frameDescriptor.composition} • {frameDescriptor.cameraLanguage}
            </CardDescription>
          </div>
          <Badge className={getRecommendationColor(comparison.recommendation)}>
            {comparison.recommendation.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Frame Descriptor Info */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
          <div>
            <p className="text-sm font-semibold text-slate-600">Mood</p>
            <p className="text-sm text-slate-900">{frameDescriptor.mood}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-600">Duration</p>
            <p className="text-sm text-slate-900">{frameDescriptor.duration}s</p>
          </div>
        </div>

        {/* Comparison Reasoning */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm font-semibold text-blue-900 mb-2">Recommendation Reasoning</p>
          <p className="text-sm text-blue-800">{comparison.reasoning}</p>
        </div>

        {/* Video Comparison Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Flow Video */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Flow</h3>
              <Badge className={getStatusColor(flow.status)}>
                {flow.status}
              </Badge>
            </div>

            {flow.status === "success" ? (
              <div className="space-y-2">
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                  <video
                    src={flow.videoUrl}
                    className="w-full h-full object-cover"
                    controls
                    onPlay={() => setPlayingFlow(true)}
                    onPause={() => setPlayingFlow(false)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setMuteFlow(!muteFlow)}
                  >
                    {muteFlow ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-blue-500 hover:bg-blue-600"
                    onClick={() => onSelect?.("flow")}
                  >
                    Select Flow
                  </Button>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <p>Processing: {flow.processingTime}ms</p>
                  <p>Score: {comparison.flowScore}</p>
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-red-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <p className="text-sm font-semibold text-red-900">Generation Failed</p>
                  <p className="text-xs text-red-700 mt-1">{flow.error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Sora Video */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Sora</h3>
              <Badge className={getStatusColor(sora.status)}>
                {sora.status}
              </Badge>
            </div>

            {sora.status === "success" ? (
              <div className="space-y-2">
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                  <video
                    src={sora.videoUrl}
                    className="w-full h-full object-cover"
                    controls
                    onPlay={() => setPlayingSora(true)}
                    onPause={() => setPlayingSora(false)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setMuteSora(!muteSora)}
                  >
                    {muteSora ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-purple-500 hover:bg-purple-600"
                    onClick={() => onSelect?.("sora")}
                  >
                    Select Sora
                  </Button>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <p>Processing: {sora.processingTime}ms</p>
                  <p>Score: {comparison.soraScore}</p>
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-red-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <p className="text-sm font-semibold text-red-900">Generation Failed</p>
                  <p className="text-xs text-red-700 mt-1">{sora.error}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Score Comparison */}
        <div className="space-y-2">
          <p className="text-sm font-semibold">Score Comparison</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium w-12">Flow</span>
              <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-full"
                  style={{ width: `${(comparison.flowScore / 100) * 100}%` }}
                />
              </div>
              <span className="text-xs font-semibold w-12 text-right">
                {comparison.flowScore}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium w-12">Sora</span>
              <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-purple-500 h-full"
                  style={{ width: `${(comparison.soraScore / 100) * 100}%` }}
                />
              </div>
              <span className="text-xs font-semibold w-12 text-right">
                {comparison.soraScore}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
