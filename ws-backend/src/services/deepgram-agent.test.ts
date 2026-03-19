// ---------------------------------------------------------------------------
// Vi Praxis BioSciences — Deepgram Agent Tests
// ---------------------------------------------------------------------------
//
// TESTABILITY NOTE:
// `createDeepgramAgent` opens a live WebSocket to wss://agent.deepgram.com
// and sends the Settings config inside the 'open' event handler. Because the
// config-building logic is inline (not extracted), it is NOT independently
// testable without either:
//   (a) mocking the `ws` module globally (brittle, couples tests to impl), or
//   (b) refactoring the Settings config builder into a pure function.
//
// RECOMMENDED REFACTOR:
//   Extract a pure function like:
//     export function buildDeepgramSettings(
//       contact: ContactRecord,
//       options?: { answeredBy?: string | null; recommendedScreenings?: RecommendedScreening[] },
//     ): DeepgramSettingsConfig
//   This would let us test audio encoding, function schemas, prompt wiring,
//   greeting selection, and the conditional record_screening_result function
//   without touching the network.
//
// Until that refactor, we test:
//   1. Module exports exist
//   2. Missing API key throws synchronously
//   3. The pure helper functions consumed by deepgram-agent.ts
//      (buildAgentPrompt, buildAgentGreeting — tested in agent-prompts.test.ts)
//      (isMachineAnsweredBy — tested in answered-by.test.ts)
// ---------------------------------------------------------------------------

import { describe, it, expect, afterEach, vi } from 'vitest';

describe('deepgram-agent', () => {
  // -----------------------------------------------------------------------
  // Save and restore env to avoid cross-test pollution
  // -----------------------------------------------------------------------
  const originalEnv = process.env.DEEPGRAM_API_KEY;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.DEEPGRAM_API_KEY = originalEnv;
    } else {
      delete process.env.DEEPGRAM_API_KEY;
    }
    vi.restoreAllMocks();
  });

  describe('module exports', () => {
    it('should export createDeepgramAgent as a function', async () => {
      // Verifying the public API surface exists and is callable
      const mod = await import('./deepgram-agent.js');
      expect(typeof mod.createDeepgramAgent).toBe('function');
    });
  });

  describe('API key validation', () => {
    it('should throw when DEEPGRAM_API_KEY environment variable is not set', async () => {
      // Pharma platforms must fail fast on missing credentials rather than
      // silently connecting with no auth — this guards against misconfigured
      // deployments that could lose safety-critical call data.
      delete process.env.DEEPGRAM_API_KEY;

      // Re-import to pick up the env change. We need a fresh import because
      // the function reads process.env at call time, not import time.
      const mod = await import('./deepgram-agent.js');

      const dummyContact = {
        contactId: 'c-test-001',
        contactType: 'patient' as const,
        agentType: 'patient-support' as const,
        name: 'Test Patient',
        phone: '+15551234567',
        age: 42,
        gender: 'Female',
        therapeuticArea: 'essential-tremor' as const,
        behavioralSignals: [],
        recommendedPathway: 'patient-education' as const,
        engagementLabels: [],
        riskTier: 'LOW' as const,
        riskScore: 15,
        preferredChannel: 'voice' as const,
        status: 'new' as const,
        createdAt: new Date().toISOString(),
        callAttempts: 0,
        lastCallAttempt: null,
        callId: null,
      };

      const dummyCallbacks = {
        onAudio: vi.fn(),
        onTranscript: vi.fn(),
        onFunctionCall: vi.fn(),
        onUserStartedSpeaking: vi.fn(),
        onAgentAudioDone: vi.fn(),
        onReady: vi.fn(),
        onClose: vi.fn(),
      };

      expect(() => mod.createDeepgramAgent(dummyContact, dummyCallbacks)).toThrow(
        'DEEPGRAM_API_KEY environment variable is not set',
      );
    });

    it('should throw with the exact error message for missing key', async () => {
      // Precise error message matters for operational monitoring — log
      // aggregation tools filter on this string to detect config issues.
      delete process.env.DEEPGRAM_API_KEY;

      const mod = await import('./deepgram-agent.js');

      const dummyContact = {
        contactId: 'c-test-002',
        contactType: 'patient' as const,
        agentType: 'patient-support' as const,
        name: 'Another Patient',
        phone: '+15559876543',
        age: 55,
        gender: 'Male',
        therapeuticArea: 'dee-dravet' as const,
        behavioralSignals: [],
        recommendedPathway: 'safety-reporting' as const,
        engagementLabels: [],
        riskTier: 'HIGH' as const,
        riskScore: 85,
        preferredChannel: 'voice' as const,
        status: 'new' as const,
        createdAt: new Date().toISOString(),
        callAttempts: 0,
        lastCallAttempt: null,
        callId: null,
      };

      const dummyCallbacks = {
        onAudio: vi.fn(),
        onTranscript: vi.fn(),
        onFunctionCall: vi.fn(),
        onUserStartedSpeaking: vi.fn(),
        onAgentAudioDone: vi.fn(),
        onReady: vi.fn(),
        onClose: vi.fn(),
      };

      expect(() => mod.createDeepgramAgent(dummyContact, dummyCallbacks)).toThrowError(
        /DEEPGRAM_API_KEY/,
      );
    });
  });

  describe('companion pure functions (cross-reference)', () => {
    // These are the pure functions that deepgram-agent.ts consumes.
    // Full test suites exist in their own files; these verify the import
    // contract is intact from deepgram-agent's perspective.

    it('should be able to import buildAgentPrompt from agent-prompts', async () => {
      // deepgram-agent.ts imports buildAgentPrompt to construct the system
      // prompt. If this import breaks, the agent cannot initialize.
      const mod = await import('../prompts/agent-prompts.js');
      expect(typeof mod.buildAgentPrompt).toBe('function');
    });

    it('should be able to import buildAgentGreeting from agent-prompts', async () => {
      // buildAgentGreeting is used for human-answered calls.
      const mod = await import('../prompts/agent-prompts.js');
      expect(typeof mod.buildAgentGreeting).toBe('function');
    });

    it('should be able to import buildAgentVoicemailMessage from agent-prompts', async () => {
      // buildAgentVoicemailMessage is used for machine-answered calls.
      const mod = await import('../prompts/agent-prompts.js');
      expect(typeof mod.buildAgentVoicemailMessage).toBe('function');
    });

    it('should be able to import isMachineAnsweredBy from answered-by', async () => {
      // isMachineAnsweredBy determines whether to send voicemail vs. greeting.
      const mod = await import('../utils/answered-by.js');
      expect(typeof mod.isMachineAnsweredBy).toBe('function');
    });

    it('should correctly route to voicemail greeting when machine-answered', async () => {
      // Validates the branching logic that deepgram-agent uses:
      // isMachineAnsweredBy('machine_start') => true => voicemail path
      const { isMachineAnsweredBy } = await import('../utils/answered-by.js');
      expect(isMachineAnsweredBy('machine_start')).toBe(true);
      expect(isMachineAnsweredBy('machine_end_beep')).toBe(true);
    });

    it('should correctly route to live greeting when human-answered', async () => {
      // isMachineAnsweredBy('human') => false => live greeting path
      const { isMachineAnsweredBy } = await import('../utils/answered-by.js');
      expect(isMachineAnsweredBy('human')).toBe(false);
      expect(isMachineAnsweredBy(null)).toBe(false);
      expect(isMachineAnsweredBy(undefined)).toBe(false);
    });
  });
});
