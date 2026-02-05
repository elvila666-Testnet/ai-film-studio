import { invokeLLM } from "../_core/llm";
import { generateImage } from "../_core/imageGeneration";

/**
 * Generate a film script from a brief using Gemini API
 */
export async function generateScriptFromBrief(brief: string): Promise<string> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert screenwriter. Generate a detailed film script based on the provided brief. 
        The script should include scene descriptions, dialogue, and character actions.
        Format it as a professional screenplay with clear scene headings, action lines, character names, and dialogue.`,
      },
      {
        role: "user",
        content: `Please write a film script based on this brief:\n\n${brief}`,
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
  notes: string
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
        content: `Here is the current script:\n\n${script}\n\nPlease refine it based on these notes:\n\n${notes}`,
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
export async function generateMasterVisualStyle(script: string): Promise<string> {
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
        content: `Based on this script, create a detailed visual style guide:\n\n${script}`,
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
  notes: string
): Promise<string> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a professional cinematographer. Refine the visual style guide based on the director's feedback.`,
      },
      {
        role: "user",
        content: `Here is the current visual style guide:\n\n${visualStyle}\n\nPlease refine it based on these comments:\n\n${notes}`,
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
  visualStyle: string
): Promise<Array<{ shot: number; tipo_plano: string; accion: string; intencion: string }>> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a professional film director and cinematographer. 
        Break down the script into individual shots with technical specifications.
        For each shot, provide:
        - Shot number
        - Shot type (plano): e.g., Close-up, Wide shot, Medium shot, etc.
        - Action: What happens in this shot
        - Intention: The purpose or emotional intent of the shot
        
        Return the response as a JSON array of shot objects.`,
      },
      {
        role: "user",
        content: `Script:\n\n${script}\n\nVisual Style:\n\n${visualStyle}\n\nPlease create a detailed shot breakdown as a JSON array.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "technical_shots",
        strict: true,
        schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              shot: { type: "number", description: "Shot number" },
              tipo_plano: { type: "string", description: "Shot type" },
              accion: { type: "string", description: "Action in the shot" },
              intencion: { type: "string", description: "Intention of the shot" },
            },
            required: ["shot", "tipo_plano", "accion", "intencion"],
            additionalProperties: false,
          },
        },
      },
    },
  });

  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("Failed to generate technical shots");

  try {
    const parsed = typeof content === "string" ? JSON.parse(content) : content;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Generate an image prompt for a shot using Gemini API
 */
export async function generateImagePromptForShot(
  shot: { shot: number; tipo_plano: string; accion: string; intencion: string },
  visualStyle: string
): Promise<string> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert at writing detailed image generation prompts for AI image generators.
        Create a vivid, detailed prompt that describes exactly what should be in the image for this film shot.
        The prompt should be specific enough for an AI image generator to create a suitable image.`,
      },
      {
        role: "user",
        content: `Shot Details:
        - Number: ${shot.shot}
        - Type: ${shot.tipo_plano}
        - Action: ${shot.accion}
        - Intention: ${shot.intencion}
        
        Visual Style Guide:
        ${visualStyle}
        
        Please create a detailed image generation prompt for this shot.`,
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
 * Generate a storyboard image using Nanobanana Pro API (with OpenAI fallback)
 */
export async function generateStoryboardImage(prompt: string): Promise<string> {
  try {
    // Try Nanobanana Pro first (better quality, 4K support)
    const { generateImageWithNanobanana } = await import("./nanobananaGeneration");
    return await generateImageWithNanobanana(prompt, "2k");
  } catch (nanobananaError) {
    console.warn("Nanobanana generation failed, falling back to OpenAI:", nanobananaError);
    // Fallback to OpenAI if Nanobanana fails
    const result = await generateImage({
      prompt: prompt,
    });
    if (!result.url) throw new Error("Failed to generate image");
    return result.url;
  }
}


/**
 * Generate storyboard image with character consistency
 */
export async function generateStoryboardImageWithConsistency(
  prompt: string,
  characterReference?: Record<string, string>,
  seed?: number
): Promise<{ url: string; seed: number }> {
  const { generateConsistentPrompt, generateSeed } = await import("./characterConsistency");
  
  const finalSeed = seed || generateSeed(Date.now(), Math.random() * 10000);
  const finalPrompt = characterReference 
    ? generateConsistentPrompt(prompt, characterReference, "storyboard shot")
    : prompt;

  try {
    const { generateImageWithNanobanana } = await import("./nanobananaGeneration");
    const url = await generateImageWithNanobanana(finalPrompt, "2k");
    return { url, seed: finalSeed };
  } catch (nanobananaError) {
    console.warn("Nanobanana generation failed, falling back to OpenAI:", nanobananaError);
    const result = await generateImage({
      prompt: finalPrompt,
    });
    if (!result.url) throw new Error("Failed to generate image");
    return { url: result.url, seed: finalSeed };
  }
}

/**
 * Generate storyboard image variation with different perspective
 */
export async function generateStoryboardImageVariation(
  basePrompt: string,
  characterReference: Record<string, string>,
  variationIndex: number
): Promise<{ url: string; seed: number }> {
  const { generateVariationPrompt, generateSeed } = await import("./characterConsistency");
  
  const finalSeed = generateSeed(Date.now(), variationIndex);
  const finalPrompt = generateVariationPrompt(basePrompt, characterReference, variationIndex);

  try {
    const { generateImageWithNanobanana } = await import("./nanobananaGeneration");
    const url = await generateImageWithNanobanana(finalPrompt, "2k");
    return { url, seed: finalSeed };
  } catch (nanobananaError) {
    console.warn("Nanobanana generation failed, falling back to OpenAI:", nanobananaError);
    const result = await generateImage({
      prompt: finalPrompt,
    });
    if (!result.url) throw new Error("Failed to generate image");
    return { url: result.url, seed: finalSeed };
  }
}
