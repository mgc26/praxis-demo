import { describe, it, expect } from 'vitest';
import {
  DRUG_PROFILES,
  DRAVET_CONTRAINDICATED_MEDICATIONS,
  SUPPORT_PATHWAYS,
  RISK_TIER_PREFS,
  PHARMA_CONTACT_NETWORK,
} from './support-knowledge.js';
import type { SupportPathway, RiskTier } from '../types/index.js';

// ---------------------------------------------------------------------------
// DRUG_PROFILES
// ---------------------------------------------------------------------------

describe('DRUG_PROFILES', () => {
  // --- Profile existence ---

  it('should define a profile for euloxacaltenamide (ELEX)', () => {
    expect(DRUG_PROFILES).toHaveProperty('euloxacaltenamide');
    expect(DRUG_PROFILES.euloxacaltenamide.brandName).toBe('ELEX');
  });

  it('should define a profile for relutrigine', () => {
    expect(DRUG_PROFILES).toHaveProperty('relutrigine');
    expect(DRUG_PROFILES.relutrigine.genericName).toBe('Relutrigine');
  });

  // --- Mechanism of action ---

  it('should include mechanism of action for both drugs', () => {
    // Mechanism text is the core pharmacological identity of each drug;
    // empty strings would mean the agent has nothing to explain to an HCP.
    expect(DRUG_PROFILES.euloxacaltenamide.mechanismOfAction.length).toBeGreaterThan(0);
    expect(DRUG_PROFILES.relutrigine.mechanismOfAction.length).toBeGreaterThan(0);
  });

  // --- Pivotal trial names ---

  it('should include pivotal trial name STEADY for ELEX', () => {
    // STEADY is the registrational trial name referenced throughout the platform.
    expect(DRUG_PROFILES.euloxacaltenamide.pivotalTrialName).toContain('STEADY');
  });

  it('should include pivotal trial name PROTECT for Relutrigine', () => {
    // PROTECT is the registrational trial name for the Dravet indication.
    expect(DRUG_PROFILES.relutrigine.pivotalTrialName).toContain('PROTECT');
  });

  // --- Primary endpoint results (not placeholder text) ---

  it('should include specific primary endpoint results for ELEX', () => {
    // A real result has a numeric delta and a p-value — not a generic placeholder.
    const result = DRUG_PROFILES.euloxacaltenamide.primaryResult;
    expect(result).toMatch(/\d/); // contains at least one digit
    expect(result).toMatch(/p\s*[<>=]/i); // contains a p-value expression
  });

  it('should include specific primary endpoint results for Relutrigine', () => {
    const result = DRUG_PROFILES.relutrigine.primaryResult;
    expect(result).toMatch(/\d/);
    expect(result).toMatch(/p\s*[<>=]/i);
  });

  // --- NNT ---

  it('should include NNT for ELEX', () => {
    // NNT is used to communicate treatment benefit to HCPs.
    expect(DRUG_PROFILES.euloxacaltenamide.nnt).toBeTruthy();
    expect(Number(DRUG_PROFILES.euloxacaltenamide.nnt)).toBeGreaterThan(0);
  });

  it('should include NNT for Relutrigine', () => {
    expect(DRUG_PROFILES.relutrigine.nnt).toBeTruthy();
    expect(Number(DRUG_PROFILES.relutrigine.nnt)).toBeGreaterThan(0);
  });

  // --- Common AEs ---

  it('should include at least 3 common AEs with incidence rates for ELEX', () => {
    // AE profiles are essential for agent safety conversations. Each entry
    // must have both an event name and a numeric incidence so the agent can
    // quote rates accurately.
    const aes = DRUG_PROFILES.euloxacaltenamide.commonAEs;
    expect(aes.length).toBeGreaterThanOrEqual(3);
    for (const ae of aes) {
      expect(ae.event.length).toBeGreaterThan(0);
      expect(ae.incidence).toMatch(/%/); // incidence rate contains a percentage
    }
  });

  it('should include at least 3 common AEs with incidence rates for Relutrigine', () => {
    const aes = DRUG_PROFILES.relutrigine.commonAEs;
    expect(aes.length).toBeGreaterThanOrEqual(3);
    for (const ae of aes) {
      expect(ae.event.length).toBeGreaterThan(0);
      expect(ae.incidence).toMatch(/%/);
    }
  });

  // --- Dosing information ---

  it('should include dosing information (starting, maintenance, max) for ELEX', () => {
    const profile = DRUG_PROFILES.euloxacaltenamide;
    expect(profile.startingDose.length).toBeGreaterThan(0);
    expect(profile.maintenanceDose.length).toBeGreaterThan(0);
    expect(profile.maxDose.length).toBeGreaterThan(0);
  });

  it('should include dosing information (starting, maintenance, max) for Relutrigine', () => {
    const profile = DRUG_PROFILES.relutrigine;
    expect(profile.startingDose.length).toBeGreaterThan(0);
    expect(profile.maintenanceDose.length).toBeGreaterThan(0);
    expect(profile.maxDose.length).toBeGreaterThan(0);
  });

  // --- Renal and hepatic adjustments ---

  it('should include renal and hepatic adjustment guidance for ELEX', () => {
    // Dose adjustments in organ impairment are safety-critical; the agent
    // must have non-empty guidance text for both.
    expect(DRUG_PROFILES.euloxacaltenamide.renalAdjustment.length).toBeGreaterThan(0);
    expect(DRUG_PROFILES.euloxacaltenamide.hepaticAdjustment.length).toBeGreaterThan(0);
  });

  it('should include renal and hepatic adjustment guidance for Relutrigine', () => {
    expect(DRUG_PROFILES.relutrigine.renalAdjustment.length).toBeGreaterThan(0);
    expect(DRUG_PROFILES.relutrigine.hepaticAdjustment.length).toBeGreaterThan(0);
  });

  // --- Contraindications ---

  it('should include contraindications for ELEX', () => {
    expect(DRUG_PROFILES.euloxacaltenamide.contraindications.length).toBeGreaterThan(0);
  });

  it('should include contraindications for Relutrigine', () => {
    expect(DRUG_PROFILES.relutrigine.contraindications.length).toBeGreaterThan(0);
  });

  // --- ELEX should NOT be contraindicated in Dravet ---

  it('should NOT list Dravet as a contraindication for ELEX', () => {
    // ELEX is indicated for essential tremor. Confirming no Dravet
    // contraindication ensures the data is not cross-contaminated between
    // the two therapeutic area profiles.
    const contraText = DRUG_PROFILES.euloxacaltenamide.contraindications.join(' ').toLowerCase();
    expect(contraText).not.toContain('dravet');
  });

  // --- Relutrigine Nav1.1 / SCN1A mechanism distinction ---

  it('should mention Nav1.1 or SCN1A mechanism distinction for Relutrigine', () => {
    // The central safety narrative for Relutrigine is that it avoids Nav1.1
    // blockade. This distinction must be present in the mechanism text.
    const moa = DRUG_PROFILES.relutrigine.mechanismOfAction;
    expect(moa).toMatch(/Nav1\.1|SCN1A/i);
  });

  // --- Relutrigine mentions traditional SCBs contraindication in Dravet ---

  it('should mention that traditional SCBs are contraindicated in Dravet for Relutrigine', () => {
    // The mechanism text or contraindications must call out that traditional
    // sodium channel blockers are harmful in Dravet — this is the #1 safety
    // message for the Dravet franchise.
    const combined =
      DRUG_PROFILES.relutrigine.mechanismOfAction +
      ' ' +
      DRUG_PROFILES.relutrigine.contraindications.join(' ');
    const lower = combined.toLowerCase();
    expect(lower).toContain('contraindicated');
    expect(lower).toMatch(/sodium channel/i);
  });

  // --- Specialty pharmacy required ---

  it('should mark both drugs as requiring specialty pharmacy', () => {
    expect(DRUG_PROFILES.euloxacaltenamide.specialtyPharmacyRequired).toBe(true);
    expect(DRUG_PROFILES.relutrigine.specialtyPharmacyRequired).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// DRAVET_CONTRAINDICATED_MEDICATIONS
// ---------------------------------------------------------------------------

describe('DRAVET_CONTRAINDICATED_MEDICATIONS', () => {
  it('should include carbamazepine', () => {
    const match = DRAVET_CONTRAINDICATED_MEDICATIONS.find((m) =>
      m.drug.toLowerCase().includes('carbamazepine'),
    );
    expect(match).toBeDefined();
  });

  it('should include oxcarbazepine', () => {
    const match = DRAVET_CONTRAINDICATED_MEDICATIONS.find((m) =>
      m.drug.toLowerCase().includes('oxcarbazepine'),
    );
    expect(match).toBeDefined();
  });

  it('should include phenytoin', () => {
    const match = DRAVET_CONTRAINDICATED_MEDICATIONS.find((m) =>
      m.drug.toLowerCase().includes('phenytoin'),
    );
    expect(match).toBeDefined();
  });

  it('should include lamotrigine', () => {
    const match = DRAVET_CONTRAINDICATED_MEDICATIONS.find((m) =>
      m.drug.toLowerCase().includes('lamotrigine'),
    );
    expect(match).toBeDefined();
  });

  it('should include at least 4 entries', () => {
    // Four is the clinically-recognized minimum set of traditional SCBs
    // contraindicated in Dravet; having fewer would be an incomplete safety list.
    expect(DRAVET_CONTRAINDICATED_MEDICATIONS.length).toBeGreaterThanOrEqual(4);
  });

  it('should have a drug name and reason for each entry', () => {
    for (const entry of DRAVET_CONTRAINDICATED_MEDICATIONS) {
      expect(entry.drug.length).toBeGreaterThan(0);
      expect(entry.reason.length).toBeGreaterThan(0);
    }
  });

  it('should reference Nav1.1 or SCN1A or sodium channel mechanism in each reason', () => {
    // Every contraindicated drug in Dravet is harmful because of sodium
    // channel / Nav1.1 / SCN1A pathophysiology. The reason text must explain
    // this so the agent can articulate WHY the drug is contraindicated.
    for (const entry of DRAVET_CONTRAINDICATED_MEDICATIONS) {
      expect(entry.reason).toMatch(/Nav1\.1|SCN1A|sodium channel/i);
    }
  });
});

// ---------------------------------------------------------------------------
// SUPPORT_PATHWAYS
// ---------------------------------------------------------------------------

const ALL_PATHWAY_IDS: SupportPathway[] = [
  'medication-access',
  'safety-reporting',
  'clinical-education',
  'patient-education',
  'adherence-support',
  'crisis-support',
];

describe('SUPPORT_PATHWAYS', () => {
  it('should define all 6 pathways', () => {
    for (const id of ALL_PATHWAY_IDS) {
      expect(SUPPORT_PATHWAYS).toHaveProperty(id);
    }
    expect(Object.keys(SUPPORT_PATHWAYS)).toHaveLength(6);
  });

  it('should have non-empty name, description, and key talking points for each pathway', () => {
    for (const id of ALL_PATHWAY_IDS) {
      const pathway = SUPPORT_PATHWAYS[id];
      expect(pathway.name.length).toBeGreaterThan(0);
      expect(pathway.description.length).toBeGreaterThan(0);
      expect(pathway.keyTalkingPoints.length).toBeGreaterThan(0);
      for (const tp of pathway.keyTalkingPoints) {
        expect(tp.length).toBeGreaterThan(0);
      }
    }
  });

  it('should have at least 2 escalation criteria for each pathway', () => {
    // Each pathway needs multiple escalation triggers so the agent can
    // distinguish routine from escalation-worthy situations.
    for (const id of ALL_PATHWAY_IDS) {
      expect(SUPPORT_PATHWAYS[id].escalationCriteria.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('should reference specialty pharmacy in the medication-access pathway', () => {
    // Both products require specialty pharmacy dispensing, so this pathway
    // must surface that resource explicitly.
    const pathway = SUPPORT_PATHWAYS['medication-access'];
    const combined = [
      pathway.description,
      ...pathway.keyTalkingPoints,
      ...pathway.suggestedResources,
    ]
      .join(' ')
      .toLowerCase();
    expect(combined).toContain('specialty pharmacy');
  });

  it('should have urgencyLevel "urgent" for the safety-reporting pathway', () => {
    // AE reporting is always urgent — pharmacovigilance requirements mandate
    // rapid escalation timelines.
    expect(SUPPORT_PATHWAYS['safety-reporting'].urgencyLevel).toBe('urgent');
  });

  it('should reference the 988 Lifeline in the crisis-support pathway', () => {
    // The 988 Suicide and Crisis Lifeline is the standard US resource for
    // suicidal ideation and must appear in crisis-support talking points.
    const combined = SUPPORT_PATHWAYS['crisis-support'].keyTalkingPoints.join(' ');
    expect(combined).toMatch(/988/);
  });

  it('should mention abrupt discontinuation risk for anti-epileptic drugs in the adherence-support pathway', () => {
    // Abrupt discontinuation of AEDs carries seizure/status epilepticus risk.
    // This is the highest-stakes adherence concern and must be in the talking
    // points to prevent the agent from omitting it.
    const combined = SUPPORT_PATHWAYS['adherence-support'].keyTalkingPoints.join(' ').toLowerCase();
    expect(combined).toContain('abrupt discontinuation');
  });
});

// ---------------------------------------------------------------------------
// RISK_TIER_PREFS
// ---------------------------------------------------------------------------

describe('RISK_TIER_PREFS', () => {
  it('should give the HIGH tier the most call attempts', () => {
    expect(RISK_TIER_PREFS.HIGH.maxCallAttempts).toBeGreaterThan(
      RISK_TIER_PREFS.MEDIUM.maxCallAttempts,
    );
    expect(RISK_TIER_PREFS.HIGH.maxCallAttempts).toBeGreaterThan(
      RISK_TIER_PREFS.LOW.maxCallAttempts,
    );
  });

  it('should give the LOW tier the fewest call attempts', () => {
    expect(RISK_TIER_PREFS.LOW.maxCallAttempts).toBeLessThan(
      RISK_TIER_PREFS.MEDIUM.maxCallAttempts,
    );
    expect(RISK_TIER_PREFS.LOW.maxCallAttempts).toBeLessThan(
      RISK_TIER_PREFS.HIGH.maxCallAttempts,
    );
  });

  it('should escalate to nurse on no answer for the HIGH tier', () => {
    // HIGH-risk patients who don't answer need nurse follow-up because
    // non-engagement may signal clinical deterioration or access barriers.
    expect(RISK_TIER_PREFS.HIGH.escalateToNurseOnNoAnswer).toBe(true);
  });

  it('should have sms enabled for all tiers', () => {
    const tiers: RiskTier[] = ['HIGH', 'MEDIUM', 'LOW'];
    for (const tier of tiers) {
      expect(RISK_TIER_PREFS[tier].smsEnabled).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// PHARMA_CONTACT_NETWORK
// ---------------------------------------------------------------------------

describe('PHARMA_CONTACT_NETWORK', () => {
  // Helper: flatten all resources across categories
  const allResources = () => PHARMA_CONTACT_NETWORK.flatMap((cat) => cat.resources);

  it('should include Drug Safety / Pharmacovigilance with 24/7 availability', () => {
    // PV must be reachable around the clock for regulatory AE reporting timelines.
    const pvResource = allResources().find(
      (r) => r.type === 'Pharmacovigilance' || r.name.toLowerCase().includes('pharmacovigilance'),
    );
    expect(pvResource).toBeDefined();
    expect(pvResource!.availability).toMatch(/24\/7/i);
  });

  it('should include at least one specialty pharmacy', () => {
    const spCategory = PHARMA_CONTACT_NETWORK.find((cat) =>
      cat.category.toLowerCase().includes('specialty pharmacy'),
    );
    expect(spCategory).toBeDefined();
    expect(spCategory!.resources.length).toBeGreaterThanOrEqual(1);
  });

  it('should include at least one nurse educator', () => {
    const nurseCategory = PHARMA_CONTACT_NETWORK.find((cat) =>
      cat.category.toLowerCase().includes('nurse'),
    );
    expect(nurseCategory).toBeDefined();
    expect(nurseCategory!.resources.length).toBeGreaterThanOrEqual(1);
  });

  it('should include at least one MSL', () => {
    const mslCategory = PHARMA_CONTACT_NETWORK.find((cat) =>
      cat.category.toLowerCase().includes('medical science liaison'),
    );
    expect(mslCategory).toBeDefined();
    expect(mslCategory!.resources.length).toBeGreaterThanOrEqual(1);
  });
});
