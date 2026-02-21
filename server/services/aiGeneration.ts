import { invokeLLM } from "../_core/llm";
import { ReplicateProvider } from "./providers/replicateProvider";
import { ENV } from "../_core/env";

const replicateProvider = new ReplicateProvider(ENV.replicateApiKey);
// Apiyi provider will be instantiated dynamically to allow DB config updates



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
  shot: { shot: number; tipo_plano: string; accion: string; intencion: string; movimiento?: string; tecnica?: string; iluminacion?: string; audio?: string },
  visualStyle: string,
  globalNotes?: string,
  characterPersona?: string
): Promise<string> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert AI Video Prompt Engineer specialized in Nano Pro models. Your goal is to construct high-fidelity generation prompts using a narrative description approach.

        PROMPT PHILOSOPHY:
        Describe the scene as a cohesive narrative paragraph. Move away from simple keyword lists.

        6-POINT MASTER FORMULA:
        1. Subject: Highly specific identity (e.g., "a weathered sailor with a silver beard").
        2. Action: Clear movement or state (e.g., "staring intensely at the horizon").
        3. Environment: Detailed setting and atmosphere (e.g., "on the deck of a wooden ship during a storm").
        4. Art Style & Optics: Technical specs (e.g., "shot on 35mm anamorphic lenses," "high-contrast cinematic film").
        5. Lighting: Specific light qualities (e.g., "dramatic rim lighting," "volumetric lightning").
        6. Details: Fine-grained atmospheric elements (e.g., "sea spray catching the light," "shaking camera").
        
        SYNTAX RULES:
        Separate the result into [Visuals] and [Dialogue/Audio] tags.

        EXAMPLE FORMAT:
        [Visuals] [Narrative Paragraph incorporating the 6-point formula]. [Specific technical camera specs and lighting directives].
        
        [Dialogue/Audio] [Sound Design/Spoken Lines]. [Negative Prompts: no people, text, watermark, camera info, distorted face].`,
      },
      {
        role: "user",
        content: `Shot Breakdown:
        - Shot No: ${shot.shot}
        - Framing: ${shot.tipo_plano}
        - Movement: ${shot.movimiento || 'Dynamic'}
        - Technical: ${shot.tecnica || 'Cinematic'}
        - Lighting: ${shot.iluminacion || 'Atmospheric'}
        - Audio/Dialogue: ${shot.audio || 'Ambient'}
        - Narrative Action: ${shot.accion}
        - Emotional Intent: ${shot.intencion}
        
        Master Visual Style Guide:
        ${visualStyle}
        
        ${characterPersona ? `LOCKED CHARACTER (VISUAL ANCHOR):
        ${characterPersona}` : ""}
        
        ${globalNotes ? `DIRECTOR'S GLOBAL MANDATE:
        ${globalNotes}` : ""}
        
        Construct a technical, highly descriptive cinematic image prompt based on these parameters.`,
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
export async function generateStoryboardImage(prompt: string, modelId?: string, projectId?: number, userId?: string): Promise<string> {
  // Map friendly names to Replicate model IDs
  let replicateModelId = modelId || "black-forest-labs/flux-schnell";

  if (modelId === "flux-fast" || modelId === "Flux") replicateModelId = "black-forest-labs/flux-schnell";
  if (modelId === "Nano Banana") replicateModelId = "black-forest-labs/flux-1.1-pro";
  if (modelId === "Nano Banana Pro") replicateModelId = "black-forest-labs/flux-1.1-pro-ultra";
  if (modelId === "Seadream 4.5") replicateModelId = "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b";

  try {
    const result = await replicateProvider.generateImage({
      prompt,
      resolution: "1024x1024",
      quality: "standard",
      projectId,
      userId
    }, replicateModelId);
    return result.url;
  } catch (error: any) {
    console.error("[AI Service] Replicate generation failed:", error);
    throw new Error(`Cinematic synthesis failed: ${error.message || error}`);
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

  let replicateModelId = modelId || "black-forest-labs/flux-schnell";

  // Tier-based override if no specific modelId or generic name used
  if (!modelId || modelId === "Flux" || modelId === "Nano Banana") {
    if (qualityTier === "quality") {
      replicateModelId = "black-forest-labs/flux-1.1-pro";
    } else {
      replicateModelId = "black-forest-labs/flux-schnell";
    }
  }

  if (modelId === "Nano Banana Pro") replicateModelId = "black-forest-labs/flux-1.1-pro-ultra";
  if (modelId === "Seadream 4.5") replicateModelId = "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b";

  try {
    const result = await replicateProvider.generateImage({
      prompt: finalPrompt,
      resolution: "1024x1024",
      quality: qualityTier === "quality" ? "hd" : "standard",
      seed: finalSeed,
      projectId,
      userId
    }, replicateModelId);
    return { url: result.url, seed: finalSeed };
  } catch (error: any) {
    console.error("[AI Service] Replicate consistency generation failed:", error);
    throw new Error(`Consistent synthesis failed: ${error.message || error}`);
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

  let replicateModelId = modelId || "black-forest-labs/flux-schnell";

  if (modelId === "Flux") replicateModelId = "black-forest-labs/flux-schnell";
  if (modelId === "Nano Banana") replicateModelId = "black-forest-labs/flux-1.1-pro";
  if (modelId === "Nano Banana Pro") replicateModelId = "black-forest-labs/flux-1.1-pro-ultra";
  if (modelId === "Seadream 4.5") replicateModelId = "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b";

  try {
    const result = await replicateProvider.generateImage({
      prompt: finalPrompt,
      resolution: "1024x1024",
      quality: "standard",
      seed: finalSeed,
      projectId,
      userId
    }, replicateModelId);
    return { url: result.url, seed: finalSeed };
  } catch (error: any) {
    console.error("[AI Service] Replicate variation generation failed:", error);
    throw new Error(`Variation synthesis failed: ${error.message || error}`);
  }
}

/**
 * Generate a structured style guide from script and visual style using Gemini API
 */
export async function generateStyleGuideJSON(
  script: string,
  visualStyle: string,
  globalNotes?: string
): Promise<any> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a professional Art Director and Production Designer.
        Create a comprehensive, structured visual style guide and mood board plan based on the script and visual directives.
        
        The output must be a valid JSON object with the following structure:
        {
          "colorPalette": {
            "primary": { "hex": "#...", "name": "...", "psychology": "...", "usage": "..." },
            "secondary": { "hex": "#...", "name": "...", "psychology": "...", "usage": "..." },
            "accent": { "hex": "#...", "name": "...", "psychology": "...", "usage": "..." },
            "neutral": [{ "hex": "#...", "name": "...", "psychology": "...", "usage": "..." }],
            "psychology": "Overall palette description"
          },
          "typography": {
            "headingFont": { "name": "...", "weight": "...", "characteristics": "...", "usage": "..." },
            "bodyFont": { "name": "...", "weight": "...", "characteristics": "...", "usage": "..." },
            "lineHeight": "...",
            "spacing": "..."
          },
          "composition": {
            "aspectRatios": ["..."],
            "gridSystem": "...",
            "balanceStyle": "...",
            "depthTechniques": ["..."],
            "focusPoints": "..."
          },
          "textures": ["...", "..."],
          "moodDescription": "Detailed atmospheric description...",
          "visualReferencePrompts": [
            "Detailed image generation prompt for mood board image 1...",
            "Detailed image generation prompt for mood board image 2...",
            "Detailed image generation prompt for mood board image 3...",
            "Detailed image generation prompt for mood board image 4..."
          ]
        }
        
        Ensure the "visualReferencePrompts" are highly descriptive and ready for an image generator (DALL-E 3/Flux/Midjourney).`,
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
  const replicateModelId = "black-forest-labs/flux-1.1-pro-ultra"; // High fidelity

  if (isDevModeEnabled()) {
    const { mockImageGeneration } = await import("./mockData");
    return mockImageGeneration(pose);
  }

  // Use provider from module scope
  // We need to access the exported replicateProvider or create a new one?
  // replicateProvider is not exported. But we are inside the module.
  // Wait, replicateProvider is defined at line 8.

  // Logic: 
  const prompt = `A cinematic ${pose} of a character. ${character.traits || "A person"}. High quality, 8k, photorealistic, film grain.`;

  // We need to use the replicateProvider instance defined in this file.
  // BUT the file view shows it at line 8.
  // Is it accessible? Yes, module scope.

  try {
    // We need to handle the case where replicateProvider might strictly expect some params.
    // Looking at previous usages (e.g. generateStoryboardImageWithConsistency), it uses replicateProvider.generateImage
    // Let's assume usage is similar.

    // Note: replicateProvider generic usage
    // We need to ensure replicateProvider is reachable.
    // It is const replicateProvider = ... at top level.

    // Re-declaring it locally just in case or using the top level one.
    // Top level one is fine.

    // But wait, in this file, verify replicateProvider availability.
    // It is at line 8.

    // I will use it directly.

    // However, I need to make sure I am not breaking anything.
    // I'll use the same pattern as other functions.

    // We need to make sure we import replicateProvider if it's not available? No it is in same file.

    // BUT checking the file 251, it is there.
    // However, I need to make sure I don't reference it if it's not in scope of function? It is in module scope.

    // One catch: this new function is at the end of the file.

    const result = await replicateProvider.generateImage({
      prompt,
      resolution: "1024x1024",
      quality: "hd",
    }, replicateModelId);

    return result.url;
  } catch (error) {
    console.error("Failed to generate character pose:", error);
    throw new Error("Failed to generate character pose");
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
        content: `You are a professional Script Supervisor.
        Analyze the screenplay provided and break it down into individual SCENES.
        
        For each scene, extract:
        - Order (sequential number)
        - Title (Slugline)
        - Description (Brief summary of the action and key dialogue)

        RETURN A JSON OBJECT with a "scenes" array.
        Example:
        {
          "scenes": [
            { "order": 1, "title": "EXT. CITY - DAY", "description": "Establishing shot of the futuristic metropolis." },
            { "order": 2, "title": "INT. APARTMENT - DAY", "description": "Hero wakes up to the sound of sirens." }
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

/**
 * Generate a Nano Pro Character Reference Sheet
 * Includes structured JSON Prompt 1 for Nano Pro API
 */
export async function generateCharacterNano(
  description: string,
  referenceImages: string[],
  modelId?: string,
  projectId?: number,
  userId?: string
): Promise<string> {
  const replicateModelId = modelId || "black-forest-labs/flux-1.1-pro-ultra"; // Nano Banana Pro

  // Structured target Prompt 1
  const structuredPrompt = {
    generative_prompt: {
      source_material: {
        input: "uploaded reference image",
        instruction: "base strictly on the uploaded reference image"
      },
      subject: description,
      style: [
        "professional character reference sheet",
        "technical model turnaround",
        "match exact visual style of the reference (same realism level, rendering approach, texture, color treatment, and overall aesthetic)",
        "crisp",
        "print-ready",
        "sharp details"
      ],
      background: "clean, neutral plain background",
      composition: {
        layout: "two horizontal rows",
        top_row: {
          view_type: "full-body standing",
          pose: "relaxed A-pose",
          sequence: [
            "front view",
            "left profile view (facing left)",
            "right profile view (facing right)",
            "back view"
          ]
        },
        bottom_row: {
          view_type: "highly detailed close-up portraits",
          sequence: [
            "front portrait",
            "left profile portrait (facing left)",
            "right profile portrait (facing right)"
          ]
        }
      },
      technical_specifications: {
        consistency: [
          "perfect identity consistency across every panel",
          "consistent scale and alignment between views",
          "consistent head height across the full-body lineup",
          "consistent facial scale across the portraits"
        ],
        anatomy_and_silhouette: [
          "accurate anatomy",
          "clear silhouette"
        ],
        framing_and_spacing: [
          "even spacing",
          "clean panel separation",
          "uniform framing"
        ]
      },
      lighting: {
        type: "natural",
        characteristics: [
          "consistent across all panels (same direction, intensity, and softness)",
          "controlled shadows that preserve detail"
        ],
        constraints: [
          "no dramatic mood shifts"
        ]
      }
    }
  };

  const finalPrompt = JSON.stringify(structuredPrompt, null, 2);

  try {
    const result = await replicateProvider.generateImage({
      prompt: finalPrompt,
      resolution: "1024x1024",
      quality: "hd",
      projectId,
      userId,
      imageInputs: referenceImages // pass base64 image URIs to the provider abstraction
    }, replicateModelId);
    return result.url;
  } catch (error: any) {
    console.error("[AI Service] Nano character generation failed:", error);
    throw new Error(`Nano character synthesis failed: ${error.message || error}`);
  }
}

/**
 * Upscales an image to 4k using a high-fidelity Replicate upscaler natively
 */
export async function upscaleImageTo4k(
  imageUrl: string,
  projectId?: number,
  userId?: string
): Promise<string> {
  try {
    return await replicateProvider.upscaleImage(imageUrl, projectId, userId, 4);
  } catch (error: any) {
    console.error("[AI Service] 4k Upscale failed:", error);
    throw new Error(`4k Upscale failed: ${error.message || error}`);
  }
}


