import axios from 'axios';
import { TRPCError } from '@trpc/server';
const generateAsset = async (..._args: any[]): Promise<any> => { throw new Error("Native Gemini Migration: Replicate Audio Service is deprecated"); };
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import { pipeline } from 'stream/promises';

// Initialize GCS
const storage = new Storage();
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'ai-film-studio-assets';

/**
 * Generate Text-to-Speech using ElevenLabs
 */
export async function generateTTS(
    text: string,
    voiceId: string = "21m00Tcm4TlvDq8ikWAM", // Default voice (Rachel)
    projectId: number
): Promise<{ audioUrl: string; duration?: number }> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'ElevenLabs API Key not configured',
        });
    }

    console.log(`[AudioService] Generating TTS for project ${projectId}`);

    try {
        const response = await axios({
            method: 'POST',
            url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            data: {
                text,
                model_id: "eleven_multilingual_v2", // Upgraded to v2 for better quality and emotional range
                voice_settings: {
                    stability: 0.45, // Slightly lower for more expressive cinematic delivery
                    similarity_boost: 0.8,
                    style: 0.5, // Added style for more dramatic flair
                    use_speaker_boost: true
                }
            },
            responseType: 'stream',
        });

        // Upload to GCS
        const filename = `projects/${projectId}/audio/dialogue/${uuidv4()}.mp3`;
        const file = storage.bucket(BUCKET_NAME).file(filename);

        const writeStream = file.createWriteStream({
            metadata: { contentType: 'audio/mpeg' },
        });

        await pipeline(response.data, writeStream);

        const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`;
        console.log(`[AudioService] TTS saved to ${publicUrl}`);

        return { audioUrl: publicUrl };

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to generate speech.';
        console.error('[AudioService] TTS Generation Failed:', errorMessage);
        throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to generate speech.',
            cause: error,
        });
    }
}

/**
 * Generate Sound Effects using Replicate (AudioLDM or similar)
 */
export async function generateSFX(
    prompt: string,
    projectId: number,
    userId: string
): Promise<{ audioUrl: string }> {
    console.log(`[AudioService] Generating SFX: "${prompt}"`);

    // Using ElevenLabs Sound Effects (higher quality than AudioLDM-2)
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'ElevenLabs API Key not configured',
        });
    }

    try {
        const response = await axios({
            method: 'POST',
            url: 'https://api.elevenlabs.io/v1/sound-effects',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            data: {
                text: prompt,
                duration_seconds: 10, // Increased for better cinematic atmosphere
                prompt_influence: 0.3,
            },
            responseType: 'stream',
        });

        // Upload to GCS
        const filename = `projects/${projectId}/audio/sfx/${uuidv4()}.mp3`;
        const file = storage.bucket(BUCKET_NAME).file(filename);

        const writeStream = file.createWriteStream({
            metadata: { contentType: 'audio/mpeg' },
        });

        await pipeline(response.data, writeStream);

        const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`;
        console.log(`[AudioService] SFX saved to ${publicUrl}`);

        return { audioUrl: publicUrl };
    } catch (error) {
        console.error('[AudioService] SFX Generation Failed:', error);
        throw error;
    }
}
