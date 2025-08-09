import { z } from 'zod';

const envSchema = z.object({
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  LOG_LEVEL: z.string().default('info'),
  OTP_TTL_SEC: z.string().default('300'),
  OTP_MAX_ATTEMPTS: z.string().default('5'),
  OTP_BLOCK_TTL_SEC: z.string().default('900'),
  RATE_LIMIT_PER_MINUTE: z.string().default('3'),
  NODE_ENV: z.string().default('developement')
});

export const env = envSchema.parse(process.env);
