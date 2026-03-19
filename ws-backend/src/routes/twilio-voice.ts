// ---------------------------------------------------------------------------
// Vi Praxis BioSciences — Twilio Voice Webhook Route
// Handles incoming Twilio call webhook — returns TwiML to connect to
// the Deepgram media stream, passing contact data as custom parameters.
// ---------------------------------------------------------------------------

import { FastifyInstance } from 'fastify';
import { contacts } from '../server.js';
import { buildAgentVoicemailMessage } from '../prompts/agent-prompts.js';
import { isMachineAnsweredBy } from '../utils/answered-by.js';

export async function twilioVoiceRoutes(fastify: FastifyInstance) {
  // Fallback TwiML route — served when the primary /twilio/voice webhook is
  // unreachable. Twilio will hit this fallbackUrl so the caller hears a polite
  // message instead of silence.
  fastify.post('/twilio/voice/fallback', async (_request, reply) => {
    fastify.log.error('Twilio fallback URL invoked — primary voice webhook may be failing');
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>We're experiencing technical difficulties. Please call back later.</Say>
  <Hangup />
</Response>`;
    return reply.type('application/xml').send(twiml);
  });

  fastify.post('/twilio/voice', async (request, reply) => {
    const body = request.body as Record<string, string>;
    const query = request.query as Record<string, string>;

    // contactId and brandId can be passed as query params from the outbound call URL
    const contactId = query.contactId || body.contactId || '';
    const brandId = query.brandId || body.brandId || 'praxis';
    const contact = contacts.get(contactId);

    // Resolve contact fields — fall back to body params or defaults
    const name = contact?.name || body.name || '';
    const phone = contact?.phone || body.To || '';
    const contactType = contact?.contactType || body.contactType || 'patient';
    const agentType = contact?.agentType || body.agentType || 'patient-support';
    const therapeuticArea = contact?.therapeuticArea || body.therapeuticArea || 'essential-tremor';
    const riskTier = contact?.riskTier || body.riskTier || 'MEDIUM';
    const recommendedPathway = contact?.recommendedPathway || body.recommendedPathway || 'patient-education';
    const answeredBy = body.AnsweredBy || '';

    // Serialize behavioral signals for stream parameter (JSON string)
    const behavioralSignalsJson = contact?.behavioralSignals
      ? encodeURIComponent(JSON.stringify(contact.behavioralSignals))
      : '';
    const engagementLabelsJson = contact?.engagementLabels
      ? encodeURIComponent(JSON.stringify(contact.engagementLabels))
      : '';

    if (isMachineAnsweredBy(answeredBy)) {
      const voicemailMessage = buildAgentVoicemailMessage({
        name: name || 'there',
        contactType: contactType as 'patient' | 'hcp' | 'caregiver',
        agentType: agentType as 'patient-support' | 'hcp-support' | 'hcp-outbound' | 'medcomms-qa',
        therapeuticArea: therapeuticArea as 'essential-tremor' | 'dee-dravet',
      });

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${escapeXml(voicemailMessage)}</Say>
  <Hangup />
</Response>`;

      return reply.type('application/xml').send(twiml);
    }

    const wsBackendUrl = process.env.WS_BACKEND_URL || '';
    const wsUrl = wsBackendUrl
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${wsUrl}/twilio/media-stream">
      <Parameter name="contactId" value="${escapeXml(contactId)}" />
      <Parameter name="name" value="${escapeXml(name)}" />
      <Parameter name="phone" value="${escapeXml(phone)}" />
      <Parameter name="contactType" value="${escapeXml(contactType)}" />
      <Parameter name="agentType" value="${escapeXml(agentType)}" />
      <Parameter name="therapeuticArea" value="${escapeXml(therapeuticArea)}" />
      <Parameter name="riskTier" value="${escapeXml(riskTier)}" />
      <Parameter name="recommendedPathway" value="${escapeXml(recommendedPathway)}" />
      <Parameter name="age" value="${escapeXml(String(contact?.age ?? ''))}"/>
      <Parameter name="gender" value="${escapeXml(contact?.gender ?? '')}" />
      <Parameter name="riskScore" value="${escapeXml(String(contact?.riskScore ?? ''))}" />
      <Parameter name="diagnosis" value="${escapeXml(contact?.diagnosis ?? '')}" />
      <Parameter name="currentDrug" value="${escapeXml(contact?.currentDrug ?? '')}" />
      <Parameter name="currentDose" value="${escapeXml(contact?.currentDose ?? '')}" />
      <Parameter name="prescribingHcp" value="${escapeXml(contact?.prescribingHcp ?? '')}" />
      <Parameter name="npi" value="${escapeXml(contact?.npi ?? '')}" />
      <Parameter name="specialty" value="${escapeXml(contact?.specialty ?? '')}" />
      <Parameter name="institution" value="${escapeXml(contact?.institution ?? '')}" />
      <Parameter name="hubEnrolled" value="${escapeXml(String(contact?.hubEnrolled ?? ''))}" />
      <Parameter name="copayCardActive" value="${escapeXml(String(contact?.copayCardActive ?? ''))}" />
      <Parameter name="behavioralSignals" value="${escapeXml(behavioralSignalsJson)}" />
      <Parameter name="engagementLabels" value="${escapeXml(engagementLabelsJson)}" />
      <Parameter name="answeredBy" value="${escapeXml(answeredBy)}" />
      <Parameter name="brandId" value="${escapeXml(brandId)}" />
    </Stream>
  </Connect>
</Response>`;

    reply.type('application/xml').send(twiml);
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
