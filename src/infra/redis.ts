import { createClient } from "redis";
import { env } from "../config/env";
import { logger } from "./logger";

// Backoff exponencial até 10s
const reconnectStrategy = (retries: number) => {
  const delay = Math.min(1000 * 2 ** Math.min(retries, 5), 10_000);
  logger.warn(`[Redis] reconnecting in ${delay}ms (attempt ${retries})`);
  return delay;
};

export const redis = createClient({
  url: env.REDIS_URL,
  socket: { keepAlive: true, reconnectStrategy },
});

redis.on("connect", () => logger.info("[Redis] connect"));
redis.on("ready", () => logger.info("[Redis] ready"));
redis.on("end", () => logger.warn("[Redis] connection ended"));
redis.on("reconnecting", () => logger.warn("[Redis] reconnecting..."));
redis.on("error", (err) =>
  logger.error(`[Redis] error: ${err?.message || err}`),
);

export async function connectRedis() {
  if (redis.isOpen || redis.isReady) return;
  try {
    await redis.connect();
    const pong = await redis.ping();
    logger.info(`[Redis] connected: ${pong}`);
  } catch (err: any) {
    logger.error(
      `[Redis] initial connect failed: ${err?.code || err?.message || err}`,
    );
    // Em dev, não derruba a app; o retry acima cuida de reconectar
    if (env.NODE_ENV === "production") throw err;
  }
}

export async function disconnectRedis() {
  if (!redis.isOpen) return;
  await redis.quit();
}
