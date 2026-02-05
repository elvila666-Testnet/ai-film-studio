/**
 * Cost Analytics Service
 * Tracks and analyzes video generation costs across providers
 */

export type VideoProvider = 'veo3' | 'sora' | 'flow';
export type VideoQuality = 'low' | 'medium' | 'high' | '4k';

export interface GenerationCost {
  id: number;
  projectId: number;
  provider: VideoProvider;
  quality: VideoQuality;
  duration: number; // in seconds
  resolution: string; // e.g., "1080p", "4k"
  cost: number; // in credits
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
  videoId?: number;
}

export interface ProviderStats {
  provider: VideoProvider;
  totalCost: number;
  totalGenerations: number;
  averageCost: number;
  successRate: number;
  averageDuration: number;
}

export interface QualityStats {
  quality: VideoQuality;
  totalCost: number;
  totalGenerations: number;
  averageCost: number;
  successRate: number;
}

export interface CostTrend {
  date: Date;
  dailyCost: number;
  generationCount: number;
  averageCostPerGeneration: number;
}

export interface CostComparison {
  provider1: VideoProvider;
  provider2: VideoProvider;
  provider1Cost: number;
  provider2Cost: number;
  savings: number;
  savingsPercent: number;
  winner: VideoProvider;
}

/**
 * Get cost for specific provider and quality
 */
export function getProviderCost(provider: VideoProvider, quality: VideoQuality, durationSeconds: number): number {
  // Cost per second in credits
  const baseCosts: Record<VideoProvider, Record<VideoQuality, number>> = {
    veo3: {
      low: 0.5,
      medium: 1.0,
      high: 2.0,
      '4k': 4.0,
    },
    sora: {
      low: 0.4,
      medium: 0.8,
      high: 1.6,
      '4k': 3.2,
    },
    flow: {
      low: 0.2,
      medium: 0.4,
      high: 0.8,
      '4k': 1.6,
    },
  };
  
  const costPerSecond = baseCosts[provider]?.[quality] ?? 1.0;
  return Math.ceil(costPerSecond * durationSeconds);
}

/**
 * Calculate total cost for multiple generations
 */
export function calculateTotalCost(costs: GenerationCost[]): number {
  return costs.reduce((sum, cost) => sum + cost.cost, 0);
}

/**
 * Calculate average cost
 */
export function calculateAverageCost(costs: GenerationCost[]): number {
  if (costs.length === 0) return 0;
  return calculateTotalCost(costs) / costs.length;
}

/**
 * Get provider statistics
 */
export function getProviderStats(costs: GenerationCost[], provider: VideoProvider): ProviderStats {
  const providerCosts = costs.filter(c => c.provider === provider);
  const completedCosts = providerCosts.filter(c => c.status === 'completed');
  
  const totalCost = calculateTotalCost(providerCosts);
  const totalGenerations = providerCosts.length;
  const successCount = completedCosts.length;
  const successRate = totalGenerations > 0 ? (successCount / totalGenerations) * 100 : 0;
  const averageDuration = completedCosts.length > 0
    ? completedCosts.reduce((sum, c) => sum + c.duration, 0) / completedCosts.length
    : 0;
  
  return {
    provider,
    totalCost,
    totalGenerations,
    averageCost: calculateAverageCost(providerCosts),
    successRate,
    averageDuration,
  };
}

/**
 * Get quality statistics
 */
export function getQualityStats(costs: GenerationCost[], quality: VideoQuality): QualityStats {
  const qualityCosts = costs.filter(c => c.quality === quality);
  const completedCosts = qualityCosts.filter(c => c.status === 'completed');
  
  const totalCost = calculateTotalCost(qualityCosts);
  const totalGenerations = qualityCosts.length;
  const successCount = completedCosts.length;
  const successRate = totalGenerations > 0 ? (successCount / totalGenerations) * 100 : 0;
  
  return {
    quality,
    totalCost,
    totalGenerations,
    averageCost: calculateAverageCost(qualityCosts),
    successRate,
  };
}

/**
 * Get cost trends by date
 */
