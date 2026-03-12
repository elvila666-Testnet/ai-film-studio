import { invokeLLM } from "../_core/llm";
import { GeminiProvider } from "./providers/geminiProvider";
import { uploadBase64Image } from "../_core/gcs";

const geminiProvider = new GeminiProvider();

import { uploadExternalUrlToGCS } from "./storageService";
import { ENV } from "../_core/env";

/**
 * Ensures an image URL is a permanent GCS link.
 * If it's a base64 Data URI, uploads it to GCS.
 * If it's a temporary URL (like Replicate), downloads and uploads to GCS.
 */
export async function ensurePermanentUrl(url: string, folder: string = "generations"): Promise<string> {
  if (url.startsWith("data:image/")) {
    return await uploadBase64Image(url, folder);
  }

  if (url.startsWith("http") && ENV.gcsBucketName && !url.includes(`storage.googleapis.com/${ENV.gcsBucketName}`)) {
    try {
      const { url: newUrl } = await uploadExternalUrlToGCS(url, folder);
      return newUrl;
    } catch (e) {
      console.error("[ensurePermanentUrl] Failed to migrate external URL, using raw url:", url, e);
      return url;
    }
  }

  return url;
}


export const NANOBANANA_2_0_CRITERIA = `
**Nanobana 2.0 — IMAX Large Format Cinematography (MANDATORY):**
- **Camera System:** IMAX 65mm (15/70) Large Format Film.
- **Optics:** Panavision Primo 70 and System 65 lenses. Naturalistic 830nm visual acuity.
- **Color Science:** ACES v1.3 with KODAK 5219/2383 Film Print Emulation.
- **Lighting Architecture:** Volumetric Ray-Tracing (Global Illumination), Physical Sky 2.0.
- **Fidelity:** Micro-displacement mapping for realistic skin texture, fabric weave, and atmospheric dust.
`;

// Legacy alias for backward compatibility
export const NANOBANANA_PRO_CRITERIA = NANOBANANA_2_0_CRITERIA;



/**
 * Generate a film synopsis from a brief using Gemini API
 */
export async function generateSynopsisFromBrief(
  brief: string,
  globalNotes?: string
): Promise<string> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an award-winning screenwriter and story consultant. Your task is to generate a compelling, high-stakes film synopsis based on a project brief.
        
        Focus on:
        1. Protagonist: Clear identity and motivation.
        2. Inciting Incident: What kicks off the story.
        3. Core Conflict: The primary obstacle.
        4. Resolution: The ultimate outcome/theme.
        
        The synopsis should be evocative, structured, and feel marketable.`,
      },
      {
        role: "user",
        content: `Project Brief:
${brief}

${globalNotes ? `Director's Directives:
${globalNotes}` : ""}

Please write a detailed film synopsis.`,
      },
    ],
  });

  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("Failed to generate synopsis");
  return typeof content === "string" ? content : JSON.stringify(content);
}

/**
 * Generate a film script from a synopsis using Gemini API
 */
export async function generateScriptFromSynopsis(
  synopsis: string,
  globalNotes?: string
): Promise<string> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert screenwriter trained in cinematographic storytelling. Your goal is to expand the provided SYNOPSIS into a complete, professional screenplay.
        
        CRITICAL FORMATTING RULES:
        1. Use standard screenplay format.
        2. SCENE HEADINGS (sluglines) must be in ALL CAPS (e.g., INT. COFFEE SHOP - DAY).
        3. CHARACTER NAMES must be in ALL CAPS before their dialogue.
        4. Include detailed action lines describing lighting, camera angles, and mood.
        
        The script should feel cinematic and ready for a director's breakdown.`,
      },
      {
        role: "user",
        content: `Synopsis:
${synopsis}

${globalNotes ? `Director's Directives:
${globalNotes}` : ""}

Please write the complete film script.`,
      },
    ],
  });

  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("Failed to generate script from synopsis");
  return typeof content === "string" ? content : JSON.stringify(content);
}

/**
 * Generate a film script from a brief using Gemini API
 * Updated to support Apiyi for image generation
 */
export async function generateScriptFromBrief(
  brief: string,
  globalNotes?: string
): Promise<string> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an award-winning screenwriter and director. Your task is to generate a professional, CINEMATOGRAPHIC film script based on a project brief.
        
        CRITICAL FORMATTING RULES:
        1. Use standard screenplay format.
        2. SCENE HEADINGS (sluglines) must be in ALL CAPS.
        3. CHARACTER NAMES must be in ALL CAPS before dialogue.
        4. Include VISUAL DIRECTIVES in action lines (e.g., "CLOSE-UP on his trembling hand", "The lighting is LOW-KEY and DRAMATIC").
        5. Balance dialogue with rich, visual world-building.
        
        The script should feel professional, engaging, and visually evocative.`,
      },
      {
        role: "user",
        content: `Project Brief:
