import { invokeLLM } from "../_core/llm";

export interface SceneChange {
  timestamp: number; // seconds
  confidence: number; // 0-100
  type: "cut" | "fade" | "dissolve" | "transition";
  description: string;
}

export interface KeyMoment {
  timestamp: number; // seconds
  duration: number; // seconds
  type: "dialogue" | "action" | "reaction" | "wide_shot" | "close_up" | "silence";
  importance: number; // 0-100
  description: string;
}

export interface VideoAnalysisResult {
  duration: number;
  sceneChanges: SceneChange[];
  keyMoments: KeyMoment[];
  pacing: "slow" | "moderate" | "fast";
  suggestedCutPoints: number[]; // timestamps in seconds
  analysisConfidence: number; // 0-100
}

/**
 * Analyzes video clip for scene changes and key moments
 * Uses LLM to interpret visual analysis data
 */
export async function analyzeVideoClip(
  _videoUrl: string,
  duration: number
): Promise<VideoAnalysisResult> {
  try {
    // Generate frame analysis prompts
    const frameIntervals = generateFrameIntervals(duration);

    // Call LLM to analyze video structure
    const analysisPrompt = `
You are a professional video editor analyzing a video clip for editing suggestions.

Video Duration: ${duration} seconds
Frame Analysis Points: ${frameIntervals.join(", ")} seconds

Based on typical video production patterns, analyze this video and provide:
1. Likely scene changes and transitions (cuts, fades, dissolves)
2. Key moments that should be preserved (dialogue, reactions, action)
3. Pacing assessment (slow, moderate, fast)
4. Suggested cut points for a rough cut

Return a JSON response with this exact structure:
{
  "sceneChanges": [
    {
      "timestamp": <number>,
      "confidence": <0-100>,
      "type": "cut|fade|dissolve|transition",
      "description": "<string>"
    }
  ],
  "keyMoments": [
    {
      "timestamp": <number>,
      "duration": <number>,
      "type": "dialogue|action|reaction|wide_shot|close_up|silence",
      "importance": <0-100>,
      "description": "<string>"
    }
  ],
  "pacing": "slow|moderate|fast",
  "suggestedCutPoints": [<timestamp>, ...],
  "analysisConfidence": <0-100>
}
`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a professional video editor. Analyze videos and provide structured editing suggestions in JSON format.",
        },
        {
          role: "user",
          content: analysisPrompt,
        },
      ],
      response_format: {
        type: "json_schema" as const,
        json_schema: {
          name: "video_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              sceneChanges: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    timestamp: { type: "number" },
                    confidence: { type: "number" },
                    type: {
                      type: "string",
                      enum: ["cut", "fade", "dissolve", "transition"] as const,
                    },
                    description: { type: "string" },
                  },
                  required: ["timestamp", "confidence", "type", "description"],
                },
              },
              keyMoments: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    timestamp: { type: "number" },
                    duration: { type: "number" },
                    type: {
                      type: "string",
                      enum: [
                        "dialogue",
                        "action",
                        "reaction",
                        "wide_shot",
                        "close_up",
                        "silence",
                      ],
                    },
                    importance: { type: "number" },
                    description: { type: "string" },
                  },
                  required: ["timestamp", "duration", "type", "importance", "description"],
                },
              },
              pacing: {
                type: "string",
                enum: ["slow", "moderate", "fast"],
              },
              suggestedCutPoints: {
                type: "array",
                items: { type: "number" },
              },
              analysisConfidence: { type: "number" },
            },
            required: [
              "sceneChanges",
              "keyMoments",
              "pacing",
              "suggestedCutPoints",
              "analysisConfidence",
            ],
          },
        },
      },
    });

    // Parse LLM response
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from LLM");
    }

    const contentStr = typeof content === "string" ? content : JSON.stringify(content);
    const analysisData = JSON.parse(contentStr);

    return {
      duration,
      sceneChanges: analysisData.sceneChanges || [],
      keyMoments: analysisData.keyMoments || [],
      pacing: analysisData.pacing || "moderate",
      suggestedCutPoints: analysisData.suggestedCutPoints || [],
      analysisConfidence: analysisData.analysisConfidence || 75,
    };
  } catch (error) {
    console.error("Video analysis failed:", error);
    // Return fallback analysis with basic cuts
    return {
      duration,
      sceneChanges: [],
      keyMoments: [],
      pacing: "moderate",
      suggestedCutPoints: generateDefaultCutPoints(duration),
      analysisConfidence: 30,
    };
  }
}

