import { z } from "zod";

function isValidUrl(u: string) {
  try {
    new URL(u);
    return true;
  } catch {
    return false;
  }
}

function pickRedisUrl() {
  const candidates = [
    process.env.REDIS_URL, // pode vir "" do compose
    process.env.UPSTASH_REDIS_URL_TCP, // Upstash (tcp://... ou rediss://...)
    process.env.NODE_ENV === "production" ? undefined : "redis://redis:6379", // docker local
    "redis://localhost:6379", // fallback local
  ];

  for (const v of candidates) {
    const s = (v ?? "").trim();
    if (s && isValidUrl(s)) return s;
  }
  return "redis://localhost:6379";
}

const envSchema = z.object({
  REDIS_URL: z.string().refine(isValidUrl, { message: "Invalid URL format" }),
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

export const env = envSchema.parse({
  ...process.env,
  REDIS_URL: pickRedisUrl(),
});
