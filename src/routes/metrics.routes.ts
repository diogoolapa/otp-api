import { FastifyInstance } from 'fastify';
import { handleMetrics } from '../controllers/metrics.controller';

export async function metricsRoutes(app: FastifyInstance) {
  app.get('/otp/metrics', handleMetrics); // vira /otp/metrics com prefix
}