/**
 * System 4: BullMQ Email Queue instance (Node.js)
 * Shared queue reference used by both the worker and the helper.
 */
import { Queue } from 'bullmq';
import sharedRedis from '../config/sharedRedis.js';

export const emailQueue = new Queue('email_queue', {
  connection: sharedRedis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // 2s → 4s → 8s
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

export default emailQueue;