${brief}

${globalNotes ? `Director's Directives (Apply project-wide):
${globalNotes}` : ""}

Please write a detailed, cinematographic film script that strictly follows the brief and directives.`,
      },
    ],
  });

  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("Failed to generate script");
  return typeof content === "string" ? content : JSON.stringify(content);
}

/**
 * Refine a script with notes using Gemini API
 */
export async function refineScriptWithNotes(
  script: string,
  notes: string,
  globalNotes?: string
): Promise<string> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert screenwriter. Refine and improve the provided script based on the director's notes.
        Maintain the overall structure but incorporate the feedback to enhance the script.`,
      },
      {
        role: "user",
        content: `Current Script:
${script}

Refinement Notes:
${notes}

${globalNotes ? `Persistent Directives:
${globalNotes}` : ""}

Please refine the script while keeping the core vision intact and following the directives.`,
      },
    ],
  });

  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("Failed to refine script");
  return typeof content === "string" ? content : JSON.stringify(content);
}

/**
 * Generate master visual style from script using Gemini API
 */
export async function generateMasterVisualStyle(
  script: string,
  globalNotes?: string
): Promise<string> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a professional cinematographer and visual director. 
        Create a comprehensive master visual style guide based on the provided script.
        Include details about color palette, lighting approach, camera movements, composition style, and overall aesthetic.`,
      },
      {
        role: "user",
        content: `Based on this script, create a detailed visual style guide:
${script}

${globalNotes ? `Director's Directives:
${globalNotes}` : ""}`,
      },
    ],
  });

  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("Failed to generate visual style");
  return typeof content === "string" ? content : JSON.stringify(content);
}

/**
 * Generate a Production Design look / World Building
 */
export async function generateProductionDesignLook(
  script: string,
  brandContext?: string,
  globalNotes?: string
): Promise<string> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a visionary Production Designer. Based on the script provided, you need to describe the physical world of the story. Include Key Locations (EXT/INT), Hero Props, Set Decoration Style, and Costume Palette. Ensure it visually matches the brand's aesthetic. Return a highly descriptive text.`
      },
      {
        role: "user",
        content: `Script:\n${script}\n\n${brandContext ? `Brand Guidelines:\n${brandContext}\n\n` : ""}${globalNotes ? `Director's Directives:\n${globalNotes}` : ""}`
      }
    ]
  });

  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("Failed to generate production design look");
  return typeof content === "string" ? content : JSON.stringify(content);
}

/**
 * Refine master visual style with notes using Gemini API
 */
export async function refineMasterVisualStyle(
  visualStyle: string,
  notes: string,
  globalNotes?: string
): Promise<string> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a professional cinematographer. Refine the visual style guide based on the director's feedback.`,
      },
      {
        role: "user",
        content: `Here is the current visual style guide:
${visualStyle}

Refinement Request:
${notes}

${globalNotes ? `Persistent Directives:
${globalNotes}` : ""}

Please refine the guide while maintaining consistency with the directives.`,
      },
    ],
  });

  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("Failed to refine visual style");
  return typeof content === "string" ? content : JSON.stringify(content);
}

/**
 * Generate technical shots from script and visual style using Gemini API
 */
