/**
 * Multi-Provider Generation System
 * Supports multiple image and video generation providers with cost estimation
 */

// ============ PROVIDER TYPES ============

export type ImageProvider = "nanobanana" | "dalle" | "midjourney" | "replicate" | "apiyi";
export type VideoProvider = "flow" | "sora" | "kling" | "whan" | "replicate";

export interface ProviderConfig {
  enabled: boolean;
  apiKey?: string;
  apiUrl?: string;
  priority: number; // Lower number = higher priority for fallback
  maxRetries: number;
  timeout: number; // milliseconds
}

export interface ProviderRegistry {
  image: Record<ImageProvider, ProviderConfig>;
  video: Record<VideoProvider, ProviderConfig>;
}

// ============ COST ESTIMATION ============

export interface CostEstimate {
  provider: string;
  model: string;
  estimatedCost: number;
  currency: "USD" | "EUR" | "GBP";
  unit: "per_image" | "per_minute" | "per_request";
  factors: {
    resolution?: string;
    quality?: string;
    duration?: number;
    frameRate?: number;
  };
  notes: string;
}

export interface GenerationRequest {
  provider: ImageProvider | VideoProvider;
  model: string;
  prompt: string;
  parameters: Record<string, unknown>;
  estimatedCost?: CostEstimate;
}

export interface GenerationResult {
  provider: string;
  model: string;
  url: string;
  duration?: number;
  actualCost: number;
  processingTime: number;
  metadata: Record<string, unknown>;
}

// ============ IMAGE GENERATION ============

export interface ImageGenerationParams {
  prompt: string;
  resolution: "1024x1024" | "1024x1792" | "1792x1024" | "512x512" | "768x768";
  quality: "standard" | "hd";
  style?: string;
  negativePrompt?: string;
  seed?: number;
  count?: number;
  projectId?: number;
  userId?: string;
  imageInputs?: string[];
}

export interface ImageGenerationResult extends GenerationResult {
  url: string;
  width: number;
  height: number;
  revisedPrompt?: string;
}

// ============ VIDEO GENERATION ============

export interface VideoGenerationParams {
  prompt: string;
  keyframeUrl?: string;
  input_image_url?: string;
  duration: number; // seconds
  resolution: "720p" | "1080p" | "4k";
  fps: 24 | 30 | 60;
  style?: string;
  negativePrompt?: string;
  seed?: number;
  projectId?: number;
  userId?: string;
}

export interface VideoGenerationResult extends GenerationResult {
  url: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  fileSize: number;
}

// ============ PROVIDER PRICING ============

export const IMAGE_PROVIDER_PRICING: Record<ImageProvider, Record<string, number>> = {
  dalle: {
    "1024x1024_standard": 0.02,
    "1024x1024_hd": 0.04,
    "1024x1792_standard": 0.03,
    "1024x1792_hd": 0.06,
    "1792x1024_standard": 0.03,
    "1792x1024_hd": 0.06,
  },
  midjourney: {
    "standard": 0.015, // per image (approximate)
    "premium": 0.03,
  },
  nanobanana: {
    "standard": 0.01, // per image (approximate)
    "premium": 0.02,
  },
  replicate: {
    "standard": 0.005, // Flux Schnell (approximate)
    "premium": 0.01, // Flux Dev
  },
  apiyi: {
    "standard": 0.04, // Estimated
    "premium": 0.08,
  },
};

export const VIDEO_PROVIDER_PRICING: Record<VideoProvider, Record<string, number>> = {
  flow: {
    "720p_per_minute": 0.05,
    "1080p_per_minute": 0.1,
    "4k_per_minute": 0.2,
  },
  sora: {
    "720p_per_minute": 0.1,
    "1080p_per_minute": 0.15,
    "4k_per_minute": 0.3,
  },
  kling: {
    "720p_per_minute": 0.08,
    "1080p_per_minute": 0.12,
    "4k_per_minute": 0.25,
  },
  whan: {
    "720p_per_minute": 0.06,
    "1080p_per_minute": 0.11,
    "4k_per_minute": 0.22,
  },
  replicate: {
    "720p_per_minute": 0.04,
    "1080p_per_minute": 0.08,
    "4k_per_minute": 0.15,
  },
};

