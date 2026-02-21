export const PRICING_REGISTRY = {
    "black-forest-labs/flux-pro": { type: "per_unit", price: 0.055 },
    "stability-ai/sdxl": { type: "per_second", price: 0.00057, avg_duration: 3.5 },
    "google/veo": { type: "per_second_video", price: 0.10 },
} as const;

export function estimateCost(modelId: string, quantity: number = 1): number {
    const model = PRICING_REGISTRY[modelId as keyof typeof PRICING_REGISTRY];
    if (!model) return 0; // Unknown model (or free)

    if (model.type === "per_unit") return model.price * quantity;
    if (model.type === "per_second") return model.price * (model.avg_duration * quantity);
    return 0;
}