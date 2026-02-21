import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Pause, Star, ThumbsUp, Copy, Download } from "lucide-react";

interface VideoComparisonTabProps {
  projectId: number;
}

interface VideoOutput {
  id: string;
  provider: "veo3" | "sora";
  shotNumber: number;
  videoUrl: string;
  duration: number;
  resolution: "720p" | "1080p" | "4k";
  generatedAt: string;
  cost: number;
  quality: number; // 1-10 scale
  motion: number; // 1-10 scale
  consistency: number; // 1-10 scale
  userRating?: number;
  selected: boolean;
}

const mockVideos: VideoOutput[] = [
  {
    id: "veo3-1",
    provider: "veo3",
    shotNumber: 1,
    videoUrl: "https://example.com/veo3-shot1.mp4",
    duration: 4,
    resolution: "1080p",
    generatedAt: "2026-01-30T12:00:00Z",
    cost: 0.6,
    quality: 8,
    motion: 7,
    consistency: 9,
    selected: false,
  },
  {
    id: "sora-1",
    provider: "sora",
    shotNumber: 1,
    videoUrl: "https://example.com/sora-shot1.mp4",
    duration: 4,
    resolution: "1080p",
    generatedAt: "2026-01-30T12:05:00Z",
    cost: 0.72,
    quality: 9,
    motion: 9,
    consistency: 8,
    selected: false,
  },
];