export async function generateTechnicalShots(
  script: string,
  visualStyle: string,
  globalNotes?: string,
  brandContext?: string
): Promise<Array<{ shot: number; tipo_plano: string; movimiento: string; accion: string; intencion: string; tecnica: string; iluminacion: string; audio: string }>> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert AI Cinematographer. Your goal is to translate narrative intent into precise technical camera directions.
        
        EMOTION-TO-MOVEMENT FRAMEWORK:
        - Intimacy/Realization: "Slow Dolly In"
        - Urgency/Shock: "Fast Dolly In" or "Crash Zoom"
        - Context/Isolation: "Dolly Out" or "Crane Up"
        - Power/Dominance: "Low Angle" or "Pedestal Up"
        - Unease/Chaos: "Handheld" or "Dutch Angle"
        - Showcase: "Orbit 180" or "Slow Cinematic Arc"

        OPTICS & LIGHTING:
        - Lenses: Specify focal length (e.g., 35mm, 50mm Anamorphic, 85mm) and aperture (e.g., f/1.2, f/2.8).
        - Atmosphere: Use terms like "Volumetric lighting," "Chiaroscuro," "Golden Hour," "High Key," "Rembrandt."

        RETURN A JSON OBJECT with a "shots" array. Each shot object must have these EXACT keys:
        - "shot" (number)
        - "tipo_plano" (string): Shot Type (e.g., Medium Shot, Close-Up)
        - "movimiento" (string): Camera Movement (from database above)
        - "accion" (string): What happens in this shot
        - "intencion" (string): Emotional intent
        - "tecnica" (string): Lens focal length, aperture, film grain details
        - "iluminacion" (string): Lighting setup and mood
        - "audio" (string): Sound design, ambient noise, or key dialogue
        
        Example:
        {
          "shots": [
            { "shot": 1, "tipo_plano": "Close-Up", "movimiento": "Slow Dolly In", "accion": "Hero realizes betrayal", "intencion": "Intimacy/Realization", "tecnica": "50mm Anamorphic, f/2.8, Film Grain", "iluminacion": "Low Key, Chiaroscuro", "audio": "Tense silence, distant clock ticking" }
          ]
        }
        
        ${brandContext ? `### BRAND GUIDELINES ###\n${brandContext}\n\nStrictly follow the brand voice and aesthetic rules for every shot.` : ""}`,
      },
      {
        role: "user",
        content: `Break down this script into a technical shot list based on the visual style: ${visualStyle}
        
        ${globalNotes ? `Director's Directives:\n${globalNotes}\n` : ""}
        
        Script:
        ${script}`,
      },
    ],
    // Remove strict json_schema to avoid compatibility issues
    response_format: { type: "json_object" }
  });

  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("Failed to generate technical shots");

  console.log("[AI Service] Raw generateTechnicalShots response:", content);

  try {
    const contentStr = typeof content === "string" ? content : JSON.stringify(content);
    const cleanContent = contentStr.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(cleanContent);
    console.log("[AI Service] Parsed JSON structure:", Object.keys(parsed));

    // Handle various response shapes
    if (Array.isArray(parsed)) {
      console.log("[AI Service] Response is direct array, length:", parsed.length);
      return parsed;
    }
    if (parsed.shots && Array.isArray(parsed.shots)) {
      console.log("[AI Service] Found shots array, length:", parsed.shots.length);
      return parsed.shots;
    }

    const values = Object.values(parsed);
    const foundArray = values.find(v => Array.isArray(v) && v.length > 0 && 'shot' in v[0]);
    if (foundArray) {
      console.log("[AI Service] Found array in values, length:", (foundArray as any).length)
      return foundArray as any;
    }

    return [];
  } catch (error) {
    console.warn("Failed to parse technical shots JSON:", error);
    return [];
  }
}

/**
 * Generate an image prompt for a shot using Gemini API
 */
export async function generateImagePromptForShot(
  shot: any, // Accepts the DB shot containing the deep `aiBlueprint` JSON
  visualStyle: string,
  globalNotes?: string,
  characterPersona?: string
): Promise<string> {
  const blueprint = shot.aiBlueprint || shot; // Fallback to raw object if passed directly

  // Extract nested features if available from the new Cinema Pipeline
  const director = blueprint.directorIntent || {};
  const camera = blueprint.cameraSpecs || {};
  const pd = blueprint.productionDesign || {};
  const sound = blueprint.soundArchitecture || {};

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert AI Video Prompt Engineer specialized in Nano Pro models. Your goal is to construct high-fidelity generation prompts using a narrative description approach.

        PROMPT PHILOSOPHY:
        Describe the scene as a cohesive narrative paragraph. Move away from simple keyword lists.

        6-POINT MASTER FORMULA:
        1. Subject: Highly specific identity and emotional state.
        2. Action: Clear movement or blocking.
        3. Environment: Detailed setting, architecture, and textures.
        4. Art Style & Optics: Technical specs (lens, T-stop, film stock).
        5. Lighting: Specific light qualities and atmosphere.
        6. Details: Fine-grained atmospheric elements.
        
        SYNTAX RULES:
        Separate the result into [Visuals] and [Dialogue/Audio] tags.

        EXAMPLE FORMAT:
        [Visuals] [Narrative Paragraph incorporating the 6-point formula]. [Specific technical camera specs and lighting directives].
        
        [Dialogue/Audio] [Sound Design/Spoken Lines]. [Negative Prompts]`,
      },
      {
        role: "user",
        content: `Shot Breakdown (Cinema Pipeline Blueprint):
        - Shot No: ${shot.shot || shot.order}
        - Framing & Movement: ${camera.shotType || shot.tipo_plano || 'Cinematic'} | ${camera.movementLogic || shot.movimiento}
        - Technical Optics: Lens: ${camera.lensStrategy || shot.tecnica}, Aperture: ${camera.tStop}, Focus: ${camera.focusStrategy}
        - Lighting & Atmosphere: ${camera.lightingSpec || shot.iluminacion} | ${pd.environmentalAtmosphere}
        - Production Design: ${pd.architectureStyle}, Materials: ${pd.materials}, Palette: ${pd.colorPalette}
        - Audio/Dialogue: ${sound.environmentalSoundscape || shot.audio}
        - Narrative Action: ${director.visualDescription || shot.accion}
        - Emotional Intent: ${director.emotionalObjective || shot.intencion}
        
        Master Visual Style Guide:
        ${visualStyle}
        
        ${characterPersona ? `LOCKED CHARACTER (VISUAL ANCHOR):\n${characterPersona}` : ""}
        
        ${globalNotes ? `DIRECTOR'S GLOBAL MANDATE:\n${globalNotes}` : ""}
        
        ${NANOBANANA_2_0_CRITERIA ? `NANOBANANA 2.0 CINEMATIC STYLE:\n${NANOBANANA_2_0_CRITERIA}` : ""}
        
        Construct a technical, highly descriptive cinematic image prompt based on these deep parameters.`,
      },
    ],
  });

  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("Failed to generate image prompt");
  return typeof content === "string" ? content : JSON.stringify(content);
}

/**
 * Refine an image prompt based on director notes using Gemini API
 */
export async function refineImagePrompt(
  currentPrompt: string,
  directorNotes: string
): Promise<string> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert at refining image generation prompts. 
        Improve the prompt based on the director's feedback while maintaining the core concept.`,
      },
      {
        role: "user",
        content: `Current prompt:\n${currentPrompt}\n\nDirector's notes:\n${directorNotes}\n\nPlease refine the prompt.`,
      },
    ],
  });

  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("Failed to refine image prompt");
  return typeof content === "string" ? content : JSON.stringify(content);
}

