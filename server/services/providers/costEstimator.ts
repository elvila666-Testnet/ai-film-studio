/**
 * Cost Estimation Engine
 * Calculates estimated costs for image and video generation across all providers
 */

import {
  CostEstimate,
  ImageGenerationParams,
  VideoGenerationParams,
  ImageProvider,
  VideoProvider,
  IMAGE_PROVIDER_PRICING,
  VIDEO_PROVIDER_PRICING,
} from "./types";

export class CostEstimator {
  /**
   * Estimate cost for image generation
   */
  static estimateImageCost(
    provider: ImageProvider,
    params: ImageGenerationParams
  ): CostEstimate {
    const resolution = params.resolution;
    const quality = params.quality || "standard";
    const count = params.count || 1;

    let baseCost = 0;
    let pricingKey = "";

    switch (provider) {
      case "dalle":
        pricingKey = `${resolution}_${quality}`;
        baseCost = IMAGE_PROVIDER_PRICING.dalle[pricingKey] || 0.02;
        break;

      case "midjourney":
        pricingKey = quality === "hd" ? "premium" : "standard";
        baseCost = IMAGE_PROVIDER_PRICING.midjourney[pricingKey] || 0.015;
        break;

      case "nanobanana":
        pricingKey = quality === "hd" ? "premium" : "standard";
        baseCost = IMAGE_PROVIDER_PRICING.nanobanana[pricingKey] || 0.01;
        break;
    }

    const totalCost = baseCost * count;

    return {
      provider,
      model: `${provider}-${quality}`,
      estimatedCost: Math.round(totalCost * 10000) / 10000, // Round to 4 decimals
      currency: "USD",
      unit: "per_image",
      factors: {
        resolution,
        quality,
      },
      notes: `Estimated cost for ${count} image(s) at ${resolution} quality`,
    };
  }

  /**
   * Estimate cost for video generation
   */
  static estimateVideoCost(
    provider: VideoProvider,
    params: VideoGenerationParams
  ): CostEstimate {
    const duration = params.duration;
    const resolution = params.resolution;
    const minutes = duration / 60;

    let pricingKey = `${resolution}_per_minute`;
    let baseCostPerMinute = VIDEO_PROVIDER_PRICING[provider][pricingKey] || 0.1;

    // Add premium for higher frame rates
    if (params.fps === 60) {
      baseCostPerMinute *= 1.5; // 50% premium for 60fps
    }

    const totalCost = baseCostPerMinute * minutes;

    return {
      provider,
      model: `${provider}-${resolution}`,
      estimatedCost: Math.round(totalCost * 10000) / 10000,
      currency: "USD",
      unit: "per_minute",
      factors: {
        duration,
        resolution,
        frameRate: params.fps,
      },
      notes: `Estimated cost for ${duration}s video at ${resolution} ${params.fps}fps`,
    };
  }

  /**
   * Compare costs across multiple image providers
   */
  static compareImageProviders(
    providers: ImageProvider[],
    params: ImageGenerationParams
  ): CostEstimate[] {
    return providers.map(provider => this.estimateImageCost(provider, params));
  }

  /**
   * Compare costs across multiple video providers
   */
  static compareVideoProviders(
    providers: VideoProvider[],
    params: VideoGenerationParams
  ): CostEstimate[] {
    return providers.map(provider => this.estimateVideoCost(provider, params));
  }

  /**
   * Find cheapest image provider
   */
  static findCheapestImageProvider(
    providers: ImageProvider[],
    params: ImageGenerationParams
  ): { provider: ImageProvider; cost: CostEstimate } {
    const estimates = this.compareImageProviders(providers, params);
    const cheapest = estimates.reduce((prev, current) =>
      prev.estimatedCost < current.estimatedCost ? prev : current
    );

    const provider = cheapest.provider as ImageProvider;
    return { provider, cost: cheapest };
  }

  /**
   * Find cheapest video provider
   */
  static findCheapestVideoProvider(
    providers: VideoProvider[],
    params: VideoGenerationParams
  ): { provider: VideoProvider; cost: CostEstimate } {
    const estimates = this.compareVideoProviders(providers, params);
    const cheapest = estimates.reduce((prev, current) =>
      prev.estimatedCost < current.estimatedCost ? prev : current
    );

    const provider = cheapest.provider as VideoProvider;
    return { provider, cost: cheapest };
  }

  /**
   * Calculate total project cost
   */
  static calculateProjectCost(
    imageCount: number,
    imageParams: ImageGenerationParams,
    videoCount: number,
    videoParams: VideoGenerationParams,
    imageProvider: ImageProvider,
    videoProvider: VideoProvider
  ): {
    totalImageCost: number;
    totalVideoCost: number;
    totalProjectCost: number;
    breakdown: string;
  } {
    const imageCost = this.estimateImageCost(imageProvider, imageParams);
    const videoCost = this.estimateVideoCost(videoProvider, videoParams);

    const totalImageCost = imageCost.estimatedCost * imageCount;
    const totalVideoCost = videoCost.estimatedCost * videoCount;
    const totalProjectCost = totalImageCost + totalVideoCost;

    const breakdown = `
Images: ${imageCount} × $${imageCost.estimatedCost} = $${totalImageCost.toFixed(4)}
Videos: ${videoCount} × $${videoCost.estimatedCost} = $${totalVideoCost.toFixed(4)}
Total: $${totalProjectCost.toFixed(4)}
    `.trim();

    return {
      totalImageCost: Math.round(totalImageCost * 10000) / 10000,
      totalVideoCost: Math.round(totalVideoCost * 10000) / 10000,
      totalProjectCost: Math.round(totalProjectCost * 10000) / 10000,
      breakdown,
    };
  }

  /**
   * Format cost for display
   */
  static formatCost(cost: number, currency: string = "USD"): string {
    const symbol = currency === "USD" ? "$" : "€";
    return `${symbol}${cost.toFixed(4)}`;
  }

  /**
   * Get cost comparison summary
   */
  static getCostComparisonSummary(
    estimates: CostEstimate[]
  ): {
    cheapest: CostEstimate;
    mostExpensive: CostEstimate;
    average: number;
    savings: number;
  } {
    const cheapest = estimates.reduce((prev, current) =>
      prev.estimatedCost < current.estimatedCost ? prev : current
    );

    const mostExpensive = estimates.reduce((prev, current) =>
      prev.estimatedCost > current.estimatedCost ? prev : current
    );

    const average =
      estimates.reduce((sum, est) => sum + est.estimatedCost, 0) / estimates.length;

    const savings = mostExpensive.estimatedCost - cheapest.estimatedCost;

    return {
      cheapest,
      mostExpensive,
      average: Math.round(average * 10000) / 10000,
      savings: Math.round(savings * 10000) / 10000,
    };
  }
}
