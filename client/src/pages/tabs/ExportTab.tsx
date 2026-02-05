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
import { Download, FileVideo, Settings, CheckCircle2, Loader2 } from "lucide-react";

interface ExportTabProps {
  projectId: number;
}

interface ExportFormat {
  id: string;
  name: string;
  extension: string;
  codec: string;
  bitrate: string;
  description: string;
}

const exportFormats: ExportFormat[] = [
  {
    id: "mp4-h264",
    name: "MP4 (H.264)",
    extension: ".mp4",
    codec: "H.264",
    bitrate: "8-50 Mbps",
    description: "Universal compatibility, widely supported",
  },
  {
    id: "mp4-h265",
    name: "MP4 (H.265/HEVC)",
    extension: ".mp4",
    codec: "H.265",
    bitrate: "4-25 Mbps",
    description: "Better compression, modern devices",
  },
  {
    id: "mov-prores",
    name: "MOV (ProRes 422)",
    extension: ".mov",
    codec: "ProRes 422",
    bitrate: "100-500 Mbps",
    description: "Professional editing, high quality",
  },
  {
    id: "mov-dnxhd",
    name: "MOV (DNxHD)",
    extension: ".mov",
    codec: "DNxHD",
    bitrate: "120-440 Mbps",
    description: "Professional mastering, Avid compatible",
  },
  {
    id: "webm",
    name: "WebM (VP9)",
    extension: ".webm",
    codec: "VP9",
    bitrate: "4-20 Mbps",
    description: "Web streaming, open source",
  },
  {
    id: "avi-mpeg2",
    name: "AVI (MPEG-2)",
    extension: ".avi",
    codec: "MPEG-2",
    bitrate: "6-12 Mbps",
    description: "Legacy format, broadcast standard",
  },
];

const resolutionOptions = [
  { value: "720p", label: "720p (HD)" },
  { value: "1080p", label: "1080p (Full HD)" },
  { value: "2k", label: "2K" },
  { value: "4k", label: "4K" },
];

const frameRateOptions = [
  { value: "24", label: "24 fps" },
  { value: "25", label: "25 fps" },
  { value: "30", label: "30 fps" },
  { value: "60", label: "60 fps" },
];

