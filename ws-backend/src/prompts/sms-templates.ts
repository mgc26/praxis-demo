// ---------------------------------------------------------------------------
// Vi Praxis BioSciences — SMS Templates
// ---------------------------------------------------------------------------

export const SMS_TEMPLATE_TYPES = [
  'copay_card_info',
  'hub_enrollment_confirmation',
  'refill_reminder',
  'ae_followup',
  'hcp_clinical_data',
  'speaker_program_invite',
  'nurse_educator_scheduling',
  'general_followup',
  'welcome',
] as const;

export type SMSTemplateType = (typeof SMS_TEMPLATE_TYPES)[number];

export interface SMSTemplateData {
  contactName: string;
  therapeuticArea?: string;
  drugName?: string;
  specialtyPharmacy?: string;
  copayCardId?: string;
  hubPhone?: string;
  nurseEducatorDate?: string;
  nurseEducatorTopic?: string;
  speakerProgramDate?: string;
  speakerProgramLocation?: string;
  speakerProgramSpeaker?: string;
  clinicalDataTopic?: string;
  clinicalDataUrl?: string;
  prescribingHcp?: string;
  hubProgram?: string;
  clinicalDataType?: string;
  contactType?: 'patient' | 'hcp' | 'caregiver';
  agentType?: string;
}

function getSignature(data: SMSTemplateData): string {
  if (data.agentType === 'hcp-support' || data.agentType === 'hcp-outbound' || data.agentType === 'medcomms-qa') {
    return '— Praxis Medical Information';
  }
  return '— Emma, Praxis Patient Support';
}

