import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { healthRoutes } from './health.js';

describe('health route', () => {
  const fastify = Fastify();

  beforeAll(async () => {
    await fastify.register(healthRoutes);
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  it('GET /health returns 200 status', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/health',
    });
    expect(response.statusCode).toBe(200);
  });

  it('GET /health returns expected fields', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/health',
    });
    const body = JSON.parse(response.payload);

    expect(body).toHaveProperty('status', 'ok');
    expect(body).toHaveProperty('service', 'vi-praxis-ws-backend');
    expect(body).toHaveProperty('uptime');
    expect(typeof body.uptime).toBe('number');
    expect(body).toHaveProperty('timestamp');
    expect(typeof body.timestamp).toBe('string');
  });

  it('GET /health returns a valid ISO timestamp', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/health',
    });
    const body = JSON.parse(response.payload);
    const parsed = new Date(body.timestamp);
    expect(parsed.toISOString()).toBe(body.timestamp);
  });

  it('GET /health uptime is a positive number', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/health',
    });
    const body = JSON.parse(response.payload);
    expect(body.uptime).toBeGreaterThan(0);
  });

  it('returns JSON content type', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/health',
    });
    expect(response.headers['content-type']).toContain('application/json');
  });
});
