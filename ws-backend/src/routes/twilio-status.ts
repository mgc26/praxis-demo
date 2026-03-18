// ---------------------------------------------------------------------------
// Vi Praxis BioSciences — Twilio Call Status Callback Route
// ---------------------------------------------------------------------------

import { FastifyInstance } from 'fastify';
import { getCallRecordBySid } from '../server.js';
import type { CallStatus, OutcomeType } from '../types/index.js';

const TWILIO_STATUS_MAP: Record<string, CallStatus> = {
  queued: 'initiated',
  initiated: 'initiated',
  ringing: 'ringing',
  answered: 'connected',
  'in-progress': 'connected',
  completed: 'completed',
  busy: 'no-answer',
  'no-answer': 'no-answer',
  failed: 'failed',
  canceled: 'failed',
};

const FAILURE_OUTCOME_MAP: Record<string, OutcomeType> = {
  busy: 'no-answer',
  'no-answer': 'no-answer',
  failed: 'no-answer',
  canceled: 'no-answer',
};

export async function twilioStatusRoutes(fastify: FastifyInstance) {
  fastify.post('/twilio/status', async (request, reply) => {
    const body = request.body as Record<string, string>;

    const callSid = body.CallSid;
    const twilioStatus = body.CallStatus;
    const callDuration = parseInt(body.CallDuration || '0', 10);

    if (!callSid || !twilioStatus) {
      fastify.log.warn({ body }, 'Twilio status callback missing CallSid or CallStatus');
      return reply.status(400).send({ error: 'Missing CallSid or CallStatus' });
    }

    const callRecord = getCallRecordBySid(callSid);

    if (!callRecord) {
      fastify.log.warn({ callSid, twilioStatus }, 'Call record not found for status callback');
      return reply.status(404).send({ received: true, matched: false });
    }

    const mappedStatus = TWILIO_STATUS_MAP[twilioStatus] || callRecord.status;
    callRecord.status = mappedStatus;

    if (callDuration > 0) {
      callRecord.duration = callDuration;
    }

    if (
      (twilioStatus === 'answered' || twilioStatus === 'in-progress') &&
      !callRecord.connectedAt
    ) {
      callRecord.connectedAt = new Date().toISOString();
    }

    if (['completed', 'busy', 'no-answer', 'failed', 'canceled'].includes(twilioStatus)) {
      callRecord.endedAt = callRecord.endedAt || new Date().toISOString();
    }

    if (FAILURE_OUTCOME_MAP[twilioStatus] && !callRecord.outcome) {
      callRecord.outcome = FAILURE_OUTCOME_MAP[twilioStatus];
    }

    // NOTE: Twilio machineDetection is disabled (eliminates 3-7s AMD delay).
    // Voicemail detection and follow-up SMS are handled in twilio-media.ts
    // post-call processing via Deepgram agent classification.

    fastify.log.info(
      {
        callSid,
        twilioStatus,
        mappedStatus,
        duration: callDuration,
        callId: callRecord.id,
      },
      'Twilio status callback processed',
    );

    return reply.status(200).send({ received: true, matched: true });
  });
}
