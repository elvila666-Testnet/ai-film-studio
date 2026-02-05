import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Music } from "lucide-react";
import { toast } from "sonner";

interface AudioUploadProps {
  onAudioSelected: (url: string, fileName: string) => void;
  currentAudioUrl?: string;
  onRemoveAudio?: () => void;
}

export function AudioUpload({
  onAudioSelected,
  currentAudioUrl,
  onRemoveAudio,
}: AudioUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please select a valid audio file (MP3, WAV, OGG, or M4A)");
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Audio file must be less than 50MB");
      return;
    }

    setIsUploading(true);
    try {
      // Create a temporary URL for the file
      const url = URL.createObjectURL(file);
      onAudioSelected(url, file.name);
      toast.success(`Audio file "${file.name}" selected`);
    } catch (error) {
      console.error("Failed to process audio file:", error);
      toast.error("Failed to process audio file");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="text-sm font-semibold text-foreground">Audio Track</div>

      {currentAudioUrl ? (
        <div className="bg-muted rounded p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-accent" />
            <span className="text-sm text-foreground">Audio track added</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onRemoveAudio}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="hidden"
            id="audio-input"
          />
          <label htmlFor="audio-input" className="cursor-pointer">
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-6 h-6 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                {isUploading ? "Uploading..." : "Click to upload audio"}
              </div>
              <div className="text-xs text-muted-foreground">MP3, WAV, OGG, or M4A (max 50MB)</div>
            </div>
          </label>
        </div>
      )}

      <div className="text-xs text-muted-foreground bg-muted rounded p-2">
        Optional: Add background music or voiceover to your animatic. The audio will be mixed with the video.
      </div>
    </div>
  );
}
