// ---------------------------------------------------------------------------
// Vi Praxis BioSciences — API Routes: Contact Outreach Queue
// ---------------------------------------------------------------------------

import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { contacts, calls, callIdBySid } from '../server.js';
import { processContactOutreach } from '../services/contact-outreach-processor.js';
import type { ContactRecord, ContactSubmission } from '../types/index.js';

export async function apiContactsRoutes(fastify: FastifyInstance) {
  // GET /api/contacts — return the full contact outreach queue
  fastify.get('/api/contacts', async (_request, reply) => {
    const allContacts = Array.from(contacts.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return reply.send({
      total: allContacts.length,
      contacts: allContacts.map((c) => ({
        contactId: c.contactId,
        contactType: c.contactType,
        agentType: c.agentType,
        name: c.name,
        phone: c.phone,
        age: c.age,
        therapeuticArea: c.therapeuticArea,
        riskTier: c.riskTier,
        riskScore: c.riskScore,
        recommendedPathway: c.recommendedPathway,
        engagementLabels: c.engagementLabels,
        behavioralSignalCount: c.behavioralSignals.length,
        status: c.status,
        callAttempts: c.callAttempts,
        lastCallAttempt: c.lastCallAttempt,
        callId: c.callId,
        createdAt: c.createdAt,
      })),
    });
  });

  // GET /api/contacts/:id — return a single contact with full detail
  fastify.get<{ Params: { id: string } }>('/api/contacts/:id', async (request, reply) => {
    const contact = contacts.get(request.params.id);

    if (!contact) {
      return reply.status(404).send({ error: 'Contact not found', id: request.params.id });
    }

    // Attach any call records for this contact
    const contactCalls = Array.from(calls.values())
      .filter((c) => c.contactId === contact.contactId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    return reply.send({
      ...contact,
      calls: contactCalls.map((c) => ({
        id: c.id,
        callSid: c.callSid,
        agentType: c.agentType,
        status: c.status,
        outcome: c.outcome,
        duration: c.duration,
        startedAt: c.startedAt,
        endedAt: c.endedAt,
        urgency: c.urgency,
        supportPathway: c.supportPathway,
        liaisonSummary: c.liaisonSummary,
        aeDetected: c.aeDetected,
      })),
    });
  });

  // POST /api/contacts/outreach — trigger an outbound call for a contact
  fastify.post<{
    Body: ContactSubmission & { contactId?: string };
  }>('/api/contacts/outreach', async (request, reply) => {
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

    fastify.log.info({ contactId, phone: contact.phone, agentType: contact.agentType }, 'Processing new contact outreach');

    try {
      const { callSid } = await processContactOutreach(contact, { contacts, calls, callIdBySid });

      return reply.status(200).send({
        callSid,
        contactId,
        status: 'initiating',
      });
    } catch (err) {
      fastify.log.error({ err, contactId }, 'Failed to process contact outreach');
      contact.status = 'new';
      return reply.status(500).send({
        error: 'Failed to initiate call',
        contactId,
      });
    }
  });
}
