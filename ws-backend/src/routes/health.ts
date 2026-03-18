import { FastifyInstance } from 'fastify';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (_request, reply) => {
    return reply.send({
      status: 'ok',
      service: 'vi-praxis-ws-backend',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });
}
