import { Queue, Worker, Job } from 'bullmq';
import { getRedis } from '../redis';
import { exportVideo, ExportOptions } from '../services/videoExport';
import * as path from 'path';
import * as fs from 'fs';

const QUEUE_NAME = 'video-export';

export interface VideoExportJobData {
    projectId: string; // or number, depends on your ID schema
    storyboardId: string;
    inputFile: string; // Path to source (e.g. concatenation of clips) or instructions
    outputFile: string;
    options: ExportOptions;
}

let videoQueue: Queue | null = null;
let videoWorker: Worker | null = null;

export function getVideoQueue() {
    if (videoQueue) return videoQueue;

    const redis = getRedis();
    if (!redis) return null;

    videoQueue = new Queue(QUEUE_NAME, { connection: redis });
    return videoQueue;
}

export function startVideoWorker() {
    if (videoWorker) return videoWorker;

    const redis = getRedis();
    if (!redis) {
        console.warn("[Worker] Redis not available, skipping worker start.");
        return null;
    }

    console.log("[Worker] Starting video export worker...");

    videoWorker = new Worker(QUEUE_NAME, async (job: Job<VideoExportJobData>) => {
        console.log(`[Worker] Processing job ${job.id}: ${job.name}`);

        const { inputFile, outputFile, options } = job.data;

        // Report progress
        await job.updateProgress(0);

        try {
            // Ensure output directory exists (redundant check but good for safety)
            const outputDir = path.dirname(outputFile);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const result = await exportVideo(inputFile, outputFile, options, async (progress) => {
                // throttle updates? BullMQ handles it well enough
                await job.updateProgress(progress.progress);
            });

            if (!result.success) {
                throw new Error(result.error || "Unknown export error");
            }

            console.log(`[Worker] Job ${job.id} completed successfully.`);
            return { outputFile };

        } catch (error) {
            console.error(`[Worker] Job ${job.id} failed:`, error);
            throw error;
        }

    }, {
        connection: redis,
        concurrency: 1 // Process one video at a time per instance to avoid CPU starvation
    });

    videoWorker.on('completed', (job) => {
        console.log(`[Worker] Job ${job.id} has completed!`);
    });

    videoWorker.on('failed', (job, err) => {
        console.log(`[Worker] Job ${job?.id} has failed with ${err.message}`);
    });

    return videoWorker;
}

export async function addVideoExportJob(data: VideoExportJobData) {
    const queue = getVideoQueue();
    if (!queue) {
        throw new Error("Redis is not configured. Cannot add background job.");
    }

    return await queue.add('export-video', data);
}
