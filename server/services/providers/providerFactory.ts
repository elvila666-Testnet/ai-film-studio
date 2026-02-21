/**
 * Provider Factory
 * Creates and manages provider instances with fallback logic
 */

import {
  ImageProvider,
  VideoProvider,
  ProviderConfig,
  ProviderRegistry,
} from "./types";
import { ReplicateProvider } from "./replicateProvider";
// Note: FlowProvider, SoraProvider, KlingProvider, WHANProvider are available but not used directly here yet

export class ProviderFactory {
  private static registry: ProviderRegistry = {
    image: {
      nanobanana: { enabled: false, priority: 10, maxRetries: 3, timeout: 60000 },
      dalle: { enabled: false, priority: 10, maxRetries: 3, timeout: 60000 },
      midjourney: { enabled: false, priority: 10, maxRetries: 2, timeout: 120000 },
      replicate: { enabled: true, priority: 1, maxRetries: 3, timeout: 120000 },
      apiyi: { enabled: false, priority: 10, maxRetries: 3, timeout: 60000 },
    },
    video: {
      flow: { enabled: false, priority: 10, maxRetries: 2, timeout: 120000 },
      sora: { enabled: false, priority: 10, maxRetries: 2, timeout: 180000 },
      kling: { enabled: false, priority: 10, maxRetries: 2, timeout: 120000 },
      whan: { enabled: false, priority: 10, maxRetries: 2, timeout: 120000 },
      replicate: { enabled: true, priority: 1, maxRetries: 3, timeout: 300000 },
    },
  };

  /**
   * Initialize provider with API key
   */
  static initializeImageProvider(provider: ImageProvider, apiKey: string): void {
    if (provider === "replicate") {
      this.registry.image.replicate.apiKey = apiKey;
      this.registry.image.replicate.enabled = true;
    }
  }

  static initializeVideoProvider(provider: VideoProvider, apiKey: string): void {
    if (provider === "replicate") {
      this.registry.video.replicate.apiKey = apiKey;
      this.registry.video.replicate.enabled = true;
    }
  }

  /**
   * Create a video provider instance
   */
  static createVideoProvider(
    _provider: VideoProvider,
    apiKey: string,
    _apiUrl?: string
  ): ReplicateProvider {
    // Phase 4: Strictly Replicate
    return new ReplicateProvider(apiKey);
  }

  /**
   * Get enabled image providers sorted by priority
   */
  static getEnabledImageProviders(): ImageProvider[] {
    return ["replicate"];
  }

  /**
   * Get enabled video providers sorted by priority
   */
  static getEnabledVideoProviders(): VideoProvider[] {
    return ["replicate"];
  }

  /**
   * Get provider configuration
   */
  static getImageProviderConfig(provider: ImageProvider): ProviderConfig | null {
    if (provider === "replicate") return this.registry.image.replicate;
    return null;
  }

  static getVideoProviderConfig(provider: VideoProvider): ProviderConfig | null {
    if (provider === "replicate") return this.registry.video.replicate;
    return null;
  }

  /**
   * Toggle provider availability
   */
  static isImageProviderAvailable(provider: ImageProvider): boolean {
    return provider === "replicate" && !!this.registry.image.replicate.apiKey;
  }

  static isVideoProviderAvailable(provider: VideoProvider): boolean {
    return provider === "replicate" && !!this.registry.video.replicate.apiKey;
  }

  /**
   * Reset all providers
   */
  static resetAll(): void {
    this.registry = {
      image: {
        nanobanana: { enabled: false, priority: 10, maxRetries: 3, timeout: 60000 },
        dalle: { enabled: false, priority: 10, maxRetries: 3, timeout: 60000 },
        midjourney: { enabled: false, priority: 10, maxRetries: 2, timeout: 120000 },
        replicate: { enabled: true, priority: 1, maxRetries: 3, timeout: 120000 },
        apiyi: { enabled: false, priority: 10, maxRetries: 3, timeout: 60000 },
      },
      video: {
        flow: { enabled: false, priority: 10, maxRetries: 2, timeout: 120000 },
        sora: { enabled: false, priority: 10, maxRetries: 2, timeout: 180000 },
        kling: { enabled: false, priority: 10, maxRetries: 2, timeout: 120000 },
        whan: { enabled: false, priority: 10, maxRetries: 2, timeout: 120000 },
        replicate: { enabled: true, priority: 1, maxRetries: 3, timeout: 300000 },
      },
    };
  }
}

/**
 * Provider Manager - handles provider selection and fallback
 */
export class ProviderManager {
  /**
   * Select best provider based on availability and priority
   */
  static selectImageProvider(
    preferred?: ImageProvider
  ): ImageProvider | null {
    if (preferred && ProviderFactory.isImageProviderAvailable(preferred)) {
      return preferred;
    }

    const available = ProviderFactory.getEnabledImageProviders();
    return available.length > 0 ? available[0] : null;
  }

  static selectVideoProvider(
    preferred?: VideoProvider
  ): VideoProvider | null {
    if (preferred && ProviderFactory.isVideoProviderAvailable(preferred)) {
      return preferred;
    }

    const available = ProviderFactory.getEnabledVideoProviders();
    return available.length > 0 ? available[0] : null;
  }

  /**
   * Get fallback providers in priority order
   */
  static getImageProviderFallbackChain(): ImageProvider[] {
    return ProviderFactory.getEnabledImageProviders();
  }

  static getVideoProviderFallbackChain(): VideoProvider[] {
    return ProviderFactory.getEnabledVideoProviders();
  }

  /**
   * Check if fallback is available
   */
  static hasImageProviderFallback(): boolean {
    return ProviderFactory.getEnabledImageProviders().length > 1;
  }

  static hasVideoProviderFallback(): boolean {
    return ProviderFactory.getEnabledVideoProviders().length > 1;
  }
}