// ============ PROVIDER CAPABILITIES ============

export interface ProviderCapabilities {
  imageResolutions: string[];
  videoResolutions: string[];
  maxDuration: number;
  supportsKeyframe: boolean;
  supportsNegativePrompt: boolean;
  supportsSeed: boolean;
  maxConcurrentRequests: number;
  averageProcessingTime: number; // milliseconds
}

export const PROVIDER_CAPABILITIES: Record<
  ImageProvider | VideoProvider,
  ProviderCapabilities
> = {
  dalle: {
    imageResolutions: ["1024x1024", "1024x1792", "1792x1024"],
    videoResolutions: [],
    maxDuration: 0,
    supportsKeyframe: false,
    supportsNegativePrompt: false,
    supportsSeed: false,
    maxConcurrentRequests: 20,
    averageProcessingTime: 10000,
  },
  midjourney: {
    imageResolutions: ["1024x1024", "1280x720", "1920x1080"],
    videoResolutions: [],
    maxDuration: 0,
    supportsKeyframe: false,
    supportsNegativePrompt: true,
    supportsSeed: true,
    maxConcurrentRequests: 10,
    averageProcessingTime: 60000,
  },
  nanobanana: {
    imageResolutions: ["1024x1024", "512x512", "768x768"],
    videoResolutions: [],
    maxDuration: 0,
    supportsKeyframe: false,
    supportsNegativePrompt: true,
    supportsSeed: true,
    maxConcurrentRequests: 5,
    averageProcessingTime: 15000,
  },
  flow: {
    imageResolutions: [],
    videoResolutions: ["720p", "1080p"],
    maxDuration: 60,
    supportsKeyframe: true,
    supportsNegativePrompt: true,
    supportsSeed: true,
    maxConcurrentRequests: 5,
    averageProcessingTime: 30000,
  },
  sora: {
    imageResolutions: [],
    videoResolutions: ["720p", "1080p", "4k"],
    maxDuration: 120,
    supportsKeyframe: true,
    supportsNegativePrompt: true,
    supportsSeed: false,
    maxConcurrentRequests: 3,
    averageProcessingTime: 60000,
  },
  kling: {
    imageResolutions: [],
    videoResolutions: ["720p", "1080p"],
    maxDuration: 90,
    supportsKeyframe: true,
    supportsNegativePrompt: true,
    supportsSeed: true,
    maxConcurrentRequests: 4,
    averageProcessingTime: 45000,
  },
  whan: {
    imageResolutions: [],
    videoResolutions: ["720p", "1080p", "4k"],
    maxDuration: 120,
    supportsKeyframe: true,
    supportsNegativePrompt: true,
    supportsSeed: true,
    maxConcurrentRequests: 5,
    averageProcessingTime: 50000,
  },
  replicate: {
    imageResolutions: ["1024x1024", "1024x1792", "1792x1024", "512x512", "768x768"],
    videoResolutions: ["720p", "1080p", "4k"],
    maxDuration: 120,
    supportsKeyframe: true,
    supportsNegativePrompt: true,
    supportsSeed: true,
    maxConcurrentRequests: 10,
    averageProcessingTime: 40000,
  },
  apiyi: {
    imageResolutions: ["1024x1024", "1024x1792", "1792x1024"],
    videoResolutions: [],
    maxDuration: 0,
    supportsKeyframe: false,
    supportsNegativePrompt: false, // Standard OpenAI format doesn't explicitly support negative prompt in top-level usually, depends on model implementation behind proxy
    supportsSeed: false,
    maxConcurrentRequests: 5,
    averageProcessingTime: 20000,
  },
};