/**
 * Generate a storyboard image using Replicate
 */
export async function generateStoryboardImage(prompt: string, modelId?: string, projectId?: number, userId?: string, resolution: string = "1024x1024"): Promise<string> {
  // Map friendly names to Replicate model IDs
  let geminiModelId = "imagen-4.0-generate-001"; // Canonical: Nano Banana 2

  if (modelId === "flux-fast" || modelId === "Flux" || modelId === "apiyi-default") geminiModelId = "imagen-4.0-generate-001";
  if (modelId === "Nano Banana") geminiModelId = "imagen-4.0-generate-001";
  if (modelId === "Nanobana 2.0" || modelId === "nanobana-2.0" || modelId === "Nano Banana 2" || modelId === "nanobana-2.0" || modelId === "flux-pro") geminiModelId = "imagen-4.0-generate-001";
  if (modelId === "Seadream 4.5") geminiModelId = "imagen-4.0-generate-001";

  try {
    const result = await geminiProvider.generateImage({
      prompt,
      resolution: resolution as any,
      quality: "standard",
      projectId,
      userId
    }, geminiModelId);
    const rawUrl = typeof result.url === 'string' ? result.url : String(result.url);
    const url = await ensurePermanentUrl(rawUrl, "storyboards");
    return url;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[AI Service] Replicate storyboard generation failed:", message);
    throw new Error(`Storyboard synthesis failed: ${message}`);
  }
}

/**
 * Generate a storyboard GRID image (3×4 layout) using landscape aspect ratio
 * Uses 1792x1024 → maps to 16:9 landscape in provider
 */
export async function generateGridImage(prompt: string, projectId?: number, userId?: string, characterReferenceUrl?: string, setReferenceUrl?: string): Promise<string> {
  const geminiModelId = "imagen-3.0-generate-001"; // Use imagen-3.0 which is better supported by Vertex AI

  try {
    // Assemble visual anchor references (character + set)
    const imageInputs: string[] = [];
    if (characterReferenceUrl) imageInputs.push(characterReferenceUrl);
    if (setReferenceUrl) imageInputs.push(setReferenceUrl);

    const result = await geminiProvider.generateImage({
      prompt,
      resolution: "1792x1024", // Standardize to 16:9 Landscape for cinematic 16:9 panels (3 cols x 4 rows)
      quality: "hd",
      projectId,
      userId,
      ...(imageInputs.length > 0 ? { imageInputs } : {}),
    }, geminiModelId);
    const rawUrl = typeof result.url === 'string' ? result.url : String(result.url);
    const url = await ensurePermanentUrl(rawUrl, "grids");
    console.log(`[AI Service] Grid successfully generated with visual anchors (character + set): ${url}`);
    return url;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[AI Service] Grid generation failed:", message);
    throw new Error(`Grid synthesis failed: ${message}`);
  }
}


