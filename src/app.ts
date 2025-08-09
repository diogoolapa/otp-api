import Fastify from 'fastify';
import { registerRoutes } from './routes';
import { connectRedis } from './infra/redis';
import { env } from './config/env';
import { httpRequestDuration } from './infra/metrics';

async function buildApp() {
  const app = Fastify({
    logger: { level: env.LOG_LEVEL },
  });

  // Metrics
  app.addHook('onRequest', async (req) => {
    // marca início (ns)
    (req as any)._hrstart = process.hrtime.bigint();
  });

  app.addHook('onResponse', async (req, reply) => {
    const start = (req as any)._hrstart as bigint | undefined;
    if (!start) return;

    const end = process.hrtime.bigint();
    const seconds = Number(end - start) / 1e9;

    // rota normalizada: usa a URL declarada da rota quando disponível
    const route = (req.routeOptions?.url as string) || req.url;
    const method = req.method;
    const status = String(reply.statusCode);

    httpRequestDuration.labels(method, route, status).observe(seconds);
  });

  // CORS
  await app.register(import('@fastify/cors'), {
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Segurança
  await app.register(import('@fastify/helmet'));

  // Conexão ao Redis
  await connectRedis();

  // Rotas (apontando pros controllers)
  await app.register(registerRoutes);

  // Error handler global
  app.setErrorHandler((err, _req, reply) => {
    app.log.error(err);
    const status = (err as any).statusCode ?? 500;
    reply.status(status).send({ error: (err as any).message ?? 'Internal Server Error' });
  });

  return app;
}

export default buildApp;
