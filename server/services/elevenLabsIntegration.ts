/**
 * ElevenLabs Voiceover Integration Service
 * Generates voiceovers from scripts using ElevenLabs API
 * Supports multiple languages and voice profiles
 */

import { invokeLLM } from "../_core/llm";
import { BrandVoiceProfile } from "../../drizzle/schema";

export interface VoiceoverGenerationRequest {
  script: string;
  voiceProfile: BrandVoiceProfile;
  language?: string;
  speed?: number; // 0.5 to 2.0
  pitch?: number; // 0.5 to 2.0
}

export interface VoiceoverGenerationResult {
  audioUrl: string;
  duration: number; // in milliseconds
  language: string;
  elevenLabsJobId?: string;
  metadata: {
    voiceId: string;
    speed: number;
    pitch: number;
    characterCount: number;
  };
}

/**
 * Generate voiceover using ElevenLabs API
 */
export async function generateVoiceover(
  request: VoiceoverGenerationRequest
): Promise<VoiceoverGenerationResult> {
  try {
    const {
      script,
      voiceProfile,
      language = "en",
      speed = 1.0,
      pitch = 1.0,
    } = request;

    if (!voiceProfile.elevenLabsVoiceId) {
      throw new Error("Voice profile does not have ElevenLabs voice ID configured");
    }

    // Call ElevenLabs API via Manus built-in service
    const apiUrl = process.env.BUILT_IN_FORGE_API_URL || "https://api.manus.im";
    const apiKey = process.env.BUILT_IN_FORGE_API_KEY;

    if (!apiKey) {
      throw new Error("ElevenLabs API key not configured");
    }

    // Prepare request to ElevenLabs
    const elevenLabsRequest = {
      text: script,
      voice_id: voiceProfile.elevenLabsVoiceId,
      model_id: "eleven_monolingual_v1",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
      language_code: languageToElevenLabsCode(language),
    };

    // Make request to ElevenLabs via Manus API
    const response = await fetch(`${apiUrl}/llm/elevenlabs/text-to-speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(elevenLabsRequest),
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.statusText}`);
    }

    const audioBuffer = await response.arrayBuffer();

    // Upload audio to S3
    const { storagePut } = await import("../storage");
    const audioKey = `voiceovers/${Date.now()}-${voiceProfile.id}.mp3`;
    const { url: audioUrl } = await storagePut(audioKey, Buffer.from(audioBuffer), "audio/mpeg");

    // Calculate duration (rough estimate: ~150 words per minute = 0.4 seconds per word)
    const wordCount = script.split(/\s+/).length;
    const duration = Math.round((wordCount / 150) * 60 * 1000); // in milliseconds

    return {
      audioUrl,
      duration,
      language,
      metadata: {
        voiceId: voiceProfile.elevenLabsVoiceId,
        speed,
        pitch,
        characterCount: script.length,
      },
    };
  } catch (error) {
    console.error("Failed to generate voiceover:", error);
    throw error;
  }
}

/**
 * Generate voiceover with brand voice characteristics
 */
export async function generateBrandVoiceover(
  script: string,
  voiceProfile: BrandVoiceProfile,
  language: string = "en"
): Promise<VoiceoverGenerationResult> {
  try {
    // Apply brand voice tone to script (optional preprocessing)
    const processedScript = await preprocessScriptForVoice(script, voiceProfile);

    // Generate voiceover
    return await generateVoiceover({
      script: processedScript,
      voiceProfile,
      language,
      speed: ((voiceProfile.speed ?? 100) / 100), // Convert from percentage to decimal
      pitch: ((voiceProfile.pitch ?? 100) / 100),
    });
  } catch (error) {
    console.error("Failed to generate brand voiceover:", error);
    throw error;
  }
}

/**
 * Preprocess script to match brand voice tone
 */
async function preprocessScriptForVoice(
  script: string,
  voiceProfile: BrandVoiceProfile
): Promise<string> {
  try {
    // Use LLM to adjust script for voice tone
    const prompt = `Adjust this script to match the specified voice tone and characteristics. 
    
Voice Profile:
- Tone: ${voiceProfile.tone || "neutral"}
- Description: ${voiceProfile.description || "No description"}

Original Script:
${script}

Adjust the script to:
1. Match the specified tone
2. Add appropriate pacing and emphasis markers if needed
3. Ensure natural speech flow
4. Maintain the original meaning and content

Return the adjusted script only, no explanations.`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a voice coach preparing scripts for voiceover recording.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return script;

    return typeof content === "string" ? content : JSON.stringify(content);
  } catch (error) {
    console.error("Failed to preprocess script:", error);
    return script; // Return original if preprocessing fails
  }
}