/**
 * Generate storyboard image with character consistency
 */
export async function generateStoryboardImageWithConsistency(
  prompt: string,
  characterReference?: Record<string, string>,
  seed?: number,
  modelId?: string,
  qualityTier: "fast" | "quality" = "fast",
  projectId?: number,
  userId?: string
): Promise<{ url: string; seed: number }> {
  const { generateConsistentPrompt, generateSeed } = await import("./characterConsistency");

  const finalSeed = seed || generateSeed(Date.now(), Math.random() * 10000);
  const finalPrompt = characterReference
    ? generateConsistentPrompt(prompt, characterReference, "storyboard shot")
    : prompt;

  let geminiModelId = modelId || "imagen-4.0-generate-001";

  // Tier-based override if no specific modelId or generic name used
  if (!modelId || modelId === "Flux" || modelId === "Nano Banana") {
    if (qualityTier === "quality") {
      geminiModelId = "imagen-4.0-generate-001";
    } else {
      geminiModelId = "imagen-4.0-generate-001";
    }
  }

  if (modelId === "Nanobana 2.0" || modelId === "nanobana-2.0" || modelId === "Nano Banana 2" || modelId === "nanobana-2.0" || modelId === "flux-pro") geminiModelId = "imagen-4.0-generate-001";
  if (modelId === "Seadream 4.5") geminiModelId = "imagen-4.0-generate-001";

  try {
    const result = await geminiProvider.generateImage({
      prompt: finalPrompt,
      resolution: "1024x1024",
      quality: qualityTier === "quality" ? "hd" : "standard",
      seed: finalSeed,
      projectId,
      userId
    }, geminiModelId);
    const rawUrl = typeof result.url === 'string' ? result.url : String(result.url);
    const url = await ensurePermanentUrl(rawUrl, "consistent-shots");
    return { url, seed: finalSeed };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[AI Service] Replicate consistency generation failed:", message);
    throw new Error(`Consistent synthesis failed: ${message}`);
  }
}

/**
 * Generate storyboard image variation with different perspective
 */
export async function generateStoryboardImageVariation(
  basePrompt: string,
  characterReference: Record<string, string>,
  variationIndex: number,
  modelId?: string,
  projectId?: number,
  userId?: string
): Promise<{ url: string; seed: number }> {
  const { generateVariationPrompt, generateSeed } = await import("./characterConsistency");

  const finalSeed = generateSeed(Date.now(), variationIndex);
  const finalPrompt = generateVariationPrompt(basePrompt, characterReference, variationIndex);

  let geminiModelId = modelId || "imagen-4.0-generate-001";

  if (modelId === "Flux") geminiModelId = "imagen-4.0-generate-001";
  if (modelId === "Nano Banana") geminiModelId = "imagen-4.0-generate-001";
  if (modelId === "Nanobana 2.0" || modelId === "nanobana-2.0" || modelId === "Nano Banana 2" || modelId === "nanobana-2.0" || modelId === "flux-pro") geminiModelId = "imagen-4.0-generate-001";
  if (modelId === "Seadream 4.5") geminiModelId = "imagen-4.0-generate-001";

  try {
    const result = await geminiProvider.generateImage({
      prompt: finalPrompt,
      resolution: "1024x1024",
      quality: "standard",
      seed: finalSeed,
      projectId,
      userId
    }, geminiModelId);
    const url = await ensurePermanentUrl(result.url, "variations");
    return { url, seed: finalSeed };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[AI Service] Replicate variation generation failed:", message);
    throw new Error(`Variation synthesis failed: ${message}`);
  }
}

/**
 * Generate a structured style guide from script and visual style using Gemini API
 */
export async function generateStyleGuideJSON(
  script: string,
  visualStyle: string,
  globalNotes?: string,
  brandDNA?: string
): Promise<any> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are the ART_DIRECTOR_ORCHESTRATOR. 
Create a comprehensive, structured visual style guide and mood board plan based on the script and visual directives.

### MISSION: COMPLETE VISUAL LOOK ###
Your goal is to provide 4 HIGH-FIDELITY, NANO-PRO READY prompts that represent the complete visual architecture of the project.

