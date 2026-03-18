import { describe, it, expect, beforeAll } from 'vitest';
import {
  getAllCalls,
  getCallById,
  getFilteredCalls,
  getContactQueue,
  getAnalytics,
  buildSignalFeed,
  getMSLFollowUpRequests,
  getMSLFollowUpRequestsByStatus,
  getPatientOutcomes,
  getCohortOutcomeData,
  getPayerEvidenceCard,
} from './seed-data';
import type {
  AgentType,
  CallRecord,
  ContactRecord,
  MSLFollowUpRequest,
  PatientOutcomeRecord,
  CohortOutcomeData,
  PayerEvidenceCard,
} from './types';

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------
describe('getContactQueue (seed contacts)', () => {
  let contacts: ContactRecord[];

  beforeAll(() => {
    contacts = getContactQueue();
  });

  it('returns 12 contacts', () => {
    expect(contacts).toHaveLength(12);
  });

  it('every contact has required fields', () => {
    for (const c of contacts) {
      expect(typeof c.contactId).toBe('string');
      expect(c.contactId.length).toBeGreaterThan(0);
      expect(typeof c.name).toBe('string');
      expect(c.name.length).toBeGreaterThan(0);
      expect(typeof c.phone).toBe('string');
      expect(c.phone.length).toBeGreaterThan(0);
      expect(['patient', 'hcp']).toContain(c.contactType);
      expect(['patient-support', 'hcp-support', 'hcp-outbound', 'medcomms-qa', undefined]).toContain(
        (c as unknown as Record<string, unknown>).agentType,
      );
      expect(['essential-tremor', 'dee']).toContain(c.therapeuticArea);
    }
  });

  it('contact types include both patient and hcp', () => {
    const types = new Set(contacts.map((c) => c.contactType));
    expect(types.has('patient')).toBe(true);
    expect(types.has('hcp')).toBe(true);
  });

  it('therapeutic areas include both essential-tremor and dee', () => {
    const areas = new Set(contacts.map((c) => c.therapeuticArea));
    expect(areas.has('essential-tremor')).toBe(true);
    expect(areas.has('dee')).toBe(true);
  });

  it('has no duplicate contactIds', () => {
    const ids = contacts.map((c) => c.contactId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------
describe('getAllCalls (seed calls)', () => {
  let calls: CallRecord[];

  beforeAll(() => {
    calls = getAllCalls();
  });

  it('returns 20 calls', () => {
    expect(calls).toHaveLength(20);
  });

  it('every call has required fields', () => {
    for (const c of calls) {
      expect(typeof c.id).toBe('string');
      expect(c.id.length).toBeGreaterThan(0);
      expect(typeof c.contactId).toBe('string');
      expect(c.contactId.length).toBeGreaterThan(0);
      expect(['patient', 'hcp']).toContain(c.contactType);
      expect(typeof c.agentType).toBe('string');
      expect(['patient-support', 'hcp-support', 'hcp-outbound', 'medcomms-qa']).toContain(c.agentType);
    }
  });

  it('has no duplicate call ids', () => {
    const ids = calls.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('agent types patient-support, hcp-support, hcp-outbound are represented', () => {
    // Note: medcomms-qa is not assigned by the seed data generator (assignAgentType
    // only returns patient-support, hcp-support, or hcp-outbound based on contactType/pathway)
    const types = new Set(calls.map((c) => c.agentType));
    expect(types.has('patient-support')).toBe(true);
    expect(types.has('hcp-support')).toBe(true);
    expect(types.has('hcp-outbound')).toBe(true);
  });

  it('calls are sorted by timestamp descending', () => {
    for (let i = 1; i < calls.length; i++) {
      const prev = new Date(calls[i - 1].timestamp).getTime();
      const curr = new Date(calls[i].timestamp).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  it('every call has a valid duration (positive number)', () => {
    for (const c of calls) {
      expect(c.duration).toBeGreaterThan(0);
    }
  });

  it('every call has a transcript array', () => {
    for (const c of calls) {
      expect(Array.isArray(c.transcript)).toBe(true);
      expect(c.transcript.length).toBeGreaterThan(0);
    }
  });

  it('every call has a classification object', () => {
    for (const c of calls) {
      expect(c.classification).toBeDefined();
      expect(typeof c.classification.outcome).toBe('string');
      expect(typeof c.classification.confidence).toBe('number');
    }
  });

  it('every call has a liaisonSummary object', () => {
    for (const c of calls) {
      expect(c.liaisonSummary).toBeDefined();
      expect(typeof c.liaisonSummary.engagementScore).toBe('number');
    }
  });
});

// ---------------------------------------------------------------------------
// getCallById
// ---------------------------------------------------------------------------
describe('getCallById', () => {
  it('returns a call for a known id', () => {
    const calls = getAllCalls();
    const firstCall = calls[0];
    const result = getCallById(firstCall.id);
    expect(result).toBeDefined();
    expect(result!.id).toBe(firstCall.id);
  });

  it('returns undefined for an unknown id', () => {
    expect(getCallById('nonexistent-id-xyz')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getFilteredCalls
// ---------------------------------------------------------------------------
describe('getFilteredCalls', () => {
  it('returns paginated results with default params', () => {
    const result = getFilteredCalls({});
    expect(result).toHaveProperty('calls');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('page');
    expect(result).toHaveProperty('totalPages');
    expect(result.total).toBe(20);
    expect(result.page).toBe(1);
  });

  it('filters by agentType', () => {
    const result = getFilteredCalls({ agentType: 'patient-support' });
    expect(result.total).toBeGreaterThan(0);
    for (const c of result.calls) {
      expect(c.agentType).toBe('patient-support');
    }
  });

  it('filters by therapeuticArea', () => {
    const result = getFilteredCalls({ therapeuticArea: 'essential-tremor' });
    expect(result.total).toBeGreaterThan(0);
    for (const c of result.calls) {
      expect(c.therapeuticArea).toBe('essential-tremor');
    }
  });

  it('respects pagination (page and limit)', () => {
    const result = getFilteredCalls({ page: 1, limit: 5 });
    expect(result.calls.length).toBeLessThanOrEqual(5);
    expect(result.totalPages).toBe(Math.ceil(result.total / 5));
  });

  it('filters by search (contact name)', () => {
    const calls = getAllCalls();
    const targetName = calls[0].contactName;
    const firstName = targetName.split(' ')[0];
    const result = getFilteredCalls({ search: firstName });
    expect(result.total).toBeGreaterThan(0);
    for (const c of result.calls) {
      expect(c.contactName.toLowerCase()).toContain(firstName.toLowerCase());
    }
  });
});

// ---------------------------------------------------------------------------
// getAnalytics
// ---------------------------------------------------------------------------
describe('getAnalytics', () => {
  it('returns expected structure for period "all"', () => {
    const analytics = getAnalytics('all');

    // KPIs
    expect(analytics.kpis).toBeDefined();
    expect(typeof analytics.kpis.totalInteractions).toBe('number');
    expect(analytics.kpis.totalInteractions).toBe(20);
    expect(typeof analytics.kpis.aeReportsCaptured).toBe('number');
    expect(typeof analytics.kpis.hubEnrollments).toBe('number');
    expect(typeof analytics.kpis.copayCardsIssued).toBe('number');
    expect(typeof analytics.kpis.hcpEngagements).toBe('number');
    expect(typeof analytics.kpis.adherenceRate).toBe('number');
    expect(typeof analytics.kpis.sampleRequests).toBe('number');
    expect(typeof analytics.kpis.avgHandleTime).toBe('number');
    expect(typeof analytics.kpis.engagementRate).toBe('number');
    expect(typeof analytics.kpis.medicalInquiries).toBe('number');

    // Distributions
    expect(analytics.outcomeDistribution).toBeDefined();
    expect(analytics.pathwayDistribution).toBeDefined();
    expect(analytics.priorityTierDistribution).toBeDefined();
    expect(analytics.agentTypeDistribution).toBeDefined();
    expect(analytics.therapeuticAreaDistribution).toBeDefined();

    // Priority tier distribution has all tiers
    expect(analytics.priorityTierDistribution).toHaveProperty('HIGH');
    expect(analytics.priorityTierDistribution).toHaveProperty('MEDIUM');
    expect(analytics.priorityTierDistribution).toHaveProperty('LOW');

    // Agent type distribution has all types
    expect(analytics.agentTypeDistribution).toHaveProperty('patient-support');
    expect(analytics.agentTypeDistribution).toHaveProperty('hcp-support');
    expect(analytics.agentTypeDistribution).toHaveProperty('hcp-outbound');
    expect(analytics.agentTypeDistribution).toHaveProperty('medcomms-qa');

    // Therapeutic area distribution
    expect(analytics.therapeuticAreaDistribution).toHaveProperty('essential-tremor');
    expect(analytics.therapeuticAreaDistribution).toHaveProperty('dee');

    // Daily trend
    expect(Array.isArray(analytics.dailyTrend)).toBe(true);
    expect(analytics.dailyTrend.length).toBe(7);
    for (const day of analytics.dailyTrend) {
      expect(typeof day.date).toBe('string');
      expect(typeof day.interactions).toBe('number');
      expect(typeof day.engagements).toBe('number');
      expect(typeof day.conversions).toBe('number');
    }

    // Top concerns
    expect(Array.isArray(analytics.topConcerns)).toBe(true);
    for (const tc of analytics.topConcerns) {
      expect(typeof tc.concern).toBe('string');
      expect(typeof tc.count).toBe('number');
      expect(typeof tc.percentage).toBe('number');
    }

    // Recent calls
    expect(Array.isArray(analytics.recentCalls)).toBe(true);
    expect(analytics.recentCalls.length).toBeLessThanOrEqual(10);
  });

  it('agent type distribution sums to totalInteractions', () => {
    const analytics = getAnalytics('all');
    const sum = Object.values(analytics.agentTypeDistribution).reduce((a, b) => a + b, 0);
    expect(sum).toBe(analytics.kpis.totalInteractions);
  });

  it('returns valid data for "week" period', () => {
    const analytics = getAnalytics('week');
    expect(analytics.kpis.totalInteractions).toBeGreaterThanOrEqual(0);
    expect(analytics.kpis.totalInteractions).toBeLessThanOrEqual(20);
  });

  it('returns valid data for "today" period', () => {
    const analytics = getAnalytics('today');
    expect(analytics.kpis.totalInteractions).toBeGreaterThanOrEqual(0);
    expect(analytics.kpis.totalInteractions).toBeLessThanOrEqual(20);
  });
});

// ---------------------------------------------------------------------------
// buildSignalFeed
// ---------------------------------------------------------------------------
describe('buildSignalFeed', () => {
  it('returns up to 15 signal feed entries', () => {
    const calls = getAllCalls();
    const feed = buildSignalFeed(calls);
    expect(feed.length).toBeLessThanOrEqual(15);
    expect(feed.length).toBeGreaterThan(0);
  });

  it('each feed entry has required fields', () => {
    const calls = getAllCalls();
    const feed = buildSignalFeed(calls);
    for (const entry of feed) {
      expect(typeof entry.id).toBe('string');
      expect(typeof entry.contactIdAnon).toBe('string');
      expect(typeof entry.signalType).toBe('string');
      expect(typeof entry.detectedBehavior).toBe('string');
      expect(typeof entry.recommendedAction).toBe('string');
      expect(['routine', 'soon', 'urgent']).toContain(entry.urgency);
      expect(typeof entry.supportPathway).toBe('string');
      expect(['essential-tremor', 'dee']).toContain(entry.therapeuticArea);
      expect(typeof entry.timestamp).toBe('string');
      expect(['new', 'queued', 'in-progress', 'completed']).toContain(entry.status);
    }
  });
});

// ---------------------------------------------------------------------------
// Competitive Intelligence Notes
// ---------------------------------------------------------------------------
describe('Competitive Intelligence Notes in seed data', () => {
  let calls: CallRecord[];

  beforeAll(() => {
    calls = getAllCalls();
  });

  it('should populate competitiveIntelNotes on some HCP call records', () => {
    // WHY: CI pipeline depends on HCP calls having competitor mentions for market analysis.
    const hcpCalls = calls.filter(c => c.contactType === 'hcp');
    const withCI = hcpCalls.filter(c => c.classification.competitiveIntelNotes.length > 0);
    expect(withCI.length).toBeGreaterThan(0);
  });

  it('should have empty array (not undefined) for calls without CI notes', () => {
    // WHY: Downstream consumers call .map() on this field; undefined would throw a TypeError.
    for (const call of calls) {
      expect(Array.isArray(call.classification.competitiveIntelNotes)).toBe(true);
    }
  });

  it('should have CI notes containing realistic pharma competitor mentions', () => {
    // WHY: CI notes must reference real competitor drugs to be useful for market intelligence.
    const allCINotes = calls.flatMap(c => c.classification.competitiveIntelNotes);
    if (allCINotes.length > 0) {
      const ciText = allCINotes.join(' ').toLowerCase();
      // At least one known competitor should appear somewhere across all CI notes
      const knownCompetitors = ['propranolol', 'topiramate', 'fenfluramine', 'primidone', 'cannabidiol', 'gabapentin', 'stiripentol', 'sodium channel'];
      const hasCompetitorMention = knownCompetitors.some(comp => ciText.includes(comp));
      expect(hasCompetitorMention).toBe(true);
    }
  });

  it('should NOT have CI notes on patient-support calls', () => {
    // WHY: Patients don't discuss competitor drugs in a competitive intel context;
    // CI notes on patient calls would be a data integrity bug.
    const patientCalls = calls.filter(c => c.contactType === 'patient');
    for (const call of patientCalls) {
      expect(call.classification.competitiveIntelNotes).toHaveLength(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Structured Liaison Summary in seed data
// ---------------------------------------------------------------------------
describe('Structured Liaison Summary fields in seed data', () => {
  let calls: CallRecord[];

  beforeAll(() => {
    calls = getAllCalls();
  });

  it('should include contextSummary on all call liaison summaries', () => {
    // WHY: Block 1 is always required -- it tells the liaison who they're reviewing.
    for (const call of calls) {
      expect(typeof call.liaisonSummary.contextSummary).toBe('string');
    }
  });

  it('should have contextSummary as a non-empty string', () => {
    for (const call of calls) {
      expect(call.liaisonSummary.contextSummary.length).toBeGreaterThan(0);
    }
  });

  it('should include whatHappened on all call liaison summaries', () => {
    // WHY: Block 2 tells the liaison what occurred during the call.
    for (const call of calls) {
      expect(typeof call.liaisonSummary.whatHappened).toBe('string');
      expect(call.liaisonSummary.whatHappened.length).toBeGreaterThan(0);
    }
  });

  it('should include whatChangedSinceLastTouch on all liaison summaries', () => {
    // WHY: Block 3 shows new signals since last contact -- helps prioritize follow-ups.
    for (const call of calls) {
      expect(typeof call.liaisonSummary.whatChangedSinceLastTouch).toBe('string');
      expect(call.liaisonSummary.whatChangedSinceLastTouch.length).toBeGreaterThan(0);
    }
  });

  it('should include clinicalQuestionsRaised as array on all liaison summaries', () => {
    // WHY: Block 4 must always be an array (possibly empty) so the UI can safely render it.
    for (const call of calls) {
      expect(Array.isArray(call.liaisonSummary.clinicalQuestionsRaised)).toBe(true);
    }
  });

  it('should include recommendedAction on all liaison summaries', () => {
    // WHY: Block 5 gives the liaison a concrete next step with timeframe.
    for (const call of calls) {
      expect(typeof call.liaisonSummary.recommendedAction).toBe('string');
      expect(call.liaisonSummary.recommendedAction.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// FRM Fields in seed data
// ---------------------------------------------------------------------------
describe('FRM (Field Reimbursement Manager) fields in seed data', () => {
  let calls: CallRecord[];

  beforeAll(() => {
    calls = getAllCalls();
  });

  it('should include payerName on some patient call records', () => {
    // WHY: FRM dashboards aggregate payer data -- at least some patient calls must have payer info.
    const patientCalls = calls.filter(c => c.contactType === 'patient');
    const withPayer = patientCalls.filter(c => c.payerName !== undefined);
    expect(withPayer.length).toBeGreaterThan(0);
  });

  it('should include priorAuthStatus on some call records', () => {
    // WHY: Prior auth tracking is a core FRM function; some calls must populate this field.
    const withPriorAuth = calls.filter(c => c.priorAuthStatus !== undefined);
    expect(withPriorAuth.length).toBeGreaterThan(0);
  });

  it('should have valid priorAuthStatus values when present', () => {
    // WHY: Invalid status values would break status-based filtering in the FRM dashboard.
    const validStatuses = ['not-needed', 'pending', 'approved', 'denied', 'appealing'];
    for (const call of calls) {
      if (call.priorAuthStatus !== undefined) {
        expect(validStatuses).toContain(call.priorAuthStatus);
      }
    }
  });

  it('should have denialReason string when priorAuthStatus is denied', () => {
    // WHY: Denied prior auths without a reason are useless for appeals strategy.
    const deniedCalls = calls.filter(c => c.priorAuthStatus === 'denied');
    for (const call of deniedCalls) {
      expect(typeof call.denialReason).toBe('string');
      expect(call.denialReason!.length).toBeGreaterThan(0);
    }
  });

  it('should have timeToTherapyDays when priorAuthStatus is present', () => {
    // WHY: Time-to-therapy is paired with prior auth status for access analytics.
    const withPriorAuth = calls.filter(c => c.priorAuthStatus !== undefined);
    for (const call of withPriorAuth) {
      expect(typeof call.timeToTherapyDays).toBe('number');
      expect(call.timeToTherapyDays!).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// MSL Follow-Up Requests
// ---------------------------------------------------------------------------
describe('MSL Follow-Up Requests', () => {
  let requests: MSLFollowUpRequest[];

  beforeAll(() => {
    requests = getMSLFollowUpRequests();
  });

  it('should generate MSL follow-up requests', () => {
    // WHY: The MSL dashboard needs follow-up request data to function.
    expect(requests.length).toBeGreaterThan(0);
  });

  it('should generate at least 3 requests (static fallbacks ensure minimum)', () => {
    // WHY: The demo requires populated MSL follow-up data; static fallbacks guarantee at least 3
    // entries even when the PRNG produces zero flagged HCP calls.
    expect(requests.length).toBeGreaterThanOrEqual(3);
  });

  it('should have required fields on each request (id, callId, contactId, topic)', () => {
    for (const req of requests) {
      expect(typeof req.id).toBe('string');
      expect(req.id.length).toBeGreaterThan(0);
      expect(typeof req.callId).toBe('string');
      expect(req.callId.length).toBeGreaterThan(0);
      expect(typeof req.contactId).toBe('string');
      expect(req.contactId.length).toBeGreaterThan(0);
      expect(typeof req.topic).toBe('string');
      expect(req.topic.length).toBeGreaterThan(0);
      expect(typeof req.contactName).toBe('string');
      expect(typeof req.createdAt).toBe('string');
    }
  });

  it('should have valid urgency levels on each request', () => {
    for (const req of requests) {
      expect(['routine', 'soon', 'urgent']).toContain(req.urgency);
    }
  });

  it('should have valid status values on each request', () => {
    for (const req of requests) {
      expect(['new', 'assigned', 'scheduled', 'completed']).toContain(req.status);
    }
  });

  it('should have valid requestType values on each request', () => {
    for (const req of requests) {
      expect(['peer-to-peer', 'clinical-data', 'off-label-inquiry', 'scientific-exchange']).toContain(req.requestType);
    }
  });

  it('should only have HCP contacts on follow-up requests', () => {
    // WHY: MSL follow-ups are always for HCPs, never patients.
    for (const req of requests) {
      expect(req.contactType).toBe('hcp');
    }
  });

  it('should filter by status correctly with getMSLFollowUpRequestsByStatus', () => {
    const newReqs = getMSLFollowUpRequestsByStatus('new');
    for (const req of newReqs) {
      expect(req.status).toBe('new');
    }
    const allReqs = getMSLFollowUpRequestsByStatus();
    expect(allReqs.length).toBe(requests.length);
  });
});

// ---------------------------------------------------------------------------
// Seed Data Determinism
// ---------------------------------------------------------------------------
describe('Seed Data Determinism (PRNG stability)', () => {
  it('should produce identical call results across multiple calls to getAllCalls', () => {
    // WHY: getAllCalls returns a singleton -- repeated calls must return the same reference
    // to avoid inconsistency in the dashboard and tests.
    const calls1 = getAllCalls();
    const calls2 = getAllCalls();
    expect(calls1).toBe(calls2); // Same reference (singleton)
  });

  it('should produce identical contact results across multiple calls to getContactQueue', () => {
    const contacts1 = getContactQueue();
    const contacts2 = getContactQueue();
    expect(contacts1).toBe(contacts2); // Same reference
  });

  it('should produce identical MSL follow-up requests across multiple calls', () => {
    const reqs1 = getMSLFollowUpRequests();
    const reqs2 = getMSLFollowUpRequests();
    expect(reqs1).toBe(reqs2); // Same reference (singleton)
  });

  it('should produce identical call IDs on repeated access', () => {
    // WHY: Even if not the same reference, IDs must be stable for linking.
    const ids1 = getAllCalls().map(c => c.id);
    const ids2 = getAllCalls().map(c => c.id);
    expect(ids1).toEqual(ids2);
  });
});

// ---------------------------------------------------------------------------
// Clinical Accuracy in Seed Data
// ---------------------------------------------------------------------------
describe('Clinical Accuracy in seed data', () => {
  let contacts: ContactRecord[];
  let calls: CallRecord[];

  beforeAll(() => {
    contacts = getContactQueue();
    calls = getAllCalls();
  });

  it('should not have contraindicated medications for Dravet patients', () => {
    // WHY: Sodium channel blockers (carbamazepine, oxcarbazepine, phenytoin, lamotrigine)
    // are contraindicated in Dravet syndrome and would be a clinical data integrity error.
    const dravetPatients = contacts.filter(
      c => c.contactType === 'patient' && c.therapeuticArea === 'dee',
    );
    const contraindicatedDrugs = ['carbamazepine', 'oxcarbazepine', 'phenytoin', 'lamotrigine'];
    for (const patient of dravetPatients) {
      const medsLower = (patient.currentMedications ?? []).map(m => m.toLowerCase());
      for (const drug of contraindicatedDrugs) {
        const hasContraindicated = medsLower.some(m => m.includes(drug));
        expect(
          hasContraindicated,
          `Dravet patient ${patient.name} should not be on contraindicated drug: ${drug}`,
        ).toBe(false);
      }
    }
  });

  it('should have ELEX dosing in plausible range (25mg-200mg)', () => {
    // WHY: Out-of-range dosing would be clinically implausible and make the demo look unrealistic.
    const elexPatients = contacts.filter(
      c => c.contactType === 'patient' && c.drugProduct === 'euloxacaltenamide',
    );
    const doseRegex = /(\d+)\s*mg/i;
    for (const patient of elexPatients) {
      const elexMed = (patient.currentMedications ?? []).find(m =>
        m.toLowerCase().includes('euloxacaltenamide') || m.toLowerCase().includes('elex'),
      );
      if (elexMed) {
        const match = elexMed.match(doseRegex);
        if (match) {
          const dose = parseInt(match[1], 10);
          expect(dose).toBeGreaterThanOrEqual(25);
          expect(dose).toBeLessThanOrEqual(200);
        }
      }
    }
  });

  it('should have Relutrigine dosing in plausible range (weight-based or fixed adult dose)', () => {
    // WHY: Relutrigine doses should be plausible for pediatric and adult Dravet patients.
    const relPatients = contacts.filter(
      c => c.contactType === 'patient' && c.drugProduct === 'relutrigine',
    );
    const doseRegex = /(\d+)\s*mg/i;
    for (const patient of relPatients) {
      const relMed = (patient.currentMedications ?? []).find(m =>
        m.toLowerCase().includes('relutrigine'),
      );
      if (relMed) {
        const match = relMed.match(doseRegex);
        if (match) {
          const dose = parseInt(match[1], 10);
          // Pediatric doses start around 10-25mg, adult up to 200mg
          expect(dose).toBeGreaterThanOrEqual(10);
          expect(dose).toBeLessThanOrEqual(200);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Data Integrity
// ---------------------------------------------------------------------------
describe('Data Integrity -- cross-referential consistency', () => {
  let calls: CallRecord[];
  let contacts: ContactRecord[];
  let contactIdSet: Set<string>;

  beforeAll(() => {
    calls = getAllCalls();
    contacts = getContactQueue();
    contactIdSet = new Set(contacts.map(c => c.contactId));
  });

  it('should have every call record with a valid contactId matching a contact', () => {
    // WHY: Orphaned calls (no matching contact) would break the contact detail view.
    for (const call of calls) {
      expect(
        contactIdSet.has(call.contactId),
        `Call ${call.id} references unknown contactId: ${call.contactId}`,
      ).toBe(true);
    }
  });

  it('should have every call record with a non-empty transcript array', () => {
    // WHY: Empty transcripts would render a blank transcript viewer in the UI.
    for (const call of calls) {
      expect(Array.isArray(call.transcript)).toBe(true);
      expect(call.transcript.length).toBeGreaterThan(0);
    }
  });

  it('should have every call record with a valid outcome from InteractionOutcome', () => {
    // WHY: Invalid outcomes would break outcome-based filtering and analytics aggregation.
    const validOutcomes = [
      'hub-enrolled', 'copay-card-issued', 'ae-report-filed', 'adherence-counseling',
      'sample-shipped', 'medical-info-provided', 'hcp-detail-completed',
      'prior-auth-initiated', 'callback-requested', 'follow-up-scheduled',
      'declined', 'no-answer', 'voicemail',
    ];
    for (const call of calls) {
      expect(validOutcomes).toContain(call.outcome);
    }
  });

  it('should have every call record with duration > 0', () => {
    // WHY: Zero-duration calls would skew avg handle time KPIs.
    for (const call of calls) {
      expect(call.duration).toBeGreaterThan(0);
    }
  });

  it('should have every contact with a valid therapeuticArea', () => {
    for (const contact of contacts) {
      expect(['essential-tremor', 'dee']).toContain(contact.therapeuticArea);
    }
  });

  it('should have every contact with a valid drugProduct', () => {
    for (const contact of contacts) {
      expect(['euloxacaltenamide', 'relutrigine']).toContain(contact.drugProduct);
    }
  });

  it('should have therapeuticArea and drugProduct consistently paired on contacts', () => {
    // WHY: ELEX is for essential tremor, Relutrigine is for DEE -- mismatches are data bugs.
    for (const contact of contacts) {
      if (contact.therapeuticArea === 'essential-tremor') {
        expect(contact.drugProduct).toBe('euloxacaltenamide');
      } else if (contact.therapeuticArea === 'dee') {
        expect(contact.drugProduct).toBe('relutrigine');
      }
    }
  });

  it('should have every call record with consistent therapeuticArea-drugProduct pairing', () => {
    for (const call of calls) {
      if (call.therapeuticArea === 'essential-tremor') {
        expect(call.drugProduct).toBe('euloxacaltenamide');
      } else if (call.therapeuticArea === 'dee') {
        expect(call.drugProduct).toBe('relutrigine');
      }
    }
  });

  it('should have every call with a valid ISO 8601 timestamp', () => {
    for (const call of calls) {
      const parsed = new Date(call.timestamp);
      expect(isNaN(parsed.getTime())).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// getPatientOutcomes
// ---------------------------------------------------------------------------
describe('getPatientOutcomes', () => {
  let patients: PatientOutcomeRecord[];

  beforeAll(() => {
    patients = getPatientOutcomes();
  });

  it('returns 437 patients', () => {
    expect(patients).toHaveLength(437);
  });

  it('all patients have baseline TETRAS scores (0-8)', () => {
    for (const p of patients) {
      expect(p.tetrasScores.baseline).toBeDefined();
      expect(p.tetrasScores.baseline).toBeGreaterThanOrEqual(0);
      expect(p.tetrasScores.baseline).toBeLessThanOrEqual(8);
    }
  });

  it('patients who persisted at 90d have 90d scores', () => {
    const persisted = patients.filter(p => p.persistedAt90d);
    for (const p of persisted) {
      expect(p.tetrasScores['90d']).toBeDefined();
    }
  });

  it('patients who dropped out before 90d have no 90d scores', () => {
    const droppedOut = patients.filter(p => !p.persistedAt90d);
    for (const p of droppedOut) {
      expect(p.tetrasScores['90d']).toBeUndefined();
    }
  });

  it('TETRAS scores are integers 0-8', () => {
    for (const p of patients) {
      for (const score of Object.values(p.tetrasScores)) {
        if (score !== undefined) {
          expect(Number.isInteger(score)).toBe(true);
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(8);
        }
      }
    }
  });

  it('seriousAeReported is subset of aeReported', () => {
    for (const p of patients) {
      if (p.seriousAeReported) {
        expect(p.aeReported).toBe(true);
      }
    }
  });

  it('all patients are ET / ELEX', () => {
    for (const p of patients) {
      expect(p.therapeuticArea).toBe('essential-tremor');
      expect(p.drugProduct).toBe('euloxacaltenamide');
    }
  });
});

// ---------------------------------------------------------------------------
// getCohortOutcomeData
// ---------------------------------------------------------------------------
describe('getCohortOutcomeData', () => {
  let cohort: CohortOutcomeData;

  beforeAll(() => {
    cohort = getCohortOutcomeData();
  });

  it('has 4 trajectory timepoints (baseline, 30d, 60d, 90d)', () => {
    expect(cohort.trajectory).toHaveLength(4);
    const timepoints = cohort.trajectory.map(t => t.timepoint);
    expect(timepoints).toContain('baseline');
    expect(timepoints).toContain('30d');
    expect(timepoints).toContain('60d');
    expect(timepoints).toContain('90d');
  });

  it('n decreases over time (persistence)', () => {
    const ns = cohort.trajectory.map(t => t.n);
    for (let i = 1; i < ns.length; i++) {
      expect(ns[i]).toBeLessThanOrEqual(ns[i - 1]);
    }
  });

  it('mean TETRAS score decreases over time (improvement)', () => {
    const means = cohort.trajectory.map(t => t.mean);
    for (let i = 1; i < means.length; i++) {
      expect(means[i]).toBeLessThan(means[i - 1]);
    }
  });

  it('CI band narrows (width at 90d <= width at 30d)', () => {
    const t30 = cohort.trajectory.find(t => t.timepoint === '30d')!;
    const t90 = cohort.trajectory.find(t => t.timepoint === '90d')!;
    const width30 = t30.ci95Upper - t30.ci95Lower;
    const width90 = t90.ci95Upper - t90.ci95Lower;
    expect(width90).toBeLessThanOrEqual(width30);
  });

  it('persistence rates between 0 and 1, decreasing over time', () => {
    const rates = [
      cohort.persistenceRate['30d'],
      cohort.persistenceRate['60d'],
      cohort.persistenceRate['90d'],
    ];
    for (const r of rates) {
      expect(r).toBeGreaterThan(0);
      expect(r).toBeLessThanOrEqual(1);
    }
    expect(rates[1]).toBeLessThanOrEqual(rates[0]);
    expect(rates[2]).toBeLessThanOrEqual(rates[1]);
  });
});

// ---------------------------------------------------------------------------
// getPayerEvidenceCard
// ---------------------------------------------------------------------------
describe('getPayerEvidenceCard', () => {
  let card: PayerEvidenceCard;

  beforeAll(() => {
    card = getPayerEvidenceCard();
  });

  it('cohort size is 437', () => {
    expect(card.cohortSize).toBe(437);
  });

  it('improvement is positive', () => {
    expect(card.meanImprovementPct).toBeGreaterThan(0);
  });

  it('90d score lower than baseline', () => {
    expect(card.mean90dScore).toBeLessThan(card.meanBaselineScore);
  });

  it('CI is tuple of two numbers, lower < upper', () => {
    expect(Array.isArray(card.ci95)).toBe(true);
    expect(card.ci95).toHaveLength(2);
    expect(typeof card.ci95[0]).toBe('number');
    expect(typeof card.ci95[1]).toBe('number');
    expect(card.ci95[0]).toBeLessThan(card.ci95[1]);
  });

  it('rates between 0 and 1', () => {
    expect(card.persistenceRate90d).toBeGreaterThan(0);
    expect(card.persistenceRate90d).toBeLessThanOrEqual(1);
    expect(card.adherenceRate90d).toBeGreaterThan(0);
    expect(card.adherenceRate90d).toBeLessThanOrEqual(1);
    expect(card.aeRate).toBeGreaterThanOrEqual(0);
    expect(card.aeRate).toBeLessThanOrEqual(1);
    expect(card.seriousAeRate).toBeGreaterThanOrEqual(0);
    expect(card.seriousAeRate).toBeLessThanOrEqual(1);
  });

  it('seriousAeRate < aeRate', () => {
    expect(card.seriousAeRate).toBeLessThan(card.aeRate);
  });

  it('headline is non-empty', () => {
    expect(typeof card.headline).toBe('string');
    expect(card.headline.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// ET seed calls TETRAS-LITE screening
// ---------------------------------------------------------------------------
describe('ET seed calls have TETRAS-LITE screening', () => {
  let calls: CallRecord[];

  beforeAll(() => {
    calls = getAllCalls();
  });

  it('at least one ET patient-support call has TETRAS-LITE screening result', () => {
    const etPatientCalls = calls.filter(
      c => c.therapeuticArea === 'essential-tremor' &&
           c.agentType === 'patient-support' &&
           c.screeningResults?.some(s => s.instrumentId === 'TETRAS-LITE')
    );
    expect(etPatientCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('TETRAS-LITE screening results have valid scores (0-8)', () => {
    const tetrasResults = calls.flatMap(c =>
      (c.screeningResults || []).filter(s => s.instrumentId === 'TETRAS-LITE')
    );
    for (const r of tetrasResults) {
      expect(r.totalScore).toBeGreaterThanOrEqual(0);
      expect(r.totalScore).toBeLessThanOrEqual(8);
      expect(r.status).toBe('completed');
    }
  });
});
