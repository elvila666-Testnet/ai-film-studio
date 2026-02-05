/**
 * Auto-Bambos Pipeline Orchestrator
 * Generates both Flow and Sora videos automatically for each storyboard frame
 * Enables side-by-side comparison and automatic selection based on shot type
 */

import { FrameDescriptor } from "./frameDescriptor";
import { generateFlowVideo, FlowGenerationResult } from "./flowGeneration";
import { generateSoraVideo, SoraGenerationResult } from "./soraGeneration";
import { compareFlowAndSora } from "./soraGeneration";

export interface AutoBambosRequest {
  frameDescriptor: FrameDescriptor;
  storyboardImageUrl: string;
  projectId: number;
}

export interface AutoBambosResult {
  frameDescriptor: FrameDescriptor;
  flow: FlowGenerationResult;
  sora: SoraGenerationResult;
  comparison: {
    recommendation: "flow" | "sora" | "both" | "neither";
    reasoning: string;
    flowScore: number;
    soraScore: number;
  };
  status: "success" | "partial" | "failed";
  metadata: {
    generatedAt: string;
    totalProcessingTime: number;
  };
}

/**
 * Generate both Flow and Sora videos for a single frame (Auto-Bambos)
 * Runs in parallel for faster processing
 */
export async function generateAutoBambos(
  request: AutoBambosRequest
): Promise<AutoBambosResult> {
  const startTime = Date.now();

  try {
    // Generate Flow and Sora in parallel
    const [flowResult, soraResult] = await Promise.all([
      generateFlowVideo({
        frameDescriptor: request.frameDescriptor,
        storyboardImageUrl: request.storyboardImageUrl,
        projectId: request.projectId,
      }),
      generateSoraVideo({
        frameDescriptor: request.frameDescriptor,
        storyboardImageUrl: request.storyboardImageUrl,
        projectId: request.projectId,
      }),
    ]);

    // Compare results
    const comparison = compareFlowAndSora(flowResult, soraResult, request.frameDescriptor);

    // Determine overall status
    let status: "success" | "partial" | "failed" = "success";
    if (flowResult.status === "failed" || soraResult.status === "failed") {
      status = "partial";
    }
    if (flowResult.status === "failed" && soraResult.status === "failed") {
      status = "failed";
    }

    return {
      frameDescriptor: request.frameDescriptor,
      flow: flowResult,
      sora: soraResult,
      comparison,
      status,
      metadata: {
        generatedAt: new Date().toISOString(),
        totalProcessingTime: Date.now() - startTime,
      },
    };
  } catch (error) {
    console.error("Auto-Bambos generation failed:", error);
    return {
      frameDescriptor: request.frameDescriptor,
      flow: {
        videoUrl: "",
        duration: 0,
        status: "failed",
        error: "Generation failed",
        metadata: {
          frameDescriptor: request.frameDescriptor,
          generatedAt: new Date().toISOString(),
          processingTime: 0,
        },
      },
      sora: {
        videoUrl: "",
        duration: 0,
        status: "failed",
        error: "Generation failed",
        metadata: {
          frameDescriptor: request.frameDescriptor,
          generatedAt: new Date().toISOString(),
          processingTime: 0,
        },
      },
      comparison: {
        recommendation: "neither",
        reasoning: "Both generation attempts failed",
        flowScore: 0,
        soraScore: 0,
      },
      status: "failed",
      metadata: {
        generatedAt: new Date().toISOString(),
        totalProcessingTime: Date.now() - startTime,
      },
    };
  }
}

/**
 * Generate Auto-Bambos for entire sequence
 */