### CRITICAL CONSTRAINTS ###
1. NARRATIVE CONTRAST: Every prompt must reflect the core tension and atmosphere defined in the script.
2. PRODUCTION DESIGN: Focus on high-fidelity materials, textures, and hero props.
3. NO HMIs: Cinematography prompts MUST prioritize natural/practical light. STRICTLY BAN studio fixtures for outdoor scenes.
4. BRAND ALIGNMENT: Incorporate the Brand DNA into the visual prompts if provided.

OUTPUT REQUIREMENTS (JSON):
{
  "colorPalette": {
    "primary": { "hex": string, "name": string, "psychology": string, "usage": string },
    "secondary": { "hex": string, "name": string, "psychology": string, "usage": string },
    "accent": { "hex": string, "name": string, "psychology": string, "usage": string },
    "neutral": [{ "hex": string, "name": string, "psychology": string, "usage": string }],
    "psychology": "Atmospheric intent"
  },
  "typography": {
    "headingFont": { "name": string, "weight": string, "characteristics": string, "usage": string },
    "bodyFont": { "name": string, "weight": string, "characteristics": string, "usage": string },
    "lineHeight": string,
    "spacing": string
  },
  "composition": {
    "aspectRatios": ["16:9"],
    "gridSystem": string,
    "balanceStyle": string,
    "depthTechniques": string[],
    "focusPoints": string
  },
  "textures": string[],
  "moodDescription": "Overall visual atmosphere",
  "visualReferencePrompts": [
    "CINEMATOGRAPHY REFERENCE: [Core Concept] High-fidelity technical camera prompt...",
    "PRODUCTION DESIGN REFERENCE: [Material/Set Detail] Master Art Direction prompt...",
    "ENVIRONMENT REFERENCE: [World Building] Atmospheric landscape prompt...",
    "TEXTURE & COLOR REFERENCE: [Micro Detail] Abstract material study prompt..."
  ]
}

${brandDNA ? `\nBrand DNA Context:\n${brandDNA}` : ""}
${globalNotes ? `\nGlobal Notes:\n${globalNotes}` : ""}

Every prompt in "visualReferencePrompts" MUST incorporate the brand hex codes (if any) and technical cinematic language.`
      },
      {
        role: "user",
        content: `Script:
${script}

Visual Style:
${visualStyle}

${globalNotes ? `Director's Directives:
${globalNotes}` : ""}

Please generate the structured style guide JSON.`,
      },
    ],
    response_format: { type: "json_object" }
  });

  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("Failed to generate style guide");

  try {
    const contentStr = typeof content === "string" ? content : JSON.stringify(content);
    const cleanContent = contentStr.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanContent);
  } catch (error) {
    console.warn("Failed to parse style guide JSON:", error);
    throw new Error("Failed to parse AI response");
  }
}

/**
 * Generate a specific pose for a character using Replicate
 */
export async function generateCharacterPose(
  character: { imageUrl: string; traits?: string | null },
  pose: "Close-up" | "Medium Shot" | "Full Body"
): Promise<string> {
  // Lazy load to avoid circular deps if any
  const { isDevModeEnabled } = await import("../_core/devMode");

  // Replicate provider is already initialized at module level
  const geminiModelId = "imagen-4.0-generate-001"; // High fidelity

  if (isDevModeEnabled()) {
    const { mockImageGeneration } = await import("./mockData");
    return mockImageGeneration(pose);
  }

  // Use provider from module scope
  // We need to access the exported geminiProvider or create a new one?
  // geminiProvider is not exported. But we are inside the module.
  // Wait, geminiProvider is defined at line 8.

  // Logic: 
  const prompt = `A cinematic ${pose} of a character. ${character.traits || "A person"}. High quality, 8k, photorealistic, film grain.`;

  // We need to use the geminiProvider instance defined in this file.
  // BUT the file view shows it at line 8.
  // Is it accessible? Yes, module scope.

  // I will use it directly.

  // However, I need to make sure I am not breaking anything.
  // I'll use the same pattern as other functions.

  // We need to make sure we import geminiProvider if it's not available? No it is in same file.

  // BUT checking the file 251, it is there.
  // However, I need to make sure I don't reference it if it's not in scope of function? It is in module scope.

  // One catch: this new function is at the end of the file.

  try {
    // We need to handle the case where geminiProvider might strictly expect some params.
    // Looking at previous usages (e.g. generateStoryboardImageWithConsistency), it uses geminiProvider.generateImage
    // Let's assume usage is similar.

    // Note: geminiProvider generic usage
    // We need to ensure geminiProvider is reachable.
    // It is const geminiProvider = ... at top level.

    // Re-declaring it locally just in case or using the top level one.
    // Top level one is fine.

    const result = await geminiProvider.generateImage({
      prompt,
      resolution: "1024x1024",
      quality: "hd",
    }, geminiModelId);

    const url = await ensurePermanentUrl(result.url, "poses");
    return url;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to generate character pose:", message);
    throw new Error(`Failed to generate character pose: ${message}`);
  }
}

/**
 * Analyze script and break it down into scenes using Gemini API
 */
export async function analyzeScriptToScenes(
  script: string,
  globalNotes?: string
): Promise<Array<{ order: number; title: string; description: string }>> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a world-class Director and Script Analyst. 
        Analyze the screenplay provided and break it down into individual SCENES, providing a rich "Director's Vision" for each.
        
        For each scene, extract:
        - Order (sequential number)
        - Title (Slugline)
        - Description: A "Narrative-Visual Synthesis." Do not just summarize dialogue. Describe the ATMOSPHERE, the LIGHTING intent (e.g., "Volumetric dust motes in cold moonlight"), the MOOD, and the specific CHARACTER ENERGY that should be reflected in storyboards.

        RETURN A JSON OBJECT with a "scenes" array.
        Example:
        {
          "scenes": [
            { "order": 1, "title": "EXT. CITY - DAY", "description": "High-angle establishing shot of the futuristic metropolis. Volumetric smog chokes the sunlight. The architecture feels oppressive and monolithic." },
            { "order": 2, "title": "INT. APARTMENT - DAY", "description": "Hero wakes up in a claustrophobic pod. Harsh, flickering fluorescent lighting. The mood is isolation and cold utility." }
          ]
        }`,
      },
      {
        role: "user",
        content: `Break down this script into scenes:
        
        ${script}

        ${globalNotes ? `Director's Notes: ${globalNotes}` : ""}`,
      },
    ],
    response_format: { type: "json_object" }
  });

  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("Failed to analyze script");

  try {
    const contentStr = typeof content === "string" ? content : JSON.stringify(content);
    const cleanContent = contentStr.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanContent);
    return parsed.scenes || [];
  } catch (error) {
    console.warn("Failed to parse scenes JSON:", error);
    return [];
  }
}

