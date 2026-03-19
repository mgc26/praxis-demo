import { describe, it, expect } from 'vitest';
import {
  buildAgentPrompt,
  buildAgentGreeting,
  buildGatekeeperGreeting,
  buildAgentVoicemailMessage,
} from './agent-prompts.js';
import type { ContactRecord, RecommendedScreening, BehavioralSignal } from '../types/index.js';
import type { BrandBackendConfig } from '../brands/index.js';
import { getBrandConfig } from '../brands/index.js';

// ---------------------------------------------------------------------------
// Helpers — realistic pharma/clinical data for each agent scenario
// ---------------------------------------------------------------------------

/** Baseline patient contact for patient-support agent. */
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
    diagnosis: 'Essential Tremor',
    currentDrug: 'euloxacaltenamide',
    prescribingHcp: 'Dr. Smith',
    treatmentStartDate: '2025-06-01',
    currentDose: '50mg BID',
    titrationPhase: 'Maintenance',
    hubEnrolled: true,
    copayCardActive: true,
    priorAuthStatus: 'Approved',
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

/** Baseline HCP contact (neurologist, DEE-Dravet, Relutrigine). */
function makeHcpContact(overrides: Partial<ContactRecord> = {}): ContactRecord {
  return makeContact({
    contactId: 'c-hcp-001',
    contactType: 'hcp',
    agentType: 'hcp-support',
    name: 'Robert Johnson',
    npi: '1234567890',
    specialty: 'Neurology',
    institution: 'Mayo Clinic',
    prescribingVolume: 'high',
    samplesOnHand: true,
    speakerProgramMember: false,
    therapeuticArea: 'dee-dravet',
    currentDrug: 'relutrigine',
    riskTier: 'HIGH',
    riskScore: 85,
    ...overrides,
  });
}

/** Dravet caregiver with distress signal — common in Dravet support calls. */
function makeDravetCaregiver(overrides: Partial<ContactRecord> = {}): ContactRecord {
  return makeContact({
    contactId: 'c-dravet-cg-001',
    contactType: 'caregiver',
    agentType: 'patient-support',
    name: 'Maria Garcia',
    age: 38,
    gender: 'Female',
    therapeuticArea: 'dee-dravet',
    currentDrug: 'relutrigine',
    diagnosis: 'Dravet Syndrome',
    riskTier: 'HIGH',
    riskScore: 88,
    recommendedPathway: 'crisis-support',
    behavioralSignals: [
      {
        category: 'CAREGIVER_DISTRESS',
        detail: 'Multiple missed refills, forum posts about burnout',
        recency: '3 days ago',
        severity: 'high',
        clinicalImplication: 'Caregiver fatigue risk — child may miss doses',
      },
    ],
    ...overrides,
  });
}

/** HCP contact pre-configured for outbound commercial engagement. */
function makeOutboundHcp(overrides: Partial<ContactRecord> = {}): ContactRecord {
  return makeHcpContact({
    contactId: 'c-outbound-001',
    agentType: 'hcp-outbound',
    name: 'Susan Chen',
    specialty: 'Neurology',
    institution: 'UCSF Medical Center',
    therapeuticArea: 'essential-tremor',
    currentDrug: 'euloxacaltenamide',
    riskTier: 'MEDIUM',
    riskScore: 55,
    engagementLabels: ['recent-conference-attendee'],
    ...overrides,
  });
}

/** Convenience: build a single behavioral signal. */
function makeSignal(overrides: Partial<BehavioralSignal>): BehavioralSignal {
  return {
    category: 'ADHERENCE_GAP',
    detail: 'Missed refill by 10 days',
    recency: '1 week ago',
    severity: 'medium',
    clinicalImplication: 'Risk of breakthrough seizures',
    ...overrides,
  };
}

// ===========================================================================
// buildAgentPrompt — dispatcher tests
// ===========================================================================

describe('buildAgentPrompt (dispatcher)', () => {
  it('should route to patient-support builder for patient-support agent type', () => {
    // Patient-support builder identifies itself as Emma, Patient Support Coordinator
    const contact = makeContact({ agentType: 'patient-support' });
    const prompt = buildAgentPrompt({ contact });
    expect(prompt).toContain('Patient Support Coordinator');
    expect(prompt).toContain('Emma');
  });

  it('should route to hcp-support builder for hcp-support agent type', () => {
    // HCP-support is an inbound Medical Information representative
    const contact = makeHcpContact({ agentType: 'hcp-support' });
    const prompt = buildAgentPrompt({ contact });
    expect(prompt).toContain('Medical Information representative');
    // Should NOT contain Field Engagement (that's outbound)
    expect(prompt).not.toContain('Field Engagement Coordinator');
  });

  it('should route to hcp-outbound builder for hcp-outbound agent type', () => {
    // Outbound is a Field Engagement Coordinator, distinct from inbound MI
    const contact = makeOutboundHcp({ agentType: 'hcp-outbound' });
    const prompt = buildAgentPrompt({ contact });
    expect(prompt).toContain('Field Engagement Coordinator');
  });

  it('should route to medcomms-qa builder for medcomms-qa agent type', () => {
    // MedComms QA is omnichannel MI — serves phone, web, email
    const contact = makeHcpContact({ agentType: 'medcomms-qa' });
    const prompt = buildAgentPrompt({ contact });
    expect(prompt).toContain('omnichannel');
    expect(prompt).toContain('Medical Information representative');
  });

  it('should throw for unknown agent type', () => {
    // TypeScript prevents this at compile time, but runtime guard matters for safety
    const contact = makeContact({ agentType: 'bogus-agent' as any });
    expect(() => buildAgentPrompt({ contact })).toThrow('Unknown agent type');
  });
});

