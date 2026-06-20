/**
 * Shared Redis connection for all BullMQ queues and workers.
 * A single IORedis instance is reused across the app to minimise
 * the number of commands sent to Redis (each idle connection polls
 * independently, so fewer connections = fewer commands).
 */
import IORedis from 'ioredis';

const sharedRedis = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  tls: process.env.REDIS_URL?.startsWith('rediss://') ? {} : undefined,
});

sharedRedis.on('error', (e) => console.warn('[Redis] Connection error:', e.message));
sharedRedis.on('connect', () => console.log('[Redis] Connected'));

export default sharedRedis;
