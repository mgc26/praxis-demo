import { describe, it, expect } from 'vitest';
import {
  SMS_TEMPLATE_TYPES,
  isSMSTemplateType,
  getSMSTemplate,
} from './sms-templates.js';
import type { SMSTemplateType, SMSTemplateData } from './sms-templates.js';

const ALL_TEMPLATE_TYPES: SMSTemplateType[] = [
  'copay_card_info',
  'hub_enrollment_confirmation',
  'refill_reminder',
  'ae_followup',
  'hcp_clinical_data',
  'speaker_program_invite',
  'nurse_educator_scheduling',
  'general_followup',
  'welcome',
];

function makeTemplateData(overrides: Partial<SMSTemplateData> = {}): SMSTemplateData {
  return {
    contactName: 'Jane Doe',
    therapeuticArea: 'Essential Tremor',
    drugName: 'Euloxacaltenamide (ELEX)',
    agentType: 'patient-support',
    ...overrides,
  };
}

describe('sms-templates', () => {
  describe('SMS_TEMPLATE_TYPES', () => {
    it('defines all 9 template types', () => {
      expect(SMS_TEMPLATE_TYPES).toHaveLength(9);
    });

    it('includes every expected template type', () => {
      for (const type of ALL_TEMPLATE_TYPES) {
        expect(SMS_TEMPLATE_TYPES).toContain(type);
      }
    });
  });

  describe('isSMSTemplateType', () => {
    it('returns true for every valid template type', () => {
      for (const type of ALL_TEMPLATE_TYPES) {
        expect(isSMSTemplateType(type)).toBe(true);
      }
    });

    it('returns false for invalid template types', () => {
      expect(isSMSTemplateType('nonexistent_template')).toBe(false);
      expect(isSMSTemplateType('')).toBe(false);
      expect(isSMSTemplateType('copay_card')).toBe(false);
    });
  });

  describe('getSMSTemplate', () => {
    it('returns non-empty string for each valid template type', () => {
      for (const type of ALL_TEMPLATE_TYPES) {
        const result = getSMSTemplate(type, makeTemplateData());
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      }
    });

    it('throws for unknown template type', () => {
      expect(() =>
        getSMSTemplate('totally_fake_template', makeTemplateData()),
      ).toThrowError('Unknown SMS template type: totally_fake_template');
    });

    describe('contact name inclusion', () => {
      it('copay_card_info includes contact name', () => {
        const result = getSMSTemplate('copay_card_info', makeTemplateData({ contactName: 'Alice' }));
        expect(result).toContain('Alice');
      });

      it('hub_enrollment_confirmation includes contact name', () => {
        const result = getSMSTemplate('hub_enrollment_confirmation', makeTemplateData({ contactName: 'Bob' }));
        expect(result).toContain('Bob');
      });

      it('refill_reminder includes contact name', () => {
        const result = getSMSTemplate('refill_reminder', makeTemplateData({ contactName: 'Charlie' }));
        expect(result).toContain('Charlie');
      });

      it('ae_followup includes contact name', () => {
        const result = getSMSTemplate('ae_followup', makeTemplateData({ contactName: 'Diana' }));
        expect(result).toContain('Diana');
      });

      it('nurse_educator_scheduling includes contact name', () => {
        const result = getSMSTemplate('nurse_educator_scheduling', makeTemplateData({ contactName: 'Eve' }));
        expect(result).toContain('Eve');
      });

      it('general_followup includes contact name', () => {
        const result = getSMSTemplate('general_followup', makeTemplateData({ contactName: 'Frank' }));
        expect(result).toContain('Frank');
      });

      it('welcome includes contact name', () => {
        const result = getSMSTemplate('welcome', makeTemplateData({ contactName: 'Grace' }));
        expect(result).toContain('Grace');
      });
    });

    describe('drug name inclusion', () => {
      it('copay_card_info includes drug name when provided', () => {
        const result = getSMSTemplate('copay_card_info', makeTemplateData({ drugName: 'TestDrug' }));
        expect(result).toContain('TestDrug');
      });

      it('hub_enrollment_confirmation includes drug name when provided', () => {
        const result = getSMSTemplate('hub_enrollment_confirmation', makeTemplateData({ drugName: 'TestDrug' }));
        expect(result).toContain('TestDrug');
      });

      it('refill_reminder includes drug name when provided', () => {
        const result = getSMSTemplate('refill_reminder', makeTemplateData({ drugName: 'TestDrug' }));
        expect(result).toContain('TestDrug');
      });

      it('ae_followup includes drug name when provided', () => {
        const result = getSMSTemplate('ae_followup', makeTemplateData({ drugName: 'TestDrug' }));
        expect(result).toContain('TestDrug');
      });

      it('welcome includes drug name when provided', () => {
        const result = getSMSTemplate('welcome', makeTemplateData({ drugName: 'TestDrug' }));
        expect(result).toContain('TestDrug');
      });
    });

    describe('signature behavior', () => {
      it('patient-support templates use Emma signature', () => {
        const result = getSMSTemplate('general_followup', makeTemplateData({ agentType: 'patient-support' }));
        expect(result).toContain('Emma, Praxis Patient Support');
      });

      it('hcp-support templates use Medical Information signature', () => {
        const result = getSMSTemplate('general_followup', makeTemplateData({ agentType: 'hcp-support' }));
        expect(result).toContain('Praxis Medical Information');
      });

      it('hcp-outbound templates use Medical Information signature', () => {
        const result = getSMSTemplate('general_followup', makeTemplateData({ agentType: 'hcp-outbound' }));
        expect(result).toContain('Praxis Medical Information');
      });

      it('medcomms-qa templates use Medical Information signature', () => {
        const result = getSMSTemplate('general_followup', makeTemplateData({ agentType: 'medcomms-qa' }));
        expect(result).toContain('Praxis Medical Information');
      });
    });

    describe('template-specific content', () => {
      it('copay_card_info mentions copay card activation', () => {
        const result = getSMSTemplate('copay_card_info', makeTemplateData());
        expect(result).toContain('copay card');
      });

      it('copay_card_info includes copayCardId when provided', () => {
        const result = getSMSTemplate('copay_card_info', makeTemplateData({ copayCardId: 'CC-12345' }));
        expect(result).toContain('CC-12345');
      });

      it('hub_enrollment_confirmation mentions hub enrollment', () => {
        const result = getSMSTemplate('hub_enrollment_confirmation', makeTemplateData());
        expect(result).toContain('enrolled');
      });

      it('ae_followup mentions safety', () => {
        const result = getSMSTemplate('ae_followup', makeTemplateData());
        expect(result).toContain('safety');
      });

      it('hcp_clinical_data mentions prescribing information', () => {
        const result = getSMSTemplate('hcp_clinical_data', makeTemplateData());
        expect(result).toContain('prescribing information');
      });

      it('speaker_program_invite mentions speaker program', () => {
        const result = getSMSTemplate('speaker_program_invite', makeTemplateData());
        expect(result).toContain('speaker program');
      });

      it('nurse_educator_scheduling mentions nurse educator', () => {
        const result = getSMSTemplate('nurse_educator_scheduling', makeTemplateData());
        expect(result).toContain('nurse educator');
      });

      it('welcome mentions reaching out', () => {
        const result = getSMSTemplate('welcome', makeTemplateData());
        expect(result).toContain('reach you today');
      });
    });
  });
});
