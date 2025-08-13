import { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    // Logs
    app.log.error({ err: error, url: request.url, method: request.method }, error.message);

    // Erro vindo de validação Zod ou similar
    if (error.validation) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Invalid request data',
        details: error.validation
      });
    }

    // Erros personalizados que já definem statusCode e errorCode
    if ((error as any).statusCode && (error as any).errorCode) {
      return reply.status((error as any).statusCode).send({
        error: (error as any).errorCode,
        message: error.message
      });
    }

    // Demais erros → 500 genérico
    return reply.status(500).send({
      error: 'internal_server_error',
      message: 'Something went wrong'
    });
  });
}
