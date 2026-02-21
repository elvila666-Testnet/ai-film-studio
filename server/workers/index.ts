import { startVideoWorker } from "../queue/videoQueue";

// Initialize Queue Worker
// This ensures that when the server starts, the background worker is also listening for jobs.
// In a scaled environment, you might run this in a separate process/container.
// For now, running it alongside the API server is acceptable.

export function initBackgroundWorkers() {
    try {
        console.log("[Worker] Initializing background workers...");
        startVideoWorker();
    } catch (error) {
        console.error("[Worker] Failed to initialize background workers:", error);
    }
}
