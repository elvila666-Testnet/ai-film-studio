import { invokeLLM } from "../_core/llm";
import { analyzeVideoClip, generateRoughCut, VideoAnalysisResult } from "./videoAnalysis";

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
  compressionRatio: number; // original / final
  pacing: "slow" | "moderate" | "fast";
  suggestedTitle: string;
  editingNotes: string;
  overallConfidence: number;
}

export interface AutoCutPreferences {
  targetDuration?: number; // desired final duration in seconds
  minClipLength?: number; // minimum clip length
  maxClipLength?: number; // maximum clip length
  prioritizeDialogue?: boolean;
  prioritizeAction?: boolean;
  prioritizeReactions?: boolean;
  style?: "documentary" | "commercial" | "narrative" | "music_video" | "vlog";
  preserveOpening?: boolean;
  preserveClosing?: boolean;
}

/**
 * Generates intelligent auto-cut suggestions for a video clip
 * Analyzes content and creates a rough cut based on preferences
 */
export async function generateAutoCutSuggestion(
  videoUrl: string,
  duration: number,
  preferences: AutoCutPreferences = {}
): Promise<AutoCutSuggestion> {
  try {
    // Analyze video for scene changes and key moments
    const analysis = await analyzeVideoClip(videoUrl, duration);

    // Generate rough cut based on analysis
    const roughCut = await generateRoughCut(videoUrl, duration, {
      targetDuration: preferences.targetDuration,
      minClipLength: preferences.minClipLength || 1,
      maxClipLength: preferences.maxClipLength || 15,
      prioritizeDialogue: preferences.prioritizeDialogue,
      prioritizeAction: preferences.prioritizeAction,
    });

    // Calculate compression ratio
    const finalDuration = roughCut.reduce((sum, clip) => sum + (clip.end - clip.start), 0);
    const compressionRatio = duration / finalDuration;

    // Use LLM to generate editing notes and suggestions
    const editingNotes = await generateEditingNotes(
      analysis,
      roughCut,
      duration,
      finalDuration,
      preferences
    );

    // Convert rough cut to clip format with confidence scores
    const clips = roughCut.map((clip, idx) => ({
      id: `auto-cut-${idx}`,
      start: clip.start,
      end: clip.end,
      duration: clip.end - clip.start,
      reason: clip.reason,
      confidence: calculateClipConfidence(analysis, clip.start, clip.end),
      keyMoments: extractKeyMomentsInRange(analysis, clip.start, clip.end),
    }));

    return {
      clips,
      totalDuration: finalDuration,
      originalDuration: duration,
      compressionRatio,
      pacing: analysis.pacing,
      suggestedTitle: generateSuggestedTitle(analysis, preferences),
      editingNotes,
      overallConfidence: analysis.analysisConfidence,
    };
  } catch (error) {
    console.error("Auto-cut generation failed:", error);
    // Return fallback suggestion with basic cuts
    return generateFallbackSuggestion(duration);
  }
}

/**
 * Generates editing notes and suggestions using LLM
 */
async function generateEditingNotes(
  analysis: VideoAnalysisResult,
  roughCut: Array<{ start: number; end: number; reason: string }>,
  originalDuration: number,
  finalDuration: number,
  preferences: AutoCutPreferences
): Promise<string> {
  try {
    const prompt = `
You are a professional video editor reviewing an AI-generated rough cut suggestion.

Original Duration: ${originalDuration}s
Suggested Final Duration: ${finalDuration}s
Compression Ratio: ${(originalDuration / finalDuration).toFixed(2)}x

Video Pacing: ${analysis.pacing}
Analysis Confidence: ${analysis.analysisConfidence}%

Editing Style: ${preferences.style || "general"}
Key Priorities: ${[
      preferences.prioritizeDialogue && "Dialogue",
      preferences.prioritizeAction && "Action",
      preferences.prioritizeReactions && "Reactions",
    ]
      .filter(Boolean)
      .join(", ") || "Balanced"}

Suggested Cuts: ${roughCut.length}
Key Moments Identified: ${analysis.keyMoments.length}
Scene Changes Detected: ${analysis.sceneChanges.length}

Provide 2-3 brief editing notes and suggestions for improving this rough cut.
Focus on pacing, flow, and storytelling. Keep notes concise and actionable.
`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a professional video editor providing constructive feedback on rough cuts.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    return typeof content === "string" ? content : JSON.stringify(content);
  } catch (error) {
    console.error("Failed to generate editing notes:", error);
    return "Review the suggested cuts and adjust as needed for optimal pacing and flow.";
  }
}

