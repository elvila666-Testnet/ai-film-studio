import Replicate from 'replicate';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import { TRPCError } from '@trpc/server';
import axios from 'axios';
import stream from 'stream';
import { promisify } from 'util';

const pipeline = promisify(stream.pipeline);

// Initialize Replicate
const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

// Initialize GCS
// Assumes GOOGLE_APPLICATION_CREDENTIALS is set in .env
const storage = new Storage();
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'ai-film-studio-assets';

/**
 * Downloads a file from a URL and uploads it to Google Cloud Storage.
 * Returns the public URL of the uploaded file.
 */
async function uploadToGCS(url: string, folder: string = 'generations'): Promise<string> {
    try {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream',
        });

        const filename = `${folder}/${uuidv4()}.png`; // Assuming PNG for now, ideally detect mime type
        const file = storage.bucket(BUCKET_NAME).file(filename);

        const writeStream = file.createWriteStream({
            gzip: true,
            metadata: {
                contentType: response.headers['content-type'],
            },
        });

        await pipeline(response.data, writeStream);

        // Make the file public (or generated signed URL if private)
        // For this app, we'll assume we want a persistent public link, OR a signed link.
        // Given usage in UI, public or long-lived signed URL is best.
        // Let's return the `storage.googleapis.com` public URL.
        // NOTE: Bucket must be configured for public access or we use signed URLs.
        // We'll stick to a standard public URL format for simplicity in this implementation phase.
        return `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`;

    } catch (error) {
        console.error('GCS Upload Error:', error);
        throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to upload asset to storage.',
            cause: error,
        });
    }
}

import { estimateCost } from '../lib/pricing';
import { logUsage } from './ledgerService';

/**
 * Core Service: Generate Asset
 * 1. Call Replicate
 * 2. Wait for result
 * 3. Download Result
 * 4. Upload to GCS
 * 5. Return GCS URL
 */
export async function generateAsset(
    modelId: string,
    input: Record<string, string | number | boolean | undefined>,
    projectId: number,
    userId: string,
    loraWeights?: string // Optional LoRA weights URL
): Promise<{ imageUrl: string; cost: number }> {
    console.log(`[ReplicateService] Generating with model: ${modelId} for Project ${projectId}`);

    if (loraWeights) {
        console.log(`[ReplicateService] Applying LoRA weights: ${loraWeights}`);
        input.lora_weights = loraWeights;
    }

    try {
        // 1. Run Replicate
        // using run() waits for the prediction to finish
        // types for input/output depend on model, using 'any' safely here
        const output = await replicate.run(modelId as unknown as `${string}/${string}`, { input });

        // Output is usually an array of strings (URLs) for image models
        const rawUrl = Array.isArray(output) ? output[0] : (output as unknown as string);

        if (!rawUrl || typeof rawUrl !== 'string') {
            throw new Error('Invalid output format from Replicate');
        }

        console.log(`[ReplicateService] Generated Raw URL: ${rawUrl}`);

        // 2. Asset Ownership Pipeline (Download -> GCS)
        const gcsUrl = await uploadToGCS(rawUrl);

        console.log(`[ReplicateService] Asset secured at: ${gcsUrl}`);

        // 3. Log Cost
        const cost = estimateCost(modelId, 1);
        await logUsage(projectId, userId, modelId, cost, 'IMAGE_GEN');

        return { imageUrl: gcsUrl, cost };

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'AI Generation Failed';
        console.error('[ReplicateService] Generation Failed:', error);

        // Handle Replicate specific errors
        if (axios.isAxiosError(error) && error.response?.status === 401) {
            throw new TRPCError({
                code: 'UNAUTHORIZED',
                message: 'Invalid Replicate API Token',
            });
        }

        throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: errorMessage,
        });
    }
}

/**
 * Train a LoRA model on Replicate
 * wrapper for ostris/flux-dev-lora-trainer
 */
export async function trainLoRA(
    userId: string | number,
    trainingZipUrl: string,
    triggerWord: string = "TOK"
): Promise<{ trainingId: string; status: string }> {
    console.log(`[ReplicateService] Starting LoRA training for user ${userId}`);

    try {
        const training = await replicate.trainings.create(
            "ostris",
            "flux-dev-lora-trainer",
            "e440909d3512c31646ee2e0c7d6f6f412c54017053091b55a40d488533b2928b",
            {
                destination: `${process.env.REPLICATE_USERNAME || "ai-film-studio"}/lora-${uuidv4()}`,
                input: {
                    steps: 1000,
                    lora_rank: 16,
                    optimizer: "adamw8bit",
                    batch_size: 1,
                    resolution: "512,768,1024",
                    autocaption: true,
                    input_images: trainingZipUrl,
                    trigger_word: triggerWord,
                },
            }
        );

        console.log(`[ReplicateService] Training started: ${training.id}`);
        return { trainingId: training.id, status: training.status };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'LoRA Training Failed';
        console.error('[ReplicateService] Training Failed:', error);
        throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: errorMessage,
        });
    }
}