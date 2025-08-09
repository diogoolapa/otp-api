import { randomInt } from 'crypto';
import { redis } from '../../infra/redis';
import { hashOtp, verifyHash } from '../../utils/hash'; // <- importa verifyHash
import { env } from '../../config/env';

const OTP_TTL_SEC    = Number(env.OTP_TTL_SEC);        // ex: 300
const MAX_ATTEMPTS   = Number(env.OTP_MAX_ATTEMPTS);   // ex: 5
const BLOCK_TTL_SEC  = Number(env.OTP_BLOCK_TTL_SEC);  // ex: 900

export async function generateOtp(
  identifier: string,
  channel: 'email' | 'sms'
): Promise<{ issued: boolean; ttl?: number; replaced?: boolean }> {
  const key = `otp:${identifier}`;
  const attemptsKey = `otp:${identifier}:attempts`;

  const ttlExisting = await redis.ttl(key);
  if (ttlExisting && ttlExisting > 0) {
    console.log(`[OTP][${channel}] Resend suppressed for ${identifier} (ttl=${ttlExisting}s)`);
    return { issued: false, ttl: ttlExisting }; // ← 200 com “já existe, ainda válido”
  }

  const otp = randomInt(100000, 999999).toString();
  const hashed = await hashOtp(otp);

  await redis.multi()
    .set(key, hashed, { EX: OTP_TTL_SEC })
    .del(attemptsKey)
    .exec();

    if (env.NODE_ENV !== 'production') console.log(`[OTP][${channel}] Sent code ${otp} to ${identifier}`);
  return { issued: true };
}

export async function verifyOtp(
  identifier: string,
  code: string
): Promise<{ status: 'ok' | 'invalid' | 'expired' | 'blocked' }> {
  const key        = `otp:${identifier}`;
  const attemptsKey= `otp:${identifier}:attempts`;
  const blockKey   = `otp:${identifier}:blocked`;

  // bloqueado?
  const blockedTtl = await redis.ttl(blockKey);
  if (blockedTtl && blockedTtl > 0) return { status: 'blocked' };

  // existe OTP válido?
  const hashed = await redis.get(key);
  if (!hashed) return { status: 'expired' };

  // valida (corrigido: verifyHash, não verifyOtp)
  const isValid = await verifyHash(hashed, code);
  if (isValid) {
    await redis.multi().del(key).del(attemptsKey).del(blockKey).exec();
    return { status: 'ok' };
  }

  // inválido → incrementa tentativas e alinha TTL do contador
  const attempts = await redis.incr(attemptsKey);
  if (attempts === 1) {
    const ttl = await redis.ttl(key);
    if (ttl > 0) await redis.expire(attemptsKey, ttl);
  }

  if (attempts >= MAX_ATTEMPTS) {
    await redis.set(blockKey, '1', { EX: BLOCK_TTL_SEC });
    return { status: 'blocked' };
  }

  return { status: 'invalid' };
}