export const PCI_1_REFERENCE_PROMPT = (description: string) => `**Photorealistic Character Identity Sheet (Using a Reference Image)**

**Prompt**
Create a **photorealistic multi-angle photographic identity sheet** based **strictly** on the uploaded reference image.

- Match the **exact real-world appearance** of the person: facial structure, proportions, skin texture, age, asymmetry, and natural imperfections.
- The result must look like **real photography of a real human**, not a digital character or 3D asset.
- Use a **simple, neutral background**, similar to a studio or indoor wall.
- The overall feeling should be **documentary and natural**, not stylized or cinematic.

**Layout**
- **Two horizontal rows**, presented as a clean photo contact sheet.
- **Top row:** four full-body photographs of the same person:
    1. Facing the camera
    2. Standing in side profile (left)
    3. Standing in side profile (right)
    4. Facing away from the camera
- **Bottom row:** four headshot/portrait photographs of the same person:
    1. Looking at the camera (straight on)
    2. Half-profile (left)
    3. Half-profile (right)
    4. Close-up on eyes/facial texture.

**Lighting & Quality**
- Pure photographic quality. 35mm lens, f/8 aperture for deep focus. No shallow depth of field. Soft, even studio lighting. No heavy shadows, no lens flares. 4k resolution, high-octane render, masterpiece, raw photo.

[REFERENCE DESCRIPTION]:
${description}`;

export const PCI_2_DESCRIPTION_PROMPT = (description: string) => `**Photorealistic Character Identity Sheet (Description Only)**

**Prompt**
Create a **photorealistic multi-angle photographic identity sheet** for a character based on the following description.

[CHARACTER DESCRIPTION]:
${description}

- The character must have a **distinct and consistent real-world appearance** across all angles: specific facial structure, proportions, skin texture, and age.
- The result must look like **real photography of a real human**, not a digital character or 3D asset.
- Use a **simple, neutral background**, similar to a studio or indoor wall.
- The overall feeling should be **documentary and natural**, not stylized or cinematic.

**Layout**
- **Two horizontal rows**, presented as a clean photo contact sheet.
- **Top row:** four full-body photographs of the same person:
    1. Facing the camera
    2. Standing in side profile (left)
    3. Standing in side profile (right)
    4. Facing away from the camera
- **Bottom row:** four headshot/portrait photographs of the same person:
    1. Looking at the camera (straight on)
    2. Half-profile (left)
    3. Half-profile (right)
    4. Close-up on eyes/facial texture.

**Lighting & Quality**
- Pure photographic quality. 35mm lens, f/8 aperture for deep focus. No shallow depth of field. Soft, even studio lighting. No heavy shadows, no lens flares. 4k resolution, high-octane render, masterpiece, raw photo.`;

