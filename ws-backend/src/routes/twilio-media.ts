// ---------------------------------------------------------------------------
// Vi Praxis BioSciences — Twilio Media Stream WebSocket Route
// Bridges Twilio's mulaw audio stream to the Deepgram Voice Agent,
// handles function calls, and runs post-call classification.
// ---------------------------------------------------------------------------

import { FastifyInstance } from 'fastify';
import WebSocket from 'ws';

import { contacts, getCallRecordBySid } from '../server.js';
import { callManager } from '../services/call-manager.js';
import { createDeepgramAgent } from '../services/deepgram-agent.js';
import { classifyCall } from '../services/groq-classifier.js';
import { sendPostCallSMS } from '../services/sms-service.js';
import { twilioService } from '../services/twilio-service.js';
import type {
  ContactRecord,
  TranscriptEntry,
  CallRecord,
  OutcomeType,
  BehavioralSignal,
  SupportPathway,
  AgentType,
  TherapeuticArea,
  ScreeningResult,
  ScreeningQuestionResponse,
  ScreeningInstrumentId,
  RecommendedScreening,
} from '../types/index.js';

export async function twilioMediaRoutes(fastify: FastifyInstance) {
  fastify.register(async function (fastify) {
    fastify.get('/twilio/media-stream', { websocket: true }, (socket, _request) => {
      fastify.log.info('Twilio Media Stream WebSocket connected');

      let streamSid: string | null = null;
      let callSid: string | null = null;
      let contact: ContactRecord | null = null;
      let sessionCallId: string | null = null;
      let deepgramWs: WebSocket | null = null;
      let deepgramReady = false;
      let answeredBy: string | null = null;
      const pendingAudioChunks: Buffer[] = [];
      let stopProcessed = false;
      const transcript: TranscriptEntry[] = [];

      // Clinical screening state
      const screeningResults = new Map<string, ScreeningResult>();
      let recommendedScreenings: RecommendedScreening[] = [];

      // Silence detection state
      let lastTranscriptTime = 0;
      let silenceCheckInterval: ReturnType<typeof setInterval> | null = null;
      let silencePromptSent = false;
      const SILENCE_PROMPT_MS = 8000;
      const SILENCE_HANGUP_MS = 25000;

      // Audio diagnostic counters
      let firstAudioLogged = false;
      let firstTtsLogged = false;
      let ttsChunksReceived = 0;
      let ttsBytesReceived = 0;
      let wavHeaderStripped = false;

      // Response gate — hold first audio chunk briefly so the agent doesn't
      // jump in on micro-pauses. Once open, subsequent chunks flow with zero delay.
      // Greeting bypasses the gate entirely for zero-latency playback.
      const RESPONSE_GATE_MS = 150;
      let responseBuffer: Buffer[] = [];
      let responseGateTimer: ReturnType<typeof setTimeout> | null = null;
      let responseGateOpen = false;
      let userSpeaking = false;
      let greetingComplete = false;
      let greetingPlaybackDone = false;
      let settingsTimeout: ReturnType<typeof setTimeout> | null = null;

      socket.on('message', async (data: Buffer | string) => {
        let message: TwilioStreamMessage;
        try {
          message = JSON.parse(typeof data === 'string' ? data : data.toString('utf-8'));
        } catch {
          fastify.log.error('Failed to parse Twilio Media Stream message');
          return;
        }

        switch (message.event) {
          case 'connected':
            fastify.log.info('Twilio Media Stream: connected event received');
            break;

          case 'start':
            handleStart(message);
            break;

          case 'media':
            handleMedia(message);
            break;

          case 'stop':
            fastify.log.info({ streamSid }, 'Twilio Media Stream: stop event received');
            await handleStop();
            break;

          case 'mark': {
            const markName = (message as TwilioMarkMessage).mark?.name;
            fastify.log.info({ mark: markName }, 'Twilio mark event — audio playback reached this point');

            if (markName === 'greeting_done' && !silenceCheckInterval) {
              greetingPlaybackDone = true;
              fastify.log.info('Greeting playback confirmed by Twilio — barge-in now live, starting silence timer');
              lastTranscriptTime = Date.now();
              silenceCheckInterval = setInterval(() => {
                if (!deepgramReady || !lastTranscriptTime) return;
                const elapsed = Date.now() - lastTranscriptTime;

                if (elapsed >= SILENCE_HANGUP_MS) {
                  fastify.log.info({ elapsed }, 'Extended silence — ending call');
                  if (callSid) {
                    twilioService.endCall(callSid).catch((err: unknown) => {
                      fastify.log.error({ err }, 'Failed to end call after silence timeout');
                    });
                  }
                  if (silenceCheckInterval) clearInterval(silenceCheckInterval);
                  return;
                }

                if (elapsed >= SILENCE_PROMPT_MS && !silencePromptSent) {
                  silencePromptSent = true;
                  fastify.log.info({ elapsed }, 'Silence — prompting contact');
                  try {
                    const dg = deepgramWs as unknown as { send: (data: string) => void } | null;
                    dg?.send(
                      JSON.stringify({
                        type: 'InjectAgentMessage',
                        message: 'Are you still there?',
                      }),
                    );
                  } catch (err) {
                    fastify.log.error({ err }, 'Failed to inject silence prompt');
                  }
                }
              }, 2000);
            }
            break;
          }

          default:
            fastify.log.debug(
              { event: (message as { event: string }).event },
              'Unhandled Twilio event',
            );
        }
      });

      socket.on('close', async () => {
        fastify.log.info({ streamSid }, 'Twilio Media Stream WebSocket closed');
        await handleStop();
      });

      socket.on('error', (err: Error) => {
        fastify.log.error({ err, streamSid }, 'Twilio Media Stream WebSocket error');
      });

      function handleStart(message: TwilioStartMessage) {
        streamSid = message.streamSid;
        callSid = message.start.callSid;
        const params = message.start.customParameters || {};
        answeredBy = params.answeredBy || null;

        fastify.log.info(
          {
            streamSid,
            callSid,
            contactId: params.contactId,
            agentType: params.agentType,
            answeredBy,
          },
          'Twilio Media Stream: start event',
        );

        // Resolve or reconstruct contact from store or custom params
        const contactId = params.contactId || '';
        contact = contacts.get(contactId) || buildContactFromParams(contactId, params);

        if (contact) {
          contacts.set(contact.contactId, contact);
        }

        if (contact && callSid) {
          const session = callManager.createSession(contact, callSid);
          sessionCallId = session.callId;

          if (session.callId) {
            contact.status = 'connected';
            contact.callId = session.callId;
          }

          // Resolve clinical screenings for this contact
          // (placeholder — screenings resolved from config if available)
          recommendedScreenings = [];

          try {
            deepgramWs = createDeepgramAgent(
              contact,
              {
                onAudio: (audioBuffer: Buffer) => {
                  let audio = audioBuffer;

                  // Twilio gotcha: WAV headers in payload cause audio to be streamed
                  // incorrectly. Strip RIFF/WAV header if Deepgram sends one despite
                  // container:'none'.
                  if (!wavHeaderStripped && audio.length > 44 &&
                      audio[0] === 0x52 && audio[1] === 0x49 &&
                      audio[2] === 0x46 && audio[3] === 0x46) {
                    fastify.log.warn({ originalLen: audio.length }, 'WAV header detected in TTS audio — stripping 44-byte header');
                    audio = audio.subarray(44);
                    wavHeaderStripped = true;
                  }

                  if (!firstTtsLogged) {
                    firstTtsLogged = true;
                    const hex = Array.from(audio.subarray(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ');
                    fastify.log.info(
                      { len: audio.length, hex, responseGateOpen, userSpeaking },
                      'First TTS audio from Deepgram (first 16 bytes hex)',
                    );
                  }
                  ttsChunksReceived++;
                  ttsBytesReceived += audio.length;
                  bufferAgentAudio(audio);
                },
                onTranscript: handleTranscript,
                onFunctionCall: handleFunctionCall,
                onUserStartedSpeaking: handleUserStartedSpeaking,
                onAgentAudioDone: () => {
                  fastify.log.info(
                    { ttsChunksReceived, ttsBytesReceived, ttsChunksSentToTwilio, ttsBytesSentToTwilio, greetingComplete },
                    'AgentAudioDone — TTS stats',
                  );
                  if (!greetingComplete) {
                    greetingComplete = true;
                    fastify.log.info('Greeting audio sent to Twilio — barge-in still blocked until Twilio playback mark');

                    if (streamSid) {
                      try {
                        socket.send(JSON.stringify({
                          event: 'mark',
                          streamSid,
                          mark: { name: 'greeting_done' },
                        }));
                      } catch { /* ignore */ }
                    }
                  }
                  responseGateOpen = false;
                  userSpeaking = false;
                },
                onReady: () => {
                  fastify.log.info('Deepgram SettingsApplied — flushing audio');
                  deepgramReady = true;
                  if (settingsTimeout) clearTimeout(settingsTimeout);

                  for (const chunk of pendingAudioChunks) {
                    sendBufferToDeepgram(chunk);
                  }
                  pendingAudioChunks.length = 0;
                },
                onClose: () => {
                  fastify.log.info('Deepgram Voice Agent closed (callback)');
                  deepgramReady = false;
                },
              },
              { answeredBy, recommendedScreenings },
            ) as unknown as WebSocket;

            const dgWs = deepgramWs as unknown as {
              readyState: number;
              OPEN: number;
              onopen: ((ev: Event) => void) | null;
              onmessage: ((ev: MessageEvent) => void) | null;
              onerror: ((ev: Event) => void) | null;
              onclose: ((ev: { code: number; reason: string }) => void) | null;
              send: (data: Buffer | ArrayBuffer | string) => void;
              close: () => void;
            };

            const deepgramTimeout = setTimeout(() => {
              if (!deepgramReady) {
                fastify.log.error('Deepgram connection timeout after 10s');
                try { dgWs.close(); } catch { /* ignore */ }
                if (callSid) {
                  twilioService.endCall(callSid).catch((err: unknown) => {
                    fastify.log.error({ err }, 'Failed to end call after Deepgram timeout');
                  });
                }
              }
            }, 10000);

            const existingOnOpen = dgWs.onopen;
            dgWs.onopen = (ev: Event) => {
              clearTimeout(deepgramTimeout);
              fastify.log.info('Deepgram Voice Agent WebSocket connected — waiting for SettingsApplied');
              settingsTimeout = setTimeout(() => {
                if (!deepgramReady) {
                  fastify.log.error('Deepgram SettingsApplied not received within 8s of connection');
                  try { dgWs.close(); } catch { /* ignore */ }
                  if (callSid) {
                    twilioService.endCall(callSid).catch((err: unknown) => {
                      fastify.log.error({ err }, 'Failed to end call after settings timeout');
                    });
                  }
                }
              }, 8000);
              if (existingOnOpen) existingOnOpen.call(dgWs, ev);
            };

            dgWs.onerror = (ev: Event) => {
              fastify.log.error({ ev }, 'Deepgram Voice Agent error');
            };

            dgWs.onclose = (_ev: { code: number; reason: string }) => {
              fastify.log.info('Deepgram Voice Agent disconnected');
              deepgramReady = false;
            };
          } catch (err) {
            fastify.log.error({ err }, 'Failed to create Deepgram Voice Agent');
          }
        } else {
          fastify.log.error(
            { callSid, contactId: contact?.contactId },
            'Cannot start call: no contact data or callSid',
          );
        }
      }

      let mediaChunksSent = 0;
      let mediaChunksBuffered = 0;

      function sendBufferToDeepgram(chunk: Buffer) {
        if (deepgramWs && deepgramReady && deepgramWs.readyState === WebSocket.OPEN) {
          try {
            deepgramWs.send(chunk);
            mediaChunksSent++;

            if (!firstAudioLogged) {
              firstAudioLogged = true;
              const first8 = Array.from(chunk.subarray(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ');
              fastify.log.info(
                { chunkLen: chunk.length, firstBytes: first8 },
                'First audio frame sent to Deepgram (raw mulaw)',
              );
            }
            if (mediaChunksSent % 500 === 1) {
              fastify.log.info({ sent: mediaChunksSent, buffered: mediaChunksBuffered, chunkSize: chunk.length }, 'Audio chunks flowing to Deepgram');
            }
          } catch (err) {
            fastify.log.error({ err }, 'Failed to send audio to Deepgram');
          }
        } else {
          mediaChunksBuffered++;
          pendingAudioChunks.push(chunk);
          if (mediaChunksBuffered % 100 === 1) {
            fastify.log.warn({ buffered: mediaChunksBuffered, deepgramReady, readyState: deepgramWs?.readyState }, 'Audio buffered (Deepgram not ready)');
          }
          if (pendingAudioChunks.length > 40) {
            pendingAudioChunks.splice(0, pendingAudioChunks.length - 40);
          }
        }
      }

      function handleMedia(message: TwilioMediaMessage) {
        if (!message.media?.payload) return;
        const audioChunk = Buffer.from(message.media.payload, 'base64');
        sendBufferToDeepgram(audioChunk);
      }

      function bufferAgentAudio(audioBuffer: Buffer) {
        if (!greetingComplete || responseGateOpen) {
          sendAudioToTwilio(audioBuffer);
          return;
        }

        responseBuffer.push(audioBuffer);
        if (responseBuffer.length === 1) {
          fastify.log.info({ chunkLen: audioBuffer.length, gateMs: RESPONSE_GATE_MS }, 'First TTS chunk buffered — response gate starting');
        }

        if (!responseGateTimer) {
          responseGateTimer = setTimeout(() => {
            openResponseGate();
          }, RESPONSE_GATE_MS);
        }
      }

      function openResponseGate() {
        responseGateOpen = true;
        if (responseGateTimer) {
          clearTimeout(responseGateTimer);
          responseGateTimer = null;
        }
        const chunksToFlush = responseBuffer.length;
        const bytesToFlush = responseBuffer.reduce((sum, c) => sum + c.length, 0);
        fastify.log.info(
          { chunks: chunksToFlush, bytes: bytesToFlush, streamSid },
          'Response gate OPEN — flushing buffered TTS audio to Twilio',
        );
        for (const chunk of responseBuffer) {
          sendAudioToTwilio(chunk);
        }
        responseBuffer = [];

        if (streamSid) {
          try {
            socket.send(JSON.stringify({
              event: 'mark',
              streamSid,
              mark: { name: `tts_flush_${ttsChunksSentToTwilio}` },
            }));
          } catch { /* ignore mark errors */ }
        }
      }

      function handleUserStartedSpeaking() {
        userSpeaking = true;

        if (!greetingPlaybackDone) {
          fastify.log.info('UserStartedSpeaking during greeting playback — ignoring (waiting for Twilio mark)');
          return;
        }

        responseGateOpen = false;

        if (responseGateTimer) {
          clearTimeout(responseGateTimer);
          responseGateTimer = null;
        }
        responseBuffer = [];

        if (streamSid) {
          try {
            socket.send(JSON.stringify({ event: 'clear', streamSid }));
          } catch (err) {
            fastify.log.error({ err }, 'Failed to send clear event to Twilio');
          }
        }
      }

      let ttsChunksSentToTwilio = 0;
      let ttsBytesSentToTwilio = 0;
      function sendAudioToTwilio(audioBuffer: Buffer) {
        if (!streamSid) {
          fastify.log.warn('sendAudioToTwilio called but no streamSid');
          return;
        }
        if (socket.readyState !== WebSocket.OPEN) {
          fastify.log.warn({ readyState: socket.readyState }, 'sendAudioToTwilio: Twilio socket not OPEN');
          return;
        }

        const base64Audio = audioBuffer.toString('base64');
        const msg = JSON.stringify({
          event: 'media',
          streamSid,
          media: { payload: base64Audio },
        });

        try {
          socket.send(msg, (err?: Error) => {
            if (err) {
              fastify.log.error({ err: err.message }, 'Async error sending audio to Twilio');
            }
          });
          ttsChunksSentToTwilio++;
          ttsBytesSentToTwilio += audioBuffer.length;
          if (ttsChunksSentToTwilio === 1) {
            const hex = Array.from(audioBuffer.subarray(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ');
            fastify.log.info(
              { len: audioBuffer.length, streamSid, msgLen: msg.length, hex },
              'First TTS chunk sent to Twilio (audio hex + JSON size)',
            );
          }
          if (ttsChunksSentToTwilio % 50 === 0) {
            fastify.log.info(
              { chunks: ttsChunksSentToTwilio, bytes: ttsBytesSentToTwilio },
              'TTS audio chunks sent to Twilio',
            );
          }
        } catch (err) {
          fastify.log.error({ err }, 'Failed to send audio to Twilio');
        }
      }

      function handleTranscript(entry: TranscriptEntry) {
        transcript.push(entry);
        lastTranscriptTime = Date.now();
        silencePromptSent = false;
        fastify.log.debug({ speaker: entry.speaker, text: entry.text }, 'Transcript entry');
      }

      function handleFunctionCall(name: string, args: Record<string, unknown>) {
        fastify.log.info({ name, args }, 'Deepgram function call received');

        switch (name) {
          case 'hang_up':
            fastify.log.info('Function call: hang_up');
            if (streamSid) {
              socket.send(
                JSON.stringify({ event: 'mark', streamSid, mark: { name: 'hang_up' } }),
              );
            }
            if (callSid) {
              twilioService.endCall(callSid).catch((err: unknown) => {
                fastify.log.error({ err }, 'Failed to end Twilio call after hang_up');
              });
            }
            break;

          case 'report_adverse_event':
            fastify.log.info({ args }, 'Function call: report_adverse_event');
            // AE is logged in post-call classification.
            break;

          case 'escalate_to_safety':
            fastify.log.info({ args }, 'Function call: escalate_to_safety');
            // In production, this triggers a warm transfer to pharmacovigilance.
            // For demo, the agent verbally prepares the caller and the call ends.
            if (callSid) {
              setTimeout(() => {
                twilioService.endCall(callSid!).catch((err: unknown) => {
                  fastify.log.error({ err }, 'Failed to end call during safety escalation');
                });
              }, 5000);
            }
            break;

          case 'escalate_crisis':
            fastify.log.info({ args }, 'Function call: escalate_crisis — C-SSRS triggered');
            // In production, this would trigger immediate crisis hotline transfer.
            if (callSid) {
              setTimeout(() => {
                twilioService.endCall(callSid!).catch((err: unknown) => {
                  fastify.log.error({ err }, 'Failed to end call during crisis escalation');
                });
              }, 5000);
            }
            break;

          case 'request_samples':
            fastify.log.info({ args }, 'Function call: request_samples');
            break;

          case 'enroll_in_hub':
            fastify.log.info({ args }, 'Function call: enroll_in_hub');
            break;

          case 'activate_copay_card':
            fastify.log.info({ args }, 'Function call: activate_copay_card');
            break;

          case 'schedule_nurse_educator':
            fastify.log.info({ args }, 'Function call: schedule_nurse_educator');
            break;

          case 'request_msl_visit':
            fastify.log.info({ args }, 'Function call: request_msl_visit');
            break;

          case 'send_clinical_data':
            fastify.log.info({ args }, 'Function call: send_clinical_data');
            break;

          case 'send_sms':
            fastify.log.info({ args }, 'Function call: send_sms — will send after call');
            break;

          case 'record_screening_result': {
            const instrumentId = args.instrument_id as string;
            const questionIndex = args.question_index as number;
            const contactResponse = args.contact_response as string;
            let scoreValue = args.score_value as number;
            const screeningStatus = args.screening_status as string;

            try {
              let result = screeningResults.get(instrumentId);
              if (!result) {
                result = {
                  instrumentId: instrumentId as ScreeningInstrumentId,
                  instrumentName: instrumentId,
                  status: 'in-progress',
                  responses: [],
                  totalScore: 0,
                  maxScore: 10, // default; will be overridden if config available
                  isPositiveScreen: false,
                  clinicalInterpretation: '',
                  requiresEscalation: false,
                  regulatoryReportable: false,
                  startedAt: new Date().toISOString(),
                  completedAt: null,
                };
                screeningResults.set(instrumentId, result);
              }

              const questionResponse: ScreeningQuestionResponse = {
                questionIndex,
                questionText: '',
                contactResponse,
                scoreValue: Math.max(0, scoreValue),
                timestamp: Date.now(),
              };
              result.responses.push(questionResponse);
              result.totalScore = result.responses.reduce((sum, r) => sum + r.scoreValue, 0);

              if (screeningStatus === 'completed') {
                result.status = 'completed';
                result.completedAt = new Date().toISOString();
              } else if (screeningStatus === 'declined') {
                result.status = 'declined';
              }

              fastify.log.info({
                instrumentId,
                questionIndex,
                scoreValue,
                totalScore: result.totalScore,
                status: result.status,
              }, 'Screening result recorded');
            } catch (err) {
              fastify.log.error({ err, instrumentId }, 'Error processing screening result');
            }
            break;
          }

          default:
            fastify.log.warn({ name }, 'Unknown function call from Deepgram');
        }
      }

      async function handleStop() {
        if (stopProcessed || !sessionCallId) return;
        stopProcessed = true;
        const currentCallId = sessionCallId;
        sessionCallId = null;

        fastify.log.info({ callId: currentCallId }, 'Starting post-call processing');

        if (silenceCheckInterval) {
          clearInterval(silenceCheckInterval);
          silenceCheckInterval = null;
        }
        if (responseGateTimer) {
          clearTimeout(responseGateTimer);
          responseGateTimer = null;
        }
        if (settingsTimeout) {
          clearTimeout(settingsTimeout);
          settingsTimeout = null;
        }
        responseBuffer = [];
        responseGateOpen = false;

        try {
          const dgWs = deepgramWs as unknown as {
            readyState: number;
            OPEN: number;
            close: () => void;
          } | null;
          if (dgWs && dgWs.readyState === dgWs.OPEN) {
            dgWs.close();
          }
        } catch (err) {
          fastify.log.error({ err }, 'Error closing Deepgram connection');
        }
        deepgramWs = null;
        deepgramReady = false;

        const callRecord = callSid ? getCallRecordBySid(callSid) : undefined;

        let classificationOutcome: OutcomeType | null = null;

        if (contact) {
          contact.status = 'completed';
        }

        // Persist screening results to call record
        const allScreenings = Array.from(screeningResults.values());
        const completedScreenings = allScreenings.filter(s => s.status === 'completed');
        if (callRecord && allScreenings.length > 0) {
          callRecord.screeningResults = allScreenings;
          fastify.log.info(
            { screeningCount: completedScreenings.length },
            'Screening results saved to call record',
          );
        }
        screeningResults.clear();

        if (contact && transcript.length > 0) {
          try {
            const classification = await classifyCall(transcript, contact, completedScreenings);
            classificationOutcome = classification.outcome;

            if (callRecord) {
              callRecord.outcome = classification.outcome;
              callRecord.outcomeConfidence = classification.confidence;
              callRecord.sentiment = classification.sentiment;
              callRecord.summary = classification.liaisonSummary;
              callRecord.keyMoments = classification.keyMoments;
              callRecord.contactConcerns = classification.contactConcerns;
              callRecord.nextAction = classification.nextAction;
              callRecord.liaisonSummary = classification.liaisonSummary;
              callRecord.supportPathway = classification.supportPathway;
              callRecord.urgency = classification.urgency;
              callRecord.behavioralSignalsReferenced = classification.behavioralSignalsReferenced;
              callRecord.appointmentDetails = classification.appointmentDetails;
              callRecord.screeningResults = classification.screeningResults ?? (allScreenings.length > 0 ? allScreenings : null);
              callRecord.aeDetected = classification.aeDetected;
              callRecord.competitiveIntelNotes = classification.competitiveIntelNotes.length > 0 ? classification.competitiveIntelNotes : null;
              callRecord.transcript = transcript;
              callRecord.status = 'completed';
              callRecord.endedAt = callRecord.endedAt || new Date().toISOString();

              fastify.log.info(
                {
                  callId: currentCallId,
                  outcome: classification.outcome,
                  confidence: classification.confidence,
                  urgency: classification.urgency,
                  supportPathway: classification.supportPathway,
                  aeDetected: classification.aeDetected,
                },
                'Call classified',
              );
            }

            contact.status = 'classified';
          } catch (err) {
            fastify.log.error({ err }, 'Post-call classification failed');
            if (callRecord) {
              callRecord.outcome = 'information-provided';
              callRecord.status = 'completed';
              callRecord.transcript = transcript;
              callRecord.screeningResults = allScreenings.length > 0 ? allScreenings : null;
              callRecord.endedAt = callRecord.endedAt || new Date().toISOString();
              callRecord.liaisonSummary = 'Classification unavailable — manual review required.';
            }
          }
        } else if (!contact) {
          fastify.log.warn(
            { callId: currentCallId, transcriptLength: transcript.length },
            'Skipping post-call processing: no contact',
          );
        } else {
          fastify.log.warn(
            { callId: currentCallId, transcriptLength: transcript.length },
            'Skipping post-call processing: empty transcript',
          );
        }

        if (callRecord?.smsFollowUpSent) {
          fastify.log.info({ callId: currentCallId }, 'SMS already sent — skipping post-call SMS');
        } else if (contact) {
          try {
            const smsResult = await sendPostCallSMS(contact, {
              outcome: classificationOutcome,
            });

            if (callRecord) {
              callRecord.smsFollowUpTemplate = smsResult.template;
            }

            if (smsResult.sent) {
              if (callRecord) {
                callRecord.smsFollowUpSent = true;
                callRecord.smsFollowUpSentAt = new Date().toISOString();
              }
              contact.status = 'followed-up';
              fastify.log.info(
                {
                  contactId: contact.contactId,
                  outcome: classificationOutcome,
                  template: smsResult.template,
                },
                'Follow-up SMS sent',
              );
            } else {
              fastify.log.info(
                {
                  contactId: contact.contactId,
                  outcome: classificationOutcome,
                  template: smsResult.template,
                  reason: smsResult.reason,
                  errorMessage: smsResult.errorMessage,
                },
                'No follow-up SMS sent',
              );
            }
          } catch (err) {
            fastify.log.error({ err, contactId: contact.contactId }, 'SMS delivery failed');
          }
        }

        try {
          callManager.endSession(currentCallId);
        } catch (err) {
          fastify.log.error({ err }, 'Error ending call session');
        }
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Twilio Media Stream message types
// ---------------------------------------------------------------------------

interface TwilioConnectedMessage {
  event: 'connected';
  protocol: string;
  version: string;
}

interface TwilioStartMessage {
  event: 'start';
  sequenceNumber: string;
  streamSid: string;
  start: {
    streamSid: string;
    accountSid: string;
    callSid: string;
    tracks: string[];
    mediaFormat: {
      encoding: string;
      sampleRate: number;
      channels: number;
    };
    customParameters: Record<string, string>;
  };
}

interface TwilioMediaMessage {
  event: 'media';
  sequenceNumber: string;
  streamSid: string;
  media: {
    track: string;
    chunk: string;
    timestamp: string;
    payload: string;
  };
}

interface TwilioStopMessage {
  event: 'stop';
  sequenceNumber: string;
  streamSid: string;
}

interface TwilioMarkMessage {
  event: 'mark';
  sequenceNumber: string;
  streamSid: string;
  mark: { name: string };
}

type TwilioStreamMessage =
  | TwilioConnectedMessage
  | TwilioStartMessage
  | TwilioMediaMessage
  | TwilioStopMessage
  | TwilioMarkMessage;

// ---------------------------------------------------------------------------
// Build a ContactRecord from custom stream parameters (fallback)
// ---------------------------------------------------------------------------

function buildContactFromParams(
  contactId: string,
  params: Record<string, string>,
): ContactRecord | null {
  if (!contactId) return null;

  let behavioralSignals: BehavioralSignal[] = [];
  let engagementLabels: string[] = [];

  try {
    if (params.behavioralSignals) {
      behavioralSignals = JSON.parse(decodeURIComponent(params.behavioralSignals));
    }
  } catch { /* ignore parse errors */ }

  try {
    if (params.engagementLabels) {
      engagementLabels = JSON.parse(decodeURIComponent(params.engagementLabels));
    }
  } catch { /* ignore parse errors */ }

  return {
    contactId,
    contactType: (params.contactType as 'patient' | 'hcp' | 'caregiver') || 'patient',
    agentType: (params.agentType as AgentType) || 'patient-support',
    name: params.name || 'Unknown Contact',
    phone: params.phone || '',
    age: parseInt(params.age || '0', 10),
    gender: params.gender || '',
    therapeuticArea: (params.therapeuticArea as TherapeuticArea) || 'essential-tremor',
    diagnosis: params.diagnosis || undefined,
    currentDrug: (params.currentDrug as ContactRecord['currentDrug']) || undefined,
    currentDose: params.currentDose || undefined,
    prescribingHcp: params.prescribingHcp || undefined,
    npi: params.npi || undefined,
    specialty: params.specialty || undefined,
    institution: params.institution || undefined,
    hubEnrolled: params.hubEnrolled === 'true' ? true : params.hubEnrolled === 'false' ? false : undefined,
    copayCardActive: params.copayCardActive === 'true' ? true : params.copayCardActive === 'false' ? false : undefined,
    behavioralSignals,
    recommendedPathway: (params.recommendedPathway as SupportPathway) || 'patient-education',
    engagementLabels,
    riskTier: (params.riskTier as 'HIGH' | 'MEDIUM' | 'LOW') || 'MEDIUM',
    riskScore: parseInt(params.riskScore || '0', 10),
    preferredChannel: 'voice',
    status: 'connected',
    createdAt: new Date().toISOString(),
    callAttempts: 1,
    lastCallAttempt: new Date().toISOString(),
    callId: null,
  };
}
