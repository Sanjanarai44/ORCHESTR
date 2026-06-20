import { Queue } from 'bullmq';
import sharedRedis from '../config/sharedRedis.js';

export const anomalyQueue = new Queue('anomaly_queue', {
  connection: sharedRedis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

export default anomalyQueue;
