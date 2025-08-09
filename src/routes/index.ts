import { FastifyInstance } from 'fastify';
import { otpRoutes } from './otp.routes';
import { metricsRoutes } from './metrics.routes';
import { healthRoutes } from './health.routes';

export async function registerRoutes(app: FastifyInstance) {
  await healthRoutes(app);
  await otpRoutes(app);
  await metricsRoutes(app);
}