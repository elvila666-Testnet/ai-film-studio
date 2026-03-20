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
// Note: FlowProvider, SoraProvider, KlingProvider, WHANProvider are available but not used directly here yet

export class ProviderFactory {
  private static registry: ProviderRegistry = {
    image: {
      nanobanana: { enabled: false, priority: 10, maxRetries: 3, timeout: 60000 },
      dalle: { enabled: false, priority: 10, maxRetries: 3, timeout: 60000 },
      midjourney: { enabled: false, priority: 10, maxRetries: 2, timeout: 120000 },
      gemini: { enabled: true, priority: 1, maxRetries: 3, timeout: 120000 },
      replicate: { enabled: true, priority: 1, maxRetries: 3, timeout: 120000 },
    },
    video: {
      flow: { enabled: false, priority: 10, maxRetries: 2, timeout: 120000 },
      sora: { enabled: true, priority: 2, maxRetries: 2, timeout: 180000 },
      kling: { enabled: false, priority: 10, maxRetries: 2, timeout: 120000 },
      whan: { enabled: false, priority: 10, maxRetries: 2, timeout: 120000 },
      gemini: { enabled: true, priority: 1, maxRetries: 3, timeout: 300000 },
      veo3: { enabled: true, priority: 3, maxRetries: 2, timeout: 180000 },
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
    } else if (provider === "sora") {
      this.registry.video.sora.apiKey = apiKey;
      this.registry.video.sora.enabled = true;
    } else if (provider === "veo3") {
      this.registry.video.veo3.apiKey = apiKey;
      this.registry.video.veo3.enabled = true;
    }
  }

  /**
   * Create a video provider instance
   */
  static createVideoProvider(
    provider: VideoProvider,
    apiKey: string,
    apiUrl?: string
  ): any {
    const { VideoProviderFactory } = require("./videoProviders");
    return VideoProviderFactory.createProvider(provider, apiKey, apiUrl);
  }

  /**
   * Create an image provider instance
   */
  static createImageProvider(
    provider: ImageProvider,
    apiKey: string,
    apiUrl?: string
  ): any {
    const { ImageProviderFactory } = require("./imageProviders");
    return ImageProviderFactory.createProvider(provider, apiKey, apiUrl);
  }

  /**
   * Get enabled image providers sorted by priority
   */
  static getEnabledImageProviders(): ImageProvider[] {
    const providers: ImageProvider[] = [];
    if (this.registry.image.replicate.enabled) providers.push("replicate");
    if (this.registry.image.gemini.enabled) providers.push("gemini");
    return providers;
  }

  /**
   * Get enabled video providers sorted by priority
   */
  static getEnabledVideoProviders(): VideoProvider[] {
    const providers: VideoProvider[] = [];
    if (this.registry.video.replicate.enabled) providers.push("replicate");
    if (this.registry.video.sora.enabled) providers.push("sora");
    if (this.registry.video.veo3.enabled) providers.push("veo3");
    if (this.registry.video.gemini.enabled) providers.push("gemini");
    return providers;
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
    if (provider === "replicate") return !!this.registry.image.replicate.apiKey;
    if (provider === "gemini") return this.registry.image.gemini.enabled;
    return false;
  }

  static isVideoProviderAvailable(provider: VideoProvider): boolean {
    const config = this.registry.video[provider];
    return config?.enabled && !!config?.apiKey;
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
        gemini: { enabled: true, priority: 1, maxRetries: 3, timeout: 120000 },
        replicate: { enabled: true, priority: 1, maxRetries: 3, timeout: 120000 },
      },
      video: {
        flow: { enabled: false, priority: 10, maxRetries: 2, timeout: 120000 },
        sora: { enabled: false, priority: 10, maxRetries: 2, timeout: 180000 },
        kling: { enabled: false, priority: 10, maxRetries: 2, timeout: 120000 },
        whan: { enabled: false, priority: 10, maxRetries: 2, timeout: 120000 },
        gemini: { enabled: true, priority: 1, maxRetries: 3, timeout: 300000 },
        veo3: { enabled: false, priority: 10, maxRetries: 2, timeout: 180000 },
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
