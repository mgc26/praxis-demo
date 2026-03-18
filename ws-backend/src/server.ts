// ---------------------------------------------------------------------------
// Vi Praxis BioSciences — Multi-Agent Pharma Support Platform
// WebSocket / API Backend
// ---------------------------------------------------------------------------

import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { v4 as uuidv4 } from 'uuid';

import type { ContactRecord, CallRecord, ContactSubmission } from './types/index.js';
import { healthRoutes } from './routes/health.js';
import { twilioVoiceRoutes } from './routes/twilio-voice.js';
import { twilioMediaRoutes } from './routes/twilio-media.js';
import { twilioStatusRoutes } from './routes/twilio-status.js';
import { apiCallsRoutes } from './routes/api-calls.js';
import { apiContactsRoutes } from './routes/api-contacts.js';
import { apiDemoCallRoutes } from './routes/api-demo-call.js';
import { processContactOutreach } from './services/contact-outreach-processor.js';

// ---------------------------------------------------------------------------
// In-memory stores
// ---------------------------------------------------------------------------

export const contacts = new Map<string, ContactRecord>();
export const calls = new Map<string, CallRecord>();
export const callIdBySid = new Map<string, string>();

export function getCallRecordBySid(callSid: string): CallRecord | undefined {
  const callId = callIdBySid.get(callSid);
  return callId ? calls.get(callId) : undefined;
}

// ---------------------------------------------------------------------------
// Fastify server
// ---------------------------------------------------------------------------

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport:
      process.env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
          }
        : undefined,
  },
});

async function bootstrap() {
  // ---- Plugins ----

  await server.register(cors, {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  await server.register(websocket);

  // Fastify v5 / @fastify/websocket v11: register content-type parser for
  // Twilio's form-urlencoded webhooks
  server.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'string' },
    (_req, body, done) => {
      try {
        const parsed = Object.fromEntries(new URLSearchParams(body as string));
        done(null, parsed);
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  // ---- Routes ----

  await server.register(healthRoutes);
  await server.register(twilioVoiceRoutes);
  await server.register(twilioMediaRoutes);
  await server.register(twilioStatusRoutes);
  await server.register(apiCallsRoutes);
  await server.register(apiContactsRoutes);
  await server.register(apiDemoCallRoutes);

  // ---- Legacy single-endpoint outreach trigger (mirrors /api/contacts/outreach) ----

  server.post<{
    Body: ContactSubmission & { contactId?: string; agentType?: string };
  }>('/api/outreach/trigger', async (request, reply) => {
    const body = request.body;

    const contactId = body.contactId || uuidv4();

    // Prevent duplicate calls — reject if contact is already in a call
    const existingContact = contacts.get(contactId);
    if (existingContact && (existingContact.status === 'calling' || existingContact.status === 'connected')) {
      return reply.status(409).send({
        error: 'Call already in progress',
        contactId: existingContact.contactId,
        status: existingContact.status,
      });
    }

    const contact: ContactRecord = {
      contactId,
      contactType: body.contactType || 'patient',
      agentType: body.agentType || 'patient-support',
      name: body.name,
      phone: body.phone,
      age: body.age,
      gender: body.gender,
      therapeuticArea: body.therapeuticArea || 'essential-tremor',
      diagnosis: body.diagnosis,
      currentDrug: body.currentDrug,
      prescribingHcp: body.prescribingHcp,
      npi: body.npi,
      specialty: body.specialty,
      institution: body.institution,
      prescribingVolume: body.prescribingVolume,
      behavioralSignals: body.behavioralSignals ?? [],
      recommendedPathway: body.recommendedPathway || 'patient-education',
      engagementLabels: body.engagementLabels ?? [],
      riskTier: body.riskTier || 'MEDIUM',
      riskScore: body.riskScore ?? 0,
      preferredChannel: body.preferredChannel ?? 'voice',
      status: 'new',
      createdAt: new Date().toISOString(),
      callAttempts: 0,
      lastCallAttempt: null,
      callId: null,
    };

    contacts.set(contactId, contact);

    server.log.info({ contactId, phone: contact.phone, agentType: contact.agentType }, 'Outreach trigger received');

    try {
      const { callSid } = await processContactOutreach(contact, { contacts, calls, callIdBySid });

      return reply.status(200).send({
        callSid,
        contactId,
        status: 'initiating',
      });
    } catch (err) {
      server.log.error({ err, contactId }, 'Failed to process contact outreach');
      contact.status = 'new';
      return reply.status(500).send({
        error: 'Failed to initiate call',
        contactId,
      });
    }
  });

  // ---- Seed data (optional — loaded if present) ----

  try {
    // @ts-ignore — seed-data is optional; file may not exist in CI
    const seedModule = await import('./seed-data.js');
    if (seedModule.seedContacts) {
      for (const contact of seedModule.seedContacts) {
        contacts.set(contact.contactId, contact);
      }
      server.log.info(`Loaded ${seedModule.seedContacts.length} seed contacts`);
    }
    if (seedModule.seedCalls) {
      for (const call of seedModule.seedCalls) {
        calls.set(call.id, call);
        callIdBySid.set(call.callSid, call.id);
      }
      server.log.info(`Loaded ${seedModule.seedCalls.length} seed call records`);
    }
  } catch {
    server.log.debug('No seed data module found — starting with empty stores');
  }

  // ---- Start server ----

  const port = parseInt(process.env.PORT || '8080', 10);
  const host = process.env.HOST || '0.0.0.0';

  await server.listen({ port, host });
  server.log.info(`Vi Praxis BioSciences backend listening on ${host}:${port}`);

  // Periodic cleanup of old completed call records (every 30 minutes)
  setInterval(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
    let cleaned = 0;
    for (const [id, call] of calls) {
      const createdAt = new Date(call.startedAt).getTime();
      if (createdAt < cutoff && call.status === 'completed') {
        calls.delete(id);
        if (call.callSid) callIdBySid.delete(call.callSid);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      server.log.info({ cleaned }, 'Cleaned up old call records');
    }
  }, 30 * 60 * 1000);
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

const shutdown = async (signal: string) => {
  server.log.info(`Received ${signal} — shutting down gracefully`);
  try {
    await server.close();
    process.exit(0);
  } catch (err) {
    server.log.error({ err }, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

if (!process.env.VITEST) {
  bootstrap().catch((err) => {
    console.error('Fatal error during startup:', err);
    process.exit(1);
  });
}
