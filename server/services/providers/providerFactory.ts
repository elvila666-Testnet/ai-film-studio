/**
 * Provider Factory
 * Creates and manages provider instances with fallback logic
 */

import {
  ImageProvider,
  VideoProvider,
  ImageGenerationParams,
  ImageGenerationResult,
  VideoGenerationParams,
  VideoGenerationResult,
  ProviderConfig,
  ProviderRegistry,
} from "./types";

export class ProviderFactory {
  private static registry: ProviderRegistry = {
    image: {
      nanobanana: { enabled: false, priority: 1, maxRetries: 3, timeout: 60000 },
      dalle: { enabled: false, priority: 2, maxRetries: 3, timeout: 60000 },
      midjourney: { enabled: false, priority: 3, maxRetries: 2, timeout: 120000 },
    },
    video: {
      flow: { enabled: false, priority: 1, maxRetries: 2, timeout: 120000 },
      sora: { enabled: false, priority: 2, maxRetries: 2, timeout: 180000 },
      kling: { enabled: false, priority: 3, maxRetries: 2, timeout: 120000 },
      whan: { enabled: false, priority: 4, maxRetries: 2, timeout: 120000 },
    },
  };

  /**
   * Initialize provider with API key
   */
  static initializeImageProvider(provider: ImageProvider, apiKey: string): void {
    if (this.registry.image[provider]) {
      this.registry.image[provider].apiKey = apiKey;
      this.registry.image[provider].enabled = true;
    }
  }

  static initializeVideoProvider(provider: VideoProvider, apiKey: string): void {
    if (this.registry.video[provider]) {
      this.registry.video[provider].apiKey = apiKey;
      this.registry.video[provider].enabled = true;
    }
  }

  /**
   * Get enabled image providers sorted by priority
   */
  static getEnabledImageProviders(): ImageProvider[] {
    return (Object.entries(this.registry.image) as [ImageProvider, ProviderConfig][])
      .filter(([, config]) => config.enabled && config.apiKey)
      .sort((a, b) => a[1].priority - b[1].priority)
      .map(([provider]) => provider);
  }

  /**
   * Get enabled video providers sorted by priority
   */
  static getEnabledVideoProviders(): VideoProvider[] {
    return (Object.entries(this.registry.video) as [VideoProvider, ProviderConfig][])
      .filter(([, config]) => config.enabled && config.apiKey)
      .sort((a, b) => a[1].priority - b[1].priority)
      .map(([provider]) => provider);
  }

  /**
   * Get provider configuration
   */
  static getImageProviderConfig(provider: ImageProvider): ProviderConfig | null {
    return this.registry.image[provider] || null;
  }

  static getVideoProviderConfig(provider: VideoProvider): ProviderConfig | null {
    return this.registry.video[provider] || null;
  }

  /**
   * Update provider priority (for fallback order)
   */
  static updateImageProviderPriority(provider: ImageProvider, priority: number): void {
    if (this.registry.image[provider]) {
      this.registry.image[provider].priority = priority;
    }
  }

  static updateVideoProviderPriority(provider: VideoProvider, priority: number): void {
    if (this.registry.video[provider]) {
      this.registry.video[provider].priority = priority;
    }
  }

  /**
   * Check if provider is available
   */
  static isImageProviderAvailable(provider: ImageProvider): boolean {
    const config = this.registry.image[provider];
    return config?.enabled && !!config?.apiKey;
  }

  static isVideoProviderAvailable(provider: VideoProvider): boolean {
    const config = this.registry.video[provider];
    return config?.enabled && !!config?.apiKey;
  }

  /**
   * Get all providers with their status
   */
  static getImageProviderStatus(): Record<ImageProvider, { enabled: boolean; priority: number }> {
    const status: Record<ImageProvider, { enabled: boolean; priority: number }> = {
      nanobanana: { enabled: false, priority: 0 },
      dalle: { enabled: false, priority: 0 },
      midjourney: { enabled: false, priority: 0 },
    };

    Object.entries(this.registry.image).forEach(([provider, config]) => {
      status[provider as ImageProvider] = {
        enabled: config.enabled && !!config.apiKey,
        priority: config.priority,
      };
    });

    return status;
  }

  static getVideoProviderStatus(): Record<VideoProvider, { enabled: boolean; priority: number }> {
    const status: Record<VideoProvider, { enabled: boolean; priority: number }> = {
      flow: { enabled: false, priority: 0 },
      sora: { enabled: false, priority: 0 },
      kling: { enabled: false, priority: 0 },
      whan: { enabled: false, priority: 0 },
    };

    Object.entries(this.registry.video).forEach(([provider, config]) => {
      status[provider as VideoProvider] = {
        enabled: config.enabled && !!config.apiKey,
        priority: config.priority,
      };
    });

    return status;
  }

  /**
   * Get registry for persistence
   */
  static getRegistry(): ProviderRegistry {
    return JSON.parse(JSON.stringify(this.registry));
  }

  /**
   * Restore registry from saved state
   */
  static restoreRegistry(registry: ProviderRegistry): void {
    this.registry = registry;
  }

  /**
   * Reset all providers
   */
  static resetAll(): void {
    this.registry = {
      image: {
        nanobanana: { enabled: false, priority: 1, maxRetries: 3, timeout: 60000 },
        dalle: { enabled: false, priority: 2, maxRetries: 3, timeout: 60000 },
        midjourney: { enabled: false, priority: 3, maxRetries: 2, timeout: 120000 },
      },
      video: {
        flow: { enabled: false, priority: 1, maxRetries: 2, timeout: 120000 },
        sora: { enabled: false, priority: 2, maxRetries: 2, timeout: 180000 },
        kling: { enabled: false, priority: 3, maxRetries: 2, timeout: 120000 },
        whan: { enabled: false, priority: 4, maxRetries: 2, timeout: 120000 },
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
