import { FastifyInstance } from 'fastify';
import Swagger from '@fastify/swagger';
import SwaggerUI from '@fastify/swagger-ui';
import path from 'node:path';

export async function registerSwagger(app: FastifyInstance) {
  const specPath = path.join(process.cwd(), 'openapi.yaml');

  // Registro do Swagger (spec)
  await app.register(Swagger, {
    mode: 'static',
    specification: {
      path: specPath,
      baseDir: process.cwd(),
    },
  });

  // UI do Swagger
  await app.register(SwaggerUI, {
    routePrefix: '/otp/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      tryItOutEnabled: true,
    },
    staticCSP: true,
  });
}
