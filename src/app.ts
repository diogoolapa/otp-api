import Fastify, {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import { registerRoutes } from "./routes";
import { connectRedis } from "./infra/redis";
import { env } from "./config/env";
import { httpRequestDuration } from "./infra/metrics";
import { registerSwagger } from "./infra/swagger";
import { HttpError } from "./utils/httpError";

// Extendendo FastifyRequest para incluir _hrstart
declare module "fastify" {
  interface FastifyRequest {
    _hrstart?: bigint;
  }
}

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: env.LOG_LEVEL },
  });

  // Métricas
  app.addHook("onRequest", async (req: FastifyRequest) => {
    req._hrstart = process.hrtime.bigint();
  });

  app.addHook(
    "onResponse",
    async (req: FastifyRequest, reply: FastifyReply) => {
      const start = req._hrstart;
      if (!start) return;

      const end = process.hrtime.bigint();
      const seconds = Number(end - start) / 1e9;

      const route = (req.routeOptions?.url as string) || req.url;
      const method = req.method;
      const status = String(reply.statusCode);

      httpRequestDuration.labels(method, route, status).observe(seconds);
    }
  );

  // Swagger
  await registerSwagger(app);

  //CORS
  await app.register(import("@fastify/cors"), {
    origin: process.env.ALLOWED_ORIGINS?.split(",") ?? [
      "http://localhost:3000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  //Segurança
  await app.register(import("@fastify/helmet"));

  // Redis
  await connectRedis();

  //Rotas
  await app.register(registerRoutes);

  //404 handler
  app.setNotFoundHandler((req, reply) => {
    reply.status(404).send({
      error: "not_found",
      message: `Route ${req.method} ${req.url} not found`,
    });
  });

  //Error handler global
  app.setErrorHandler((err, _req, reply) => {
    app.log.error({ err }, "Unhandled error");

    // Validação Fastify/Zod
    // @ts-ignore
    if (err.validation) {
      return reply.status(400).send({
        error: "validation_error",
        message: "Invalid request data",
        // @ts-ignore
        details: err.validation,
      });
    }

    // Erro customizado HttpError
    if (err instanceof HttpError) {
      return reply.status(err.statusCode).send({
        error: err.errorCode,
        message: err.message,
      });
    }

    // Erro genérico
    const status = (err as any).statusCode ?? 500;
    reply.status(status).send({
      error: "internal_server_error",
      message: err.message ?? "Internal Server Error",
    });
  });

  return app;
}

export default buildApp;