export const PCI_3_WARDROBE_PROMPT = (outfitDescription: string) => `Use the same photographic identity sheet as reference.
- Maintain the exact same person: face, body, age, proportions, posture, and expression.
- Change only the clothing to the following: ${outfitDescription}

Constraints:
- The clothing must behave like real fabric on a real body.
- No change to lighting, camera angle, or body posture.`;

/**
 * Generate a Nano Pro Character Reference Sheet
 * Uses PCI (Photorealistic Character Identity) standards
 */
export async function generateCharacterNano(
  description: string,
  referenceImages: string[],
  projectId?: number,
  userId?: string,
  isWardrobeChange: boolean = false,
  seed?: number
): Promise<string> {
  const geminiModelId = "imagen-4.0-generate-001";

  let finalPrompt = "";
  if (isWardrobeChange) {
    finalPrompt = PCI_3_WARDROBE_PROMPT(description);
  } else if (referenceImages.length > 0) {
    finalPrompt = PCI_1_REFERENCE_PROMPT(description);
  } else {
    finalPrompt = PCI_2_DESCRIPTION_PROMPT(description);
  }

  try {
    const result = await geminiProvider.generateImage({
      prompt: finalPrompt,
      resolution: "1024x1344",
      quality: "hd",
      projectId,
      userId,
      seed,
      ...(referenceImages.length > 0 ? { imageInputs: referenceImages } : {})
    }, geminiModelId);

    const url = await ensurePermanentUrl(result.url, "characters");
    return url;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[AI Service] PCI Character generation failed:", message);
    throw new Error(`Character synthesis failed: ${message}`);
  }
}

/**
 * Upscales an image to 4k using a high-fidelity Replicate upscaler natively
 */
export async function upscaleImageTo4k(
  imageUrl: string
): Promise<string> {
  try {
    return await geminiProvider.upscaleImage(imageUrl, 4);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[AI Service] 4K Upscale failed:", message);
    throw new Error(`Upscale synthesis failed: ${message}`);
  }
}

/**
 * Generate a visual portrait of a Production Design Set.
 */
export async function generateSetNano(
    description: string,
    projectId?: number,
    userId?: string
): Promise<string> {
    const geminiModelId = "imagen-4.0-generate-001";
    const prompt = `8K RAW cinematic master set photograph. PRODUCTION DESIGN ARCHITECTURE: ${description}. 
    Focus on physical set construction, tactile materials (concrete, aged wood, brushed metal), atmospheric depth, and realistic global illumination. 
    Cinematography: Panavision Primo 70 lenses, 1.33x Anamorphic squeeze, ACES color science. 
    Strictly: NO CONCEPT ART, NO PEOPLE, NO STUDIO LIGHTS IN FRAME. This must look like an actual location on a film set.`;

    try {
        console.log(`[AI Service] Generating set image with prompt: ${prompt.substring(0, 100)}...`);
        const result = await geminiProvider.generateImage({
            prompt,
            resolution: "1792x1024",
            quality: "hd",
            projectId,
            userId,
        }, geminiModelId);
        console.log(`[AI Service] Set image generation success.`);
        return await ensurePermanentUrl(result.url, "sets");
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[AI Service] Set generation failed:", message);
        throw new Error(`Set synthesis failed: ${message}`);
    }
}

/**
 * Generate a high-fidelity image of a hero prop.
 */
export async function generatePropNano(
    description: string,
    projectId?: number,
    userId?: string
): Promise<string> {
    const geminiModelId = "imagen-4.0-generate-001";
    const prompt = `8K RAW MACRO product photography of a HERO PROP: ${description}. 
    Extreme fidelity on materials, surface wear, mechanical imperfections, and high-resolution textures. 
    Lighting: Precise cinematic rim lighting, volumetric depth, ACES color space. 
    Strictly: Isolated on a professional, dark neutral cinematic staging area. No people.`;

    try {
        const result = await geminiProvider.generateImage({
            prompt,
            resolution: "1024x1024",
            quality: "hd",
            projectId,
            userId,
        }, geminiModelId);
        return await ensurePermanentUrl(result.url, "props");
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[AI Service] Prop generation failed:", message);
        throw new Error(`Prop synthesis failed: ${message}`);
    }
}

