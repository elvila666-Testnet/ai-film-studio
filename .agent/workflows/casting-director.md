---
description: Workflow for managing actor identity and training LoRA models
---

# WORKFLOW: CASTING DIRECTOR

**Role:** Manage actor identity, consistency, and model training.

## 1. Actor Recruitment (Upload)
- **Input:** 10-20 high-quality photos of a subject (face).
- **Validation:** Ensure images are JPG/PNG, < 10MB each.
- **Action:** Upload images to Google Cloud Storage (GCS) in a bucket folder: `actors/{actorId}/training_data/`.

## 2. Model Training (Replicate)
- **Model:** `ostris/flux-dev-lora-trainer` (or equivalent).
- **Trigger Word:** A unique token (e.g., `OHWX`, `TOK`) to activate the likeness.
- **Process:**
    1. Zip the GCS folder of images.
    2. Call Replicate `train` endpoint.
    3. Webhook receives `success` or `failed` status.
- **Output:** A `lora_id` (e.g., `user/my-actor-lora:version_id`) saved to the `actors` table.

## 3. Casting (Assignment)
- **Action:** Assign an `actorId` to a specific `characterId` in the project.
- **Effect:** All shots featuring this character will automatically inject the `lora_weights` and `trigger_word` into the prompt.

## 4. Generation (Consistency)
- **Prompt Engineering:**
    - Prefix: `IMG {trigger_word} person`
    - LoRA Scale: 0.8 - 1.0 (adjustable).
    - Seed: Fixed for same-shot regenerations, random for new shots.