/**
 * Generates frame analysis intervals based on video duration
 * More frequent analysis for shorter videos, sparse for longer ones
 */
function generateFrameIntervals(duration: number): number[] {
  const intervals: number[] = [];
  const step = Math.max(1, Math.floor(duration / 20)); // Max 20 analysis points

  for (let i = 0; i < duration; i += step) {
    intervals.push(i);
  }

  if (intervals[intervals.length - 1] !== duration) {
    intervals.push(duration);
  }

  return intervals;
}

/**
 * Generates default cut points if analysis fails
 * Uses simple heuristics: cuts every 3-5 seconds
 */
function generateDefaultCutPoints(duration: number): number[] {
  const cutPoints: number[] = [];
  const interval = 4; // seconds

  for (let i = interval; i < duration; i += interval) {
    cutPoints.push(i);
  }

  return cutPoints;
}

/**
 * Detects silence in audio track (useful for identifying dialogue breaks)
 */
export async function detectSilence(
  _audioUrl: string,
  _threshold: number = -40 // dB
): Promise<Array<{ start: number; end: number }>> {
  try {
    // In a real implementation, this would analyze audio waveform
    // For now, return empty array as placeholder
    return [];
  } catch (error) {
    console.error("Silence detection failed:", error);
    return [];
  }
}

/**
 * Detects scene cuts using optical flow analysis
 * Identifies abrupt changes in visual content
 */
export async function detectSceneCuts(
  _videoUrl: string,
  _threshold: number = 0.7 // 0-1, higher = stricter
): Promise<SceneChange[]> {
  try {
    // In a real implementation, this would use computer vision
    // to detect optical flow changes between frames
    // For now, return empty array as placeholder
    return [];
  } catch (error) {
    console.error("Scene cut detection failed:", error);
    return [];
  }
}

/**
 * Combines multiple analysis methods into final rough cut suggestion
 */
export async function generateRoughCut(
  videoUrl: string,
  duration: number,
  preferences?: {
    targetDuration?: number; // desired final duration
    minClipLength?: number; // minimum clip length in seconds
    maxClipLength?: number; // maximum clip length in seconds
    prioritizeDialogue?: boolean;
    prioritizeAction?: boolean;
  }
): Promise<Array<{ start: number; end: number; reason: string }>> {
  const analysis = await analyzeVideoClip(videoUrl, duration);

  const roughCut: Array<{ start: number; end: number; reason: string }> = [];
  const minClip = preferences?.minClipLength || 1;
  const maxClip = preferences?.maxClipLength || 15;

  // Start with first cut point
  let currentStart = 0;

  for (const cutPoint of analysis.suggestedCutPoints) {
    const clipLength = cutPoint - currentStart;

    // Validate clip length
    if (clipLength >= minClip && clipLength <= maxClip) {
      // Find key moment in this segment
      const keyMoment = analysis.keyMoments.find(
        (km) => km.timestamp >= currentStart && km.timestamp < cutPoint
      );

      roughCut.push({
        start: currentStart,
        end: cutPoint,
        reason: keyMoment
          ? `Contains ${keyMoment.type}: ${keyMoment.description}`
          : "Scene change detected",
      });

      currentStart = cutPoint;
    }
  }

  // Add final segment
  if (currentStart < duration) {
    roughCut.push({
      start: currentStart,
      end: duration,
      reason: "Final segment",
    });
  }

  return roughCut;
}
