import client from "prom-client";

export const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Counters existentes
export const otpRequests = new client.Counter({
  name: "otp_requests_total",
  help: "OTP requests",
});
export const otpVerifyOk = new client.Counter({
  name: "otp_verify_ok_total",
  help: "OTP verify OK",
});
export const otpVerifyFail = new client.Counter({
  name: "otp_verify_fail_total",
  help: "OTP verify FAIL",
});

// rate-limit hits
export const rateLimitHits = new client.Counter({
  name: "rate_limit_hits_total",
  help: "Requests blocked by rate limit",
});

// histograma de duração por rota (em segundos)
export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"] as const,
  // buckets típicos do Prometheus (s)
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});

register.registerMetric(otpRequests);
register.registerMetric(otpVerifyOk);
register.registerMetric(otpVerifyFail);
register.registerMetric(rateLimitHits);
register.registerMetric(httpRequestDuration);
