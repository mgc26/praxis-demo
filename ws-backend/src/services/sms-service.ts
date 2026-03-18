// ---------------------------------------------------------------------------
// Vi Praxis BioSciences — SMS Service
// Resolves the correct SMS template for a given call outcome and delivers
// via Twilio.
// ---------------------------------------------------------------------------

import type { ContactRecord, OutcomeType } from '../types/index.js';
import { getOutcomeDefinition } from '../config/outcomes.js';
import {
  getSMSTemplate,
  isSMSTemplateType,
  type SMSTemplateType,
} from '../prompts/sms-templates.js';
import { twilioService } from './twilio-service.js';

function maskPhone(phone: string): string {
  if (phone.length <= 4) return '****';
  return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4);
}

export interface SMSDeliveryResult {
  sent: boolean;
  template: SMSTemplateType | null;
  reason: 'sent' | 'no-template' | 'send-failed';
  errorMessage?: string;
}

function resolveOutcomeTemplate(outcome: OutcomeType): SMSTemplateType | null {
  const outcomeDef = getOutcomeDefinition(outcome);

  if (!outcomeDef.smsTemplate) {
    return null;
  }

  if (!isSMSTemplateType(outcomeDef.smsTemplate)) {
    console.error(
      `[SMSService] Unknown SMS template "${outcomeDef.smsTemplate}" for outcome "${outcome}"`,
    );
    return null;
  }

  return outcomeDef.smsTemplate as SMSTemplateType;
}

export function resolveRequestedSMSTemplate(
  args: Record<string, unknown>,
): SMSTemplateType | null {
  const rawTemplate = args.template ?? args.message_type;
  if (typeof rawTemplate !== 'string' || !isSMSTemplateType(rawTemplate)) {
    return null;
  }
  return rawTemplate;
}

export async function sendTemplatedSMS(
  contact: ContactRecord,
  template: SMSTemplateType,
  overrides?: {
    drugName?: string;
    hubProgram?: string;
    nurseEducatorDate?: string;
    clinicalDataType?: string;
  },
): Promise<SMSDeliveryResult> {
  const message = getSMSTemplate(template, {
    contactName: contact.name,
    contactType: contact.contactType,
    therapeuticArea: contact.therapeuticArea,
    drugName: overrides?.drugName || contact.currentDrug,
    hubProgram: overrides?.hubProgram,
    nurseEducatorDate: overrides?.nurseEducatorDate,
    clinicalDataType: overrides?.clinicalDataType,
  });

  try {
    try {
      await twilioService.sendSMS(contact.phone, message);
    } catch (firstErr) {
      console.warn('[SMSService] SMS send failed, retrying in 2s:', (firstErr as Error).message);
      await new Promise(resolve => setTimeout(resolve, 2000));
      try {
        await twilioService.sendSMS(contact.phone, message);
      } catch (retryErr) {
        // If retry also fails, throw the original error
        throw firstErr;
      }
    }
    console.log(
      `[SMSService] Follow-up SMS sent to ${maskPhone(contact.phone)} (template: ${template}, contact: ${contact.contactId})`,
    );
    return {
      sent: true,
      template,
      reason: 'sent',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[SMSService] Failed to send follow-up SMS:', errorMessage);
    return {
      sent: false,
      template,
      reason: 'send-failed',
      errorMessage,
    };
  }
}

export async function sendFollowUpSMS(
  contact: ContactRecord,
  outcome: OutcomeType,
): Promise<SMSDeliveryResult> {
  const template = resolveOutcomeTemplate(outcome);
  if (!template) {
    console.log(
      `[SMSService] No SMS template defined for outcome "${outcome}" — skipping`,
    );
    return {
      sent: false,
      template: null,
      reason: 'no-template',
    };
  }

  return sendTemplatedSMS(contact, template);
}

export async function sendPostCallSMS(
  contact: ContactRecord,
  options: {
    requestedTemplate?: SMSTemplateType | null;
    outcome?: OutcomeType | null;
    drugName?: string;
    hubProgram?: string;
  },
): Promise<SMSDeliveryResult> {
  const template = options.requestedTemplate
    ?? (options.outcome ? resolveOutcomeTemplate(options.outcome) : null);

  if (!template) {
    console.log(
      `[SMSService] No SMS template available for contact ${contact.contactId} — skipping`,
    );
    return {
      sent: false,
      template: null,
      reason: 'no-template',
    };
  }

  return sendTemplatedSMS(contact, template, {
    drugName: options.drugName,
    hubProgram: options.hubProgram,
  });
}
