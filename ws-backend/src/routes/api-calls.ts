// ---------------------------------------------------------------------------
// Vi Praxis BioSciences — API Routes: Call Records
// ---------------------------------------------------------------------------

import { FastifyInstance } from 'fastify';
import { calls } from '../server.js';

export async function apiCallsRoutes(fastify: FastifyInstance) {
  // GET /api/calls — return all call records, sorted by startedAt desc
  fastify.get('/api/calls', async (_request, reply) => {
    const allCalls = Array.from(calls.values()).sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );

    return reply.send({
      total: allCalls.length,
      calls: allCalls.map((c) => ({
        id: c.id,
        contactId: c.contactId,
        callSid: c.callSid,
        direction: c.direction,
        agentType: c.agentType,
        status: c.status,
        duration: c.duration,
        startedAt: c.startedAt,
        connectedAt: c.connectedAt,
        endedAt: c.endedAt,
        outcome: c.outcome,
        outcomeConfidence: c.outcomeConfidence,
        sentiment: c.sentiment,
        urgency: c.urgency,
        supportPathway: c.supportPathway,
        liaisonSummary: c.liaisonSummary,
        nextAction: c.nextAction,
        aeDetected: c.aeDetected,
        smsFollowUpSent: c.smsFollowUpSent,
        smsFollowUpTemplate: c.smsFollowUpTemplate,
        smsFollowUpSentAt: c.smsFollowUpSentAt,
        transcriptLength: c.transcript?.length ?? 0,
        screeningResults: c.screeningResults ?? null,
        competitiveIntelNotes: c.competitiveIntelNotes ?? null,
      })),
    });
  });

  // GET /api/calls/:id — return a single call record with full transcript and classification
  fastify.get<{ Params: { id: string } }>('/api/calls/:id', async (request, reply) => {
    const callRecord = calls.get(request.params.id);

    if (!callRecord) {
      return reply.status(404).send({ error: 'Call record not found', id: request.params.id });
    }

    return reply.send({
      ...callRecord,
      // Ensure transcript is always an array
      transcript: callRecord.transcript ?? [],
    });
  });
}
