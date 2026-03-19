# Twilio API Integration Report

> Generated: 2026-03-18
> Scope: Voice API, Media Streams (bidirectional), SMS/Messaging, AMD, Call Status Callbacks
> Project: Vi Praxis BioSciences Demo Platform

---

## Table of Contents

1. [Implementation Summary](#1-implementation-summary)
2. [Voice REST API -- Outbound Calls](#2-voice-rest-api----outbound-calls)
3. [TwiML Verbs](#3-twiml-verbs)
4. [Media Streams -- Bidirectional WebSocket Protocol](#4-media-streams----bidirectional-websocket-protocol)
5. [Call Status Callbacks](#5-call-status-callbacks)
6. [Answering Machine Detection (AMD)](#6-answering-machine-detection-amd)
7. [SMS / Messaging API](#7-sms--messaging-api)
8. [Recording API](#8-recording-api)
9. [Node.js SDK (twilio npm)](#9-nodejs-sdk-twilio-npm)
10. [Pricing](#10-pricing)
11. [Error Codes and Retry Patterns](#11-error-codes-and-retry-patterns)
12. [Gap Analysis: Our Implementation vs Full API](#12-gap-analysis-our-implementation-vs-full-api)
13. [Recommendations](#13-recommendations)

---

## 1. Implementation Summary

Our platform uses Twilio for five core flows:

| Flow | File | Status |
|------|------|--------|
| Outbound call initiation | `twilio-service.ts` | Implemented |
| Inbound voice webhook (TwiML) | `twilio-voice.ts` | Implemented |
| Bidirectional Media Streams | `twilio-media.ts` | Implemented |
| Call status callbacks | `twilio-status.ts` | Implemented |
| Post-call SMS follow-ups | `sms-service.ts` | Implemented |
| AMD (Answering Machine Detection) | Disabled (agent-based detection) | Intentional |

### Current Twilio SDK Version
`twilio@^5.5.1` (latest stable line is 5.13.x)

---

## 2. Voice REST API -- Outbound Calls

### Authentication
- **Account SID** + **Auth Token** (Basic Auth over HTTPS)
- Environment variables: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`

### Creating Calls -- `client.calls.create()`

#### Parameters We Use

| Parameter | Our Value | Notes |
|-----------|-----------|-------|
| `to` | `contact.phone` | E.164 validated with `/^\+?[1-9]\d{1,14}$/` |
| `from` | `process.env.TWILIO_PHONE_NUMBER` | Must be a Twilio-owned number |
| `url` | `${webhookUrl}?contactId=...` | Returns TwiML with `<Connect><Stream>` |
| `statusCallback` | Derived from webhook URL (`/twilio/status`) | Receives status updates |
| `statusCallbackEvent` | `['initiated', 'ringing', 'answered', 'completed']` | Four events subscribed |

#### Parameters Available But Not Used

| Parameter | Purpose | Relevance |
|-----------|---------|-----------|
| `machineDetection` | AMD (`Enable` or `DetectMessageEnd`) | Intentionally disabled -- see Section 6 |
| `asyncAmd` | Non-blocking AMD | Could reduce latency if AMD re-enabled |
| `asyncAmdStatusCallback` | Webhook for async AMD results | Required if `asyncAmd=true` |
| `machineDetectionTimeout` | 3-59s, default 30 | AMD tuning |
| `machineDetectionSpeechThreshold` | 1000-6000ms, default 2400 | AMD tuning |
| `machineDetectionSpeechEndThreshold` | 500-5000ms, default 1200 | AMD tuning |
| `machineDetectionSilenceTimeout` | 2000-10000ms, default 5000 | AMD tuning |
| `timeout` | Ring timeout (default 30s) | Could customize per contact |
| `record` | Enable call recording | Compliance/QA use |
| `recordingChannels` | `mono` or `dual` | Dual-channel useful for speaker separation |
| `recordingStatusCallback` | Webhook when recording complete | Required if recording enabled |
| `sendDigits` | DTMF after connect | Not needed |
| `twiml` | Inline TwiML (skip webhook) | Could simplify for static responses |
| `fallbackUrl` | Backup TwiML URL | Resilience improvement |
| `applicationSid` | TwiML Application | Not used |
| `trim` | Remove silence from recordings | Only relevant with recording |

### Ending Calls -- `client.calls(sid).update({ status: 'completed' })`

Our implementation correctly uses `status: 'completed'` to terminate calls. The other valid update status is `canceled` (for queued/ringing calls only).

### Rate Limits -- Calls Per Second (CPS)

| Tier | CPS Limit |
|------|-----------|
| Default (new account) | 1 CPS |
| Approved Business Profile | Up to 5 CPS |
| Enterprise (by request) | Higher limits available |

Calls exceeding CPS are queued by Twilio (not rejected). The `queue_time` response field indicates estimated wait in milliseconds.

**Our exposure**: If the demo initiates a batch of calls simultaneously, the 1 CPS default could cause queuing delays. For production, Business Profile approval is needed.

---

## 3. TwiML Verbs

### All Available TwiML Verbs

| Verb | Purpose | Used By Us |
|------|---------|------------|
| `<Response>` | Root element (required) | YES |
| `<Say>` | Text-to-speech | YES (voicemail message) |
| `<Play>` | Pre-recorded audio playback | No |
| `<Gather>` | Collect DTMF keypad input | No |
| `<Record>` | Record caller's voice | No |
| `<Dial>` | Connect to another party | No |
| `<Connect>` | Connect to external system | YES (Media Streams) |
| `<Stream>` | Real-time audio streaming (noun) | YES (within Connect) |
| `<Hangup>` | End the call | YES (after voicemail Say) |
| `<Redirect>` | Transfer to different TwiML | No |
| `<Pause>` | Wait between verbs | No |
| `<Enqueue>` | Place caller in queue | No |
| `<Leave>` | Remove from queue | No |
| `<Refer>` | SIP REFER | No |
| `<Reject>` | Decline call (no billing) | No |
| `<Pay>` | Payment capture | No |

### Our TwiML Usage

**Voicemail path** (machine detected via AnsweredBy):
```xml
<Response>
  <Say>{voicemailMessage}</Say>
  <Hangup />
</Response>
```

**Live call path** (human or unknown):
```xml
<Response>
  <Connect>
    <Stream url="wss://{host}/twilio/media-stream">
      <Parameter name="contactId" value="..." />
      <Parameter name="name" value="..." />
      <!-- ... 16 total custom parameters -->
    </Stream>
  </Connect>
</Response>
```

### Stream Element Attributes (within Connect -- Bidirectional)

| Attribute | Purpose | Our Usage |
|-----------|---------|-----------|
| `url` | WebSocket endpoint (wss:// required) | `wss://{host}/twilio/media-stream` |
| `name` | Stream identifier | Not set |
| `track` | Audio direction (`inbound_track` default) | Not set (default = inbound) |
| `statusCallback` | Stream event webhook | Not set |
| `statusCallbackMethod` | GET or POST | Not set |

### Parameter Element

Child of `<Stream>`. Passes custom key-value pairs to the WebSocket server via the `start` message's `customParameters` object.

**Constraint**: Combined name + value length must stay under 500 characters per parameter.

**Our usage**: We pass 16+ custom parameters including contactId, name, phone, contactType, agentType, therapeuticArea, riskTier, clinical data, behavioral signals, and engagement labels. The behavioral signals and engagement labels are JSON-encoded and URI-encoded, which could approach the 500-character limit for contacts with many signals.

---

## 4. Media Streams -- Bidirectional WebSocket Protocol

This is a critical path for the application. All audio flows through this WebSocket bridge between Twilio and Deepgram.

### Architecture

```
Caller <--PSTN--> Twilio <--WebSocket--> Our Server <--WebSocket--> Deepgram Agent
                          (bidirectional)              (bidirectional)
```

### Audio Format (Immutable)

| Property | Value |
|----------|-------|
| Encoding | `audio/x-mulaw` (G.711 mu-law) |
| Sample Rate | 8000 Hz |
| Channels | 1 (mono) |
| Payload Encoding | Base64 |
| File Headers | **PROHIBITED** (no WAV/RIFF headers) |

### Bidirectional Stream Constraints

- Only **1 bidirectional stream per call**
- Only **inbound track** is received (caller's audio)
- DTMF events are supported (inbound direction only)
- Started exclusively via `<Connect><Stream>` TwiML
- Cannot be started via REST API
- Stopped by: closing WebSocket, ending the call, or updating call with new TwiML

### Message Types -- Twilio to Server

#### 1. `connected` (first message)
```json
{
  "event": "connected",
  "protocol": "Call",
  "version": "1.0.0"
}
```
Confirms WebSocket connection is established. No audio data yet.

**Our handling**: Logged. No action taken. CORRECT.

#### 2. `start` (sent once)
```json
{
  "event": "start",
  "sequenceNumber": "1",
  "streamSid": "MZ...",
  "start": {
    "accountSid": "AC...",
    "streamSid": "MZ...",
    "callSid": "CA...",
    "tracks": ["inbound"],
    "mediaFormat": {
      "encoding": "audio/x-mulaw",
      "sampleRate": 8000,
      "channels": 1
    },
    "customParameters": { /* our Parameter values */ }
  }
}
```

**Our handling**: Extracts streamSid, callSid, customParameters. Creates Deepgram agent connection. Builds/retrieves contact record. CORRECT.

#### 3. `media` (continuous)
```json
{
  "event": "media",
  "sequenceNumber": "3",
  "streamSid": "MZ...",
  "media": {
    "track": "inbound",
    "chunk": "1",
    "timestamp": "5",
    "payload": "base64-encoded-mulaw-audio"
  }
}
```

**Our handling**: Decodes base64 payload to Buffer, forwards to Deepgram. Buffers if Deepgram not ready (max 40 chunks). CORRECT.

**Note**: `media.timestamp` is milliseconds from stream start. We don't use this for synchronization -- could be useful for latency diagnostics.

#### 4. `stop` (stream termination)
```json
{
  "event": "stop",
  "sequenceNumber": "5",
  "streamSid": "MZ...",
  "stop": {
    "accountSid": "AC...",
    "callSid": "CA..."
  }
}
```

**Our handling**: Triggers full post-call pipeline (close Deepgram, classify call, send SMS). Also handled on `socket.close`. Guard via `stopProcessed` flag prevents double-processing. CORRECT.

**Note from docs**: The stop message includes a `stop` object with `accountSid` and `callSid`. Our TypeScript interface (`TwilioStopMessage`) does not define the `stop` sub-object -- it works because we don't access those fields from the stop message (we already have callSid from start). Minor type accuracy issue.

#### 5. `mark` (bidirectional only)
```json
{
  "event": "mark",
  "sequenceNumber": "4",
  "streamSid": "MZ...",
  "mark": {
    "name": "my label"
  }
}
```
Sent by Twilio when audio playback reaches a mark previously sent by our server. This is the acknowledgment that all audio before the mark has been played to the caller.

**Our handling**: We listen for `greeting_done` mark to confirm greeting playback completed, then start silence detection timer and enable barge-in. Also log other marks. CORRECT -- good use of the mark protocol.

#### 6. `dtmf` (bidirectional only)
```json
{
  "event": "dtmf",
  "streamSid": "MZ...",
  "sequenceNumber": "5",
  "dtmf": {
    "track": "inbound_track",
    "digit": "1"
  }
}
```

**Our handling**: Falls through to default case ("Unhandled Twilio event"). We log it but don't process it.

**Gap**: If callers press keypad buttons during the call (e.g., trying to navigate an IVR or press 0 for operator), we silently ignore it. Not critical for our use case but worth noting.

### Message Types -- Server to Twilio

#### 1. `media` (send audio to caller)
```json
{
  "event": "media",
  "streamSid": "MZ...",
  "media": {
    "payload": "base64-encoded-mulaw-audio"
  }
}
```

Audio MUST be mu-law 8000Hz mono with NO file headers (no WAV/RIFF).

**Our handling**: We encode Deepgram TTS audio as base64 and send via this format. We also strip WAV headers if Deepgram sends them (44-byte RIFF header detection). CORRECT.

**Important gotcha we handle**: Deepgram sometimes sends WAV headers despite `container:'none'` config. Our code detects the RIFF magic bytes (`0x52 0x49 0x46 0x46`) and strips the 44-byte header. This is critical -- WAV headers cause garbled audio on Twilio.

#### 2. `mark` (track playback position)
```json
{
  "event": "mark",
  "streamSid": "MZ...",
  "mark": {
    "name": "greeting_done"
  }
}
```

Sent after media messages. Twilio echoes back the mark event when audio playback reaches this point. Used for synchronization.

**Our handling**: We send marks for `greeting_done` and `tts_flush_N` and `hang_up`. CORRECT.

#### 3. `clear` (interrupt playback)
```json
{
  "event": "clear",
  "streamSid": "MZ..."
}
```

Empties Twilio's audio playback buffer immediately. Twilio sends back mark messages for any pending marks that were cleared.

**Our handling**: We send `clear` in `handleUserStartedSpeaking()` to implement barge-in (interrupt agent speech when user starts talking). CORRECT.

### Bidirectional Audio Flow Summary

```
Inbound (caller speaks):
  Twilio -> media event -> base64 decode -> Deepgram STT

Outbound (agent speaks):
  Deepgram TTS -> strip WAV header -> base64 encode -> media event -> Twilio -> caller

Barge-in (user interrupts):
  UserStartedSpeaking -> clear event -> Twilio empties buffer
  Also: clear local response buffer, cancel response gate timer

Mark protocol (synchronization):
  Server sends mark after audio -> Twilio echoes when played -> Server acts on confirmation
```

### Our Response Gate Mechanism

We implement a 150ms response gate to prevent the agent from jumping in on micro-pauses:

1. First TTS chunk arrives from Deepgram
2. Buffered for 150ms (RESPONSE_GATE_MS)
3. If no user speech detected, gate opens and all buffered audio flushes to Twilio
4. Subsequent chunks flow with zero delay
5. Greeting bypasses the gate entirely (zero-latency first impression)

This is a custom mechanism not part of Twilio's protocol -- it sits between Deepgram output and Twilio input.

---

## 5. Call Status Callbacks

### Full Call Status Lifecycle

| Twilio Status | Meaning | Our Mapping | Handled |
|---------------|---------|-------------|---------|
| `queued` | Call waiting in Twilio queue | `initiated` | YES |
| `initiated` | Call created, not yet sent to carrier | `initiated` | YES |
| `ringing` | Destination phone ringing | `ringing` | YES |
| `answered` | Call connected (human or machine) | `connected` | YES |
| `in-progress` | Active call | `connected` | YES |
| `completed` | Call ended normally | `completed` | YES |
| `busy` | Busy signal | `no-answer` | YES |
| `no-answer` | Ring timeout, no answer | `no-answer` | YES |
| `failed` | Call could not be placed | `failed` | YES |
| `canceled` | Call canceled before connect | `failed` | YES |

### Status Callback Events We Subscribe To

`['initiated', 'ringing', 'answered', 'completed']`

**Gap**: We do not subscribe to `busy`, `no-answer`, `failed`, or `canceled` events explicitly in `statusCallbackEvent`. However, Twilio always sends `completed` for terminal states, and our status route handles all statuses via the `TWILIO_STATUS_MAP` regardless. The `completed` callback includes the final status, so we do receive terminal failure statuses.

**Clarification from docs**: The `statusCallbackEvent` parameter controls which *intermediate* events trigger callbacks. The final `completed` event is always sent regardless. So our setup is correct -- we get `initiated`, `ringing`, `answered` as intermediate events, and `completed` as the terminal event (which could have a CallStatus of `completed`, `busy`, `no-answer`, `failed`, or `canceled`).

### Webhook Parameters Received

The status callback POST includes:
- `CallSid` -- call identifier
- `CallStatus` -- current status string
- `CallDuration` -- duration in seconds (populated on completion)
- `To`, `From` -- phone numbers
- `Direction` -- `outbound-api`
- `AnsweredBy` -- AMD result (only if AMD enabled)
- `Timestamp` -- when the event occurred
- Various other fields

### Our Status Handling

We correctly:
- Map Twilio statuses to our internal `CallStatus` type
- Set `connectedAt` when answered/in-progress
- Set `endedAt` for terminal statuses
- Apply failure outcomes (busy/no-answer/failed/canceled -> `no-answer` outcome)
- Log all status transitions

---

## 6. Answering Machine Detection (AMD)

### Current State: DISABLED

Our implementation explicitly disables AMD:
```typescript
// No machineDetection — eliminates 3-7 sec AMD delay on pickup.
// Voicemail detection handled by the Deepgram agent via prompt instructions.
```

### AMD Modes Available

#### Synchronous AMD (default)
- **Parameter**: `machineDetection: 'Enable'` or `machineDetection: 'DetectMessageEnd'`
- **Behavior**: Blocks TwiML execution until detection completes
- **Latency**: 3-7 seconds delay before the caller hears anything
- **AnsweredBy values (Enable)**: `human`, `machine_start`, `fax`, `unknown`
- **AnsweredBy values (DetectMessageEnd)**: `human`, `machine_end_beep`, `machine_end_silence`, `machine_end_other`, `fax`, `unknown`

#### Asynchronous AMD
- **Parameter**: `asyncAmd: true` (in addition to `machineDetection`)
- **Behavior**: Call proceeds immediately; AMD result sent to webhook
- **Latency**: Zero delay -- call connects instantly while AMD runs in background
- **Additional parameter**: `asyncAmdStatusCallback` -- webhook URL for AMD result
- **Webhook payload**: `CallSid`, `AccountSid`, `AnsweredBy`, `MachineDetectionDuration`

### AMD Tuning Parameters

| Parameter | Range | Default | Purpose |
|-----------|-------|---------|---------|
| `machineDetectionTimeout` | 3-59s | 30s | Max time to wait for detection |
| `machineDetectionSpeechThreshold` | 1000-6000ms | 2400ms | Speech duration to classify as machine |
| `machineDetectionSpeechEndThreshold` | 500-5000ms | 1200ms | Silence after speech to end detection |
| `machineDetectionSilenceTimeout` | 2000-10000ms | 5000ms | Initial silence before returning `unknown` |

### Accuracy vs Latency Tradeoffs

| Mode | Latency | Accuracy | Best For |
|------|---------|----------|----------|
| Sync `Enable` | 3-7s | Good | Simple human/machine routing |
| Sync `DetectMessageEnd` | 5-30s | Best | Leaving voicemail messages after beep |
| Async `Enable` | 0s (call connects immediately) | Good | Real-time conversations with fallback |
| Async `DetectMessageEnd` | 0s | Best | Background detection, late-stage routing |
| Disabled (our approach) | 0s | N/A | Agent-based detection via speech analysis |

### Our Approach: Agent-Based Voicemail Detection

Instead of Twilio AMD, we rely on Deepgram's voice agent to detect voicemail through speech analysis. This approach:

**Advantages**:
- Zero latency -- caller hears agent immediately
- No AMD cost (AMD has per-call pricing)
- More natural interaction -- no awkward silence while AMD processes
- Handles edge cases (short personal greetings, business greetings) better through contextual speech analysis

**Disadvantages**:
- Agent may start speaking during voicemail greeting
- No pre-connection machine detection -- Media Stream still established for voicemail calls
- Relies on prompt engineering for detection accuracy
- Uses Deepgram compute for calls that could have been filtered

**Hybrid Alternative (Recommended for production)**:
Use **Async AMD** (`asyncAmd: true`) with `MachineDetection: 'Enable'`. The call connects immediately (zero latency), and when AMD decides it was a machine, we receive a webhook and can:
1. Inject a voicemail message via `InjectAgentMessage`
2. Or end the call gracefully
3. Or switch the Deepgram agent to voicemail-leaving mode

This gives us the best of both worlds: zero latency + Twilio's AMD accuracy running in parallel.

### AnsweredBy Handling in Our Code

File `answered-by.ts` normalizes the `AnsweredBy` value:
- `isMachineAnsweredBy()` -- checks if value starts with `machine` (covers `machine_start`, `machine_end_beep`, `machine_end_silence`, `machine_end_other`)
- `isHumanAnsweredBy()` -- checks for exact `human` match

This code is currently only exercised if `AnsweredBy` is passed via TwiML webhook body (which only happens when AMD is enabled). With AMD disabled, `answeredBy` is always empty.

---

## 7. SMS / Messaging API

### Creating Messages -- `client.messages.create()`

#### Parameters We Use

| Parameter | Our Value | Notes |
|-----------|-----------|-------|
| `to` | Contact phone number | E.164 validated |
| `from` | `process.env.TWILIO_PHONE_NUMBER` | Same number as voice |
| `body` | Template-rendered message | Text content |

#### Parameters Available But Not Used

| Parameter | Purpose | Relevance |
|-----------|---------|-----------|
| `messagingServiceSid` | Managed sending via Messaging Service | Better for A2P compliance |
| `mediaUrl` | MMS attachment URL | Could send documents/images |
| `statusCallback` | Delivery status webhook | Track delivery confirmation |
| `maxPrice` | Maximum price per message | Cost control |
| `validityPeriod` | Message TTL (seconds) | Time-sensitive messages |
| `sendAt` | Scheduled delivery | Requires Messaging Service |

### Message Status Lifecycle

| Status | Meaning |
|--------|---------|
| `accepted` | Messaging Service received request |
| `queued` | Pending dispatch |
| `sending` | In transit to carrier |
| `sent` | Carrier accepted |
| `delivered` | Confirmed receipt by device |
| `undelivered` | Failed after carrier acceptance |
| `failed` | Could not be sent |
| `read` | Opened (WhatsApp/RCS only) |

### Character Limits and Segmentation

| Encoding | Single Segment | Concatenated Segment |
|----------|---------------|---------------------|
| GSM-7 (standard chars) | 160 characters | 153 characters per segment |
| UCS-2 (unicode/emoji) | 70 characters | 67 characters per segment |

Messages are billed per segment. A 200-character GSM-7 message = 2 segments = 2x cost.

**Our exposure**: SMS templates should be reviewed for length. If templates exceed 160 characters (likely for detailed follow-ups), they will be split into multiple segments and billed accordingly.

### Rate Limits

- **Long code (10DLC)**: 1 SMS/second per number (default)
- **Toll-free**: 3 SMS/second
- **Short code**: 100+ SMS/second
- Exceeding limits triggers error `14107` (rate limit exceeded)

**Our exposure**: We send one SMS per completed call, so rate limits are not a concern unless batch-calling many contacts simultaneously.

### A2P 10DLC Compliance (CRITICAL for Production)

All application-generated SMS to US numbers via long code numbers requires A2P 10DLC registration.

#### Registration Requirements

1. **Brand Registration**: Company information, Tax ID (EIN)
   - Up to 5 Brands per Tax ID
   - Standard, Low-Volume Standard, or Sole Proprietor tiers

2. **Campaign Registration**: Message use case, opt-in/opt-out mechanisms
   - Must describe how users opt in
   - Must provide opt-out mechanism (e.g., reply STOP)
   - Must provide help mechanism (e.g., reply HELP)
   - Review takes 10-15 days

#### Throughput Limits by Registration

| Registration Type | Daily Segments (T-Mobile) | Daily Segments (All Carriers) |
|-------------------|--------------------------|-------------------------------|
| Sole Proprietor | ~1,000 | ~3,000 |
| Low-Volume Standard | ~2,000 | ~6,000 |
| Standard (trust-scored) | 2,000 to unlimited | Varies by trust score |

#### Non-Compliance Consequences

- Additional carrier fees for unregistered traffic
- Higher message filtering rates
- Reduced throughput
- Potential number suspension

#### Our Compliance Status

**Action Required**: For production deployment, we must:
1. Register a Brand with Twilio
2. Register a Campaign describing our post-call follow-up SMS use case
3. Implement opt-out handling (STOP keyword)
4. Implement help handling (HELP keyword)
5. Document opt-in mechanism (verbal consent during call or prior written consent)
6. Consider using a Messaging Service SID instead of direct phone number for better deliverability

---

## 8. Recording API

### Not Currently Used

We do not record calls via Twilio's Recording API. Audio is processed in real-time through Media Streams.

### If Needed in Future

| Method | How |
|--------|-----|
| At call creation | `record: true` parameter in `calls.create()` |
| During call | `<Record>` TwiML verb |
| Programmatic | POST to `/Calls/{CallSid}/Recordings` |
| With Start/Stop control | `<Start><Recording>` / `<Stop><Recording>` TwiML |

**Recording + Media Streams**: Recording and Media Streams can run simultaneously. Recording is handled by Twilio (stored on their servers), while Media Streams sends raw audio to your WebSocket. They are independent features.

### Compliance Note
Recording requires consent management. For healthcare (HIPAA) and payment (PCI) contexts, additional compliance measures apply.

### Costs
- Recording: $0.0025/minute
- Storage: $0.0005/minute/month
- Transcription: $0.05/minute

---

## 9. Node.js SDK (twilio npm)

### Current Version
We use `twilio@^5.5.1`. Latest available is `5.13.0`.

### Initialization Pattern (Our Implementation)
```typescript
import twilio from 'twilio';
const client = twilio(accountSid, authToken);
```

### Key API Methods We Use

| Method | Purpose |
|--------|---------|
| `client.calls.create({...})` | Initiate outbound call |
| `client.calls(sid).update({ status: 'completed' })` | End an active call |
| `client.messages.create({...})` | Send SMS |

### SDK Update Recommendation
Consider updating to `^5.13.0` for latest bug fixes and features. The 5.x line has full TypeScript support.

---

## 10. Pricing

### Voice (US)

| Item | Cost |
|------|------|
| Outbound local call | $0.0140/min |
| Inbound local number | $0.0085/min + $1.15/mo per number |
| Toll-free outbound | $0.0140/min |
| Toll-free inbound | $0.0220/min + $2.15/mo per number |
| Media Streams | $0.0040/min (additional) |
| Recording | $0.0025/min |
| Recording storage | $0.0005/min/month |

### SMS (US)

| Item | Cost |
|------|------|
| Outbound SMS (long code) | $0.0083/segment |
| Inbound SMS | $0.0083/segment |
| Outbound MMS | $0.022/message |
| Failed message processing | $0.001/message |

### Carrier Surcharges (per message, in addition to base)

| Carrier | Outbound | Inbound |
|---------|----------|---------|
| AT&T | $0.003 | $0.003 |
| T-Mobile | $0.0045 | $0.0025 |
| Verizon | $0.004 | $0.0065 |

### Cost Per Call Estimate (Our Use Case)

Assuming a 5-minute outbound call with Media Streams + 1 SMS follow-up:
- Voice: 5 min x $0.0140 = $0.070
- Media Streams: 5 min x $0.0040 = $0.020
- SMS (1 segment): $0.0083 + ~$0.004 carrier fee = $0.012
- **Total per call: ~$0.10**

For 1,000 calls/day: **~$100/day** or **~$3,000/month** (Twilio costs only, excludes Deepgram).

---

## 11. Error Codes and Retry Patterns

### Voice Call Errors

| Code | Description | Action |
|------|-------------|--------|
| 10001 | Account not active | Check account status |
| 10004 | Call concurrency limit exceeded | Reduce simultaneous calls |
| 13224 | Invalid/unsupported number | Validate before calling |
| 13225 | Call blocked (fraud flag) | Contact Twilio support |
| 13230 | Geo permission prevents call | Configure geo permissions |
| 13248 | Invalid From number | Verify caller ID |
| 16020 | Conference full | N/A for our use |
| 16021 | Account concurrency limit | Upgrade account |

### SMS Errors

| Code | Description | Action |
|------|-------------|--------|
| 14107 | Send rate limit exceeded | Implement backoff |
| 14108 | From number not SMS capable | Use SMS-capable number |
| 14109 | Reply limit exceeded | Throttle replies |
| 14111 | Invalid To (trial mode) | Verify numbers |

### General/Auth Errors

| Code | Description | Action |
|------|-------------|--------|
| 400 | Bad request | Validate parameters |
| 403 | Forbidden | Check credentials/permissions |
| 404 | Not found | Verify resource SID |
| 11200 | HTTP retrieval failure | Check webhook URL accessibility |

### Our Retry Pattern

In `sms-service.ts`, we implement a single retry with 2-second delay:
```
try send -> fail -> wait 2s -> retry once -> fail -> return error
```

This is reasonable for SMS. For voice calls, we do not retry (correct -- duplicate calls would be confusing).

**Recommendation**: Add exponential backoff for SMS retries and consider inspecting the error code to determine if retry is appropriate (e.g., retry on rate limit `14107`, don't retry on invalid number `13224`).

---

## 12. Gap Analysis: Our Implementation vs Full API

### What We Handle Correctly

| Area | Status | Notes |
|------|--------|-------|
| Call creation with E.164 validation | GOOD | Regex validates format |
| TwiML generation (Connect/Stream/Say/Hangup) | GOOD | Proper XML escaping |
| Media Streams all 5 inbound message types | GOOD | connected, start, media, stop, mark |
| Media Streams outbound: media, mark, clear | GOOD | All three used correctly |
| WAV header stripping | GOOD | Critical fix for Deepgram compatibility |
| Barge-in via clear event | GOOD | Proper implementation |
| Mark-based playback synchronization | GOOD | greeting_done mark pattern |
| Status callback handling for all statuses | GOOD | Complete mapping |
| Call termination via API | GOOD | `status: 'completed'` |
| SMS with retry | GOOD | Single retry with 2s delay |
| Response gate for natural conversation | GOOD | 150ms debounce |

### Gaps and Opportunities

| Gap | Severity | Description |
|-----|----------|-------------|
| DTMF not handled | LOW | `dtmf` events logged but not processed |
| No `fallbackUrl` on call creation | MEDIUM | No resilience if webhook fails |
| No SMS `statusCallback` | MEDIUM | Can't track delivery success |
| No A2P 10DLC registration | HIGH (prod) | Required for production US SMS |
| No opt-out handling (STOP) | HIGH (prod) | TCPA compliance requirement |
| No `stream.statusCallback` | LOW | Can't detect stream errors via webhook |
| `TwilioStopMessage` type incomplete | LOW | Missing `stop` sub-object in interface |
| No Messaging Service SID | MEDIUM | Better deliverability than raw number |
| SDK version behind (5.5.1 vs 5.13.0) | LOW | Missing recent fixes |
| No ring timeout customization | LOW | Default 30s may be too long for some contacts |
| 500-char parameter limit risk | LOW | Behavioral signals JSON could exceed limit |
| No call recording for QA | MEDIUM | May need for compliance/training |

### AMD Decision Analysis

Our decision to disable AMD is sound for the demo context. The tradeoff:

| Factor | AMD Enabled | AMD Disabled (Ours) |
|--------|-------------|---------------------|
| First-word latency | 3-7s delay | 0s |
| Voicemail detection accuracy | ~90-95% | Depends on agent prompt |
| Cost per call | +AMD fee | No additional cost |
| Wasted compute on voicemail | Prevented | Agent processes voicemail calls |
| User experience | Awkward silence | Immediate response |

**Verdict**: For a real-time conversational agent, disabling sync AMD is correct. For production at scale, consider Async AMD as a hybrid approach (see Section 6).

---

## 13. Recommendations

### Immediate (Before Next Demo)

1. **Update SDK**: Bump `twilio` from `^5.5.1` to `^5.13.0`
2. **Add `fallbackUrl`**: Set a static TwiML fallback on `calls.create()` that plays a "please try again later" message if the primary webhook fails
3. **Fix `TwilioStopMessage` type**: Add the `stop` sub-object to match actual Twilio payload

### Pre-Production (Required)

4. **A2P 10DLC Registration**: Register Brand and Campaign with Twilio for SMS compliance
5. **Opt-out Handling**: Implement STOP keyword processing; maintain opt-out list
6. **SMS Delivery Tracking**: Add `statusCallback` to `messages.create()` to track delivery
7. **Use Messaging Service**: Create a Twilio Messaging Service and use `messagingServiceSid` instead of raw `from` number for SMS
8. **Evaluate Async AMD**: Test `asyncAmd: true` with `asyncAmdStatusCallback` as a hybrid approach -- zero latency with background machine detection

### Production Hardening

9. **Call Recording**: Enable dual-channel recording for QA, compliance, and training data
10. **Smart Retry Logic**: Check SMS error codes before retrying (don't retry permanent failures)
11. **Parameter Size Monitoring**: Log warnings if custom stream parameters approach the 500-character limit
12. **Ring Timeout Tuning**: Consider setting `timeout` based on contact type (shorter for HCPs, longer for patients)
13. **DTMF Handling**: Process `dtmf` events -- at minimum, map `0` to "transfer to operator" and `*` to "repeat"
14. **Stream Status Callback**: Set `statusCallback` on the `<Stream>` element to detect stream-level errors (stream-started, stream-stopped, stream-error events)
15. **Webhook Signature Validation**: Validate `X-Twilio-Signature` header on all incoming webhooks to prevent spoofing

---

## Appendix A: Complete WebSocket Message Reference (Quick Reference)

### Twilio -> Server

| Event | When | Key Fields |
|-------|------|------------|
| `connected` | WebSocket opens | `protocol`, `version` |
| `start` | Stream begins | `streamSid`, `callSid`, `mediaFormat`, `customParameters` |
| `media` | Continuous audio | `track`, `chunk`, `timestamp`, `payload` (base64 mulaw) |
| `stop` | Stream ends | `accountSid`, `callSid` |
| `mark` | Playback reached mark | `mark.name` (echoed from server) |
| `dtmf` | Keypad press | `dtmf.track`, `dtmf.digit` |

### Server -> Twilio

| Event | Purpose | Key Fields |
|-------|---------|------------|
| `media` | Send audio to caller | `streamSid`, `media.payload` (base64 mulaw, no headers) |
| `mark` | Track playback position | `streamSid`, `mark.name` |
| `clear` | Interrupt/empty audio buffer | `streamSid` |

---

## Appendix B: Call Flow Sequence

```
1. calls.create() -> Twilio -> rings destination
2. Destination answers -> Twilio hits webhook URL (/twilio/voice)
3. Webhook returns TwiML: <Connect><Stream url="wss://...">
4. Twilio opens WebSocket to our server
5. connected message (WebSocket established)
6. start message (stream metadata + custom params)
7. Our server opens WebSocket to Deepgram
8. media messages flow: Twilio -> Server -> Deepgram (caller audio)
9. Deepgram TTS -> Server -> media messages -> Twilio (agent audio)
10. mark messages for synchronization (greeting_done, etc.)
11. User speaks -> clear message -> barge-in
12. Function calls (hang_up, send_sms, etc.) processed
13. Call ends -> stop message
14. Post-call: classify transcript, send SMS follow-up
15. Status callback confirms final call status
```

---

## Appendix C: Environment Variables Required

| Variable | Purpose |
|----------|---------|
| `TWILIO_ACCOUNT_SID` | Account authentication |
| `TWILIO_AUTH_TOKEN` | Account authentication |
| `TWILIO_PHONE_NUMBER` | From number for calls and SMS |
| `TWILIO_WEBHOOK_URL` | Base URL for voice webhook (must be publicly accessible) |
| `WS_BACKEND_URL` | WebSocket server URL (wss:// for Media Streams) |
