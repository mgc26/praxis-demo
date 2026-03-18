import { describe, it, expect, beforeAll } from 'vitest';
import {
  getAllCalls,
  getCallById,
  getFilteredCalls,
  getContactQueue,
  getAnalytics,
  buildSignalFeed,
} from './seed-data';
import type { AgentType, CallRecord, ContactRecord } from './types';

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
        (c as Record<string, unknown>).agentType,
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
