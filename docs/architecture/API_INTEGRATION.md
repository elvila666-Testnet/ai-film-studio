# API Integration Documentation - AI Film Studio

## Overview

This document defines the technical standards for external AI integrations within the AI Film Studio. The architecture has transitioned to a **Replicate-First** model to leverage high-fidelity Image-to-Image anchoring for character and set consistency.

---

## I. Image Generation Architecture

### 1. Primary Engine: Replicate
Replicate is the tiered primary engine for all creative image synthesis. It is accessed via the `ReplicateProvider` and routes to specific high-performance models.

#### Key Models
- **`google/nano-banana-pro`**: Used for all **Visual Anchoring** and **Img2Img** tasks (Storyboards, Character Poses).
- **`black-forest-labs/flux-pro`**: Used for high-fidelity wide shots and final production stills.

#### Implementation (Img2Img)
All anchoring requests MUST pass recursive image references for identity pinning.
```typescript
const result = await provider.generateImage({
  prompt: "Cinematic shot of Jax in a rain-soaked alley",
  imageInputs: [characterReferenceUrl, setReferenceUrl],
  prompt_strength: 0.45 // Standardized for identity preservation
});
```

### 2. Secondary Engine: Google Gemini (Imagen 3/4)
Used as a **resilient fallback** if Replicate experiences latency or API failures. Gemini is also used for ultra-high-resolution upscaling.

---

## II. PCI Standard (Photorealistic Character Identity)

The Studio enforces the **PCI Standard** for all character creation. Every character generation request must produce a **7-shot identity sheet** to ensure a "locked" reference.

### PCI Layout Requirements:
- **Format:** 2-column contact sheet.
- **Top Row (Positional):** 4 Full-body shots (Facing, Profile L, Profile R, Away).
- **Bottom Row (Detail):** 3 Close-up portraits (Facing, Profile L, Profile R).

### PCI Prompt Injection:
The `aiGeneration` service automatically wraps user descriptions in the standard PCI framing prompt to ensure consistency across the Character Casting tab.

---

## III. Video Generation Architecture

### 1. Google Vertex AI (Veo 3)
The primary video engine for high-fidelity 1080p cinematic motion.
- **Endpoint:** `predictLongRunning` (Vertex AI).
- **Polling:** Long-Running Operation (LRO) status checks via `fetchPredictOperation`.

### 2. Sora 2 (OpenAI)
Used for experimental, highly narrative video sequences. Accessed via `ProviderFactory`.

---

## IV. Shared Infrastructure

### 1. GCS Asset Integrity
AI Film Studio strictly follows the **Asset Ownership Pipeline**:
`Generate -> Download Stream -> Upload to GCS -> Return Permanent Link`.
No temporary API URLs should persist in the database beyond the generation cycle.

### 2. Usage Ledger (FinOps)
Every API call MUST be recorded in the `usage_ledger` table with:
- `service_name`
- `model_id`
- `estimated_cost`
- `tokens_used` / `credits_used`

---

## V. Error Handling & Resilience
- **Max Retries:** 3 with exponential backoff.
- **Provider Fallback:** `Replicate -> Gemini -> Placeholder`.
- **Safety Filtering:** All prompts are sanitized via the `BrandGuardian` before submission.

---
**Last Updated:** April 6, 2026
**Status:** ENFORCED (v2.0 Replicate-Migration)
