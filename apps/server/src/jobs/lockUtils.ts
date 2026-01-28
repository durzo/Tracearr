/**
 * Shared utilities for BullMQ job lock management
 */

import type { Job } from 'bullmq';

/**
 * Extend the job lock, failing fast if extension fails.
 *
 * If we can't extend the lock, the job is already in a bad state - BullMQ may have
 * marked it as stalled and another worker could pick it up. Continuing would waste
 * work and result in a confusing "Missing lock" error at job completion.
 *
 * @param job - The BullMQ job to extend the lock for
 * @param durationMs - How long to extend the lock (default: 30 minutes)
 * @throws Error if lock extension fails (triggers clean job failure and retry)
 */
export async function extendJobLock(job: Job, durationMs: number = 30 * 60 * 1000) {
  if (!job.token) {
    throw new Error(`Job ${job.id} has no lock token - cannot extend lock`);
  }

  try {
    await job.extendLock(job.token, durationMs);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Lost lock for job ${job.id} - aborting to allow clean retry. ` +
        `This usually indicates a Redis connectivity issue. Original error: ${message}`
    );
  }
}
