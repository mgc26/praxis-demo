// ---------------------------------------------------------------------------
// Vi Praxis BioSciences — Call Manager
// Manages in-memory active call sessions.
// ---------------------------------------------------------------------------

import { v4 as uuidv4 } from 'uuid';
import type { ActiveCallSession, ContactRecord, TranscriptEntry } from '../types/index.js';

class CallManager {
  private sessions: Map<string, ActiveCallSession> = new Map();
  private callSidIndex: Map<string, string> = new Map(); // callSid -> callId

  createSession(contact: ContactRecord, callSid: string): ActiveCallSession {
    // Detect duplicate callSid and clean up previous session
    const existing = this.callSidIndex.get(callSid);
    if (existing) {
      console.warn(`[CallManager] Duplicate callSid ${callSid} — cleaning up previous session ${existing}`);
      this.sessions.delete(existing);
      this.callSidIndex.delete(callSid);
    }

    const callId = uuidv4();

    const session: ActiveCallSession = {
      callId,
      contactId: contact.contactId,
      callSid,
      contact,
      streamSid: null,
      deepgramWs: null,
      transcript: [],
      startedAt: new Date().toISOString(),
      connectedAt: null,
    };

    this.sessions.set(callId, session);
    this.callSidIndex.set(callSid, callId);
    return session;
  }

  getSession(callId: string): ActiveCallSession | undefined {
    return this.sessions.get(callId);
  }

  getSessionByCallSid(callSid: string): ActiveCallSession | undefined {
    const callId = this.callSidIndex.get(callSid);
    return callId ? this.sessions.get(callId) : undefined;
  }

  addTranscript(callId: string, entry: TranscriptEntry): void {
    const session = this.sessions.get(callId);
    if (session) {
      session.transcript.push(entry);
    }
  }

  endSession(callId: string): ActiveCallSession | undefined {
    const session = this.sessions.get(callId);
    if (session) {
      this.sessions.delete(callId);
      this.callSidIndex.delete(session.callSid);
      return session;
    }
    return undefined;
  }

  getAllSessions(): ActiveCallSession[] {
    return Array.from(this.sessions.values());
  }
}

export const callManager = new CallManager();
