// ---------------------------------------------------------------------------
// Vi Praxis BioSciences — Contact Outreach Processor
// Validates a ContactRecord, initiates a Twilio outbound call,
// and creates the corresponding CallRecord in the in-memory store.
// ---------------------------------------------------------------------------

import { v4 as uuidv4 } from 'uuid';
import type { CallRecord, ContactRecord } from '../types/index.js';
import { twilioService } from './twilio-service.js';

interface OutreachProcessorStore {
  contacts: Map<string, ContactRecord>;
  calls: Map<string, CallRecord>;
  callIdBySid: Map<string, string>;
}

export async function processContactOutreach(
  contact: ContactRecord,
  store: OutreachProcessorStore,
): Promise<{ callSid: string }> {
  // Validate required fields
  if (!contact.phone) {
    throw new Error(`Contact ${contact.contactId} has no phone number on file`);
  }
  if (!/^\+?[1-9]\d{1,14}$/.test(contact.phone)) {
    throw new Error(`Invalid phone number format for contact ${contact.contactId}: ${contact.phone}`);
  }
  if (!contact.name) {
    throw new Error(`Contact ${contact.contactId} has no name on file`);
  }

  // Update contact status to calling
  contact.status = 'calling';
  contact.callAttempts += 1;
  contact.lastCallAttempt = new Date().toISOString();
  store.contacts.set(contact.contactId, contact);

  try {
    const callSid = await twilioService.initiateCall(contact);

    // Create the call record
    const callRecord: CallRecord = {
      id: uuidv4(),
      contactId: contact.contactId,
      callSid,
      direction: 'outbound',
      agentType: contact.agentType,
      status: 'initiated',
      duration: 0,
      startedAt: new Date().toISOString(),
      connectedAt: null,
      endedAt: null,
      outcome: null,
      outcomeConfidence: null,
      sentiment: null,
      summary: null,
      keyMoments: null,
      contactConcerns: null,
      nextAction: null,
      liaisonSummary: null,
      supportPathway: null,
      urgency: null,
      behavioralSignalsReferenced: null,
      appointmentDetails: null,
      transcript: [],
      smsFollowUpSent: false,
      smsFollowUpTemplate: null,
      smsFollowUpSentAt: null,
      screeningResults: null,
      aeDetected: false,
      competitiveIntelNotes: null,
    };

    store.calls.set(callRecord.id, callRecord);
    store.callIdBySid.set(callSid, callRecord.id);

    // Link call record back to contact
    contact.callId = callRecord.id;
    store.contacts.set(contact.contactId, contact);

    console.log(
      `[ContactOutreachProcessor] Call initiated for contact ${contact.contactId} (${contact.name}) — callSid: ${callSid} — agentType: ${contact.agentType} — pathway: ${contact.recommendedPathway}`,
    );

    return { callSid };
  } catch (error) {
    // Mark contact as no-answer on failure
    contact.status = 'no-answer';
    store.contacts.set(contact.contactId, contact);

    console.error(
      '[ContactOutreachProcessor] Failed to initiate call for contact',
      contact.contactId,
      error instanceof Error ? error.message : error,
    );

    throw error;
  }
}
