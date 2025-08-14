import { randomInt } from "crypto";
import { redis } from "../../infra/redis";
import { hashOtp, verifyHash } from "../../utils/hash";
import { env } from "../../config/env";
import { logger } from "../../infra/logger";
import { Mailer } from "../../infra/mailer";

// ---------- Config ----------
const MAX_ATTEMPTS = Number(env.OTP_MAX_ATTEMPTS);
const BLOCK_TTL_SEC = Number(env.OTP_BLOCK_TTL_SEC);

export async function verifyOtp(
  identifier: string,
  code: string,
): Promise<{ status: "ok" | "invalid" | "expired" | "blocked" }> {
  logger.debug({ op: "otp:verify:start", identifier });

  const key = `otp:${identifier}`;
  const attemptsKey = `otp:${identifier}:attempts`;
  const blockKey = `otp:${identifier}:blocked`;

  const blockedTtl = await redis.ttl(blockKey);
  if (blockedTtl && blockedTtl > 0) {
    logger.warn({ op: "otp:blocked", identifier, blockedTtl });
    return { status: "blocked" };
  }

  const hashed = await redis.get(key);
  if (!hashed) {
    logger.warn({ op: "otp:expired", identifier });
    return { status: "expired" };
  }

  const isValid = await verifyHash(hashed, code);
  if (isValid) {
    await redis.multi().del(key).del(attemptsKey).del(blockKey).exec();
    logger.info({ op: "otp:verified_ok", identifier });
    return { status: "ok" };
  }

  const attempts = await redis.incr(attemptsKey);
  if (attempts === 1) {
    const ttl = await redis.ttl(key);
    if (ttl > 0) await redis.expire(attemptsKey, ttl);
  }

  logger.warn({ op: "otp:invalid_attempt", identifier, attempts });

  if (attempts >= MAX_ATTEMPTS) {
    await redis.set(blockKey, "1", { EX: BLOCK_TTL_SEC });
    logger.warn({ op: "otp:blocked_now", identifier, blockTtl: BLOCK_TTL_SEC });
    return { status: "blocked" };
  }

  return { status: "invalid" };
}
