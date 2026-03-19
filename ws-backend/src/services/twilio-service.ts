// ---------------------------------------------------------------------------
// Vi Praxis BioSciences — Twilio Service
// Wraps the Twilio SDK for outbound calls and SMS.
// ---------------------------------------------------------------------------

import twilio from 'twilio';
import type { ContactRecord } from '../types/index.js';

class TwilioService {
  private client: ReturnType<typeof twilio> | null = null;
  private phoneNumber: string = '';

  private ensureClient(): ReturnType<typeof twilio> {
    if (this.client) return this.client;
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER || '';
    if (!accountSid || !authToken) {
      throw new Error(
        'TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables are required',
      );
    }
    this.client = twilio(accountSid, authToken);
    return this.client;
  }

  async initiateCall(contact: ContactRecord, options?: { brandId?: string }): Promise<string> {
    const client = this.ensureClient();

    if (!contact.phone || !/^\+?[1-9]\d{1,14}$/.test(contact.phone)) {
      throw new Error(`Invalid phone number format: ${contact.phone}`);
    }

    const webhookUrl = process.env.TWILIO_WEBHOOK_URL;
    if (!webhookUrl) {
      throw new Error('TWILIO_WEBHOOK_URL environment variable is required');
    }

    const baseUrl = new URL(webhookUrl);
    baseUrl.pathname = baseUrl.pathname.replace(/\/voice$/, '/status');
    const statusCallbackUrl = baseUrl.toString();

    // Build the fallback URL — serves a simple TwiML apology if the primary
    // voice webhook is unreachable, preventing silent call failures.
    const fallbackBase = new URL(webhookUrl);
    fallbackBase.pathname = fallbackBase.pathname.replace(/\/voice$/, '/voice/fallback');
    const fallbackUrl = fallbackBase.toString();

    // Build call creation parameters
    const createParams = {
      to: contact.phone,
      from: this.phoneNumber,
      url: `${webhookUrl}?contactId=${encodeURIComponent(contact.contactId)}&brandId=${encodeURIComponent(options?.brandId || 'praxis')}`,
      statusCallback: statusCallbackUrl,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'] as string[],
      fallbackUrl,
      // AMD fields — conditionally populated below
      machineDetection: undefined as string | undefined,
      asyncAmd: undefined as string | undefined,
      asyncAmdStatusCallback: undefined as string | undefined,
      asyncAmdStatusCallbackMethod: undefined as string | undefined,
    };

    // Async AMD: zero-latency call connect with background machine detection.
    // Enable via TWILIO_ASYNC_AMD=true environment variable.
    // When enabled, the call connects immediately while Twilio runs AMD in the
    // background. The result is delivered to asyncAmdStatusCallback.
    if (process.env.TWILIO_ASYNC_AMD === 'true') {
      const amdCallbackBase = new URL(webhookUrl);
      amdCallbackBase.pathname = amdCallbackBase.pathname.replace(/\/voice$/, '/status/amd');
      createParams.machineDetection = 'Enable';
      createParams.asyncAmd = 'true';
      createParams.asyncAmdStatusCallback = amdCallbackBase.toString();
      createParams.asyncAmdStatusCallbackMethod = 'POST';
    }
    // Default: No machineDetection — eliminates 3-7 sec AMD delay on pickup.
    // Voicemail detection handled by the Deepgram agent via prompt instructions.

    const call = await client.calls.create(createParams);

    return call.sid;
  }

  async endCall(callSid: string): Promise<void> {
    const client = this.ensureClient();
    await client.calls(callSid).update({ status: 'completed' });
  }

  async sendSMS(to: string, body: string, statusCallback?: string): Promise<void> {
    if (!to || !/^\+?[1-9]\d{1,14}$/.test(to)) {
      throw new Error(`Invalid phone number format: ${to}`);
    }

    const client = this.ensureClient();
    const createParams: {
      to: string;
      from: string;
      body: string;
      statusCallback?: string;
    } = {
      to,
      from: this.phoneNumber,
      body,
    };

    // Add SMS delivery status callback if a URL was provided
    if (statusCallback) {
      createParams.statusCallback = statusCallback;
    }

    await client.messages.create(createParams);
  }
}

export const twilioService = new TwilioService();
