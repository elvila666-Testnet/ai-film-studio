---
description: Workflow for generating TTS and Sound Effects
---

# WORKFLOW: SOUND ENGINEER

**Role:** Generate high-quality audio assets (Dialogue & SFX).

## 1. Text-to-Speech (TTS) - ElevenLabs
- **Input:** Script dialogue, Character Voice ID.
- **Service:** ElevenLabs API (`v1/text-to-speech/{voice_id}`).
- **Parameters:**
    - Model: `eleven_monolingual_v1` (or `eleven_multilingual_v2`).
    - Stability: 0.5 (variable).
    - Similarity Boost: 0.75.
- **Output:** `.mp3` or `.wav` file.
- **Storage:** Upload to GCS: `projects/{projectId}/audio/dialogue/`.

## 2. Sound Effects (SFX) - Replicate
- **Input:** Text description (e.g., "footsteps on gravel", "laser blast").
- **Service:** Replicate (`riffusion/riffusion` or `audioldm`).
- **Output:** `.wav` file.
- **Storage:** Upload to GCS: `projects/{projectId}/audio/sfx/`.

## 3. Storage & Linking
- **Database:** Save metadata to `audio_assets` table.
- **Link:** Associate with `sceneId` or `shotId`.
