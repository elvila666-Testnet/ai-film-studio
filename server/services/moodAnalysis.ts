import { invokeLLM } from "../_core/llm";
import { errorHandler } from "./errorHandling";

/**
 * Project Mood Analysis Engine
 * Analyzes project content to determine mood, pacing, and emotional tone
 */

export interface ProjectMood {
  primaryMood: string;
  secondaryMoods: string[];
  energyLevel: "low" | "medium" | "high";
  pace: "slow" | "moderate" | "fast";
  emotionalTone: string;
  suggestedTempo: number; // BPM
  intensity: number; // 0-100
  confidence: number; // 0-100
}

export interface ContentAnalysis {
  script?: {
    tone: string;
    themes: string[];
    pacing: string;
  };
  visualStyle?: {
    colorPalette: string[];
    cinematography: string;
    mood: string;
  };
  storyboard?: {
    pacing: string;
    actionLevel: string;
    emotionalArc: string;
  };
}

class MoodAnalysisService {
  /**
   * Analyze project content to determine mood
   */
  async analyzeProjectMood(
    _projectId: string,
    content: ContentAnalysis
  ): Promise<ProjectMood> {
    try {
      const analysisPrompt = this.buildAnalysisPrompt(content);

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a music and mood analysis expert. Analyze the provided project content and determine the appropriate mood, energy level, and pacing for background music. Consider the emotional arc, visual style, and narrative tone.`,
          },
          {
            role: "user",
            content: analysisPrompt,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "project_mood_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                primaryMood: {
                  type: "string",
                  description:
                    "Primary mood (e.g., happy, sad, energetic, calm, dramatic)",
                },
                secondaryMoods: {
                  type: "array",
                  items: { type: "string" },
                  description: "Secondary moods that complement the primary mood",
                },
                energyLevel: {
                  type: "string",
                  enum: ["low", "medium", "high"],
                  description: "Overall energy level of the content",
                },
                pace: {
                  type: "string",
                  enum: ["slow", "moderate", "fast"],
                  description: "Pacing of the content",
                },
                emotionalTone: {
                  type: "string",
                  description: "Detailed emotional tone description",
                },
                suggestedTempo: {
                  type: "number",
                  description: "Suggested BPM for background music",
                },
                intensity: {
                  type: "number",
                  description: "Intensity level 0-100",
                },
                confidence: {
                  type: "number",
                  description: "Confidence in analysis 0-100",
                },
              },
              required: [
                "primaryMood",
                "secondaryMoods",
                "energyLevel",
                "pace",
                "emotionalTone",
                "suggestedTempo",
                "intensity",
                "confidence",
              ],
              additionalProperties: false,
            },
          },
        },
      });

      const analysisText =
        typeof response.choices[0]?.message?.content === "string"
          ? response.choices[0].message.content
          : "{}";
      const analysis = JSON.parse(analysisText);

      return {
        primaryMood: analysis.primaryMood,
        secondaryMoods: analysis.secondaryMoods || [],
        energyLevel: analysis.energyLevel,
        pace: analysis.pace,
        emotionalTone: analysis.emotionalTone,
        suggestedTempo: Number(analysis.suggestedTempo) || 120,
        intensity: analysis.intensity,
        confidence: analysis.confidence,
      };
    } catch (error) {
      errorHandler.logError(
        `Failed to analyze project mood: ${(error as Error).message}`,
        "MOOD_ANALYSIS_ERROR",
        "error",
        { operation: "analyzeProjectMood" },
        error as Error
      );

      // Return default mood as fallback
      return this.getDefaultMood();
    }
  }

  /**
   * Analyze script for mood indicators
   */
  async analyzeScriptMood(scriptContent: string): Promise<{
    tone: string;
    themes: string[];
    pacing: string;
  }> {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "You are a screenwriting analyst. Analyze the script and identify its tone, themes, and pacing.",
          },
          {
            role: "user",
            content: `Analyze this script for mood indicators:\n\n${scriptContent}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "script_mood_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                tone: {
                  type: "string",
                  description: "Overall tone of the script",
                },
                themes: {
                  type: "array",
                  items: { type: "string" },
                  description: "Main themes in the script",
                },
                pacing: {
                  type: "string",
                  enum: ["slow", "moderate", "fast"],
                  description: "Pacing of the narrative",
                },
              },
              required: ["tone", "themes", "pacing"],
              additionalProperties: false,
            },
          },
        },
      });

      const analysisText =
        typeof response.choices[0]?.message?.content === "string"
          ? response.choices[0].message.content
          : "{}";
      return JSON.parse(analysisText);
    } catch (error) {
      errorHandler.logError(
        `Failed to analyze script mood: ${(error as Error).message}`,
        "SCRIPT_MOOD_ERROR",
        "error",
        { operation: "analyzeScriptMood" },
        error as Error
      );

      return {
        tone: "neutral",
        themes: [],
        pacing: "moderate",
      };
    }
  }

  /**
   * Analyze visual style for mood indicators
   */
  async analyzeVisualMood(visualDescription: string): Promise<{
    colorPalette: string[];
    cinematography: string;
    mood: string;
  }> {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "You are a cinematography and color theory expert. Analyze the visual style and determine its mood.",
          },
          {
            role: "user",
            content: `Analyze this visual style for mood:\n\n${visualDescription}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "visual_mood_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                colorPalette: {
                  type: "array",
                  items: { type: "string" },
                  description: "Dominant colors in the visual style",
                },
                cinematography: {
                  type: "string",
                  description: "Cinematography style and techniques",
                },
                mood: {
                  type: "string",
                  description: "Mood conveyed by the visual style",
                },
              },
              required: ["colorPalette", "cinematography", "mood"],
              additionalProperties: false,
            },
          },
        },
      });

      const analysisText =
        typeof response.choices[0]?.message?.content === "string"
          ? response.choices[0].message.content
          : "{}";
      return JSON.parse(analysisText);
    } catch (error) {
      errorHandler.logError(
        `Failed to analyze visual mood: ${(error as Error).message}`,
        "VISUAL_MOOD_ERROR",
        "error",
        { operation: "analyzeVisualMood" },
        error as Error
      );

      return {
        colorPalette: [],
        cinematography: "standard",
        mood: "neutral",
      };
    }
  }

  /**
   * Analyze storyboard for pacing and action
   */
  async analyzeStoryboardMood(storyboardDescription: string): Promise<{
    pacing: string;
    actionLevel: string;
    emotionalArc: string;
  }> {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "You are a storyboard analyst. Analyze the storyboard and determine pacing, action level, and emotional arc.",
          },
          {
            role: "user",
            content: `Analyze this storyboard:\n\n${storyboardDescription}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "storyboard_mood_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                pacing: {
                  type: "string",
                  enum: ["slow", "moderate", "fast"],
                  description: "Pacing of the storyboard",
                },
                actionLevel: {
                  type: "string",
                  enum: ["low", "medium", "high"],
                  description: "Level of action and movement",
                },
                emotionalArc: {
                  type: "string",
                  description: "Emotional journey throughout the storyboard",
                },
              },
              required: ["pacing", "actionLevel", "emotionalArc"],
              additionalProperties: false,
            },
          },
        },
      });

      const analysisText =
        typeof response.choices[0]?.message?.content === "string"
          ? response.choices[0].message.content
          : "{}";
      return JSON.parse(analysisText);
    } catch (error) {
      errorHandler.logError(
        `Failed to analyze storyboard mood: ${(error as Error).message}`,
        "STORYBOARD_MOOD_ERROR",
        "error",
        { operation: "analyzeStoryboardMood" },
        error as Error
      );

      return {
        pacing: "moderate",
        actionLevel: "medium",
        emotionalArc: "neutral",
      };
    }
  }

  /**
   * Get mood compatibility score between two moods
   */
  getMoodCompatibilityScore(mood1: string, mood2: string): number {
    const compatibilityMap: Record<string, Record<string, number>> = {
      happy: { happy: 100, uplifting: 90, energetic: 85, calm: 40, sad: 10 },
      sad: { sad: 100, calm: 80, dramatic: 75, happy: 10, energetic: 20 },
      energetic: {
        energetic: 100,
        happy: 85,
        uplifting: 80,
        calm: 20,
        sad: 15,
      },
      calm: { calm: 100, peaceful: 95, romantic: 85, energetic: 20, sad: 60 },
      dramatic: {
        dramatic: 100,
        intense: 90,
        sad: 75,
        energetic: 70,
        calm: 30,
      },
      romantic: { romantic: 100, calm: 90, peaceful: 85, happy: 75, sad: 60 },
      dark: { dark: 100, dramatic: 85, intense: 80, sad: 75, calm: 20 },
      uplifting: {
        uplifting: 100,
        happy: 90,
        energetic: 85,
        calm: 50,
        sad: 15,
      },
    };

    return (
      compatibilityMap[mood1.toLowerCase()]?.[mood2.toLowerCase()] ?? 50
    );
  }

  /**
   * Build analysis prompt from content
   */
  private buildAnalysisPrompt(content: ContentAnalysis): string {
    const parts: string[] = [];

    if (content.script) {
      parts.push(`Script Analysis:
- Tone: ${content.script.tone}
- Themes: ${content.script.themes.join(", ")}
- Pacing: ${content.script.pacing}`);
    }

    if (content.visualStyle) {
      parts.push(`Visual Style:
- Color Palette: ${content.visualStyle.colorPalette.join(", ")}
- Cinematography: ${content.visualStyle.cinematography}
- Mood: ${content.visualStyle.mood}`);
    }

    if (content.storyboard) {
      parts.push(`Storyboard:
- Pacing: ${content.storyboard.pacing}
- Action Level: ${content.storyboard.actionLevel}
- Emotional Arc: ${content.storyboard.emotionalArc}`);
    }

    return parts.join("\n\n");
  }

  /**
   * Get default mood
   */
  private getDefaultMood(): ProjectMood {
    return {
      primaryMood: "neutral",
      secondaryMoods: [],
      energyLevel: "medium",
      pace: "moderate",
      emotionalTone: "balanced",
      suggestedTempo: 120,
      intensity: 50,
      confidence: 30,
    };
  }
}

export const moodAnalysisService = new MoodAnalysisService();
