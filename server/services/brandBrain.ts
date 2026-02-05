/**
 * Brand Brain AI Service
 * 
 * Provides AI-powered brand intelligence and compliance analysis.
 * Ensures all generated content aligns with brand guidelines.
 */

import { invokeLLM } from "../_core/llm";

export interface BrandGuidelines {
  id: number;
  name: string;
  targetCustomer?: string;
  aesthetic?: string;
  mission?: string;
  coreMessaging?: string;
}

export interface ComplianceScore {
  overall: number; // 0-100
  targetCustomerAlignment: number;
  aestheticAlignment: number;
  missionAlignment: number;
  messagingAlignment: number;
  issues: string[];
  recommendations: string[];
}

export interface BrandAnalysisResult {
  isCompliant: boolean;
  score: ComplianceScore;
  summary: string;
  suggestions: string[];
}

/**
 * Analyze content for brand compliance
 */
export async function analyzeContentCompliance(
  brand: BrandGuidelines,
  contentType: "script" | "visual" | "storyboard" | "voiceover",
  content: string
): Promise<BrandAnalysisResult> {
  try {
    const prompt = buildCompliancePrompt(brand, contentType, content);

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a Brand Compliance AI. Analyze content against brand guidelines and provide a compliance score.
          
Return a JSON object with:
{
  "isCompliant": boolean,
  "score": {
    "overall": number (0-100),
    "targetCustomerAlignment": number (0-100),
    "aestheticAlignment": number (0-100),
    "missionAlignment": number (0-100),
    "messagingAlignment": number (0-100),
    "issues": string[],
    "recommendations": string[]
  },
  "summary": string,
  "suggestions": string[]
}`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "compliance_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              isCompliant: { type: "boolean" },
              score: {
                type: "object",
                properties: {
                  overall: { type: "number" },
                  targetCustomerAlignment: { type: "number" },
                  aestheticAlignment: { type: "number" },
                  missionAlignment: { type: "number" },
                  messagingAlignment: { type: "number" },
                  issues: { type: "array", items: { type: "string" } },
                  recommendations: { type: "array", items: { type: "string" } },
                },
                required: [
                  "overall",
                  "targetCustomerAlignment",
                  "aestheticAlignment",
                  "missionAlignment",
                  "messagingAlignment",
                  "issues",
                  "recommendations",
                ],
              },
              summary: { type: "string" },
              suggestions: { type: "array", items: { type: "string" } },
            },
            required: ["isCompliant", "score", "summary", "suggestions"],
          },
        },
      },
    });

    const messageContent = response.choices[0]?.message?.content;
    if (!messageContent) {
      throw new Error("No response from LLM");
    }

    const content_text = typeof messageContent === "string" ? messageContent : "";
    const parsed = JSON.parse(content_text);
    return {
      isCompliant: parsed.isCompliant,
      score: parsed.score,
      summary: parsed.summary,
      suggestions: parsed.suggestions,
    };
  } catch (error) {
    console.error("Brand compliance analysis failed:", error);
    // Return a default non-compliant result on error
    return {
      isCompliant: false,
      score: {
        overall: 0,
        targetCustomerAlignment: 0,
        aestheticAlignment: 0,
        missionAlignment: 0,
        messagingAlignment: 0,
        issues: ["Failed to analyze compliance"],
        recommendations: ["Please try again"],
      },
      summary: "Compliance analysis failed",
      suggestions: ["Please retry the analysis"],
    };
  }
}

/**
 * Generate content that aligns with brand guidelines
 */
export async function generateBrandAlignedContent(
  brand: BrandGuidelines,
  contentType: "script" | "visual" | "storyboard" | "voiceover",
  prompt: string
): Promise<string> {
  const systemPrompt = buildBrandSystemPrompt(brand, contentType);

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const messageContent = response.choices[0]?.message?.content;
  return typeof messageContent === "string" ? messageContent : "";
}

/**
 * Build a system prompt that enforces brand guidelines
 */
function buildBrandSystemPrompt(
  brand: BrandGuidelines,
  contentType: string
): string {
  const guidelines = [
    `Brand Name: ${brand.name}`,
    brand.targetCustomer && `Target Customer: ${brand.targetCustomer}`,
    brand.aesthetic && `Aesthetic: ${brand.aesthetic}`,
    brand.mission && `Mission: ${brand.mission}`,
    brand.coreMessaging && `Core Messaging: ${brand.coreMessaging}`,
  ]
    .filter(Boolean)
    .join("\n");

  const contentSpecificInstructions = getContentSpecificInstructions(contentType);

  return `You are a Brand-Aligned Content Generator for "${brand.name}".

BRAND GUIDELINES:
${guidelines}

CONTENT TYPE: ${contentType}

${contentSpecificInstructions}

REQUIREMENTS:
1. All generated content MUST align with the brand guidelines above
2. Maintain consistency with target customer preferences
3. Respect the aesthetic and visual style
4. Reinforce the brand mission and core messaging
5. Use appropriate tone and voice for the brand
6. Ensure messaging is clear and on-brand

Generate content that strictly adheres to these guidelines.`;
}

/**
 * Build a compliance analysis prompt
 */
function buildCompliancePrompt(
  brand: BrandGuidelines,
  contentType: string,
  content: string
): string {
  const guidelines = [
    `Brand Name: ${brand.name}`,
    brand.targetCustomer && `Target Customer: ${brand.targetCustomer}`,
    brand.aesthetic && `Aesthetic: ${brand.aesthetic}`,
    brand.mission && `Mission: ${brand.mission}`,
    brand.coreMessaging && `Core Messaging: ${brand.coreMessaging}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `Analyze the following ${contentType} content for compliance with the brand guidelines.

BRAND GUIDELINES:
${guidelines}

CONTENT TO ANALYZE:
${content}

Evaluate how well this content aligns with each aspect of the brand guidelines. 
Provide specific scores (0-100) for each alignment dimension and identify any issues or areas for improvement.`;
}

/**
 * Get content-specific instructions for different content types
 */
function getContentSpecificInstructions(contentType: string): string {
  switch (contentType) {
    case "script":
      return `SCRIPT-SPECIFIC INSTRUCTIONS:
- Dialogue should reflect the brand voice and tone
- Characters should embody brand values
- Scenes should align with aesthetic preferences
- Messaging should reinforce core brand messages`;

    case "visual":
      return `VISUAL-SPECIFIC INSTRUCTIONS:
- Color palette should match brand aesthetic
- Composition should reflect visual style preferences
- Mood and lighting should align with brand identity
- Visual elements should support brand messaging`;

    case "storyboard":
      return `STORYBOARD-SPECIFIC INSTRUCTIONS:
- Shot composition should match visual aesthetic
- Character appearance should be consistent
- Scene settings should reflect brand values
- Visual flow should tell a brand-aligned story`;

    case "voiceover":
      return `VOICEOVER-SPECIFIC INSTRUCTIONS:
- Tone and delivery should match brand voice
- Pacing should align with brand personality
- Language should reinforce core messaging
- Emotion should reflect brand values`;

    default:
      return "";
  }
}

/**
 * Extract brand compliance metrics from content
 */
export async function extractBrandMetrics(
  brand: BrandGuidelines,
  content: string
): Promise<Record<string, number>> {
  const analysis = await analyzeContentCompliance(brand, "script", content);
  return {
    overall: analysis.score.overall,
    targetCustomerAlignment: analysis.score.targetCustomerAlignment,
    aestheticAlignment: analysis.score.aestheticAlignment,
    missionAlignment: analysis.score.missionAlignment,
    messagingAlignment: analysis.score.messagingAlignment,
  };
}

/**
 * Validate multiple content pieces for brand consistency
 */
export async function validateBrandConsistency(
  brand: BrandGuidelines,
  contentPieces: Array<{
    type: "script" | "visual" | "storyboard" | "voiceover";
    content: string;
  }>
): Promise<{
  consistent: boolean;
  overallScore: number;
  analyses: BrandAnalysisResult[];
}> {
  const analyses = await Promise.all(
    contentPieces.map((piece) =>
      analyzeContentCompliance(brand, piece.type, piece.content)
    )
  );

  const overallScore =
    analyses.reduce((sum, a) => sum + a.score.overall, 0) / analyses.length;
  const consistent = overallScore >= 70; // 70% compliance threshold

  return {
    consistent,
    overallScore,
    analyses,
  };
}
