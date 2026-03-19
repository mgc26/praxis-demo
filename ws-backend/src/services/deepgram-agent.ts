// ---------------------------------------------------------------------------
// Vi Praxis BioSciences — Deepgram Voice Agent Service
// Connects to Deepgram's Voice Agent API and wires up STT/TTS/LLM.
// Multi-agent: patient-support, hcp-support, hcp-outbound, medcomms-qa
// ---------------------------------------------------------------------------

import WebSocket from 'ws';
import type { ContactRecord, TranscriptEntry, RecommendedScreening } from '../types/index.js';
import {
  buildAgentPrompt,
  buildAgentVoicemailMessage,
  buildAgentGreeting,
} from '../prompts/agent-prompts.js';
import { isMachineAnsweredBy } from '../utils/answered-by.js';

interface DeepgramAgentCallbacks {
  onAudio: (audioBuffer: Buffer) => void;
  onTranscript: (entry: TranscriptEntry) => void;
  onFunctionCall: (name: string, params: Record<string, unknown>) => void;
  onUserStartedSpeaking: () => void;
  onAgentAudioDone: () => void;
  onReady: () => void;
  onClose: () => void;
}

export function createDeepgramAgent(
  contact: ContactRecord,
  callbacks: DeepgramAgentCallbacks,
  options?: {
    answeredBy?: string | null;
    recommendedScreenings?: RecommendedScreening[];
  },
): WebSocket {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPGRAM_API_KEY environment variable is not set');
  }

  const ws = new WebSocket('wss://agent.deepgram.com/v1/agent/converse', {
    headers: {
      Authorization: `Token ${apiKey}`,
    },
  });

  const systemPrompt = buildAgentPrompt({
    contact,
    answeredBy: options?.answeredBy,
    recommendedScreenings: options?.recommendedScreenings,
  });

  const initialGreeting = isMachineAnsweredBy(options?.answeredBy)
    ? buildAgentVoicemailMessage({
        name: contact.name,
        contactType: contact.contactType,
        agentType: contact.agentType,
        therapeuticArea: contact.therapeuticArea,
      })
    : buildAgentGreeting(contact);

  ws.on('open', () => {
    const config = {
      type: 'Settings',
      tags: [contact.agentType, contact.therapeuticArea, contact.contactType],
      mip_opt_out: true,
      audio: {
        input: {
          encoding: 'mulaw',
          sample_rate: 8000,
        },
        output: {
          encoding: 'mulaw',
          sample_rate: 8000,
          container: 'none',
        },
      },
      agent: {
        language: 'en',
        listen: {
          provider: {
            type: 'deepgram',
            model: 'nova-3',
            keyterms: [
              { term: 'Euloxacaltenamide', boost: 5 },
              { term: 'ELEX', boost: 5 },
              { term: 'Relutrigine', boost: 5 },
              { term: 'Praxis', boost: 3 },
              { term: 'TETRAS', boost: 3 },
              { term: 'Dravet', boost: 3 },
              { term: 'clobazam', boost: 2 },
              { term: 'stiripentol', boost: 2 },
              { term: 'valproate', boost: 2 },
              { term: 'propranolol', boost: 2 },
              { term: 'primidone', boost: 2 },
              { term: 'topiramate', boost: 2 },
              { term: 'carbamazepine', boost: 2 },
              { term: 'phenytoin', boost: 2 },
              { term: 'lamotrigine', boost: 2 },
            ],
          },
        },
        think: {
          provider: {
            type: 'open_ai',
            model: 'gpt-4o-mini',
            temperature: 0.3,
          },
          prompt: systemPrompt,
          functions: [
            {
              name: 'report_adverse_event',
              description:
                'Report an adverse event (AE). Call when a patient or HCP describes a side effect, unexpected reaction, or safety concern related to ELEX (Euloxacaltenamide) or Relutrigine. A valid ICSR requires four minimum elements per 21 CFR 314.80: (1) identifiable reporter, (2) identifiable patient, (3) suspect drug, and (4) adverse event description. Collect all four before calling.',
              parameters: {
                type: 'object',
                properties: {
                  event_description: {
                    type: 'string',
                    description: 'Description of the adverse event as reported',
                  },
                  severity: {
                    type: 'string',
                    enum: ['mild', 'moderate', 'severe', 'life-threatening'],
                    description: 'Severity of the adverse event',
                  },
                  onset_date: {
                    type: 'string',
                    description: 'When the event started (as described by the reporter)',
                  },
                  drug_name: {
                    type: 'string',
                    description: 'Drug associated with the AE (ELEX or Relutrigine)',
                  },
                  reporter_type: {
                    type: 'string',
                    enum: ['patient', 'hcp', 'caregiver'],
                    description: 'Who is reporting the AE',
                  },
                  patient_initials: {
                    type: 'string',
                    description: 'Patient initials (e.g., "J.S.") or "unknown" if not available. Required for identifiable patient element.',
                  },
                  patient_age: {
                    type: 'string',
                    description: 'Patient age or age range (e.g., "45", "40-50", "elderly")',
                  },
                  patient_sex: {
                    type: 'string',
                    description: 'Patient sex (male, female, unknown)',
                  },
                  event_outcome: {
                    type: 'string',
                    enum: ['resolved', 'resolving', 'not-resolved', 'fatal', 'unknown'],
                    description: 'Outcome of the adverse event at time of report',
                  },
                  is_serious: {
                    type: 'boolean',
                    description: 'Whether this meets serious AE criteria (hospitalization, life-threatening, disability, death, congenital anomaly, or other medically important condition)',
                  },
                  concomitant_medications: {
                    type: 'string',
                    description: 'Other medications the patient is currently taking',
                  },
                },
                required: ['event_description', 'severity', 'drug_name', 'reporter_type', 'patient_initials'],
              },
            },
            {
              name: 'escalate_to_safety',
              description:
                'Immediately escalate to pharmacovigilance/drug safety. Use for serious adverse events (SAEs), unexpected reactions, or any event requiring urgent medical review.',
              parameters: {
                type: 'object',
                properties: {
                  reason: {
                    type: 'string',
                    description: 'Reason for escalation: serious-ae, unexpected-reaction, pregnancy-exposure, overdose, medication-error',
                  },
                  urgency: {
                    type: 'string',
                    enum: ['immediate', 'within-24h'],
                    description: 'Urgency level of the safety escalation',
                  },
                  patient_initials: {
                    type: 'string',
                    description: 'Patient initials (e.g., "J.S.") or "unknown" if not available',
                  },
                  event_description: {
                    type: 'string',
                    description: 'Description of the serious event being escalated',
                  },
                  seriousness_criteria: {
                    type: 'string',
                    enum: ['hospitalization', 'life-threatening', 'disability', 'congenital-anomaly', 'death', 'other-medically-important'],
                    description: 'Which ICH seriousness criterion this event meets',
                  },
                },
                required: ['reason', 'urgency', 'patient_initials', 'event_description', 'seriousness_criteria'],
              },
            },
            {
              name: 'escalate_crisis',
              description:
                'C-SSRS triggered crisis escalation. Use when a patient or caregiver expresses suicidal ideation, self-harm, or is in immediate danger.',
              parameters: {
                type: 'object',
                properties: {
                  trigger: {
                    type: 'string',
                    description: 'What triggered the crisis escalation (e.g., suicidal ideation, self-harm mention)',
                  },
                  severity: {
                    type: 'string',
                    enum: ['passive-ideation', 'active-ideation', 'plan', 'attempt', 'imminent-danger'],
                    description: 'C-SSRS severity level',
                  },
                },
                required: ['trigger', 'severity'],
              },
            },
            {
              name: 'report_pregnancy_exposure',
              description:
                'Report pregnancy exposure to a Praxis product. MANDATORY reporting for all anti-epileptic drugs. Call immediately when pregnancy is mentioned by a patient, caregiver, or HCP.',
              parameters: {
                type: 'object',
                properties: {
                  drug_name: {
                    type: 'string',
                    description: 'Praxis drug the patient was exposed to (ELEX or Relutrigine)',
                  },
                  trimester: {
                    type: 'string',
                    description: 'Trimester of pregnancy at time of exposure (first, second, third, unknown)',
                  },
                  gestational_age: {
                    type: 'string',
                    description: 'Gestational age if known (e.g., "12 weeks", "5 months")',
                  },
                  patient_initials: {
                    type: 'string',
                    description: 'Patient initials (e.g., "J.S.") or "unknown" if not available',
                  },
                  reporter_type: {
                    type: 'string',
                    enum: ['patient', 'hcp', 'caregiver'],
                    description: 'Who is reporting the pregnancy exposure',
                  },
                  outcome_if_known: {
                    type: 'string',
                    description: 'Pregnancy outcome if already known (e.g., live birth, miscarriage, ongoing)',
                  },
                },
                required: ['drug_name', 'patient_initials', 'reporter_type'],
              },
            },
            {
              name: 'request_samples',
              description:
                'Process an HCP sample request. Use when a healthcare provider requests drug samples of ELEX or Relutrigine.',
              parameters: {
                type: 'object',
                properties: {
                  drug_name: {
                    type: 'string',
                    description: 'Drug being requested (ELEX or Relutrigine)',
                  },
                  quantity: {
                    type: 'string',
                    description: 'Quantity or number of sample packs requested',
                  },
                  ship_to: {
                    type: 'string',
                    description: 'Shipping address or office location',
                  },
                },
                required: ['drug_name'],
              },
            },
            {
              name: 'enroll_in_hub',
              description:
                'Enroll a patient in the Praxis Patient Support Hub. Use when a patient agrees to enrollment for copay assistance, nursing support, or access services.',
              parameters: {
                type: 'object',
                properties: {
                  program: {
                    type: 'string',
                    description: 'Hub program: copay-assistance, nurse-educator, access-services, full-enrollment',
                  },
                  consent_given: {
                    type: 'boolean',
                    description: 'Whether the patient verbally consented to enrollment',
                  },
                },
                required: ['program', 'consent_given'],
              },
            },
            {
              name: 'activate_copay_card',
              description:
                'Activate or check status of a copay card. Use when a patient wants to activate their copay assistance card or check eligibility.',
              parameters: {
                type: 'object',
                properties: {
                  action: {
                    type: 'string',
                    enum: ['activate', 'check-status', 'check-eligibility'],
                    description: 'Action to take on the copay card',
                  },
                  drug_name: {
                    type: 'string',
                    description: 'Drug the copay card is for',
                  },
                },
                required: ['action'],
              },
            },
            {
              name: 'schedule_nurse_educator',
              description:
                'Schedule a field nurse educator visit. Use when a patient or HCP requests a nurse educator for injection training, titration support, or patient education.',
              parameters: {
                type: 'object',
                properties: {
                  visit_type: {
                    type: 'string',
                    description: 'Type of visit: injection-training, titration-support, patient-education, first-dose',
                  },
                  preferred_date: {
                    type: 'string',
                    description: 'Preferred date or timeframe for the visit',
                  },
                  location: {
                    type: 'string',
                    description: 'Visit location: patient-home, hcp-office, infusion-center',
                  },
                },
                required: ['visit_type'],
              },
            },
            {
              name: 'request_msl_visit',
              description:
                'Request an MSL (Medical Science Liaison) visit. Use when an HCP requests clinical data review, peer-to-peer discussion, or scientific exchange.',
              parameters: {
                type: 'object',
                properties: {
                  topic: {
                    type: 'string',
                    description: 'Topic of interest for the MSL visit',
                  },
                  preferred_format: {
                    type: 'string',
                    enum: ['in-person', 'virtual', 'phone'],
                    description: 'Preferred meeting format',
                  },
                  urgency: {
                    type: 'string',
                    enum: ['routine', 'soon', 'urgent'],
                    description: 'Urgency of the MSL request',
                  },
                },
                required: ['topic'],
              },
            },
            {
              name: 'send_clinical_data',
              description:
                'Send clinical data package to an HCP. Use when an HCP requests prescribing information, clinical trial data, formulary information, or educational materials.',
              parameters: {
                type: 'object',
                properties: {
                  data_type: {
                    type: 'string',
                    description: 'Type of data: prescribing-info, clinical-trial-results, formulary-info, dosing-guide, patient-education-materials',
                  },
                  drug_name: {
                    type: 'string',
                    description: 'Drug the data pertains to',
                  },
                  delivery_method: {
                    type: 'string',
                    enum: ['email', 'fax', 'portal'],
                    description: 'How to deliver the data',
                  },
                },
                required: ['data_type', 'drug_name'],
              },
            },
            {
              name: 'send_sms',
              description:
                'Send the contact a follow-up SMS with support resources, program information, or hub enrollment details. Call after confirming verbally that the contact wants a text.',
              parameters: {
                type: 'object',
                properties: {
                  template: {
                    type: 'string',
                    enum: [
                      'hub_enrollment',
                      'copay_card_info',
                      'nurse_educator_confirmation',
                      'safety_followup',
                      'general_followup',
                      'welcome',
                    ],
                    description: 'SMS template to send',
                  },
                  reason: {
                    type: 'string',
                    description: 'Brief reason for the SMS',
                  },
                },
                required: ['template'],
              },
            },
            ...(options?.recommendedScreenings && options.recommendedScreenings.length > 0
              ? [
                  {
                    name: 'record_screening_result',
                    description:
                      'Record the contact\'s response to a clinical screening question. Call this after EACH individual question in a screening instrument (AE-TRIAGE, C-SSRS-LITE, TETRAS-LITE, MMAS-4). Do NOT wait until the end — call after every single question.',
                    parameters: {
                      type: 'object',
                      properties: {
                        instrument_id: {
                          type: 'string',
                          enum: ['AE-TRIAGE', 'C-SSRS-LITE', 'TETRAS-LITE', 'MMAS-4'],
                          description: 'Which screening instrument this question belongs to',
                        },
                        question_index: {
                          type: 'number',
                          description: 'Zero-based index of the question within the instrument (0, 1, or 2)',
                        },
                        contact_response: {
                          type: 'string',
                          description: 'What the contact said in their own words',
                        },
                        score_value: {
                          type: 'number',
                          description: 'The numeric score mapped from their response per the instrument scale',
                        },
                        screening_status: {
                          type: 'string',
                          enum: ['in-progress', 'completed', 'declined'],
                          description: 'Set to "completed" on the LAST question of the instrument, "declined" if contact refuses',
                        },
                      },
                      required: ['instrument_id', 'question_index', 'contact_response', 'score_value', 'screening_status'],
                    },
                  },
                ]
              : []),
            {
              name: 'hang_up',
              description:
                'End the call. Call ONLY after saying a warm goodbye such as "Thank you for your time, take care!" Triggers: contact says bye, wants to go, or the conversation is clearly complete.',
              parameters: {
                type: 'object',
                properties: {
                  reason: {
                    type: 'string',
                    description:
                      'Reason: goodbye, not-interested, callback-later, safety-transferred, crisis-transferred, voicemail-left',
                  },
                },
                required: ['reason'],
              },
            },
          ],
        },
        speak: {
          provider: {
            type: 'deepgram',
            // Aura-2 Thalia: warm, professional female voice
            model: 'aura-2-thalia-en',
          },
        },
        // Agent speaks first on every outbound call.
        // For voicemail: scripted message. For humans: warm, context-aware intro.
        greeting: initialGreeting,
      },
    };

    console.log('[DeepgramAgent] Sending Settings config — contact:', contact.contactId, 'agentType:', contact.agentType);
    console.log('[DeepgramAgent] Audio config:', JSON.stringify(config.audio));
    console.log('[DeepgramAgent] Listen provider:', JSON.stringify(config.agent.listen));
    ws.send(JSON.stringify(config));
  });

  // KeepAlive interval — prevents WebSocket drops on long calls
  let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

  let textFrames = 0;
  let binaryFrames = 0;
  ws.on('message', (data: WebSocket.RawData, isBinary: boolean) => {
    if (isBinary) binaryFrames++; else textFrames++;
    if (binaryFrames > 0 && binaryFrames % 50 === 1) {
      console.log(`[DeepgramAgent] Frame counts — text: ${textFrames}, binary: ${binaryFrames}`);
    }
    if (!isBinary) {
      const messageStr = data.toString();
      let message: Record<string, unknown>;

      try {
        message = JSON.parse(messageStr) as Record<string, unknown>;
      } catch (err) {
        console.warn('[DeepgramAgent] Failed to parse message as JSON:', (err as Error).message);
        return;
      }

      const messageType = message.type as string | undefined;
      // Log ALL text messages at info level for debugging
      console.log(`[DeepgramAgent] << ${messageType}`, JSON.stringify(message).substring(0, 300));

      switch (messageType) {
        case 'Welcome':
          console.log('[DeepgramAgent] Received Welcome from Deepgram');
          break;

        case 'SettingsApplied':
          console.log('[DeepgramAgent] Settings applied successfully');
          // Start KeepAlive to prevent WebSocket drops on long calls
          keepAliveInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(JSON.stringify({ type: 'KeepAlive' }));
              } catch (err) {
                console.warn('[DeepgramAgent] Failed to send KeepAlive:', (err as Error).message);
              }
            }
          }, 8000);
          callbacks.onReady();
          break;

        case 'UserStartedSpeaking':
          callbacks.onUserStartedSpeaking();
          break;

        case 'ConversationText': {
          const role = message.role as string;
          const content = message.content as string;
          if (role && content) {
            const entry: TranscriptEntry = {
              speaker: role === 'user' ? 'caller' : 'agent',
              text: content,
              timestamp: Date.now(),
            };
            callbacks.onTranscript(entry);
          }
          break;
        }

        case 'FunctionCallRequest': {
          // Support both new format (functions[] array) and legacy format (top-level fields)
          const functions = message.functions as Array<{
            id: string;
            name: string;
            arguments: string;
            client_side?: boolean;
          }> | undefined;

          let functionName: string;
          let functionCallId: string;
          let functionInput: Record<string, unknown>;

          if (functions && functions.length > 0) {
            // New Deepgram format: functions array with id, name, arguments (JSON string)
            const fn = functions[0]!;
            functionName = fn.name;
            functionCallId = fn.id;
            try {
              functionInput = JSON.parse(fn.arguments || '{}');
            } catch {
              functionInput = {};
            }
          } else {
            // Legacy format: top-level function_name, function_call_id, input
            functionName = message.function_name as string;
            functionCallId = message.function_call_id as string;
            functionInput = (message.input as Record<string, unknown>) ?? {};
          }

          if (!functionName || !functionCallId) {
            console.warn(
              '[DeepgramAgent] FunctionCallRequest missing required fields — name:',
              functionName,
              'id:',
              functionCallId,
            );
            break;
          }

          callbacks.onFunctionCall(functionName, functionInput);

          // Return a meaningful function response so the agent can continue naturally
          let outputMessage = 'Done.';
          if (functionName === 'report_adverse_event') {
            outputMessage = 'Adverse event has been logged in the pharmacovigilance system. Confirm you have: reporter identity, patient initials, suspect drug name, and event description — these four elements are required. Confirm with the reporter that safety will follow up.';
          } else if (functionName === 'report_pregnancy_exposure') {
            outputMessage = 'Pregnancy exposure report has been logged. Advise the caller to consult their prescribing physician immediately. Provide the North American Antiepileptic Drug Pregnancy Registry contact: 1-888-233-2334. Safety will follow up for outcome tracking.';
          } else if (functionName === 'escalate_to_safety') {
            outputMessage = 'Safety escalation initiated. Prepare the caller for transfer to pharmacovigilance.';
          } else if (functionName === 'escalate_crisis') {
            outputMessage = 'Crisis escalation activated. Transfer to crisis hotline in progress. Stay on the line with the caller.';
          } else if (functionName === 'request_samples') {
            outputMessage = 'Sample request logged. Samples will be shipped to the provider\'s office.';
          } else if (functionName === 'enroll_in_hub') {
            outputMessage = 'Hub enrollment submitted. The patient will receive a welcome kit within 5-7 business days.';
          } else if (functionName === 'activate_copay_card') {
            outputMessage = 'Copay card activation processed. The card can be used at the pharmacy immediately.';
          } else if (functionName === 'schedule_nurse_educator') {
            outputMessage = 'Nurse educator visit request submitted. A field nurse will reach out to confirm scheduling.';
          } else if (functionName === 'request_msl_visit') {
            outputMessage = 'MSL visit request logged. The regional MSL will contact the HCP to schedule.';
          } else if (functionName === 'send_clinical_data') {
            outputMessage = 'Clinical data package queued for delivery to the HCP.';
          } else if (functionName === 'send_sms') {
            outputMessage = 'SMS queued for delivery after the call ends.';
          } else if (functionName === 'record_screening_result') {
            outputMessage = 'Screening response recorded. Continue with the next question or proceed with the conversation.';
          } else if (functionName === 'hang_up') {
            outputMessage = 'Call ending.';
          }

          try {
            // Use current Deepgram format: id, name, content
            ws.send(
              JSON.stringify({
                type: 'FunctionCallResponse',
                id: functionCallId,
                name: functionName,
                content: outputMessage,
              }),
            );
          } catch (err) {
            console.error(
              '[DeepgramAgent] Failed to send FunctionCallResponse:',
              (err as Error).message,
            );
          }
          break;
        }

        case 'AgentStartedSpeaking':
          console.log(
            '[DeepgramAgent] AgentStartedSpeaking — latency:',
            `total=${message.total_latency}s`,
            `tts=${message.tts_latency}s`,
            `ttt=${message.ttt_latency}s`,
          );
          break;

        case 'AgentAudioDone':
          callbacks.onAgentAudioDone();
          break;

        case 'EndOfThought':
          break;

        case 'Warning':
          console.warn('[DeepgramAgent] Warning from Deepgram:', JSON.stringify(message));
          break;

        case 'Error':
          console.error('[DeepgramAgent] Error from Deepgram:', JSON.stringify(message));
          break;

        case 'History': {
          // Deepgram Voice Agent sends History for each conversation turn
          const histRole = message.role as string;
          const histContent = message.content as string;
          if (histRole && histContent) {
            const entry: TranscriptEntry = {
              speaker: histRole === 'user' ? 'caller' : 'agent',
              text: histContent,
              timestamp: Date.now(),
            };
            callbacks.onTranscript(entry);
            // Do NOT call onUserStartedSpeaking here — History is a post-hoc
            // transcript, not a real-time VAD event. Calling it would set
            // userSpeaking=true permanently and drop all TTS audio.
          }
          break;
        }

        default:
          console.log('[DeepgramAgent] Message type:', messageType, JSON.stringify(message).substring(0, 200));
          break;
      }
    } else {
      // Binary data — TTS audio output from Deepgram
      const audioBuffer = Buffer.isBuffer(data)
        ? data
        : Buffer.from(data as ArrayBuffer);
      if (audioBuffer.length > 0) {
        callbacks.onAudio(audioBuffer);
      }
    }
  });

  ws.on('close', (code: number, reason: Buffer) => {
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }
    const reasonStr = reason.toString();
    switch (code) {
      case 1000:
        console.log('[DeepgramAgent] WebSocket closed normally');
        break;
      case 1006:
        console.error('[DeepgramAgent] WebSocket closed: Abnormal closure — possible network issue');
        break;
      case 1008:
        console.error('[DeepgramAgent] WebSocket closed: Policy violation — check API key');
        break;
      case 1011:
        console.error('[DeepgramAgent] WebSocket closed: Deepgram server error');
        break;
      default:
        console.warn(`[DeepgramAgent] WebSocket closed: code=${code} reason=${reasonStr}`);
        break;
    }
    callbacks.onClose();
  });

  ws.on('error', (error: Error) => {
    console.error('[DeepgramAgent] WebSocket error for contact', contact.contactId, ':', error.message, error.stack);
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }
    try { ws.close(); } catch { /* ignore */ }
    callbacks.onClose();
  });

  return ws;
}
