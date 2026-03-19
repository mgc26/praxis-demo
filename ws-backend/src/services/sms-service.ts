// ---------------------------------------------------------------------------
// Vi Praxis BioSciences — SMS Service
// Resolves the correct SMS template for a given call outcome and delivers
// via Twilio.
// ---------------------------------------------------------------------------
//
// PRODUCTION REQUIREMENT: A2P 10DLC Registration
// Before sending production SMS in the US, register for A2P 10DLC:
// 1. Register brand with The Campaign Registry (TCR)
// 2. Register campaign (use case: healthcare/pharma patient support)
// 3. Associate phone number with campaign
// Without registration: carrier filtering, higher fees, lower throughput
//
// OPT-OUT HANDLING (TCPA compliance):
// Must handle STOP, HELP, and other standard keywords.
// Twilio handles this automatically for long codes if Twilio-hosted number
// is configured with Advanced Opt-Out. Verify this is enabled.
//
// ---------------------------------------------------------------------------

import type { ContactRecord, OutcomeType } from '../types/index.js';
import { getOutcomeDefinition } from '../config/outcomes.js';
import {
  getSMSTemplate,
  isSMSTemplateType,
  type SMSTemplateType,
} from '../prompts/sms-templates.js';
import { twilioService } from './twilio-service.js';
import { getBrandConfig, type BrandBackendConfig } from '../brands/index.js';

function maskPhone(phone: string): string {
  if (phone.length <= 4) return '****';
  return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4);
}

// ---------------------------------------------------------------------------
// SMS Segment Calculator
// GSM-7 encoding: 160 chars/single segment, 153 chars/concatenated segment
// UCS-2 encoding: 70 chars/single segment, 67 chars/concatenated segment
// Messages billed per segment — multi-segment SMS is more expensive.
// ---------------------------------------------------------------------------

// GSM-7 basic character set (plus @ and space, etc.)
const GSM7_BASIC_CHARS = new Set(
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
  'ÄÖÑÜabcdefghijklmnopqrstuvwxyzäöñüà§',
);

// GSM-7 extended characters (count as 2 chars each)
const GSM7_EXTENDED_CHARS = new Set('|^€{}[]~\\');

function isGSM7(text: string): boolean {
  for (const char of text) {
    if (!GSM7_BASIC_CHARS.has(char) && !GSM7_EXTENDED_CHARS.has(char)) {
      return false;
    }
  }
  return true;
}

function gsm7Length(text: string): number {
  let length = 0;
  for (const char of text) {
    length += GSM7_EXTENDED_CHARS.has(char) ? 2 : 1;
  }
  return length;
}

export interface SMSSegmentInfo {
  encoding: 'GSM-7' | 'UCS-2';
  charCount: number;
  segmentCount: number;
}

export function calculateSMSSegments(body: string): SMSSegmentInfo {
  if (isGSM7(body)) {
    const charCount = gsm7Length(body);
    const segmentCount = charCount <= 160 ? 1 : Math.ceil(charCount / 153);
    return { encoding: 'GSM-7', charCount, segmentCount };
  }
  const charCount = body.length;
  const segmentCount = charCount <= 70 ? 1 : Math.ceil(charCount / 67);
  return { encoding: 'UCS-2', charCount, segmentCount };
}

const SMS_SEGMENT_WARN_THRESHOLD = 3;

function logSegmentWarning(body: string, context: string): void {
  const info = calculateSMSSegments(body);
  if (info.segmentCount > SMS_SEGMENT_WARN_THRESHOLD) {
    console.warn(
      `[SMSService] ${context}: message will be split into ${info.segmentCount} segments ` +
      `(${info.charCount} chars, ${info.encoding}). Multi-segment SMS is more expensive and less reliable.`,
    );
  }
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
  brandConfig?: BrandBackendConfig,
): Promise<SMSDeliveryResult> {
  const cfg = brandConfig ?? getBrandConfig();
  const message = getSMSTemplate(template, {
    contactName: contact.name,
    contactType: contact.contactType,
    therapeuticArea: contact.therapeuticArea,
    drugName: overrides?.drugName || contact.currentDrug,
    hubProgram: overrides?.hubProgram,
    nurseEducatorDate: overrides?.nurseEducatorDate,
    clinicalDataType: overrides?.clinicalDataType,
  }, cfg);

  // Warn if the message will be split into many segments (cost/reliability concern)
  logSegmentWarning(message, `template=${template}, contact=${contact.contactId}`);

  // Build SMS status callback URL if configured
  const smsStatusCallback = process.env.TWILIO_WEBHOOK_URL
    ? `${process.env.TWILIO_WEBHOOK_URL.replace(/\/+$/, '')}/api/sms/status`
    : undefined;

  try {
    try {
      await twilioService.sendSMS(contact.phone, message, smsStatusCallback);
    } catch (firstErr) {
      console.warn('[SMSService] SMS send failed, retrying in 2s:', (firstErr as Error).message);
      await new Promise(resolve => setTimeout(resolve, 2000));
      try {
        await twilioService.sendSMS(contact.phone, message, smsStatusCallback);
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
  brandConfig?: BrandBackendConfig,
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

  return sendTemplatedSMS(contact, template, undefined, brandConfig);
}

export async function sendPostCallSMS(
  contact: ContactRecord,
  options: {
    requestedTemplate?: SMSTemplateType | null;
    outcome?: OutcomeType | null;
    drugName?: string;
    hubProgram?: string;
  },
  brandConfig?: BrandBackendConfig,
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
  }, brandConfig);
}
