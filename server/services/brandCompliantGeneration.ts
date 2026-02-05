/**
 * Brand-Compliant Content Generation Service
 * Wraps all content generation functions to ensure brand compliance
 */

import {
  analyzeContentCompliance,
  generateBrandAlignedContent,
  extractBrandMetrics,
  BrandGuidelines,
  BrandAnalysisResult,
} from "./brandBrain";

export interface BrandCompliantContent {
  content: string;
  compliance: BrandAnalysisResult;
  metrics: Record<string, number>;
}

/**
 * Generate brand-aligned script from brief
 */
export async function generateBrandAlignedScript(
  brand: BrandGuidelines,
  brief: string
): Promise<BrandCompliantContent> {
  try {
    const script = await generateBrandAlignedContent(
      brand,
      "script",
      `Write a professional film script based on this brief:\n\n${brief}`
    );

    const compliance = await analyzeContentCompliance(brand, "script", script);
    const metrics = await extractBrandMetrics(brand, script);

    return { content: script, compliance, metrics };
  } catch (error) {
    console.error("Failed to generate brand-aligned script:", error);
    throw error;
  }
}

/**
 * Refine script while maintaining brand compliance
 */
export async function refineBrandAlignedScript(
  brand: BrandGuidelines,
  script: string,
  notes: string
): Promise<BrandCompliantContent> {
  try {
    const refinedScript = await generateBrandAlignedContent(
      brand,
      "script",
      `Here is the current script:\n\n${script}\n\nPlease refine it based on these notes while maintaining brand alignment:\n\n${notes}`
    );

    const compliance = await analyzeContentCompliance(
      brand,
      "script",
      refinedScript
    );
    const metrics = await extractBrandMetrics(brand, refinedScript);

    return { content: refinedScript, compliance, metrics };
  } catch (error) {
    console.error("Failed to refine brand-aligned script:", error);
    throw error;
  }
}

/**
 * Generate brand-aligned visual style from script
 */
export async function generateBrandAlignedVisualStyle(
  brand: BrandGuidelines,
  script: string
): Promise<BrandCompliantContent> {
  try {
    const visualStyle = await generateBrandAlignedContent(
      brand,
      "visual",
      `Based on this script, create a detailed visual style guide that aligns with the brand aesthetic:\n\n${script}`
    );

    const compliance = await analyzeContentCompliance(
      brand,
      "visual",
      visualStyle
    );
    const metrics = await extractBrandMetrics(brand, visualStyle);

    return { content: visualStyle, compliance, metrics };
  } catch (error) {
    console.error("Failed to generate brand-aligned visual style:", error);
    throw error;
  }
}

/**
 * Refine visual style while maintaining brand compliance
 */
export async function refineBrandAlignedVisualStyle(
  brand: BrandGuidelines,
  visualStyle: string,
  notes: string
): Promise<BrandCompliantContent> {
  try {
    const refinedVisualStyle = await generateBrandAlignedContent(
      brand,
      "visual",
      `Here is the current visual style guide:\n\n${visualStyle}\n\nPlease refine it based on these notes while maintaining brand alignment:\n\n${notes}`
    );

    const compliance = await analyzeContentCompliance(
      brand,
      "visual",
      refinedVisualStyle
    );
    const metrics = await extractBrandMetrics(brand, refinedVisualStyle);

    return { content: refinedVisualStyle, compliance, metrics };
  } catch (error) {
    console.error("Failed to refine brand-aligned visual style:", error);
    throw error;
  }
}

/**
 * Generate brand-aligned storyboard description
 */
export async function generateBrandAlignedStoryboardPrompt(
  brand: BrandGuidelines,
  script: string,
  visualStyle: string
): Promise<BrandCompliantContent> {
  try {
    const combinedContext = `Script:\n${script}\n\nVisual Style:\n${visualStyle}`;

    const storyboardPrompt = await generateBrandAlignedContent(
      brand,
      "storyboard",
      `Based on this script and visual style, create detailed storyboard shot descriptions that align with the brand aesthetic and messaging:\n\n${combinedContext}`
    );

    const compliance = await analyzeContentCompliance(
      brand,
      "storyboard",
      storyboardPrompt
    );
    const metrics = await extractBrandMetrics(brand, storyboardPrompt);

    return { content: storyboardPrompt, compliance, metrics };
  } catch (error) {
    console.error("Failed to generate brand-aligned storyboard prompt:", error);
    throw error;
  }
}

/**
 * Generate brand-aligned voiceover script
 */
export async function generateBrandAlignedVoiceover(
  brand: BrandGuidelines,
  script: string,
  tone: string
): Promise<BrandCompliantContent> {
  try {
    const voiceover = await generateBrandAlignedContent(
      brand,
      "voiceover",
      `Based on this script and desired tone, create a professional voiceover script that aligns with the brand voice and messaging:\n\nScript:\n${script}\n\nDesired Tone:\n${tone}`
    );

    const compliance = await analyzeContentCompliance(
      brand,
      "voiceover",
      voiceover
    );
    const metrics = await extractBrandMetrics(brand, voiceover);

    return { content: voiceover, compliance, metrics };
  } catch (error) {
    console.error("Failed to generate brand-aligned voiceover:", error);
    throw error;
  }
}