export default function VideoComparisonTab({ projectId: _projectId }: VideoComparisonTabProps) {
  const [videos, setVideos] = useState<VideoOutput[]>(mockVideos);
  const [selectedShot, setSelectedShot] = useState("1");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"quality" | "cost" | "consistency">("quality");

  const shotNumbers = Array.from(new Set(videos.map((v) => v.shotNumber))).sort();
  const shotsForComparison = videos.filter((v) => v.shotNumber === parseInt(selectedShot));

  const sortedVideos = [...shotsForComparison].sort((a, b) => {
    if (sortBy === "quality") return b.quality - a.quality;
    if (sortBy === "cost") return a.cost - b.cost;
    if (sortBy === "consistency") return b.consistency - a.consistency;
    return 0;
  });

  const handleSelectVideo = (videoId: string) => {
    setVideos(
      videos.map((v) =>
        v.id === videoId
          ? { ...v, selected: !v.selected }
          : { ...v, selected: false }
      )
    );
  };

  const handleRateVideo = (videoId: string, rating: number) => {
    setVideos(
      videos.map((v) => (v.id === videoId ? { ...v, userRating: rating } : v))
    );
  };

  const selectedVideos = videos.filter((v) => v.selected);

  return (
    <div className="space-y-6">
      {/* Shot Selection */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Select Shot to Compare</CardTitle>
          <CardDescription>View and compare video outputs from different providers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {shotNumbers.map((shot) => (
              <Button
                key={shot}
                onClick={() => setSelectedShot(shot.toString())}
                variant={selectedShot === shot.toString() ? "default" : "outline"}
                className={
                  selectedShot === shot.toString()
                    ? "bg-accent text-accent-foreground"
                    : "border-border"
                }
              >
                Shot {shot}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sort Options */}
      <div className="flex gap-2">
        <Select value={sortBy} onValueChange={(v: unknown) => setSortBy(v)}>
          <SelectTrigger className="w-48 bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="quality">Sort by Quality</SelectItem>
            <SelectItem value="cost">Sort by Cost</SelectItem>
            <SelectItem value="consistency">Sort by Consistency</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Video Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedVideos.map((video) => (
          <Card
            key={video.id}
            className={`border-2 overflow-hidden transition-colors ${video.selected
                ? "border-accent bg-accent/5"
                : "border-border bg-card"
              }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">
                    {video.provider === "veo3" ? "Veo3" : "Sora 2"}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className={
                      video.provider === "veo3"
                        ? "border-blue-500/50 text-blue-500"
                        : "border-purple-500/50 text-purple-500"
                    }
                  >
                    {video.resolution}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(video.generatedAt).toLocaleTimeString()}
                </span>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Video Preview */}
              <div className="aspect-video bg-background border border-border rounded-sm flex items-center justify-center relative overflow-hidden">
                <img
                  src={`https://via.placeholder.com/640x360?text=${video.provider}+Shot+${video.shotNumber}`}
                  alt={`${video.provider} video`}
                  className="w-full h-full object-cover"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setPlayingId(playingId === video.id ? null : video.id)
                  }
                  className="absolute inset-0 flex items-center justify-center hover:bg-black/20"
                >
                  {playingId === video.id ? (
                    <Pause className="w-8 h-8 text-white" />
                  ) : (
                    <Play className="w-8 h-8 text-white" />
                  )}
                </Button>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded-sm bg-background border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Quality</p>
                  <p className="text-lg font-bold text-foreground">{video.quality}/10</p>
                </div>
                <div className="p-2 rounded-sm bg-background border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Motion</p>
                  <p className="text-lg font-bold text-foreground">{video.motion}/10</p>
                </div>
                <div className="p-2 rounded-sm bg-background border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Consistency</p>
                  <p className="text-lg font-bold text-foreground">{video.consistency}/10</p>
                </div>
              </div>

              {/* Cost */}
              <div className="p-3 rounded-sm bg-background border border-border">
                <p className="text-xs text-muted-foreground mb-1">Cost for this shot</p>
                <p className="text-2xl font-bold text-accent">${video.cost.toFixed(2)}</p>
              </div>

              {/* Rating */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Your Rating</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Button
                      key={rating}
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRateVideo(video.id, rating)}
                      className={
                        rating <= (video.userRating || 0)
                          ? "text-accent"
                          : "text-muted-foreground"
                      }
                    >
                      <Star
                        className="w-4 h-4"
                        fill={rating <= (video.userRating || 0) ? "currentColor" : "none"}
                      />
                    </Button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-border">
                <Button
                  size="sm"
                  onClick={() => handleSelectVideo(video.id)}
                  className={
                    video.selected
                      ? "flex-1 bg-accent text-accent-foreground"
                      : "flex-1 border-border"
                  }
                  variant={video.selected ? "default" : "outline"}
                >
                  <ThumbsUp className="w-3 h-3 mr-1" />
                  {video.selected ? "Selected" : "Select"}
                </Button>
                <Button size="sm" variant="outline" className="border-border">
                  <Copy className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" className="border-border">
                  <Download className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Comparison Summary */}
      {shotsForComparison.length > 1 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Comparison Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shotsForComparison.map((video) => (
                <div key={video.id} className="p-4 rounded-sm bg-background border border-border">
                  <h4 className="font-semibold text-foreground mb-3">
                    {video.provider === "veo3" ? "Veo3" : "Sora 2"}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quality Score:</span>
                      <span className="font-semibold text-foreground">{video.quality}/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Motion Quality:</span>
                      <span className="font-semibold text-foreground">{video.motion}/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Character Consistency:</span>
                      <span className="font-semibold text-foreground">
                        {video.consistency}/10
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-border">
                      <span className="text-muted-foreground">Cost:</span>
                      <span className="font-semibold text-accent">${video.cost.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {shotsForComparison.length > 1 && (
              <div className="p-4 rounded-sm bg-accent/10 border border-accent">
                <p className="text-sm text-foreground">
                  <span className="font-semibold">Recommendation:</span> Based on quality and
                  consistency metrics,{" "}
                  <span className="text-accent font-bold">
                    {shotsForComparison.reduce((best, v) =>
                      v.quality + v.consistency > best.quality + best.consistency ? v : best
                    ).provider === "veo3"
                      ? "Veo3"
                      : "Sora 2"}
                  </span>{" "}
                  provides the best overall output for this shot.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Batch Selection */}
      {selectedVideos.length > 0 && (
        <Card className="bg-accent/10 border border-accent">
          <CardHeader>
            <CardTitle className="text-lg">Batch Actions</CardTitle>
            <CardDescription>{selectedVideos.length} video(s) selected</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Download className="w-4 h-4 mr-2" />
              Download Selected
            </Button>
            <Button variant="outline" className="border-border">
              <Copy className="w-4 h-4 mr-2" />
              Export Comparison
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