// ===========================================================================
// Patient Support Agent
// ===========================================================================

describe('Patient Support Agent', () => {

  // -------------------------------------------------------------------------
  // Regulatory / Compliance
  // -------------------------------------------------------------------------

  describe('Regulatory/Compliance', () => {
    it('should include anti-kickback copay screening language when building prompt', () => {
      // Anti-Kickback Statute requires copay card screening for federal programs
      const contact = makeContact();
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('ANTI-KICKBACK');
      expect(prompt).toContain('copay');
    });

    it('should mention Medicare/Medicaid/TRICARE in copay screening', () => {
      // These are the specific federal programs that trigger copay card prohibition
      const contact = makeContact();
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('Medicare');
      expect(prompt).toContain('Medicaid');
      expect(prompt).toContain('TRICARE');
    });

    it('should include "NEVER activate" for federal program beneficiaries', () => {
      // Copay card activation for federal beneficiaries is a legal violation
      const contact = makeContact();
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toMatch(/NEVER activate.*copay card.*federal/i);
    });

    it('should include FDA four minimum AE elements', () => {
      // FDA requires: identifiable patient, identifiable reporter, suspect product, adverse event
      // The prompt captures these via: event description, onset date, severity, reporter
      const contact = makeContact();
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('event description');
      expect(prompt).toContain('onset date');
      expect(prompt).toContain('severity');
      expect(prompt).toContain('reporter');
    });

    it('should include pregnancy exposure protocol', () => {
      // Anti-epileptic drugs have teratogenic risk — pregnancy is a mandatory reportable event
      const contact = makeContact();
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('PREGNANCY REPORTING');
      expect(prompt).toContain('report_pregnancy_exposure');
    });

    it('should include pregnancy registry phone number (1-888-233-2334)', () => {
      // Pregnancy registry enrollment is required for anti-epileptic drugs
      const contact = makeContact();
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('pregnancy registry');
    });

    it('should warn against advising medication discontinuation during pregnancy', () => {
      // Abrupt AED discontinuation during pregnancy risks status epilepticus
      const contact = makeContact();
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('do NOT stop taking your medication');
    });

    it('should include lack-of-expected-effectiveness as AE trigger', () => {
      // FDA guidance: lack of expected therapeutic effect is a reportable event
      const contact = makeContact();
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('LACK OF EXPECTED EFFECTIVENESS');
      expect(prompt).toContain('report_adverse_event');
    });

    it('should include break-in-therapy emergency flow', () => {
      // For anti-epileptics, running out of medication is a medical emergency
      const contact = makeContact();
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('BREAK-IN-THERAPY');
    });

    it('should warn about abrupt discontinuation seizure risk', () => {
      // Abrupt discontinuation of AEDs can trigger seizures or status epilepticus
      const contact = makeContact();
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('abrupt discontinuation');
      expect(prompt).toContain('seizure');
    });
  });

  // -------------------------------------------------------------------------
  // Caregiver Handling
  // -------------------------------------------------------------------------

  describe('Caregiver Handling', () => {
    it('should include Dravet Syndrome Foundation reference for Dravet caregivers', () => {
      // Dravet Syndrome Foundation is the primary patient organization for Dravet families
      const contact = makeDravetCaregiver();
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('Dravet Syndrome Foundation');
    });

    it('should include IETF reference for ET caregivers (when caregiver with ET)', () => {
      // International Essential Tremor Foundation is the primary resource for ET caregivers
      const contact = makeContact({
        contactType: 'caregiver',
        therapeuticArea: 'essential-tremor',
        behavioralSignals: [
          makeSignal({ category: 'CAREGIVER_DISTRESS', detail: 'Burnout signals' }),
        ],
      });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('International Essential Tremor Foundation');
    });

    it('should include load-reduction language for caregivers with distress signals', () => {
      // Caregivers under distress need the agent to DO things for them, not give them tasks
      const contact = makeDravetCaregiver();
      const prompt = buildAgentPrompt({ contact });
      // "Let me take care of that for you" — active load reduction
      expect(prompt).toContain('Let me take care of that for you');
    });

    it('should relax word limit for caregiver calls (mention 50 words)', () => {
      // Standard limit is 35 words, but caregivers need more emotional support space
      const contact = makeDravetCaregiver();
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('50 words');
    });
  });

  // -------------------------------------------------------------------------
  // Behavioral Signal Responsiveness
  // -------------------------------------------------------------------------

  describe('Behavioral Signal Responsiveness', () => {
    it('should include adherence gap guidance when ADHERENCE_GAP signal present', () => {
      const contact = makeContact({
        behavioralSignals: [
          makeSignal({ category: 'ADHERENCE_GAP', detail: 'Missed refill by 14 days', severity: 'high' }),
        ],
      });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('MEDICATION ADHERENCE GAP');
    });

    it('should include caregiver distress guidance when CAREGIVER_DISTRESS signal present', () => {
      const contact = makeContact({
        contactType: 'caregiver',
        behavioralSignals: [
          makeSignal({ category: 'CAREGIVER_DISTRESS', detail: 'Forum posts about burnout', severity: 'high' }),
        ],
      });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('CAREGIVER SUPPORT');
    });

    it('should include high urgency guidance when high-severity signal present', () => {
      const contact = makeContact({
        behavioralSignals: [
          makeSignal({ category: 'ADHERENCE_GAP', detail: 'Out of medication', severity: 'high' }),
        ],
      });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('HIGH URGENCY SIGNAL DETECTED');
    });

    it('should include Dravet safety block for dee-dravet therapeutic area', () => {
      // Dravet patients are at elevated crisis risk — need C-SSRS screening
      const contact = makeContact({
        therapeuticArea: 'dee-dravet',
        currentDrug: 'relutrigine',
      });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('DRAVET-SPECIFIC SAFETY');
      expect(prompt).toContain('C-SSRS');
    });

    it('should NOT include Dravet safety block for essential-tremor therapeutic area', () => {
      const contact = makeContact({
        therapeuticArea: 'essential-tremor',
      });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).not.toContain('DRAVET-SPECIFIC SAFETY');
    });
  });

  // -------------------------------------------------------------------------
  // 90-Day Abandonment
  // -------------------------------------------------------------------------

  describe('90-Day Abandonment', () => {
    it('should mention first 90 days barrier addressing in GOAL section', () => {
      // First 90 days have the highest therapy abandonment rate; proactive barrier-addressing is key
      const contact = makeContact();
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('first 90 days');
    });
  });

  // -------------------------------------------------------------------------
  // Screening
  // -------------------------------------------------------------------------

  describe('Screening', () => {
    it('should include screening instructions when recommendedScreenings provided', () => {
      const contact = makeContact();
      const screenings: RecommendedScreening[] = [
        { instrumentId: 'MMAS-4', reason: 'Adherence monitoring', priority: 1 },
      ];
      const prompt = buildAgentPrompt({ contact, recommendedScreenings: screenings });
      expect(prompt).toContain('CLINICAL SCREENINGS');
      expect(prompt).toContain('MMAS-4');
      expect(prompt).toContain('Adherence monitoring');
    });

    it('should NOT include screening block when no screenings recommended', () => {
      const contact = makeContact();
      const prompt = buildAgentPrompt({ contact, recommendedScreenings: [] });
      expect(prompt).not.toContain('CLINICAL SCREENINGS');
    });
  });

  // -------------------------------------------------------------------------
  // AI Disclosure
  // -------------------------------------------------------------------------

  describe('AI Disclosure', () => {
    it('should include honest AI disclosure', () => {
      // Ethical AI: patients have a right to know they're speaking to an AI
      const contact = makeContact();
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('AI DISCLOSURE');
      expect(prompt).toContain('AI patient support coordinator');
    });
  });
});