export function getCostTrends(costs: GenerationCost[], days: number = 30): CostTrend[] {
  const trends: Map<string, CostTrend> = new Map();
  const now = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    
    trends.set(dateKey, {
      date,
      dailyCost: 0,
      generationCount: 0,
      averageCostPerGeneration: 0,
    });
  }
  
  // Populate with actual costs
  for (const cost of costs) {
    const dateKey = new Date(cost.timestamp).toISOString().split('T')[0];
    const trend = trends.get(dateKey);
    
    if (trend) {
      trend.dailyCost += cost.cost;
      trend.generationCount += 1;
      trend.averageCostPerGeneration = trend.dailyCost / trend.generationCount;
    }
  }
  
  return Array.from(trends.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Compare costs between two providers
 */
export function compareCosts(costs: GenerationCost[], provider1: VideoProvider, provider2: VideoProvider): CostComparison {
  const stats1 = getProviderStats(costs, provider1);
  const stats2 = getProviderStats(costs, provider2);
  
  const savings = stats1.totalCost - stats2.totalCost;
  const savingsPercent = stats1.totalCost > 0 ? (savings / stats1.totalCost) * 100 : 0;
  const winner = savings > 0 ? provider2 : provider1;
  
  return {
    provider1,
    provider2,
    provider1Cost: stats1.totalCost,
    provider2Cost: stats2.totalCost,
    savings: Math.abs(savings),
    savingsPercent: Math.abs(savingsPercent),
    winner,
  };
}

/**
 * Get most cost-effective provider
 */
export function getMostCostEffectiveProvider(costs: GenerationCost[]): VideoProvider | null {
  const providers: VideoProvider[] = ['veo3', 'sora', 'flow'];
  let bestProvider: VideoProvider | null = null;
  let lowestCost = Infinity;
  
  for (const provider of providers) {
    const stats = getProviderStats(costs, provider);
    if (stats.totalGenerations > 0 && stats.averageCost < lowestCost) {
      lowestCost = stats.averageCost;
      bestProvider = provider;
    }
  }
  
  return bestProvider;
}

/**
 * Get most reliable provider (highest success rate)
 */
export function getMostReliableProvider(costs: GenerationCost[]): VideoProvider | null {
  const providers: VideoProvider[] = ['veo3', 'sora', 'flow'];
  let bestProvider: VideoProvider | null = null;
  let highestSuccessRate = -1;
  
  for (const provider of providers) {
    const stats = getProviderStats(costs, provider);
    if (stats.successRate > highestSuccessRate) {
      highestSuccessRate = stats.successRate;
      bestProvider = provider;
    }
  }
  
  return bestProvider;
}

/**
 * Estimate cost for generation
 */
export function estimateCost(provider: VideoProvider, quality: VideoQuality, durationSeconds: number): number {
  return getProviderCost(provider, quality, durationSeconds);
}

/**
 * Get cost breakdown by provider
 */
export function getCostBreakdown(costs: GenerationCost[]): Record<VideoProvider, number> {
  const breakdown: Record<VideoProvider, number> = {
    veo3: 0,
    sora: 0,
    flow: 0,
  };
  
  for (const cost of costs) {
    breakdown[cost.provider] += cost.cost;
  }
  
  return breakdown;
}

/**
 * Get cost breakdown by quality
 */
export function getQualityBreakdown(costs: GenerationCost[]): Record<VideoQuality, number> {
  const breakdown: Record<VideoQuality, number> = {
    low: 0,
    medium: 0,
    high: 0,
    '4k': 0,
  };
  
  for (const cost of costs) {
    breakdown[cost.quality] += cost.cost;
  }
  
  return breakdown;
}

/**
 * Check if cost is within budget
 */
export function isWithinBudget(totalCost: number, budget: number): boolean {
  return totalCost <= budget;
}

/**
 * Calculate remaining budget
 */
export function calculateRemainingBudget(totalCost: number, budget: number): number {
  return Math.max(0, budget - totalCost);
}

/**
 * Get budget utilization percentage
 */
export function getBudgetUtilization(totalCost: number, budget: number): number {
  if (budget === 0) return 0;
  return Math.min(100, (totalCost / budget) * 100);
}

/**
 * Recommend provider based on quality and cost
 */
export function recommendProvider(quality: VideoQuality, budget: number): VideoProvider {
  const providers: VideoProvider[] = ['veo3', 'sora', 'flow'];
  const durationSeconds = 60; // Standard 1-minute video
  
  // Find cheapest provider within budget
  let bestProvider = providers[0];
  let lowestCost = getProviderCost(bestProvider, quality, durationSeconds);
  
  for (const provider of providers) {
    const cost = getProviderCost(provider, quality, durationSeconds);
    if (cost <= budget && cost < lowestCost) {
      lowestCost = cost;
      bestProvider = provider;
    }
  }
  
  return bestProvider;
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  return `${cost.toLocaleString()} credits`;
}

/**
 * Get cost warning level
 */
export function getCostWarningLevel(totalCost: number, budget: number): 'safe' | 'warning' | 'critical' {
  const utilization = getBudgetUtilization(totalCost, budget);
  
  if (utilization >= 100) return 'critical';
  if (utilization >= 80) return 'warning';
  
  return 'safe';
}