export async function generateAutoBambosSequence(
  frameDescriptors: FrameDescriptor[],
  storyboardImageUrls: string[],
  projectId: number
): Promise<AutoBambosResult[]> {
  const results: AutoBambosResult[] = [];

  for (let i = 0; i < frameDescriptors.length; i++) {
    const result = await generateAutoBambos({
      frameDescriptor: frameDescriptors[i],
      storyboardImageUrl: storyboardImageUrls[i],
      projectId,
    });
    results.push(result);

    // Add small delay to avoid rate limiting
    if (i < frameDescriptors.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Create Auto-Bambos comparison report
 */
export function createAutoBambosReport(
  results: AutoBambosResult[]
): {
  totalFrames: number;
  successCount: number;
  partialCount: number;
  failureCount: number;
  flowPreferred: number;
  soraPreferred: number;
  bothRecommended: number;
  averageProcessingTime: number;
  frames: Array<{
    shotNumber: number;
    status: string;
    recommendation: string;
    flowScore: number;
    soraScore: number;
    flowUrl: string;
    soraUrl: string;
  }>;
} {
  const successCount = results.filter(r => r.status === "success").length;
  const partialCount = results.filter(r => r.status === "partial").length;
  const failureCount = results.filter(r => r.status === "failed").length;

  const flowPreferred = results.filter(r => r.comparison.recommendation === "flow").length;
  const soraPreferred = results.filter(r => r.comparison.recommendation === "sora").length;
  const bothRecommended = results.filter(r => r.comparison.recommendation === "both").length;

  const totalProcessingTime = results.reduce((sum, r) => sum + r.metadata.totalProcessingTime, 0);

  return {
    totalFrames: results.length,
    successCount,
    partialCount,
    failureCount,
    flowPreferred,
    soraPreferred,
    bothRecommended,
    averageProcessingTime: totalProcessingTime / results.length,
    frames: results.map(r => ({
      shotNumber: r.frameDescriptor.shotNumber,
      status: r.status,
      recommendation: r.comparison.recommendation,
      flowScore: r.comparison.flowScore,
      soraScore: r.comparison.soraScore,
      flowUrl: r.flow.videoUrl,
      soraUrl: r.sora.videoUrl,
    })),
  };
}

/**
 * Auto-select best output for each frame based on recommendation
 */
export function selectBestOutputs(results: AutoBambosResult[]): Array<{
  shotNumber: number;
  selectedType: "flow" | "sora" | "none";
  videoUrl: string;
  reason: string;
}> {
  return results.map(r => {
    let selectedType: "flow" | "sora" | "none" = "none";
    let videoUrl = "";
    let reason = "";

    if (r.comparison.recommendation === "flow" && r.flow.status === "success") {
      selectedType = "flow";
      videoUrl = r.flow.videoUrl;
      reason = `Flow recommended (score: ${r.comparison.flowScore})`;
    } else if (r.comparison.recommendation === "sora" && r.sora.status === "success") {
      selectedType = "sora";
      videoUrl = r.sora.videoUrl;
      reason = `Sora recommended (score: ${r.comparison.soraScore})`;
    } else if (r.comparison.recommendation === "both") {
      // Prefer Flow for short cuts, Sora for longer scenes
      if (r.frameDescriptor.duration < 2.5 && r.flow.status === "success") {
        selectedType = "flow";
        videoUrl = r.flow.videoUrl;
        reason = "Flow selected for short cut";
      } else if (r.sora.status === "success") {
        selectedType = "sora";
        videoUrl = r.sora.videoUrl;
        reason = "Sora selected for longer scene";
      }
    }

    return {
      shotNumber: r.frameDescriptor.shotNumber,
      selectedType,
      videoUrl,
      reason,
    };
  });
}

/**
 * Create comparison metadata for UI display
 */
export function createComparisonMetadata(result: AutoBambosResult) {
  return {
    shotNumber: result.frameDescriptor.shotNumber,
    frameDescriptor: {
      composition: result.frameDescriptor.composition,
      cameraLanguage: result.frameDescriptor.cameraLanguage,
      mood: result.frameDescriptor.mood,
      duration: result.frameDescriptor.duration,
    },
    flow: {
      status: result.flow.status,
      videoUrl: result.flow.videoUrl,
      processingTime: result.flow.metadata.processingTime,
      error: result.flow.error,
    },
    sora: {
      status: result.sora.status,
      videoUrl: result.sora.videoUrl,
      processingTime: result.sora.metadata.processingTime,
      error: result.sora.error,
    },
    comparison: {
      recommendation: result.comparison.recommendation,
      reasoning: result.comparison.reasoning,
      flowScore: result.comparison.flowScore,
      soraScore: result.comparison.soraScore,
    },
    overallStatus: result.status,
    generatedAt: result.metadata.generatedAt,
  };
}
