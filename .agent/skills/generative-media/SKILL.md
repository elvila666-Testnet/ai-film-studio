---
name: generative-media
description: "Generates images or videos using Replicate models (Flux, Stable Diffusion, Sora-like, etc.)."
---

# SKILL: GENERATIVE MEDIA (REPLICATE)

Use this skill when the user wants to generate visual content (Storyboards, Scene Previews, Video Clips).

## 1. Model Selection Strategy
You have access to the Replicate API. Choose the model based on the user's intent:

| Intent | Recommended Model Slug |
| :--- | :--- |
| **Realistic Storyboard** | `black-forest-labs/flux-pro` (Best prompt adherence) |
| **Stylized/Artistic** | `stability-ai/sdxl` |
| **Video Generation** | `luma/ray-2` or `minimax/video-01` (Check current SOTA) |
| **Fast Preview** | `stability-ai/sdxl-lightning` |

## 2. API Schema
Calls must go through the `ai.generate` tRPC mutation.

```typescript
// Input Schema
{
  prompt: string;
  type: 'image' | 'video';
  modelId: string; // e.g., "black-forest-labs/flux-pro"
  aspectRatio: "16:9" | "21:9";
}