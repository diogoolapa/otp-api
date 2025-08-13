import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health.routes';
import { metricsRoutes } from './metrics.routes';
import { otpRoutes } from './otp.routes';

export async function registerRoutes(app: FastifyInstance) {
  await app.register(healthRoutes,  { prefix: '/otp' });   // GET /otp/health
  await app.register(metricsRoutes, { prefix: '/otp' });   // GET /otp/metrics
  await app.register(otpRoutes,     { prefix: '/otp' });   // POST /otp/generate (ou /otp/request), POST /otp/verify
}