/**
 * Calculates confidence score for a clip based on analysis data
 */
function calculateClipConfidence(
  analysis: VideoAnalysisResult,
  start: number,
  end: number
): number {
  let confidence = analysis.analysisConfidence;

  // Boost confidence if clip contains key moments
  const keyMomentsInClip = analysis.keyMoments.filter(
    (km) => km.timestamp >= start && km.timestamp < end
  );
  confidence += keyMomentsInClip.length * 5;

  // Boost confidence if clip starts with scene change
  const sceneChangeAtStart = analysis.sceneChanges.find(
    (sc) => Math.abs(sc.timestamp - start) < 0.5
  );
  if (sceneChangeAtStart) {
    confidence += sceneChangeAtStart.confidence * 0.2;
  }

  return Math.min(100, confidence);
}

/**
 * Extracts key moment descriptions for a clip range
 */
function extractKeyMomentsInRange(
  analysis: VideoAnalysisResult,
  start: number,
  end: number
): string[] {
  return analysis.keyMoments
    .filter((km) => km.timestamp >= start && km.timestamp < end)
    .map((km) => `${km.type}: ${km.description}`);
}

/**
 * Generates a suggested title based on video analysis
 */
function generateSuggestedTitle(
  analysis: VideoAnalysisResult,
  preferences: AutoCutPreferences
): string {
  const stylePrefix = {
    documentary: "Documentary Cut",
    commercial: "Commercial Cut",
    narrative: "Narrative Cut",
    music_video: "Music Video Cut",
    vlog: "Vlog Cut",
  };

  const prefix = stylePrefix[preferences.style || "narrative"] || "Rough Cut";
  const pacing = analysis.pacing.charAt(0).toUpperCase() + analysis.pacing.slice(1);

  return `${prefix} - ${pacing} Pacing`;
}

/**
 * Generates a fallback suggestion if analysis fails
 */
function generateFallbackSuggestion(duration: number): AutoCutSuggestion {
  const clips = [];
  const clipDuration = 5; // 5-second clips

  for (let i = 0; i < duration; i += clipDuration) {
    const end = Math.min(i + clipDuration, duration);
    clips.push({
      id: `fallback-${clips.length}`,
      start: i,
      end,
      duration: end - i,
      reason: "Default cut",
      confidence: 40,
      keyMoments: [],
    });
  }

  return {
    clips,
    totalDuration: duration,
    originalDuration: duration,
    compressionRatio: 1,
    pacing: "moderate",
    suggestedTitle: "Rough Cut",
    editingNotes: "Review and adjust cuts as needed.",
    overallConfidence: 30,
  };
}

/**
 * Refines auto-cut suggestion based on user feedback
 */
export async function refineAutoCutSuggestion(
  currentSuggestion: AutoCutSuggestion,
  feedback: {
    tooFast?: boolean;
    tooSlow?: boolean;
    missingKeyMoments?: boolean;
    tooManyClips?: boolean;
    tooFewClips?: boolean;
    customNotes?: string;
  }
): Promise<AutoCutSuggestion> {
  try {
    // Adjust preferences based on feedback
    const adjustedPreferences: AutoCutPreferences = {};

    if (feedback.tooFast) {
      adjustedPreferences.maxClipLength = 10;
    }
    if (feedback.tooSlow) {
      adjustedPreferences.minClipLength = 2;
    }
    if (feedback.tooManyClips) {
      adjustedPreferences.minClipLength = 4;
    }
    if (feedback.tooFewClips) {
      adjustedPreferences.maxClipLength = 8;
    }

    // In a real implementation, would re-analyze with adjusted preferences
    // For now, return modified suggestion
    return {
      ...currentSuggestion,
      editingNotes: feedback.customNotes || currentSuggestion.editingNotes,
    };
  } catch (error) {
    console.error("Failed to refine auto-cut suggestion:", error);
    return currentSuggestion;
  }
}

/**
 * Applies auto-cut suggestion to timeline
 */
export function applyAutoCutToTimeline(
  suggestion: AutoCutSuggestion,
  trackId: string
): Array<{
  id: string;
  trackId: string;
  clipId: string;
  startTime: number;
  duration: number;
  name: string;
}> {
  return suggestion.clips.map((clip) => ({
    id: clip.id,
    trackId,
    clipId: `clip-${clip.id}`,
    startTime: clip.start,
    duration: clip.duration,
    name: `${clip.reason} (${clip.confidence}%)`,
  }));
}