const TEMPLATES: Record<SMSTemplateType, (data: SMSTemplateData) => string> = {
  copay_card_info: (data) =>
    `Hi ${data.contactName} — this is Emma from Praxis Patient Support.

Your copay card${data.copayCardId ? ` (ID: ${data.copayCardId})` : ''} for ${data.drugName ?? 'your Praxis medication'} has been activated.

How to use your copay card:
• Present it at your specialty pharmacy along with your insurance card
• Eligible patients may pay as little as $0 per fill
• The card is valid for up to 12 fills per calendar year

${data.specialtyPharmacy ? `Your specialty pharmacy: ${data.specialtyPharmacy}\n` : ''}Questions? Call Praxis Patient Support at 1-800-PRAXIS-PS or visit PraxisPatientSupport.com.

${getSignature(data)}`,

  hub_enrollment_confirmation: (data) =>
    `Hi ${data.contactName} — great news! You're now enrolled in the Praxis Patient Support Hub for ${data.drugName ?? 'your treatment'}.

What this means for you:
• A dedicated support coordinator will be your single point of contact
• Benefits verification and prior authorization assistance
• Copay card and financial assistance support
• Refill coordination with your specialty pharmacy
• Access to nurse educators for treatment questions

Your hub support line: ${data.hubPhone ?? '1-800-PRAXIS-PS'}

${data.prescribingHcp ? `Your prescribing physician ${data.prescribingHcp} has been notified of your enrollment.\n` : ''}We're here to help — don't hesitate to call with any questions.

${getSignature(data)}`,

  refill_reminder: (data) =>
    `Hi ${data.contactName} — this is Emma from Praxis Patient Support.

This is a friendly reminder that your ${data.drugName ?? 'medication'} refill may be coming up soon.

Next steps:
• Contact your specialty pharmacy to schedule your refill${data.specialtyPharmacy ? `: ${data.specialtyPharmacy}` : ''}
• Make sure your copay card is on file for cost savings
• If you're having any issues with your refill, call us — we can help

${data.prescribingHcp ? `Your prescribing physician: ${data.prescribingHcp}\n` : ''}Questions or need help with your refill? Call Praxis Patient Support at 1-800-PRAXIS-PS.

${getSignature(data)}`,

  ae_followup: (data) =>
    `Hi ${data.contactName} — this is Emma from Praxis Patient Support.

Thank you for reporting your experience with ${data.drugName ?? 'your medication'}. Your safety is our top priority, and our medical team is reviewing your report.

Important next steps:
• If your symptoms worsen or you have new concerns, contact your doctor immediately
• For urgent medical situations, call 911 or go to your nearest emergency room
• To report additional information, call the Praxis Safety Line at 1-800-PRAXIS-AE

A member of our safety team may follow up with you or your doctor for additional details.

${getSignature(data)}`,

  hcp_clinical_data: (data) =>
    `Hello — this is Praxis Medical Information.

${data.clinicalDataTopic ? `Per your request, here is information regarding: ${data.clinicalDataTopic}\n` : 'Per your request, clinical data is available at the link below.'}
${data.clinicalDataUrl ? `Access clinical data: ${data.clinicalDataUrl}\n` : 'Visit PraxisHCP.com for full prescribing information and clinical data.'}
Resources available:
• Full prescribing information
• Phase 2/3 clinical trial data summaries
• Dosing and titration guides
• Patient support program information for your patients

For a detailed scientific discussion, request an MSL visit at PraxisHCP.com/MSL or call 1-800-PRAXIS-MI.

— Praxis Medical Information`,

  speaker_program_invite: (data) =>
    `Hello — this is Emma from Praxis BioSciences.

You're invited to an upcoming ${data.therapeuticArea ?? ''} speaker program featuring clinical data and peer discussion.

${data.speakerProgramSpeaker ? `Featured speaker: ${data.speakerProgramSpeaker}\n` : ''}${data.speakerProgramDate ? `Date: ${data.speakerProgramDate}\n` : ''}${data.speakerProgramLocation ? `Location: ${data.speakerProgramLocation}\n` : ''}
Topics include:
• Latest clinical evidence in ${data.therapeuticArea ?? 'the therapeutic area'}
• Real-world treatment considerations
• Peer discussion and Q&A

To RSVP or learn more, visit PraxisHCP.com/speakers or contact your Praxis representative.

— Praxis Medical Information`,

  nurse_educator_scheduling: (data) =>
    `Hi ${data.contactName} — this is Emma from Praxis Patient Support.

Your nurse educator visit has been scheduled!

${data.nurseEducatorDate ? `Date/Time: ${data.nurseEducatorDate}\n` : 'A nurse educator will contact you to confirm the date and time.\n'}${data.nurseEducatorTopic ? `Topic: ${data.nurseEducatorTopic}\n` : ''}
What to expect:
• A trained nurse educator will walk you through your ${data.drugName ?? 'treatment'}
• You can ask questions about dosing, titration, and what to expect
• The visit is at no cost to you — it's part of Praxis Patient Support

Need to reschedule? Call 1-800-PRAXIS-PS.

${getSignature(data)}`,

  general_followup: (data) =>
    `Hi ${data.contactName} — thank you for speaking with ${data.agentType === 'hcp-support' || data.agentType === 'hcp-outbound' || data.agentType === 'medcomms-qa' ? 'Praxis Medical Information' : 'Emma, your Praxis Patient Support coordinator'}.

Here are some helpful resources:
• Praxis Patient Support Hub: 1-800-PRAXIS-PS
• Medical Information: 1-800-PRAXIS-MI
• Patient website: PraxisPatientSupport.com
• HCP portal: PraxisHCP.com
• Safety reporting: 1-800-PRAXIS-AE

${data.prescribingHcp ? `Your prescribing physician on file is ${data.prescribingHcp}. ` : ''}Don't hesitate to reach out — we're here to help.

${getSignature(data)}`,

  welcome: (data) =>
    `Hi ${data.contactName} — this is Emma from Praxis Patient Support.

I tried to reach you today to check in on your ${data.drugName ?? 'treatment'} and make sure you have the support you need.

I'd love to help you with:
• Copay card activation and financial assistance
• Specialty pharmacy coordination
• Nurse educator scheduling
• Answers to your treatment questions

Please call us back at 1-800-PRAXIS-PS or visit PraxisPatientSupport.com to get started.

${getSignature(data)}`,
};

export function isSMSTemplateType(value: string): value is SMSTemplateType {
  return Object.prototype.hasOwnProperty.call(
    Object.fromEntries(SMS_TEMPLATE_TYPES.map((t) => [t, true])),
    value,
  );
}

export function getSMSTemplate(
  templateType: string,
  data: SMSTemplateData,
): string {
  const templateFn = TEMPLATES[templateType as SMSTemplateType];
  if (!templateFn) {
    throw new Error(`Unknown SMS template type: ${templateType}`);
  }
  return templateFn(data);
}
