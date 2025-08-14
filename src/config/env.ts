import { z } from "zod";

// Prepara process.env.REDIS_URL a partir de UPSTASH_REDIS_URL_TCP, se necessário
if (!process.env.REDIS_URL && process.env.UPSTASH_REDIS_URL_TCP) {
  process.env.REDIS_URL = process.env.UPSTASH_REDIS_URL_TCP;
}

const envSchema = z.object({
  REDIS_URL: z
    .string()
    .default("redis://localhost:6379")
    .refine(
      (val) => {
        try {
          new URL(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Invalid URL format" }
    ),
  LOG_LEVEL: z.string().default("info"),
  OTP_TTL_SEC: z.string().default("300"),
  OTP_MAX_ATTEMPTS: z.string().default("5"),
  OTP_BLOCK_TTL_SEC: z.string().default("900"),
  RATE_LIMIT_PER_MINUTE: z.string().default("3"),
  NODE_ENV: z.string().default("development"),
  RESEND_API_KEY: z.string().default("not found"),
  MAIL_FROM: z.string().default("OTP Service <onboarding@resend.dev>"),
  APP_NAME: z.string().default("OTP API"),
});

export const env = envSchema.parse(process.env);