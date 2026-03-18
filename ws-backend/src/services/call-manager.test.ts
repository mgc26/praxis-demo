import { describe, it, expect, beforeEach } from 'vitest';
import type { ContactRecord, TranscriptEntry } from '../types/index.js';

// The module exports a singleton. We need to re-import fresh for isolation.
// Since we cannot easily reset a singleton, we will test sequentially
// and clean up after each test by ending all sessions.

function makeContact(overrides: Partial<ContactRecord> = {}): ContactRecord {
  return {
    contactId: 'c-001',
    contactType: 'patient',
    agentType: 'patient-support',
    name: 'Jane Doe',
    phone: '+15551234567',
    age: 45,
    gender: 'Female',
    therapeuticArea: 'essential-tremor',
    behavioralSignals: [],
    recommendedPathway: 'patient-education',
    engagementLabels: [],
    riskTier: 'LOW',
    riskScore: 20,
    preferredChannel: 'voice',
    status: 'new',
    createdAt: new Date().toISOString(),
    callAttempts: 0,
    lastCallAttempt: null,
    callId: null,
    ...overrides,
  };
}

describe('call-manager', () => {
  let callManager: typeof import('./call-manager.js')['callManager'];

  beforeEach(async () => {
    // Re-import to get the singleton and clean up any lingering sessions
    const mod = await import('./call-manager.js');
    callManager = mod.callManager;
    // Clean up all sessions
    for (const session of callManager.getAllSessions()) {
      callManager.endSession(session.callId);
    }
  });

  describe('createSession', () => {
    it('creates a session with correct fields', () => {
      const contact = makeContact();
      const session = callManager.createSession(contact, 'CA_test_123');

      expect(session.callId).toBeDefined();
      expect(typeof session.callId).toBe('string');
      expect(session.callId.length).toBeGreaterThan(0);
      expect(session.contactId).toBe('c-001');
      expect(session.callSid).toBe('CA_test_123');
      expect(session.contact).toBe(contact);
      expect(session.streamSid).toBeNull();
      expect(session.deepgramWs).toBeNull();
      expect(session.transcript).toEqual([]);
      expect(typeof session.startedAt).toBe('string');
      expect(session.connectedAt).toBeNull();
    });

    it('generates a unique callId for each session', () => {
      const contact = makeContact();
      const session1 = callManager.createSession(contact, 'CA_sid_1');
      const session2 = callManager.createSession(contact, 'CA_sid_2');

      expect(session1.callId).not.toBe(session2.callId);

      callManager.endSession(session1.callId);
      callManager.endSession(session2.callId);
    });
  });

  describe('getSession', () => {
    it('returns a created session by callId', () => {
      const contact = makeContact();
      const created = callManager.createSession(contact, 'CA_get_1');

      const retrieved = callManager.getSession(created.callId);
      expect(retrieved).toBeDefined();
      expect(retrieved!.callId).toBe(created.callId);
      expect(retrieved!.callSid).toBe('CA_get_1');
    });

    it('returns undefined for a non-existent callId', () => {
      expect(callManager.getSession('nonexistent-id')).toBeUndefined();
    });
  });

  describe('getSessionByCallSid', () => {
    it('returns session by callSid', () => {
      const contact = makeContact();
      const created = callManager.createSession(contact, 'CA_bysid_1');

      const retrieved = callManager.getSessionByCallSid('CA_bysid_1');
      expect(retrieved).toBeDefined();
      expect(retrieved!.callId).toBe(created.callId);
    });

    it('returns undefined for a non-existent callSid', () => {
      expect(callManager.getSessionByCallSid('CA_nonexistent')).toBeUndefined();
    });
  });

  describe('addTranscript', () => {
    it('appends transcript entries to the session', () => {
      const contact = makeContact();
      const session = callManager.createSession(contact, 'CA_transcript_1');

      const entry1: TranscriptEntry = { speaker: 'agent', text: 'Hello!', timestamp: 1000 };
      const entry2: TranscriptEntry = { speaker: 'caller', text: 'Hi there', timestamp: 2000 };

      callManager.addTranscript(session.callId, entry1);
      callManager.addTranscript(session.callId, entry2);

      const retrieved = callManager.getSession(session.callId);
      expect(retrieved!.transcript).toHaveLength(2);
      expect(retrieved!.transcript[0]).toEqual(entry1);
      expect(retrieved!.transcript[1]).toEqual(entry2);
    });

    it('does nothing for non-existent callId', () => {
      const entry: TranscriptEntry = { speaker: 'agent', text: 'Hello', timestamp: 1000 };
      // Should not throw
      callManager.addTranscript('nonexistent-id', entry);
    });
  });

  describe('endSession', () => {
    it('removes session and returns it', () => {
      const contact = makeContact();
      const session = callManager.createSession(contact, 'CA_end_1');

      const ended = callManager.endSession(session.callId);
      expect(ended).toBeDefined();
      expect(ended!.callId).toBe(session.callId);
      expect(ended!.callSid).toBe('CA_end_1');

      // Should no longer be retrievable
      expect(callManager.getSession(session.callId)).toBeUndefined();
      expect(callManager.getSessionByCallSid('CA_end_1')).toBeUndefined();
    });

    it('returns undefined for non-existent callId', () => {
      expect(callManager.endSession('nonexistent-id')).toBeUndefined();
    });
  });

  describe('duplicate callSid cleanup', () => {
    it('cleans up previous session when duplicate callSid is used', () => {
      const contact = makeContact();
      const session1 = callManager.createSession(contact, 'CA_dup_1');
      const session2 = callManager.createSession(contact, 'CA_dup_1');

      // First session should be gone
      expect(callManager.getSession(session1.callId)).toBeUndefined();

      // Second session should be active
      const retrieved = callManager.getSessionByCallSid('CA_dup_1');
      expect(retrieved).toBeDefined();
      expect(retrieved!.callId).toBe(session2.callId);
    });
  });

  describe('getAllSessions', () => {
    it('returns all active sessions', () => {
      const contact = makeContact();
      callManager.createSession(contact, 'CA_all_1');
      callManager.createSession(contact, 'CA_all_2');
      callManager.createSession(contact, 'CA_all_3');

      const all = callManager.getAllSessions();
      expect(all).toHaveLength(3);
    });

    it('returns empty array when no sessions exist', () => {
      expect(callManager.getAllSessions()).toHaveLength(0);
    });

    it('reflects sessions removed by endSession', () => {
      const contact = makeContact();
      const s1 = callManager.createSession(contact, 'CA_ref_1');
      callManager.createSession(contact, 'CA_ref_2');

      expect(callManager.getAllSessions()).toHaveLength(2);

      callManager.endSession(s1.callId);
      expect(callManager.getAllSessions()).toHaveLength(1);
    });
  });
});
