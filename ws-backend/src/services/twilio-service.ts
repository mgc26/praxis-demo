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

  async initiateCall(contact: ContactRecord): Promise<string> {
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

    const call = await client.calls.create({
      to: contact.phone,
      from: this.phoneNumber,
      url: `${webhookUrl}?contactId=${encodeURIComponent(contact.contactId)}`,
      statusCallback: statusCallbackUrl,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      // No machineDetection — eliminates 3-7 sec AMD delay on pickup.
      // Voicemail detection handled by the Deepgram agent via prompt instructions.
    });

    return call.sid;
  }

  async endCall(callSid: string): Promise<void> {
    const client = this.ensureClient();
    await client.calls(callSid).update({ status: 'completed' });
  }

  async sendSMS(to: string, body: string): Promise<void> {
    if (!to || !/^\+?[1-9]\d{1,14}$/.test(to)) {
      throw new Error(`Invalid phone number format: ${to}`);
    }

    const client = this.ensureClient();
    await client.messages.create({
      to,
      from: this.phoneNumber,
      body,
    });
  }
}

export const twilioService = new TwilioService();
