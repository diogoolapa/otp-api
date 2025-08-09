import { FastifyReply, FastifyRequest } from 'fastify';
import { register } from '../infra/metrics';


export async function handleMetrics(_req: FastifyRequest, reply: FastifyReply) {
  reply.header('Content-Type', register.contentType);
  return reply.send(await register.metrics());
}
