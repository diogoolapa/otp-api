import { env } from '../config/env';
import { createClient } from 'redis';

export const redis = createClient({ url: env.REDIS_URL });

redis.on('error', (err) => {
  console.error('[Redis] connection error:', err);
});

export async function connectRedis() {
  if (redis.isOpen) return;
  await redis.connect();
  // opcional: sanity ping
  const pong = await redis.ping();
  console.log('[Redis] connected:', pong);
}

// graceful shutdown
export async function disconnectRedis() {
  if (!redis.isOpen) return;
  await redis.quit();
}