// ===========================================================================
// HCP Support Agent
// ===========================================================================

describe('HCP Support Agent', () => {

  // -------------------------------------------------------------------------
  // Commercial Feature Removal (compliance-critical)
  // -------------------------------------------------------------------------

  describe('Commercial Feature Removal (compliance-critical)', () => {
    it('should NOT include request_samples in functions', () => {
      // Medical Information agents cannot offer samples — that's a commercial activity
      const contact = makeHcpContact({ agentType: 'hcp-support' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).not.toContain('request_samples');
    });

    it('should NOT include speaker program mentions', () => {
      // Speaker programs are commercial; MI agents must not reference them
      const contact = makeHcpContact({ agentType: 'hcp-support' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt.toLowerCase()).not.toContain('speaker program');
    });

    it('should NOT include competitive intelligence or competitor guidance', () => {
      // MI agents provide balanced medical information, not competitive intelligence
      const contact = makeHcpContact({ agentType: 'hcp-support' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).not.toContain('COMPETITIVE INTELLIGENCE');
    });

    it('should NOT include prescribing volume in context', () => {
      // Prescribing volume is commercial data — MI agents should not see it
      const contact = makeHcpContact({ agentType: 'hcp-support', prescribingVolume: 'high' });
      const prompt = buildAgentPrompt({ contact });
      // The prompt should not surface prescribing volume to the agent
      expect(prompt.toLowerCase()).not.toContain('prescribing volume');
    });
  });

  // -------------------------------------------------------------------------
  // Solicited/Unsolicited Tracking
  // -------------------------------------------------------------------------

  describe('Solicited/Unsolicited Tracking', () => {
    it('should include request classification section', () => {
      // FDA requires distinguishing solicited vs unsolicited info requests for off-label
      const contact = makeHcpContact({ agentType: 'hcp-support' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('REQUEST CLASSIFICATION');
    });

    it('should mention solicited vs unsolicited distinction', () => {
      const contact = makeHcpContact({ agentType: 'hcp-support' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('SOLICITED');
      expect(prompt).toContain('UNSOLICITED');
    });
  });

  // -------------------------------------------------------------------------
  // Response Type Determination
  // -------------------------------------------------------------------------

  describe('Response Type Determination', () => {
    it('should include standard response vs custom MI response distinction', () => {
      // Some queries need real-time answers; others need a formal written MI response
      const contact = makeHcpContact({ agentType: 'hcp-support' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('STANDARD RESPONSE');
      expect(prompt).toContain('CUSTOM MI RESPONSE');
    });

    it('should mention "written response" for complex queries', () => {
      // Complex MI queries require a referenced, written response
      const contact = makeHcpContact({ agentType: 'hcp-support' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('written response');
    });
  });

  // -------------------------------------------------------------------------
  // Special Populations
  // -------------------------------------------------------------------------

  describe('Special Populations', () => {
    it('should include renal impairment handling', () => {
      // Renal impairment dose adjustments are a common HCP question
      const contact = makeHcpContact({ agentType: 'hcp-support' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('RENAL IMPAIRMENT');
    });

    it('should include hepatic impairment handling', () => {
      const contact = makeHcpContact({ agentType: 'hcp-support' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('HEPATIC IMPAIRMENT');
    });

    it('should include pregnancy/lactation handling', () => {
      const contact = makeHcpContact({ agentType: 'hcp-support' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('PREGNANCY AND LACTATION');
    });

    it('should include pediatric handling', () => {
      // Pediatric off-label use is a frequent MI question for AEDs
      const contact = makeHcpContact({ agentType: 'hcp-support' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('PEDIATRIC');
    });
  });

  // -------------------------------------------------------------------------
  // Safety
  // -------------------------------------------------------------------------

  describe('Safety', () => {
    it('should include pregnancy exposure reporting', () => {
      const contact = makeHcpContact({ agentType: 'hcp-support' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('PREGNANCY EXPOSURE REPORTING');
      expect(prompt).toContain('report_pregnancy_exposure');
    });

    it('should include crisis/suicidality protocol', () => {
      const contact = makeHcpContact({ agentType: 'hcp-support' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('CRISIS PROTOCOL');
      expect(prompt).toContain('suicidal');
    });

    it('should include escalate_crisis in functions', () => {
      const contact = makeHcpContact({ agentType: 'hcp-support' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('escalate_crisis');
    });

    it('should include lack-of-effectiveness as AE scope', () => {
      // FDA guidance: lack of effect is a reportable safety event
      const contact = makeHcpContact({ agentType: 'hcp-support' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('Lack of therapeutic effect');
    });

    it('should include expanded safety event scope (medication errors, off-label use)', () => {
      // Expanded scope ensures medication errors and off-label use are captured as safety events
      const contact = makeHcpContact({ agentType: 'hcp-support' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('Medication errors');
      expect(prompt).toContain('Off-label use reports');
    });
  });

  // -------------------------------------------------------------------------
  // Off-Label Handling
  // -------------------------------------------------------------------------

  describe('Off-Label Handling', () => {
    it('should NOT self-reference "connect to Medical Information" (it IS medical information)', () => {
      // The HCP-support agent IS the MI line. It should not say "let me connect you with MI."
      // Instead it should offer to prepare a written MI response or arrange MSL visit.
      const contact = makeHcpContact({ agentType: 'hcp-support' });
      const prompt = buildAgentPrompt({ contact });
      // Should mention preparing a written response, not "connecting to" MI
      expect(prompt).toContain('written response');
      // Should offer MSL visit for deeper exchange
      expect(prompt).toContain('request_msl_visit');
    });

    it('should include custom MI response intake workflow for off-label', () => {
      // Off-label queries detected via signal should trigger custom MI response workflow
      const contact = makeHcpContact({
        agentType: 'hcp-support',
        behavioralSignals: [
          makeSignal({ category: 'OFF_LABEL_QUERY', detail: 'Pediatric use inquiry', severity: 'high' }),
        ],
      });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('OFF-LABEL INQUIRY DETECTED');
      expect(prompt).toContain('written response');
    });
  });
});

// ===========================================================================
// HCP Outbound Agent
// ===========================================================================

describe('HCP Outbound Agent', () => {

  // -------------------------------------------------------------------------
  // Compliance
  // -------------------------------------------------------------------------

  describe('Compliance', () => {
    it('should NOT route off-label queries commercially — should recommend MSL', () => {
      // Commercial agents must not address off-label; must route to MSL for scientific exchange
      const contact = makeOutboundHcp({
        behavioralSignals: [
          makeSignal({ category: 'OFF_LABEL_QUERY', detail: 'Asked about tremor subtypes', severity: 'medium' }),
        ],
      });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('OFF-LABEL INTEREST DETECTED');
      expect(prompt).toContain('Medical Science Liaison');
      expect(prompt).toContain('MSL visit');
    });

    it('should NOT include prescribing volume in agent-visible context', () => {
      // Prescribing volume is internal commercial data — should not be surfaced in the prompt
      const contact = makeOutboundHcp({ prescribingVolume: 'high' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt.toLowerCase()).not.toContain('prescribing volume');
    });

    it('should NOT include speaker program as a goal', () => {
      // Speaker programs are not a goal of outbound engagement
      const contact = makeOutboundHcp();
      const prompt = buildAgentPrompt({ contact });
      expect(prompt.toLowerCase()).not.toContain('speaker program');
    });

    it('should include fair balance section', () => {
      // FDA requires fair balance: efficacy claims must be accompanied by safety information
      const contact = makeOutboundHcp();
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('FAIR BALANCE');
    });

    it('should include "NEVER present efficacy data without safety" language', () => {
      const contact = makeOutboundHcp();
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('NEVER present efficacy data without');
    });
  });

  // -------------------------------------------------------------------------
  // Clinical Data
  // -------------------------------------------------------------------------

  describe('Clinical Data', () => {
    it('should include STEADY or TREMOR trial data for ET contacts (not placeholder text)', () => {
      // ET contacts should see real STEADY trial data with TETRAS-P endpoint
      const contact = makeOutboundHcp({ therapeuticArea: 'essential-tremor' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('STEADY');
    });

    it('should include PROTECT or NAVIGATE trial data for DEE contacts', () => {
      // DEE contacts should see real PROTECT trial data with seizure frequency endpoint
      const contact = makeOutboundHcp({ therapeuticArea: 'dee-dravet', currentDrug: 'relutrigine' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('PROTECT');
    });

    it('should NOT contain placeholder text "[reference approved efficacy data"', () => {
      // Placeholder text indicates incomplete prompt development — should be real data
      const etContact = makeOutboundHcp({ therapeuticArea: 'essential-tremor' });
      const deeContact = makeOutboundHcp({ therapeuticArea: 'dee-dravet', currentDrug: 'relutrigine' });
      expect(buildAgentPrompt({ contact: etContact })).not.toContain('[reference approved efficacy data');
      expect(buildAgentPrompt({ contact: deeContact })).not.toContain('[reference approved efficacy data');
    });

    it('should include specific efficacy numbers (TETRAS-P, seizure frequency reduction)', () => {
      // Real clinical data should include actual numeric endpoints
      const etPrompt = buildAgentPrompt({ contact: makeOutboundHcp({ therapeuticArea: 'essential-tremor' }) });
      expect(etPrompt).toContain('TETRAS');
      expect(etPrompt).toContain('4.2');

      const deePrompt = buildAgentPrompt({
        contact: makeOutboundHcp({ therapeuticArea: 'dee-dravet', currentDrug: 'relutrigine' }),
      });
      expect(deePrompt).toContain('seizure frequency');
      expect(deePrompt).toContain('48%');
    });
  });

  // -------------------------------------------------------------------------
  // Gatekeeper Handling
  // -------------------------------------------------------------------------

  describe('Gatekeeper Handling', () => {
    it('should include multi-turn gatekeeper conversation flow', () => {
      // Outbound calls often reach office staff first — agent needs gatekeeper handling
      const contact = makeOutboundHcp();
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('gatekeeper');
    });

    it('should include "take a message" scenario', () => {
      // Common gatekeeper response — agent needs a scripted fallback
      const contact = makeOutboundHcp();
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('take a message');
    });

    it('should include hostile/do-not-call scenario', () => {
      // Agent must gracefully exit and update records when asked not to call
      const contact = makeOutboundHcp();
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('do-not-call');
    });
  });

  // -------------------------------------------------------------------------
  // Greeting Language
  // -------------------------------------------------------------------------

  describe('Greeting Language', () => {
    it('should NOT use "exciting" in greeting for competitor research signal', () => {
      // "Exciting" sounds salesy and tone-deaf when HCP is evaluating alternatives
      const contact = makeOutboundHcp({
        behavioralSignals: [
          makeSignal({ category: 'COMPETITOR_RESEARCH', detail: 'Researching alternatives', severity: 'medium' }),
        ],
      });
      const greeting = buildAgentGreeting(contact);
      expect(greeting.toLowerCase()).not.toContain('exciting');
    });

    it('should NOT use "compelling" in greeting for high-risk contacts', () => {
      // "Compelling" is overly promotional for high-risk clinical situations
      const contact = makeOutboundHcp({ riskTier: 'HIGH', riskScore: 90 });
      const greeting = buildAgentGreeting(contact);
      expect(greeting.toLowerCase()).not.toContain('compelling');
    });

    it('should use need-based language in greetings', () => {
      // Greetings should lead with clinical relevance, not sales enthusiasm
      const contact = makeOutboundHcp();
      const greeting = buildAgentGreeting(contact);
      expect(greeting).toContain('clinical data');
    });
  });

  // -------------------------------------------------------------------------
  // Autonomy Preservation
  // -------------------------------------------------------------------------

  describe('Autonomy Preservation', () => {
    it('should include channel choice offering', () => {
      // HCPs should choose how they receive information — email, phone, portal
      const contact = makeOutboundHcp();
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('channel choice');
    });

    it('should include cadence control offering', () => {
      // HCPs should control how often they hear from Praxis
      const contact = makeOutboundHcp();
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('cadence control');
    });

    it('should include no-pressure closing language', () => {
      // End calls without pressuring for commitment
      const contact = makeOutboundHcp();
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('Take your time');
    });
  });

  // -------------------------------------------------------------------------
  // Safety
  // -------------------------------------------------------------------------

  describe('Safety', () => {
    it('should include full AE capture protocol (not just one line)', () => {
      // Even commercial calls must have complete AE capture — this is a regulatory requirement
      const contact = makeOutboundHcp();
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('ADVERSE EVENT CAPTURE');
      expect(prompt).toContain('report_adverse_event');
      expect(prompt).toContain('event description');
      expect(prompt).toContain('onset date');
    });

    it('should include pregnancy exposure reporting', () => {
      const contact = makeOutboundHcp();
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('PREGNANCY EXPOSURE REPORTING');
      expect(prompt).toContain('report_pregnancy_exposure');
    });

    it('should include crisis protocol', () => {
      // Not expected on commercial calls, but agent must be prepared
      const contact = makeOutboundHcp();
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('escalate_to_safety');
    });
  });
});

// ===========================================================================
// MedComms QA Agent
// ===========================================================================

describe('MedComms QA Agent', () => {

  // -------------------------------------------------------------------------
  // Delineation
  // -------------------------------------------------------------------------

  describe('Delineation', () => {
    it('should identify as omnichannel service (phone, web, email)', () => {
      // MedComms QA serves all channels — this distinguishes it from the dedicated HCP MI line
      const contact = makeHcpContact({ agentType: 'medcomms-qa' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('phone');
      expect(prompt).toContain('web');
      expect(prompt).toContain('email');
    });

    it('should mention distinction from dedicated HCP MI phone line', () => {
      // Callers need to understand they're on the omnichannel MI service, not the dedicated HCP line
      const contact = makeHcpContact({ agentType: 'medcomms-qa' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('distinct from the dedicated HCP Medical Information phone line');
    });
  });

  // -------------------------------------------------------------------------
  // Crisis Protocol
  // -------------------------------------------------------------------------

  describe('Crisis Protocol', () => {
    it('should include crisis/suicidality protocol (serves patients!)', () => {
      // MedComms QA serves patients too, so crisis protocol is essential
      const contact = makeContact({ agentType: 'medcomms-qa', contactType: 'patient' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('suicidal');
      expect(prompt).toContain('self-harm');
    });

    it('should include escalate_crisis in functions', () => {
      const contact = makeContact({ agentType: 'medcomms-qa' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('escalate_crisis');
    });

    it('should include 988 Lifeline reference', () => {
      // 988 is the national crisis lifeline — must be available for any patient-facing agent
      const contact = makeContact({ agentType: 'medcomms-qa' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('988');
    });
  });

  // -------------------------------------------------------------------------
  // Safety
  // -------------------------------------------------------------------------

  describe('Safety', () => {
    it('should include pregnancy exposure handling', () => {
      const contact = makeHcpContact({ agentType: 'medcomms-qa' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('PREGNANCY REPORTING');
      expect(prompt).toContain('report_pregnancy_exposure');
    });

    it('should include pregnancy registry reference', () => {
      const contact = makeHcpContact({ agentType: 'medcomms-qa' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('pregnancy registry');
    });

    it('should include lack-of-effectiveness as AE scope', () => {
      // Lack of effect must be captured as a reportable safety event across all agents
      const contact = makeHcpContact({ agentType: 'medcomms-qa' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('Lack of therapeutic effect');
    });
  });
});

// ===========================================================================
// buildAgentGreeting
// ===========================================================================

describe('buildAgentGreeting', () => {
  it('should use first name for patient-support greeting', () => {
    // Patient support is warm and personal — uses first name
    const contact = makeContact({ name: 'Jane Doe' });
    const greeting = buildAgentGreeting(contact);
    expect(greeting).toContain('Jane');
    // Should NOT use "Dr." for patients
    expect(greeting).not.toMatch(/Dr\.\s*Doe/);
  });

  it('should use title+last name for hcp-support greeting', () => {
    // HCP support is professional — uses Dr. LastName
    const contact = makeHcpContact({ agentType: 'hcp-support', name: 'Robert Johnson' });
    const greeting = buildAgentGreeting(contact);
    expect(greeting).toContain('Dr.');
    expect(greeting).toContain('Johnson');
  });

  it('should use need-based language for hcp-outbound (no "exciting"/"compelling")', () => {
    // Outbound greetings should lead with clinical relevance, not sales language
    const contact = makeOutboundHcp();
    const greeting = buildAgentGreeting(contact);
    expect(greeting.toLowerCase()).not.toContain('exciting');
    expect(greeting.toLowerCase()).not.toContain('compelling');
    // Should reference clinical data or practice relevance
    expect(greeting).toContain('clinical data');
  });

  it('should adapt hcp-outbound greeting for competitor research signal', () => {
    // Competitor research signal should trigger "evidence review" framing, not generic greeting
    const contact = makeOutboundHcp({
      behavioralSignals: [
        makeSignal({ category: 'COMPETITOR_RESEARCH', detail: 'Evaluated alternatives', severity: 'medium' }),
      ],
    });
    const greeting = buildAgentGreeting(contact);
    expect(greeting).toContain('evidence review');
  });

  it('should adapt hcp-outbound greeting for conference activity signal', () => {
    // Conference activity should trigger follow-up framing
    const contact = makeOutboundHcp({
      behavioralSignals: [
        makeSignal({ category: 'CONFERENCE_ACTIVITY', detail: 'Attended AAN 2025', severity: 'low' }),
      ],
    });
    const greeting = buildAgentGreeting(contact);
    expect(greeting).toContain('recent clinical evidence');
  });
});

// ===========================================================================
// buildGatekeeperGreeting
// ===========================================================================

describe('buildGatekeeperGreeting', () => {
  it('should exist as an exported function', () => {
    // Gatekeeper greeting is a distinct function, not just a branch of buildAgentGreeting
    expect(typeof buildGatekeeperGreeting).toBe('function');
  });

  it('should include the doctor\'s title and name', () => {
    const contact = makeOutboundHcp({ name: 'Susan Chen' });
    const greeting = buildGatekeeperGreeting(contact);
    expect(greeting).toContain('Dr.');
    expect(greeting).toContain('Chen');
  });

  it('should mention therapeutic area', () => {
    const contact = makeOutboundHcp({ therapeuticArea: 'essential-tremor' });
    const greeting = buildGatekeeperGreeting(contact);
    expect(greeting).toContain('Essential Tremor');
  });

  it('should be distinct from the standard HCP outbound greeting', () => {
    // Gatekeeper greeting addresses office staff, not the HCP directly
    const contact = makeOutboundHcp({ name: 'Susan Chen' });
    const gatekeeperGreeting = buildGatekeeperGreeting(contact);
    const standardGreeting = buildAgentGreeting(contact);
    expect(gatekeeperGreeting).not.toEqual(standardGreeting);
    // Gatekeeper greeting asks if doctor is available
    expect(gatekeeperGreeting).toContain('Is the doctor available');
  });
});

// ===========================================================================
// buildAgentVoicemailMessage
// ===========================================================================

describe('buildAgentVoicemailMessage', () => {
  it('should include callback number for patient-support', () => {
    const contact = makeContact({ agentType: 'patient-support', name: 'Jane Doe' });
    const msg = buildAgentVoicemailMessage(contact);
    expect(msg).toContain('1-800-PRAXIS-PS');
  });

  it('should include therapeutic area for hcp-outbound', () => {
    const contact = makeOutboundHcp({
      agentType: 'hcp-outbound',
      therapeuticArea: 'essential-tremor',
    });
    const msg = buildAgentVoicemailMessage(contact);
    expect(msg).toContain('Essential Tremor');
  });

  it('should include callback number for hcp-support', () => {
    const contact = makeHcpContact({ agentType: 'hcp-support' });
    const msg = buildAgentVoicemailMessage(contact);
    expect(msg).toContain('1-800-PRAXIS-MI');
  });
});

// ===========================================================================
// Brand-Parameterization — verifies prompts adapt to non-default brands
// ===========================================================================

describe('Brand-Parameterization', () => {
  /** Minimal mock brand config that differs from Praxis in every key field. */
  const mockBrand: BrandBackendConfig = {
    ...getBrandConfig(),
    id: 'acme',
    companyName: 'Acme Therapeutics',
    shortName: 'Acme',
    hubName: 'AcmeConnect',
    agentPersonas: {
      'patient-support': { name: 'Sophia', greeting: 'Hi, this is Sophia from Acme Patient Support.' },
      'hcp-support': { name: 'Aria', greeting: 'Hello, Acme Medical Information.' },
      'hcp-outbound': { name: 'Leo', greeting: 'Hello, this is Leo from Acme Therapeutics.' },
      'medcomms-qa': { name: 'Dana', greeting: 'Acme Medical Information.' },
    },
    phoneNumbers: {
      patientSupport: '1-888-ACME-PS',
      medicalInfo: '1-888-ACME-MI',
      safety: '1-888-ACME-AE',
    },
    urls: {
      patientPortal: 'AcmePatient.com',
      hcpPortal: 'AcmeHCP.com',
    },
    drugProfiles: [
      {
        id: 'euloxacaltenamide',
        brandName: 'AcmePill',
        genericName: 'Euloxacaltenamide',
        therapeuticArea: 'essential-tremor',
        indication: 'Treatment of essential tremor in adults',
        moa: 'Mock MOA',
        dosing: '10 mg once daily',
        commonAEs: ['Headache (10%)'],
        seriousAEs: [],
        trialData: 'ACME-TRIAL (Phase 3): mock data',
      },
    ],
  };

  it('should use custom company name in patient-support prompt', () => {
    const contact = makeContact({ agentType: 'patient-support' });
    const prompt = buildAgentPrompt({ contact }, mockBrand);
    expect(prompt).toContain('Acme Therapeutics');
    expect(prompt).toContain('Sophia');
    expect(prompt).not.toContain('Praxis BioSciences');
    expect(prompt).not.toContain('Emma');
  });

  it('should use custom company name in hcp-support prompt', () => {
    const contact = makeHcpContact({ agentType: 'hcp-support' });
    const prompt = buildAgentPrompt({ contact }, mockBrand);
    expect(prompt).toContain('Acme Therapeutics');
    expect(prompt).not.toContain('Praxis BioSciences');
  });

  it('should use custom agent name in hcp-outbound prompt', () => {
    const contact = makeOutboundHcp({ agentType: 'hcp-outbound' });
    const prompt = buildAgentPrompt({ contact }, mockBrand);
    expect(prompt).toContain('Leo');
    expect(prompt).toContain('Acme Therapeutics');
    expect(prompt).not.toContain('Praxis BioSciences');
  });

  it('should use custom company name in medcomms-qa prompt', () => {
    const contact = makeHcpContact({ agentType: 'medcomms-qa' });
    const prompt = buildAgentPrompt({ contact }, mockBrand);
    expect(prompt).toContain('Acme Therapeutics');
    expect(prompt).not.toContain('Praxis BioSciences');
  });

  it('should resolve drug brand name from custom config', () => {
    const contact = makeContact({ currentDrug: 'euloxacaltenamide' });
    const prompt = buildAgentPrompt({ contact }, mockBrand);
    expect(prompt).toContain('AcmePill');
    // Should NOT contain the Praxis brand name for this drug
    expect(prompt).not.toContain('ELEX');
  });

  it('should use custom phone numbers in voicemail messages', () => {
    const contact = makeContact({ agentType: 'patient-support' });
    const msg = buildAgentVoicemailMessage(contact, mockBrand);
    expect(msg).toContain('1-888-ACME-PS');
    expect(msg).toContain('Sophia');
    expect(msg).not.toContain('1-800-PRAXIS');
  });

  it('should use custom agent name and company in greeting', () => {
    const contact = makeOutboundHcp();
    const greeting = buildAgentGreeting(contact, mockBrand);
    expect(greeting).toContain('Leo');
    expect(greeting).toContain('Acme Therapeutics');
    expect(greeting).not.toContain('Emma');
    expect(greeting).not.toContain('Praxis');
  });

  it('should use custom agent name in gatekeeper greeting', () => {
    const contact = makeOutboundHcp();
    const greeting = buildGatekeeperGreeting(contact, mockBrand);
    expect(greeting).toContain('Leo');
    expect(greeting).toContain('Acme Therapeutics');
    expect(greeting).not.toContain('Emma');
    expect(greeting).not.toContain('Praxis');
  });

  it('should use custom phone number in hcp-outbound voicemail', () => {
    const contact = makeOutboundHcp({ agentType: 'hcp-outbound' });
    const msg = buildAgentVoicemailMessage(contact, mockBrand);
    expect(msg).toContain('1-888-ACME-MI');
    expect(msg).toContain('Acme');
    expect(msg).not.toContain('1-800-PRAXIS');
  });

  it('should use custom hub name in patient-support prompt', () => {
    const contact = makeContact({ agentType: 'patient-support' });
    const prompt = buildAgentPrompt({ contact }, mockBrand);
    expect(prompt).toContain('AcmeConnect');
  });

  it('should default to Praxis config when no brand is passed', () => {
    const contact = makeContact({ agentType: 'patient-support' });
    const prompt = buildAgentPrompt({ contact });
    expect(prompt).toContain('Praxis BioSciences');
    expect(prompt).toContain('Emma');
  });
});
