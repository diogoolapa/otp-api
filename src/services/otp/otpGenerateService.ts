import { randomInt } from "crypto";
import { redis } from "../../infra/redis";
import { hashOtp, verifyHash } from "../../utils/hash";
import { env } from "../../config/env";
import { logger } from "../../infra/logger";
import { Mailer } from "../../infra/mailer";

// ---------- Config ----------
const OTP_TTL_SEC = Number(env.OTP_TTL_SEC);

// Mailer singleton (usa RESEND_API_KEY e MAIL_FROM das envs)
const mailer = new Mailer();

export async function generateOtp(
  identifier: string, // para e-mail, usamos o próprio e-mail como identifier
  channel: "email",
): Promise<{ issued: boolean; ttl?: number; replaced?: boolean }> {
  logger.debug({ op: "otp:generate:start", identifier, channel });

  const key = `otp:${identifier}`;
  const attemptsKey = `otp:${identifier}:attempts`;

  // Evita reenvio se já existir um OTP válido
  const ttlExisting = await redis.ttl(key);
  if (ttlExisting && ttlExisting > 0) {
    logger.info({
      op: "otp:resend_suppressed",
      channel,
      identifier,
      ttl: ttlExisting,
    });
    return { issued: false, ttl: ttlExisting };
  }

  // Gera e guarda
  const otp = randomInt(100000, 999999).toString();
  const hashed = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_SEC * 1000);

  await redis
    .multi()
    .set(key, hashed, { EX: OTP_TTL_SEC })
    .del(attemptsKey)
    .exec();

  // Entrega por canal
  if (channel === "email") {
    if (env.NODE_ENV === "production") {
      // PRODUÇÃO: envia e-mail; não loga o código
      try {
        await mailer.sendOtpEmail(
          identifier, // aqui esperamos que o identifier seja o e-mail do usuário
          otp,
        );
        logger.info({ op: "otp:email_sent", identifier, ttl: OTP_TTL_SEC });
      } catch (err) {
        // Não quebramos o fluxo; apenas registramos o erro
        logger.error({
          op: "otp:email_error",
          identifier,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    } else {
      // DEV: loga o código para facilitar testes
      logger.info({
        op: "otp:issued",
        channel,
        identifier,
        ttl: OTP_TTL_SEC,
        otp,
      });
    }
  } else {
    // SMS: futuro — por enquanto apenas loga em dev
    if (env.NODE_ENV !== "production") {
      logger.info({ op: "otp:sms_mock", identifier, ttl: OTP_TTL_SEC, otp });
    } else {
      logger.info({ op: "otp:sms_placeholder", identifier, ttl: OTP_TTL_SEC });
    }
  }

  return { issued: true };
}
