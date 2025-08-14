import { redis } from "../infra/redis";

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSec: number,
) {
  const bucket = `rl:${key}:${Math.floor(Date.now() / (windowSec * 1000))}`;
  const count = await redis.incr(bucket);
  if (count === 1) await redis.expire(bucket, windowSec);
  return count <= limit;
}
