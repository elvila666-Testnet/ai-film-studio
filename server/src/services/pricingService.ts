import { TRPCError } from '@trpc/server';

// Pricing Registry (Hardcoded for now, could be DB backed)
const PRICING_REGISTRY: Record<string, number> = {
    // Image Models
    'black-forest-labs/flux-pro': 0.055, // per image
    'stability-ai/sdxl': 0.020, // per image
    'stability-ai/sd-turbo': 0.005, // per image

    // Video Models (estimated)
    'stability-ai/stable-video-diffusion': 0.20, // per second/run
    'replicate/cogvideox-5b': 0.15,

    // Audio Models
    'elevenlabs/tts': 0.010,
    'haoheliu/audioldm-2': 0.015,

    // LLM Models
    'gemini-1.5-pro': 0.050,
    'gemini-1.5-flash': 0.005,

    // Default fallback
    'default-image': 0.05,
};

/**
 * Estimates cost for a generation request.
 * @param modelId - The Replicate model ID
 * @param quantity - Number of images or Duration in seconds (default 1)
 */
export function estimateCost(modelId: string, quantity: number = 1): number {
    // Normalize model ID to finding pricing
    // If exact match not found, try to guess category or use fallback
    let unitCost = PRICING_REGISTRY[modelId];

    if (unitCost === undefined) {
        console.warn(`[PricingService] Unknown model ${modelId}, using default.`);
        unitCost = PRICING_REGISTRY['default-image'];
    }

    // Calculate total
    const estimatedTotal = unitCost * quantity;

    // Sanity check
    if (estimatedTotal < 0) return 0;

    return parseFloat(estimatedTotal.toFixed(4));
}

/**
 * Checks if a cost requires explicit approval.
 * We throw a specific error code if it does, which the frontend intercepts.
 * Threshold: $0.50 (as per user request in Phase 4 of old plan, or generally high)
 * User constitution says > $0.01 needs approval, but that might be annoying.
 * Let's set a "Silent Limit" and an "Approval Limit".
 * Prompt says: "if cost > 0.50, require approval" in Phase 4 of original request.
 * Prompt says: "No AI generation can occur without a pre-flight cost estimate check." in Constitution.
 * Prompt says: "If cost > $0.01, require explicit user approval via UI." in Constitution III.2.
 */
export function validateCost(estimatedCost: number, isApproved: boolean = false) {
    const APPROVAL_THRESHOLD = 0.01; // From Constitution

    if (estimatedCost > APPROVAL_THRESHOLD && !isApproved) {
        throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: `Financial Guardrail: Cost $${estimatedCost.toFixed(4)} exceeds manual approval limit ($${APPROVAL_THRESHOLD}).`,
            cause: {
                requiresApproval: true,
                estimatedCost,
            }
        });
    }
}
