import * as thumbnailGeneration from './thumbnailGeneration';
// ffmpegService import removed as it was unused

/**
 * Batch processing service for video thumbnail generation
 */

export interface BatchJob {
  id: string;
  videoUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: 'low' | 'normal' | 'high';
  frameCount: number;
  progress: number;
  result?: { thumbnailUrl: string; previewFrames: unknown[] };
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface BatchQueue {
  jobs: Map<string, BatchJob>;
  processing: boolean;
  currentJobId?: string;
}

// Global batch queue
const batchQueue: BatchQueue = {
  jobs: new Map(),
  processing: false,
};

/**
 * Add job to batch queue
 */
export function addBatchJob(
  videoUrl: string,
  frameCount: number = 6,
  priority: 'low' | 'normal' | 'high' = 'normal'
): string {
  const jobId = generateJobId();
  const job: BatchJob = {
    id: jobId,
    videoUrl,
    status: 'pending',
    priority,
    frameCount,
    progress: 0,
    createdAt: new Date(),
  };

  batchQueue.jobs.set(jobId, job);

  // Start processing if not already running
  if (!batchQueue.processing) {
    processBatchQueue();
  }

  return jobId;
}

/**
 * Get job status
 */
export function getJobStatus(jobId: string): BatchJob | undefined {
  return batchQueue.jobs.get(jobId);
}

/**
 * Get all jobs
 */
export function getAllJobs(): BatchJob[] {
  return Array.from(batchQueue.jobs.values());
}

/**
 * Get jobs by status
 */
export function getJobsByStatus(status: BatchJob['status']): BatchJob[] {
  return Array.from(batchQueue.jobs.values()).filter((job) => job.status === status);
}

/**
 * Cancel job
 */
export function cancelJob(jobId: string): boolean {
  const job = batchQueue.jobs.get(jobId);
  if (!job) return false;

  if (job.status === 'pending' || job.status === 'processing') {
    job.status = 'failed';
    job.error = 'Cancelled by user';
    job.completedAt = new Date();
    return true;
  }

  return false;
}

/**
 * Process batch queue
 */
async function processBatchQueue(): Promise<void> {
  if (batchQueue.processing) return;

  batchQueue.processing = true;

  try {
    while (batchQueue.jobs.size > 0) {
      // Get next job (sorted by priority)
      const nextJob = getNextJob();
      if (!nextJob) break;

      batchQueue.currentJobId = nextJob.id;
      await processJob(nextJob);
    }
  } finally {
    batchQueue.processing = false;
    batchQueue.currentJobId = undefined;
  }
}

/**
 * Process single job
 */
async function processJob(job: BatchJob): Promise<void> {
  try {
    job.status = 'processing';
    job.startedAt = new Date();
    job.progress = 0;

    // Generate thumbnail set
    const result = await thumbnailGeneration.generateThumbnailSet(job.videoUrl, 120, job.frameCount);

    job.result = result;
    job.status = 'completed';
    job.progress = 100;
    job.completedAt = new Date();
  } catch (error) {
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : 'Unknown error';
    job.completedAt = new Date();
  }
}

/**
 * Get next job to process (priority queue)
 */
function getNextJob(): BatchJob | undefined {
  const pending = Array.from(batchQueue.jobs.values()).filter((job) => job.status === 'pending');

  if (pending.length === 0) return undefined;

  // Sort by priority (high > normal > low) and creation time
  const priorityOrder = { high: 3, normal: 2, low: 1 };
  return pending.sort((a, b) => {
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return a.createdAt.getTime() - b.createdAt.getTime();
  })[0];
}

/**
 * Generate unique job ID
 */
function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get queue statistics
 */
export function getQueueStats() {
  const jobs = Array.from(batchQueue.jobs.values());
  return {
    total: jobs.length,
    pending: jobs.filter((j) => j.status === 'pending').length,
    processing: jobs.filter((j) => j.status === 'processing').length,
    completed: jobs.filter((j) => j.status === 'completed').length,
    failed: jobs.filter((j) => j.status === 'failed').length,
    averageProcessingTime: calculateAverageProcessingTime(jobs),
  };
}

/**
 * Calculate average processing time
 */
function calculateAverageProcessingTime(jobs: BatchJob[]): number {
  const completedJobs = jobs.filter((j) => j.startedAt && j.completedAt);
  if (completedJobs.length === 0) return 0;

  let totalTime = 0;
  completedJobs.forEach((job) => {
    const duration = (job.completedAt!.getTime() - job.startedAt!.getTime()) / 1000;
    totalTime += duration;
  });

  return Math.round(totalTime / completedJobs.length);
}

/**
 * Clear completed jobs
 */
export function clearCompletedJobs(): number {
  let cleared = 0;
  const jobsToDelete: string[] = [];
  batchQueue.jobs.forEach((job, jobId) => {
    if (job.status === 'completed' || job.status === 'failed') {
      jobsToDelete.push(jobId);
    }
  });
  jobsToDelete.forEach((jobId) => {
    batchQueue.jobs.delete(jobId);
    cleared++;
  });
  return cleared;
}

/**
 * Clear all jobs
 */
export function clearAllJobs(): void {
  batchQueue.jobs.clear();
  batchQueue.processing = false;
  batchQueue.currentJobId = undefined;
}

/**
 * Export queue state (for persistence)
 */
export function exportQueueState() {
  const jobsArray: BatchJob[] = [];
  batchQueue.jobs.forEach((job) => jobsArray.push(job));
  return {
    jobs: jobsArray,
    processing: batchQueue.processing,
    currentJobId: batchQueue.currentJobId,
  };
}
