// ---------------------------------------------------------------------------
// Vi Praxis BioSciences — API Route: Call Status
// Returns the current status and details of a call by its Twilio callSid.
// ---------------------------------------------------------------------------

import { FastifyInstance } from 'fastify';
import { callIdBySid, calls } from '../server.js';

interface CallStatusQuery {
  callSid?: string;
}

export async function apiCallStatusRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: CallStatusQuery }>('/api/call-status', async (request, reply) => {
    const { callSid } = request.query;

    if (!callSid) {
      return reply.status(400).send({ error: 'Missing required query parameter: callSid' });
    }

    const callId = callIdBySid.get(callSid);
    if (!callId) {
      return reply.status(404).send({ error: 'Call not found', callSid });
    }

    const callRecord = calls.get(callId);
    if (!callRecord) {
      return reply.status(404).send({ error: 'Call record not found', callSid, callId });
    }

    const response: Record<string, unknown> = {
      callSid: callRecord.callSid,
      callId: callRecord.id,
      status: callRecord.status,
      duration: callRecord.duration,
      outcome: callRecord.outcome,
      summary: callRecord.summary,
      contactId: callRecord.contactId,
    };

    // Only include transcript when the call is completed
    if (callRecord.status === 'completed') {
      response.transcript = callRecord.transcript;
    }

    return reply.status(200).send(response);
  });
}