/**
 * Generate multi-language voiceovers from script
 */
export async function generateMultiLanguageVoiceovers(
  script: string,
  voiceProfile: BrandVoiceProfile,
  languages: string[]
): Promise<Record<string, VoiceoverGenerationResult>> {
  try {
    const results: Record<string, VoiceoverGenerationResult> = {};

    // Generate voiceovers for each language in parallel
    const promises = languages.map(async (lang) => {
      try {
        const result = await generateBrandVoiceover(script, voiceProfile, lang);
        results[lang] = result;
      } catch (error) {
        console.error(`Failed to generate voiceover for language ${lang}:`, error);
      }
    });

    await Promise.all(promises);
    return results;
  } catch (error) {
    console.error("Failed to generate multi-language voiceovers:", error);
    throw error;
  }
}

/**
 * Translate script to target language before voiceover generation
 */
export async function translateScriptForVoiceover(
  script: string,
  targetLanguage: string
): Promise<string> {
  try {
    const prompt = `Translate this script to ${targetLanguage} for voiceover recording. 
    
Maintain:
1. Original meaning and intent
2. Natural speech patterns for the target language
3. Timing and pacing cues if present
4. Any character names or proper nouns

Original Script:
${script}

Provide the translated script only.`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a professional translator specializing in voiceover scripts. Translate to ${targetLanguage}.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return script;

    return typeof content === "string" ? content : JSON.stringify(content);
  } catch (error) {
    console.error("Failed to translate script:", error);
    return script; // Return original if translation fails
  }
}

/**
 * Convert language code to ElevenLabs format
 */
function languageToElevenLabsCode(language: string): string {
  const languageMap: Record<string, string> = {
    en: "en",
    es: "es",
    fr: "fr",
    de: "de",
    it: "it",
    pt: "pt",
    nl: "nl",
    pl: "pl",
    ru: "ru",
    ja: "ja",
    zh: "zh",
    ko: "ko",
    ar: "ar",
    hi: "hi",
    tr: "tr",
  };

  return languageMap[language] || "en";
}

/**
 * Validate voice profile configuration
 */
export async function validateVoiceProfile(voiceProfile: BrandVoiceProfile): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!voiceProfile.elevenLabsVoiceId) {
    errors.push("ElevenLabs voice ID is not configured");
  }

  if (!voiceProfile.name) {
    errors.push("Voice profile name is required");
  }

  if (!voiceProfile.tone) {
    warnings.push("Voice tone is not specified");
  }

  // Validate speed and pitch ranges
  if ((voiceProfile.speed ?? 100) < 50 || (voiceProfile.speed ?? 100) > 200) {
    warnings.push("Speed is outside recommended range (50-200%)");
  }

  if ((voiceProfile.pitch ?? 100) < 50 || (voiceProfile.pitch ?? 100) > 200) {
    warnings.push("Pitch is outside recommended range (50-200%)");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get available ElevenLabs voices
 */
export async function getAvailableVoices(): Promise<
  Array<{
    id: string;
    name: string;
    description: string;
    language: string;
  }>
> {
  try {
    // This would call ElevenLabs API to get available voices
    // For now, return a curated list of popular voices
    return [
      {
        id: "21m00Tcm4TlvDq8ikWAM",
        name: "Rachel",
        description: "Clear, professional female voice",
        language: "en",
      },
      {
        id: "EZaYIPSvPG85kYs3SXAl",
        name: "Gigi",
        description: "Warm, friendly female voice",
        language: "en",
      },
      {
        id: "TX3LPaxmHKQFdv7UY0lF",
        name: "Freya",
        description: "Energetic, youthful female voice",
        language: "en",
      },
      {
        id: "pNInz6obpgDQGcFmaJgB",
        name: "Antoni",
        description: "Deep, authoritative male voice",
        language: "en",
      },
      {
        id: "EZaYIPSvPG85kYs3SXAl",
        name: "Arnold",
        description: "Strong, commanding male voice",
        language: "en",
      },
    ];
  } catch (error) {
    console.error("Failed to get available voices:", error);
    return [];
  }
}
