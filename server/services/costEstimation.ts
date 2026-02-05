/**
 * Cost Estimation Service
 * Provides accurate cost estimates for video generation using Veo3 and Sora
 */

export interface CostEstimate {
  provider: "veo3" | "sora";
  duration: number;
  resolution: "720p" | "1080p" | "4k";
  baseCost: number;
  resolutionMultiplier: number;
  durationMultiplier: number;
  totalCost: number;
  currency: "USD";
  estimatedTime: string;
}

export interface ProjectCostBreakdown {
  projectName: string;
  totalShots: number;
  averageDuration: number;
  veo3Estimate: CostEstimate;
  soraEstimate: CostEstimate;
  totalEstimate: {
    veo3: number;
    sora: number;
    difference: number;
    savings: number;
    savingsPercent: number;
  };
}

/**
 * Veo3 Pricing Structure
 * Base: $0.10 per second
 * Resolution multiplier: 720p (1x), 1080p (1.5x), 4K (2.5x)
 */
function estimateVeo3Cost(
  duration: number,
  resolution: "720p" | "1080p" | "4k"
): CostEstimate {
  const baseCostPerSecond = 0.1;
  const resolutionMultipliers: Record<string, number> = {
    "720p": 1.0,
    "1080p": 1.5,
    "4k": 2.5,
  };

  const resolutionMultiplier = resolutionMultipliers[resolution] || 1.0;
  const durationMultiplier = Math.ceil(duration / 4); // Minimum 4 second generation
  const baseCost = baseCostPerSecond * duration;
  const totalCost = baseCost * resolutionMultiplier;

  return {
    provider: "veo3",
    duration,
    resolution,
    baseCost,
    resolutionMultiplier,
    durationMultiplier,
    totalCost: Math.round(totalCost * 100) / 100,
    currency: "USD",
    estimatedTime: estimateGenerationTime("veo3", duration),
  };
}

/**
 * Sora Pricing Structure
 * Base: $0.15 per second
 * Resolution multiplier: 720p (1x), 1080p (1.3x), 4K (2.0x)
 * Quality premium: +20% for high quality
 */
function estimateSoraCost(
  duration: number,
  resolution: "720p" | "1080p" | "4k"
): CostEstimate {
  const baseCostPerSecond = 0.15;
  const resolutionMultipliers: Record<string, number> = {
    "720p": 1.0,
    "1080p": 1.3,
    "4k": 2.0,
  };

  const resolutionMultiplier = resolutionMultipliers[resolution] || 1.0;
  const qualityPremium = 1.2; // High quality
  const durationMultiplier = Math.ceil(duration / 4);
  const baseCost = baseCostPerSecond * duration;
  const totalCost = baseCost * resolutionMultiplier * qualityPremium;

  return {
    provider: "sora",
    duration,
    resolution,
    baseCost,
    resolutionMultiplier,
    durationMultiplier,
    totalCost: Math.round(totalCost * 100) / 100,
    currency: "USD",
    estimatedTime: estimateGenerationTime("sora", duration),
  };
}

/**
 * Estimate generation time based on provider and duration
 */
function estimateGenerationTime(
  provider: "veo3" | "sora",
  duration: number
): string {
  let baseMinutes = 2;
  if (provider === "sora") baseMinutes = 3;

  const additionalMinutes = Math.ceil(duration / 10);
  const totalMinutes = baseMinutes + additionalMinutes;

  if (totalMinutes < 60) {
    return `${totalMinutes} minutes`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

/**
 * Get cost estimate for a single video generation
 */
export function estimateSingleVideoGeneration(
  duration: number,
  resolution: "720p" | "1080p" | "4k",
  provider?: "veo3" | "sora"
): CostEstimate | { veo3: CostEstimate; sora: CostEstimate } {
  if (provider === "veo3") {
    return estimateVeo3Cost(duration, resolution);
  } else if (provider === "sora") {
    return estimateSoraCost(duration, resolution);
  } else {
    return {
      veo3: estimateVeo3Cost(duration, resolution),
      sora: estimateSoraCost(duration, resolution),
    };
  }
}

/**
 * Get cost estimate for entire project
 */
export function estimateProjectCost(
  projectName: string,
  shotCount: number,
  averageDuration: number = 4,
  resolution: "720p" | "1080p" | "4k" = "1080p"
): ProjectCostBreakdown {
  const veo3Single = estimateVeo3Cost(averageDuration, resolution);
  const soraSingle = estimateSoraCost(averageDuration, resolution);

  const veo3Total = {
    ...veo3Single,
    totalCost: Math.round(veo3Single.totalCost * shotCount * 100) / 100,
  };

  const soraTotal = {
    ...soraSingle,
    totalCost: Math.round(soraSingle.totalCost * shotCount * 100) / 100,
  };

  const veo3Cost = veo3Total.totalCost;
  const soraCoast = soraTotal.totalCost;
  const difference = Math.abs(veo3Cost - soraCoast);
  const isSoraCheaper = soraCoast < veo3Cost;
  const savings = isSoraCheaper ? veo3Cost - soraCoast : soraCoast - veo3Cost;
  const savingsPercent = Math.round((savings / Math.max(veo3Cost, soraCoast)) * 100);

  return {
    projectName,
    totalShots: shotCount,
    averageDuration,
    veo3Estimate: veo3Total,
    soraEstimate: soraTotal,
    totalEstimate: {
      veo3: veo3Cost,
      sora: soraCoast,
      difference,
      savings,
      savingsPercent,
    },
  };
}

/**
 * Get cost per frame for comparison
 */
export function getCostPerFrame(
  totalCost: number,
  frameCount: number
): number {
  return Math.round((totalCost / frameCount) * 100) / 100;
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

/**
 * Get cost breakdown by resolution
 */
export function getCostByResolution(
  duration: number,
  provider: "veo3" | "sora"
): Record<string, CostEstimate> {
  const resolutions = ["720p", "1080p", "4k"] as const;
  const breakdown: Record<string, CostEstimate> = {};

  for (const resolution of resolutions) {
    if (provider === "veo3") {
      breakdown[resolution] = estimateVeo3Cost(duration, resolution);
    } else {
      breakdown[resolution] = estimateSoraCost(duration, resolution);
    }
  }

  return breakdown;
}

/**
 * Get recommended provider based on cost and quality
 */
export function getRecommendedProvider(
  duration: number,
  resolution: "720p" | "1080p" | "4k",
  prioritizeSpeed: boolean = false
): {
  provider: "veo3" | "sora";
  reason: string;
  veo3Cost: number;
  soraCost: number;
} {
  const veo3 = estimateVeo3Cost(duration, resolution);
  const sora = estimateSoraCost(duration, resolution);

  let provider: "veo3" | "sora";
  let reason: string;

  if (prioritizeSpeed) {
    provider = "veo3";
    reason = "Veo3 generates faster (2-6 minutes vs 3-9 minutes for Sora)";
  } else if (veo3.totalCost < sora.totalCost) {
    provider = "veo3";
    reason = `Veo3 is ${Math.round(((sora.totalCost - veo3.totalCost) / sora.totalCost) * 100)}% cheaper`;
  } else {
    provider = "sora";
    reason = `Sora offers better quality (20% premium) for ${Math.round(((sora.totalCost - veo3.totalCost) / veo3.totalCost) * 100)}% more`;
  }

  return {
    provider,
    reason,
    veo3Cost: veo3.totalCost,
    soraCost: sora.totalCost,
  };
}