export default function ExportTab({ projectId }: ExportTabProps) {
  const [selectedFormat, setSelectedFormat] = useState("mp4-h264");
  const [selectedResolution, setSelectedResolution] = useState("1080p");
  const [selectedFrameRate, setSelectedFrameRate] = useState("30");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportComplete, setExportComplete] = useState(false);

  const selectedFormatData = exportFormats.find((f) => f.id === selectedFormat);

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    setExportComplete(false);

    // Simulate export progress
    const interval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsExporting(false);
          setExportComplete(true);
          return 100;
        }
        return prev + Math.random() * 30;
      });
    }, 500);
  };

  return (
    <div className="space-y-6">
      {/* Format Selection */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Select Export Format</CardTitle>
          <CardDescription>Choose the video format for your final output</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {exportFormats.map((format) => (
              <button
                key={format.id}
                onClick={() => setSelectedFormat(format.id)}
                className={`p-4 rounded-sm border-2 text-left transition-colors ${
                  selectedFormat === format.id
                    ? "border-accent bg-accent/10"
                    : "border-border bg-background hover:border-accent/50"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-foreground">{format.name}</h4>
                  {selectedFormat === format.id && (
                    <CheckCircle2 className="w-4 h-4 text-accent" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-2">{format.description}</p>
                <div className="space-y-1">
                  <p className="text-xs">
                    <span className="text-muted-foreground">Codec:</span>{" "}
                    <span className="font-mono text-foreground">{format.codec}</span>
                  </p>
                  <p className="text-xs">
                    <span className="text-muted-foreground">Bitrate:</span>{" "}
                    <span className="font-mono text-foreground">{format.bitrate}</span>
                  </p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Export Settings
          </CardTitle>
          <CardDescription>Configure resolution and frame rate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                Resolution
              </label>
              <Select value={selectedResolution} onValueChange={setSelectedResolution}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {resolutionOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                Frame Rate
              </label>
              <Select value={selectedFrameRate} onValueChange={setSelectedFrameRate}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {frameRateOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Format Details */}
      {selectedFormatData && (
        <Card className="bg-card border-border border-accent">
          <CardHeader>
            <CardTitle className="text-lg">{selectedFormatData.name} Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-sm bg-background border border-border">
                <p className="text-xs text-muted-foreground mb-1">Format</p>
                <p className="font-semibold text-foreground">{selectedFormatData.extension}</p>
              </div>
              <div className="p-3 rounded-sm bg-background border border-border">
                <p className="text-xs text-muted-foreground mb-1">Codec</p>
                <p className="font-semibold text-foreground">{selectedFormatData.codec}</p>
              </div>
              <div className="p-3 rounded-sm bg-background border border-border">
                <p className="text-xs text-muted-foreground mb-1">Bitrate</p>
                <p className="font-semibold text-foreground">{selectedFormatData.bitrate}</p>
              </div>
              <div className="p-3 rounded-sm bg-background border border-border">
                <p className="text-xs text-muted-foreground mb-1">Resolution</p>
                <p className="font-semibold text-foreground">{selectedResolution}</p>
              </div>
            </div>

            <div className="p-4 rounded-sm bg-background border border-border">
              <p className="text-sm text-foreground">
                <span className="font-semibold">Best for:</span> {selectedFormatData.description}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Progress */}
      {isExporting && (
        <Card className="bg-card border-border border-accent">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
              Exporting Video
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold text-foreground">{Math.round(exportProgress)}%</span>
              </div>
              <div className="w-full bg-background border border-border rounded-sm overflow-hidden h-2">
                <div
                  className="bg-accent h-full transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Encoding video with {selectedFormatData?.codec} codec...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Export Complete */}
      {exportComplete && (
        <Card className="bg-accent/10 border border-accent">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-accent" />
              Export Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-sm bg-background border border-border">
              <p className="text-sm font-semibold text-foreground mb-2">
                project_video{selectedFormatData?.extension}
              </p>
              <p className="text-xs text-muted-foreground">
                Ready to download • {selectedResolution} • {selectedFrameRate}
              </p>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground">
                <Download className="w-4 h-4 mr-2" />
                Download Video
              </Button>
              <Button
                variant="outline"
                className="border-border"
                onClick={() => setExportComplete(false)}
              >
                Export Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Button */}
      {!isExporting && !exportComplete && (
        <Button
          onClick={handleExport}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-12 text-base"
        >
          <FileVideo className="w-5 h-5 mr-2" />
          Export Video as {selectedFormatData?.name}
        </Button>
      )}

      {/* Format Recommendations */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Format Recommendations</CardTitle>
          <CardDescription>Choose based on your use case</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <Badge className="mt-1 bg-blue-500/20 text-blue-500 border-blue-500/50">
                Web
              </Badge>
              <div>
                <p className="font-semibold text-foreground text-sm">Web Streaming</p>
                <p className="text-xs text-muted-foreground">
                  Use MP4 (H.265) or WebM for optimal streaming performance
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge className="mt-1 bg-purple-500/20 text-purple-500 border-purple-500/50">
                Professional
              </Badge>
              <div>
                <p className="font-semibold text-foreground text-sm">Professional Editing</p>
                <p className="text-xs text-muted-foreground">
                  Use MOV (ProRes 422) or MOV (DNxHD) for post-production workflows
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge className="mt-1 bg-green-500/20 text-green-500 border-green-500/50">
                Archive
              </Badge>
              <div>
                <p className="font-semibold text-foreground text-sm">Long-term Archive</p>
                <p className="text-xs text-muted-foreground">
                  Use MP4 (H.264) for universal compatibility and storage efficiency
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
