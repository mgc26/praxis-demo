// ---------------------------------------------------------------------------
// Vi Praxis BioSciences — OpenAI Classifier Tests
// Tests the pure logic around classifyCall: default results, empty transcript
// handling, and API-absent behavior. The OpenAI API itself is NOT called.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ContactRecord, TranscriptEntry, ClassificationResult } from '../types/index.js';

// ---------------------------------------------------------------------------
// Helper: build a minimal ContactRecord for test use
// ---------------------------------------------------------------------------
function makeContact(overrides: Partial<ContactRecord> = {}): ContactRecord {
  return {
    contactId: 'c-test-001',
    contactType: 'patient',
    agentType: 'patient-support',
    name: 'Test Patient',
    phone: '+15551234567',
    age: 40,
    gender: 'Female',
    therapeuticArea: 'essential-tremor',
    behavioralSignals: [],
    recommendedPathway: 'patient-education',
    engagementLabels: [],
    riskTier: 'LOW',
    riskScore: 15,
    preferredChannel: 'voice',
    status: 'new',
    createdAt: new Date().toISOString(),
    callAttempts: 0,
    lastCallAttempt: null,
    callId: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// We need to mock the OpenAI module before importing the classifier.
// The classifier calls `new OpenAI(...)` and then `openai.chat.completions.create(...)`.
// The mock uses a class constructor to satisfy `new OpenAI(...)`.
// ---------------------------------------------------------------------------

const mockCreate = vi.fn();

// Use a function (not arrow) so it can be called with `new`
vi.mock('openai', () => {
  return {
    default: function OpenAI() {
      return {
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      };
    },
  };
});

describe('groq-classifier (OpenAI classifier)', () => {
  let classifyCall: typeof import('./groq-classifier.js')['classifyCall'];

  beforeEach(async () => {
    // Reset module registry so we get a fresh singleton client each time
    vi.resetModules();

    // Re-mock openai after resetModules clears it — use a regular function
    // (not arrow) so it works as a constructor with `new`
    vi.doMock('openai', () => {
      return {
        default: function OpenAI() {
          return {
            chat: {
              completions: {
                create: mockCreate,
              },
            },
          };
        },
      };
    });

    mockCreate.mockReset();
  });

  afterEach(() => {
    // Clean up env changes
    delete process.env.OPENAI_API_KEY;
  });

  // -------------------------------------------------------------------------
  // createDefaultResult behavior
  // The default result is returned on any error path (no API key, API failure,
  // parse error). Its shape must match ClassificationResult exactly.
  // -------------------------------------------------------------------------
  describe('createDefaultResult (tested via no-API-key path)', () => {
    it('should return valid ClassificationResult structure when OPENAI_API_KEY is not set', async () => {
      // When the API key is absent, classifyCall returns the default result
      // without making any network call
      delete process.env.OPENAI_API_KEY;
      const mod = await import('./groq-classifier.js');
      classifyCall = mod.classifyCall;

      const transcript: TranscriptEntry[] = [
        { speaker: 'agent', text: 'Hello', timestamp: 1000 },
      ];
      const result = await classifyCall(transcript, makeContact());

      // Verify it has all required ClassificationResult fields
      expect(result).toHaveProperty('outcome');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('supportPathway');
      expect(result).toHaveProperty('urgency');
      expect(result).toHaveProperty('sentiment');
      expect(result).toHaveProperty('keyMoments');
      expect(result).toHaveProperty('contactConcerns');
      expect(result).toHaveProperty('behavioralSignalsReferenced');
      expect(result).toHaveProperty('nextAction');
      expect(result).toHaveProperty('liaisonSummary');
      expect(result).toHaveProperty('appointmentDetails');
      expect(result).toHaveProperty('aeDetected');
      expect(result).toHaveProperty('competitiveIntelNotes');
    });

    it('should have sentiment 50 (neutral default)', async () => {
      // Neutral sentiment (50/100) is the safest default — it avoids
      // skewing sentiment dashboards on classification failures
      delete process.env.OPENAI_API_KEY;
      const mod = await import('./groq-classifier.js');
      classifyCall = mod.classifyCall;

      const result = await classifyCall(
        [{ speaker: 'agent', text: 'Hello', timestamp: 1000 }],
        makeContact(),
      );
      expect(result.sentiment).toBe(50);
    });

    it('should have confidence 0', async () => {
      // Zero confidence signals to downstream systems that this result
      // should not be trusted for analytics or automated actions
      delete process.env.OPENAI_API_KEY;
      const mod = await import('./groq-classifier.js');
      classifyCall = mod.classifyCall;

      const result = await classifyCall(
        [{ speaker: 'agent', text: 'Hello', timestamp: 1000 }],
        makeContact(),
      );
      expect(result.confidence).toBe(0);
    });

    it('should have aeDetected false', async () => {
      // Default must NOT flag an AE — false positives trigger mandatory
      // pharmacovigilance review workflows
      delete process.env.OPENAI_API_KEY;
      const mod = await import('./groq-classifier.js');
      classifyCall = mod.classifyCall;

      const result = await classifyCall(
        [{ speaker: 'agent', text: 'Hello', timestamp: 1000 }],
        makeContact(),
      );
      expect(result.aeDetected).toBe(false);
    });

    it('should have empty arrays for keyMoments, contactConcerns, and competitiveIntelNotes', async () => {
      // Empty arrays (not null/undefined) are required so downstream
      // .map()/.filter() calls don't throw
      delete process.env.OPENAI_API_KEY;
      const mod = await import('./groq-classifier.js');
      classifyCall = mod.classifyCall;

      const result = await classifyCall(
        [{ speaker: 'agent', text: 'Hello', timestamp: 1000 }],
        makeContact(),
      );
      expect(result.keyMoments).toEqual([]);
      expect(result.contactConcerns).toEqual([]);
      expect(result.competitiveIntelNotes).toEqual([]);
      expect(result.behavioralSignalsReferenced).toEqual([]);
    });

    it('should have outcome no-answer as default', async () => {
      // no-answer is the safest default outcome — it's a non-conversion
      // that won't trigger any downstream workflows
      delete process.env.OPENAI_API_KEY;
      const mod = await import('./groq-classifier.js');
      classifyCall = mod.classifyCall;

      const result = await classifyCall(
        [{ speaker: 'agent', text: 'Hello', timestamp: 1000 }],
        makeContact(),
      );
      expect(result.outcome).toBe('no-answer');
    });

    it('should have urgency routine as default', async () => {
      delete process.env.OPENAI_API_KEY;
      const mod = await import('./groq-classifier.js');
      classifyCall = mod.classifyCall;

      const result = await classifyCall(
        [{ speaker: 'agent', text: 'Hello', timestamp: 1000 }],
        makeContact(),
      );
      expect(result.urgency).toBe('routine');
    });

    it('should have null supportPathway as default', async () => {
      delete process.env.OPENAI_API_KEY;
      const mod = await import('./groq-classifier.js');
      classifyCall = mod.classifyCall;

      const result = await classifyCall(
        [{ speaker: 'agent', text: 'Hello', timestamp: 1000 }],
        makeContact(),
      );
      expect(result.supportPathway).toBeNull();
    });

    it('should have null appointmentDetails as default', async () => {
      delete process.env.OPENAI_API_KEY;
      const mod = await import('./groq-classifier.js');
      classifyCall = mod.classifyCall;

      const result = await classifyCall(
        [{ speaker: 'agent', text: 'Hello', timestamp: 1000 }],
        makeContact(),
      );
      expect(result.appointmentDetails).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Empty transcript handling
  // Empty transcripts occur when calls connect but no speech is detected
  // (e.g., fax line, silent hold). The classifier must handle this gracefully.
  // -------------------------------------------------------------------------
  describe('empty transcript handling', () => {
    it('should return no-answer outcome when transcript is empty', async () => {
      // An empty transcript means no conversation happened — the correct
      // classification is no-answer, not information-provided
      process.env.OPENAI_API_KEY = 'test-key-123';
      const mod = await import('./groq-classifier.js');
      classifyCall = mod.classifyCall;

      const result = await classifyCall([], makeContact());
      expect(result.outcome).toBe('no-answer');
    });

    it('should handle empty transcript array gracefully', async () => {
      // Must not throw when given an empty array
      process.env.OPENAI_API_KEY = 'test-key-123';
      const mod = await import('./groq-classifier.js');
      classifyCall = mod.classifyCall;

      const result = await classifyCall([], makeContact());
      expect(result).toBeDefined();
      expect(result.confidence).toBe(0);
      expect(result.aeDetected).toBe(false);
    });

    it('should set appropriate liaison summary for empty transcript', async () => {
      // The liaison summary should explain WHY classification failed,
      // not just return a blank string
      process.env.OPENAI_API_KEY = 'test-key-123';
      const mod = await import('./groq-classifier.js');
      classifyCall = mod.classifyCall;

      const result = await classifyCall([], makeContact());
      expect(result.liaisonSummary).toContain('No transcript');
    });

    it('should not call OpenAI API when transcript is empty', async () => {
      // Saves API costs and avoids sending empty prompts that return
      // unpredictable results
      process.env.OPENAI_API_KEY = 'test-key-123';
      const mod = await import('./groq-classifier.js');
      classifyCall = mod.classifyCall;

      await classifyCall([], makeContact());
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Successful API response parsing
  // When the API returns valid JSON, the classifier must parse all fields
  // correctly, validate enums, and clamp numeric ranges.
  // -------------------------------------------------------------------------
  describe('successful API response parsing', () => {
    it('should parse a valid API response into ClassificationResult', async () => {
      process.env.OPENAI_API_KEY = 'test-key-456';
      const mod = await import('./groq-classifier.js');
      classifyCall = mod.classifyCall;

      const apiResponse = {
        outcome: 'medical-info-provided',
        confidence: 0.92,
        support_pathway: 'clinical-education',
        urgency: 'routine',
        sentiment: 75,
        key_moments: ['Discussed Phase 3 data', 'Asked about drug interactions'],
        contact_concerns: ['Worried about cost'],
        behavioral_signals_referenced: ['COMPETITOR_RESEARCH'],
        next_action: 'Send clinical data packet',
        liaison_summary: 'Dr. Johnson discussed clinical data for relutrigine.',
        context_summary: 'Dr. Johnson, DEE/Dravet, Relutrigine, HIGH risk',
        what_happened: 'Provided Phase 3 subgroup analysis data.',
        what_changed_since_last_touch: 'First contact',
        clinical_questions_raised: ['Drug-drug interaction with valproate'],
        recommended_action: 'MSL to send Phase 3 subgroup data within 48 hours',
        appointment_details: null,
        ae_detected: false,
        competitive_intel_notes: ['Mentioned considering clobazam as alternative'],
        msl_followup_requested: true,
        msl_followup_topic: 'Drug interaction profile with existing AEDs',
        payer_name: null,
        prior_auth_status: null,
        denial_reason: null,
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(apiResponse) } }],
      });

      const transcript: TranscriptEntry[] = [
        { speaker: 'agent', text: 'Good morning, Dr. Johnson.', timestamp: 1000 },
        { speaker: 'caller', text: 'I had a question about drug interactions.', timestamp: 3000 },
      ];

      const result = await classifyCall(transcript, makeContact({ contactType: 'hcp' }));

      expect(result.outcome).toBe('medical-info-provided');
      expect(result.confidence).toBe(0.92);
      expect(result.supportPathway).toBe('clinical-education');
      expect(result.urgency).toBe('routine');
      expect(result.sentiment).toBe(75);
      expect(result.keyMoments).toEqual(['Discussed Phase 3 data', 'Asked about drug interactions']);
      expect(result.contactConcerns).toEqual(['Worried about cost']);
      expect(result.aeDetected).toBe(false);
      expect(result.competitiveIntelNotes).toEqual(['Mentioned considering clobazam as alternative']);
    });

    it('should fallback to information-provided for invalid outcome string', async () => {
      // The LLM might hallucinate an outcome type that doesn't exist;
      // falling back to information-provided is safe (non-conversion, low impact)
      process.env.OPENAI_API_KEY = 'test-key-456';
      const mod = await import('./groq-classifier.js');
      classifyCall = mod.classifyCall;

      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              outcome: 'hallucinated-outcome',
              confidence: 0.5,
              support_pathway: null,
              urgency: 'routine',
              sentiment: 50,
              key_moments: [],
              contact_concerns: [],
              behavioral_signals_referenced: [],
              next_action: '',
              liaison_summary: 'Test summary.',
              appointment_details: null,
              ae_detected: false,
              competitive_intel_notes: [],
            }),
          },
        }],
      });

      const result = await classifyCall(
        [{ speaker: 'agent', text: 'Hello', timestamp: 1000 }],
        makeContact(),
      );
      expect(result.outcome).toBe('information-provided');
    });

    it('should fallback to null for invalid pathway string', async () => {
      // Invalid pathways must not propagate — they would break routing logic
      process.env.OPENAI_API_KEY = 'test-key-456';
      const mod = await import('./groq-classifier.js');
      classifyCall = mod.classifyCall;

      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              outcome: 'information-provided',
              confidence: 0.5,
              support_pathway: 'fake-pathway',
              urgency: 'routine',
              sentiment: 50,
              key_moments: [],
              contact_concerns: [],
              behavioral_signals_referenced: [],
              next_action: '',
              liaison_summary: 'Test.',
              appointment_details: null,
              ae_detected: false,
              competitive_intel_notes: [],
            }),
          },
        }],
      });

      const result = await classifyCall(
        [{ speaker: 'agent', text: 'Hello', timestamp: 1000 }],
        makeContact(),
      );
      expect(result.supportPathway).toBeNull();
    });

    it('should fallback to routine for invalid urgency string', async () => {
      // Invalid urgency must default to routine (lowest priority) rather than
      // "urgent" to avoid false alarms that overwhelm the safety team
      process.env.OPENAI_API_KEY = 'test-key-456';
      const mod = await import('./groq-classifier.js');
      classifyCall = mod.classifyCall;

      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              outcome: 'information-provided',
              confidence: 0.5,
              support_pathway: null,
              urgency: 'super-urgent',
              sentiment: 50,
              key_moments: [],
              contact_concerns: [],
              behavioral_signals_referenced: [],
              next_action: '',
              liaison_summary: 'Test.',
              appointment_details: null,
              ae_detected: false,
              competitive_intel_notes: [],
            }),
          },
        }],
      });

      const result = await classifyCall(
        [{ speaker: 'agent', text: 'Hello', timestamp: 1000 }],
        makeContact(),
      );
      expect(result.urgency).toBe('routine');
    });

    it('should force aeDetected true when outcome is ae-reported', async () => {
      // Safety invariant: if the outcome IS an AE type, aeDetected must be
      // true regardless of what the LLM returned for ae_detected
      process.env.OPENAI_API_KEY = 'test-key-456';
      const mod = await import('./groq-classifier.js');
      classifyCall = mod.classifyCall;

      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              outcome: 'ae-reported',
              confidence: 0.95,
              support_pathway: 'safety-reporting',
              urgency: 'urgent',
              sentiment: 30,
              key_moments: ['Patient reported nausea'],
              contact_concerns: [],
              behavioral_signals_referenced: [],
              next_action: 'Route to pharmacovigilance',
              liaison_summary: 'AE reported.',
              appointment_details: null,
              ae_detected: false, // LLM incorrectly said false
              competitive_intel_notes: [],
            }),
          },
        }],
      });

      const result = await classifyCall(
        [{ speaker: 'caller', text: 'I have been feeling nauseous', timestamp: 1000 }],
        makeContact(),
      );
      // aeDetected should be forced to true because outcome is ae-reported
      expect(result.aeDetected).toBe(true);
    });

    it('should force aeDetected true when outcome is ae-escalated', async () => {
      process.env.OPENAI_API_KEY = 'test-key-456';
      const mod = await import('./groq-classifier.js');
      classifyCall = mod.classifyCall;

      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              outcome: 'ae-escalated',
              confidence: 0.99,
              support_pathway: 'safety-reporting',
              urgency: 'urgent',
              sentiment: 20,
              key_moments: ['Serious AE detected'],
              contact_concerns: [],
              behavioral_signals_referenced: [],
              next_action: 'Immediate pharmacovigilance review',
              liaison_summary: 'Serious AE escalated.',
              appointment_details: null,
              ae_detected: false, // LLM incorrectly said false
              competitive_intel_notes: [],
            }),
          },
        }],
      });

      const result = await classifyCall(
        [{ speaker: 'caller', text: 'I was hospitalized', timestamp: 1000 }],
        makeContact(),
      );
      expect(result.aeDetected).toBe(true);
    });

    it('should clamp confidence values outside [0,1] range', async () => {
      // LLMs sometimes return confidence > 1.0 or negative values;
      // clamping prevents nonsensical values in dashboards
      process.env.OPENAI_API_KEY = 'test-key-456';
      const mod = await import('./groq-classifier.js');
      classifyCall = mod.classifyCall;

      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              outcome: 'information-provided',
              confidence: 1.5, // out of range
              support_pathway: null,
              urgency: 'routine',
              sentiment: 50,
              key_moments: [],
              contact_concerns: [],
              behavioral_signals_referenced: [],
              next_action: '',
              liaison_summary: 'Test.',
              appointment_details: null,
              ae_detected: false,
              competitive_intel_notes: [],
            }),
          },
        }],
      });

      const result = await classifyCall(
        [{ speaker: 'agent', text: 'Hello', timestamp: 1000 }],
        makeContact(),
      );
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should clamp sentiment values outside [0,100] range', async () => {
      process.env.OPENAI_API_KEY = 'test-key-456';
      const mod = await import('./groq-classifier.js');
      classifyCall = mod.classifyCall;

      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              outcome: 'information-provided',
              confidence: 0.5,
              support_pathway: null,
              urgency: 'routine',
              sentiment: 150, // out of range
              key_moments: [],
              contact_concerns: [],
              behavioral_signals_referenced: [],
              next_action: '',
              liaison_summary: 'Test.',
              appointment_details: null,
              ae_detected: false,
              competitive_intel_notes: [],
            }),
          },
        }],
      });

      const result = await classifyCall(
        [{ speaker: 'agent', text: 'Hello', timestamp: 1000 }],
        makeContact(),
      );
      expect(result.sentiment).toBeLessThanOrEqual(100);
      expect(result.sentiment).toBeGreaterThanOrEqual(0);
    });

    it('should parse appointment_details when present and valid', async () => {
      process.env.OPENAI_API_KEY = 'test-key-456';
      const mod = await import('./groq-classifier.js');
      classifyCall = mod.classifyCall;

      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              outcome: 'appointment-scheduled',
              confidence: 0.88,
              support_pathway: 'patient-education',
              urgency: 'routine',
              sentiment: 70,
              key_moments: ['Scheduled follow-up'],
              contact_concerns: [],
              behavioral_signals_referenced: [],
              next_action: 'Confirm appointment via SMS',
              liaison_summary: 'Appointment scheduled.',
              appointment_details: {
                provider: 'Dr. Smith',
                specialty: 'Neurology',
                date: '2026-04-01',
                location: 'Mayo Clinic',
              },
              ae_detected: false,
              competitive_intel_notes: [],
            }),
          },
        }],
      });

      const result = await classifyCall(
        [{ speaker: 'caller', text: 'I can come in next Tuesday', timestamp: 1000 }],
        makeContact(),
      );
      expect(result.appointmentDetails).toEqual({
        provider: 'Dr. Smith',
        specialty: 'Neurology',
        date: '2026-04-01',
        location: 'Mayo Clinic',
      });
    });

    it('should handle non-array competitive_intel_notes gracefully', async () => {
      // The LLM might return a string instead of an array for CI notes;
      // the parser must default to empty array
      process.env.OPENAI_API_KEY = 'test-key-456';
      const mod = await import('./groq-classifier.js');
      classifyCall = mod.classifyCall;

      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              outcome: 'information-provided',
              confidence: 0.5,
              support_pathway: null,
              urgency: 'routine',
              sentiment: 50,
              key_moments: [],
              contact_concerns: [],
              behavioral_signals_referenced: [],
              next_action: '',
              liaison_summary: 'Test.',
              appointment_details: null,
              ae_detected: false,
              competitive_intel_notes: 'This is a string not an array',
            }),
          },
        }],
      });

      const result = await classifyCall(
        [{ speaker: 'agent', text: 'Hello', timestamp: 1000 }],
        makeContact(),
      );
      expect(Array.isArray(result.competitiveIntelNotes)).toBe(true);
      expect(result.competitiveIntelNotes).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // API error handling
  // The classifier must never throw — it always returns a default result on
  // failure so the call record can still be saved with partial data.
  // -------------------------------------------------------------------------
  describe('API error handling', () => {
    it('should return default result when API throws an error', async () => {
      process.env.OPENAI_API_KEY = 'test-key-789';
      const mod = await import('./groq-classifier.js');
      classifyCall = mod.classifyCall;

      mockCreate.mockRejectedValueOnce(new Error('API rate limit exceeded'));

      const result = await classifyCall(
        [{ speaker: 'agent', text: 'Hello', timestamp: 1000 }],
        makeContact(),
      );

      // Should return default result, not throw
      expect(result.outcome).toBe('no-answer');
      expect(result.confidence).toBe(0);
      expect(result.aeDetected).toBe(false);
    });

    it('should return default result when API returns empty content', async () => {
      // OpenAI occasionally returns null content on overloaded responses
      process.env.OPENAI_API_KEY = 'test-key-789';
      const mod = await import('./groq-classifier.js');
      classifyCall = mod.classifyCall;

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: null } }],
      });

      const result = await classifyCall(
        [{ speaker: 'agent', text: 'Hello', timestamp: 1000 }],
        makeContact(),
      );

      expect(result.outcome).toBe('no-answer');
      expect(result.confidence).toBe(0);
    });

    it('should return default result when API returns invalid JSON', async () => {
      // Malformed JSON from the API must not crash the classifier
      process.env.OPENAI_API_KEY = 'test-key-789';
      const mod = await import('./groq-classifier.js');
      classifyCall = mod.classifyCall;

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'not valid json {{{' } }],
      });

      const result = await classifyCall(
        [{ speaker: 'agent', text: 'Hello', timestamp: 1000 }],
        makeContact(),
      );

      expect(result.outcome).toBe('no-answer');
      expect(result.confidence).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Transcript formatting
  // The classifier formats TranscriptEntry[] into a plain text transcript
  // before sending to the prompt builder. Verify the format is correct.
  // -------------------------------------------------------------------------
  describe('transcript formatting', () => {
    it('should pass transcript content to OpenAI when API key is set', async () => {
      process.env.OPENAI_API_KEY = 'test-key-format';
      const mod = await import('./groq-classifier.js');
      classifyCall = mod.classifyCall;

      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              outcome: 'information-provided',
              confidence: 0.5,
              support_pathway: null,
              urgency: 'routine',
              sentiment: 50,
              key_moments: [],
              contact_concerns: [],
              behavioral_signals_referenced: [],
              next_action: '',
              liaison_summary: 'Test.',
              appointment_details: null,
              ae_detected: false,
              competitive_intel_notes: [],
            }),
          },
        }],
      });

      const transcript: TranscriptEntry[] = [
        { speaker: 'agent', text: 'Good morning!', timestamp: 1000 },
        { speaker: 'caller', text: 'Hi there.', timestamp: 2000 },
      ];

      await classifyCall(transcript, makeContact());

      // Verify the API was called (transcript was non-empty)
      expect(mockCreate).toHaveBeenCalledTimes(1);

      // Verify the system message contains the formatted transcript
      const callArgs = mockCreate.mock.calls[0][0];
      const systemMessage = callArgs.messages[0].content;
      expect(systemMessage).toContain('Agent: Good morning!');
      expect(systemMessage).toContain('Contact: Hi there.');
    });
  });

  // -------------------------------------------------------------------------
  // Architecture notes (flagged for refactoring)
  // -------------------------------------------------------------------------
  //
  // NOTE: `classifyCall` mixes API call + response parsing in a single function.
  // Extracting `parseClassificationResponse(raw: Record<string, unknown>): ClassificationResult`
  // as a pure exported function would allow direct unit testing of all parsing
  // logic without mocking the OpenAI client. This would simplify tests and
  // improve coverage of edge cases in field validation.
  //
  // NOTE: `clamp` is an internal (non-exported) utility function. It is
  // tested indirectly through the confidence and sentiment clamping tests
  // above. Consider exporting it (or moving it to a utils module) if more
  // direct testing is desired.
  // -------------------------------------------------------------------------
});
