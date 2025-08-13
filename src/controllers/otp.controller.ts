import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { generateOtp, verifyOtp } from "../services/otp/otpService";
import { checkRateLimit } from "../services/rateLimitService";
import { env } from "../config/env";
import { otpRequests, otpVerifyOk, otpVerifyFail } from "../infra/metrics";
import { Metrics } from "../services/otp/metricsService";

const requestSchema = z.object({
  identifier: z.string().min(3),
  channel: z.enum(["email"]).default("email"),
});
const verifySchema = z.object({
  identifier: z.string().min(3),
  code: z
    .string()
    .regex(/^\d{6}$/)
    .length(6),
});

type OtpRequest = FastifyRequest<{ Body: z.infer<typeof requestSchema> }>;
type OtpVerify = FastifyRequest<{ Body: z.infer<typeof verifySchema> }>;

export async function handleOtpRequest(req: OtpRequest, reply: FastifyReply) {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply
      .status(400)
      .send({ error: "Invalid body", issues: z.flattenError(parsed.error) });
  }
  const { identifier, channel } = parsed.data;

  const limit = Number(env.RATE_LIMIT_PER_MINUTE ?? "3");
  const ok = await checkRateLimit(
    `${identifier}:${req.ip ?? "unknown"}`,
    limit,
    60
  );
  if (!ok) {
    Metrics.incRateLimitHit?.();
    return reply
      .status(429)
      .send({ error: "Too many requests", message: "Try again later" });
  }

  const result = await generateOtp(identifier, channel);
  Metrics.incOtpRequest();

  // Você pode manter uma mensagem genérica para não revelar estado, se preferir
  return reply.send({
    message: result.issued ? "OTP sent" : "OTP already issued (still valid)",
    issued: result.issued,
    ttl: result.ttl ?? undefined,
  });
}

export async function handleOtpVerify(req: OtpVerify, reply: FastifyReply) {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    return reply
      .status(400)
      .send({ error: "Invalid body", issues: z.flattenError(parsed.error) });
  }
  const { identifier, code } = parsed.data;

  try {
    const result = await verifyOtp(identifier, code);
    if (result.status === "ok") {
      otpVerifyOk.inc();
      return reply.send({ success: true });
    }
    otpVerifyFail.inc();
    if (result.status === "expired")
      return reply.status(410).send({ success: false, error: "Code expired" });
    if (result.status === "blocked")
      return reply
        .status(429)
        .send({ success: false, error: "too_many_requests", message: "Try again later" });
    return reply.status(401).send({ success: false, error: "Invalid code" });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: "Internal error" });
  }
}
