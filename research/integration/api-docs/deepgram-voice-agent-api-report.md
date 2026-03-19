# Deepgram Voice Agent API -- Integration Report

> **Generated:** 2026-03-18
> **Endpoint:** `wss://agent.deepgram.com/v1/agent/converse`
> **Docs:** https://developers.deepgram.com/docs/voice-agent
> **API Reference:** https://developers.deepgram.com/reference/voice-agent/voice-agent

---

## Table of Contents

1. [Connection & Authentication](#1-connection--authentication)
2. [Settings Config -- Full Schema](#2-settings-config--full-schema)
3. [WebSocket Message Types -- Server Events](#3-websocket-message-types--server-events)
4. [WebSocket Message Types -- Client Messages](#4-websocket-message-types--client-messages)
5. [Function Calling Protocol](#5-function-calling-protocol)
6. [STT Models (Listen Provider)](#6-stt-models-listen-provider)
7. [TTS Models (Speak Provider)](#7-tts-models-speak-provider)
8. [LLM Models (Think Provider)](#8-llm-models-think-provider)
9. [Audio Encoding Options](#9-audio-encoding-options)
10. [Rate Limits & Pricing](#10-rate-limits--pricing)
11. [Error Codes](#11-error-codes)
12. [Gap Analysis vs. Current Implementation](#12-gap-analysis-vs-current-implementation)
13. [Sources](#13-sources)

---

## 1. Connection & Authentication

### WebSocket Endpoint

```
wss://agent.deepgram.com/v1/agent/converse
```

### Authentication

Two supported methods:

| Method | Format | Example |
|--------|--------|---------|
| `Authorization` header | `Token <api-key>` or `Bearer <api-key>` | `Authorization: Token dg-xxxx` |
| Query parameter | `?token=<api-key>` | `wss://agent.deepgram.com/v1/agent/converse?token=dg-xxxx` |

### Connection Lifecycle

```
1. Client opens WSS connection with auth header
2. Server sends  --> Welcome { type, request_id }
3. Client sends  --> Settings { ... }          (MUST be first client message)
4. Server sends  --> SettingsApplied { type }
5. Client streams binary audio / Server streams binary TTS audio
6. JSON control messages flow bidirectionally
7. Connection closes (client or server initiated)
```

### Keep-Alive

- Send `{ "type": "KeepAlive" }` every **8 seconds** during periods of no audio transmission
- Server does NOT respond to keep-alive messages
- Not needed during active audio streaming (most voice agent conversations)

---

## 2. Settings Config -- Full Schema

The `Settings` message MUST be the first client message after connection. Only one Settings message per session.

```jsonc
{
  "type": "Settings",

  // --- Optional metadata ---
  "tags": ["string"],                    // Tags for filtered searching/analytics
  "mip_opt_out": false,                  // Opt out of Model Improvement Partnership
  "experimental": false,                 // Enable experimental features

  "flags": {
    "history": true                      // Enable/disable History server events (default: true)
  },

  // --- Audio configuration ---
  "audio": {
    "input": {
      "encoding": "mulaw",              // linear16 | mulaw | alaw | opus | flac | mp3 | amr-nb | amr-wb | ogg-opus | speex | g729
      "sample_rate": 8000               // Hz (default: 16000, common: 8000, 16000, 24000, 44100, 48000)
    },
    "output": {
      "encoding": "mulaw",              // linear16 | mulaw | alaw  (output options are more limited)
      "sample_rate": 8000,              // Hz
      "bitrate": 0,                     // Bits per second (optional)
      "container": "none"               // "none" (default) -- raw audio, no container headers
    }
  },

  // --- Agent configuration ---
  "agent": {
    "language": "en",                   // DEPRECATED -- use listen/speak provider language instead

    // --- Speech-to-Text ---
    "listen": {
      "provider": {
        "type": "deepgram",             // Currently only "deepgram"
        "model": "nova-3",             // nova-3 | nova-2 | flux-general-en | nova-3-medical | etc.
        "version": "v1",               // "v1" or "v2" (Flux uses v2)
        "language": "en",              // BCP-47 language code or "multi" for code-switching
        "smart_format": false,         // Smart formatting (not supported with Flux)
        "keyterms": ["ELEX", "Euloxacaltenamide"]  // Boost recognition of specific terms
      }
    },

    // --- LLM / Reasoning ---
    "think": {
      "provider": {
        "type": "open_ai",             // open_ai | anthropic | google | groq | aws_bedrock
        "model": "gpt-4o-mini",        // Model identifier (see LLM Models section)
        "temperature": 0.7,            // 0-2 (OpenAI), 0-1 (Anthropic), model-dependent
        "reasoning_mode": "medium",    // "low" | "medium" | "high" (reasoning models only)
        "credentials": {}              // AWS Bedrock credentials (see below)
      },
      "endpoint": {                    // Custom/BYO LLM endpoint (optional)
        "url": "https://api.example.com/llm",
        "headers": {
          "authorization": "Bearer {{token}}"
        }
      },
      "prompt": "You are a helpful assistant...",  // System prompt (max 25,000 chars for managed LLMs, unlimited for BYO)
      "context_length": 4096,          // Integer or "max"
      "functions": [                   // Function definitions (see Function Calling section)
        {
          "name": "function_name",
          "description": "What the function does",
          "parameters": {
            "type": "object",
            "properties": { ... },
            "required": [ ... ]
          },
          "endpoint": {                // Optional: server-side execution endpoint
            "url": "https://api.example.com/action",
            "method": "post",
            "headers": { "authorization": "Bearer {{token}}" }
          }
        }
      ]
    },

    // --- Text-to-Speech ---
    "speak": {
      "provider": {
        "type": "deepgram",            // deepgram | open_ai | eleven_labs | cartesia | aws_polly
        "model": "aura-2-thalia-en",   // For deepgram / open_ai
        "model_id": "eleven_turbo_v2_5",  // For eleven_labs / cartesia
        "voice": "alloy",              // For open_ai (string) or cartesia (object: { mode, id })
        "language": "en",              // For deepgram, cartesia, eleven_labs
        "language_code": "en-US",      // For some providers
        "engine": "neural",            // For aws_polly: standard | neural | generative
        "credentials": {}              // AWS Polly credentials
      },
      "endpoint": {                    // Custom TTS endpoint (optional)
        "url": "https://api.example.com/tts",
        "headers": { ... }
      }
    },

    // --- Conversation context (for session continuity) ---
    "context": {
      "messages": [
        // Conversational history
        { "type": "History", "role": "user", "content": "Previous user message" },
        { "type": "History", "role": "assistant", "content": "Previous agent response" },
        // Function call history
        {
          "type": "History",
          "function_calls": [
            {
              "id": "fc_unique_id",
              "name": "function_name",
              "client_side": true,
              "arguments": "{\"param\": \"value\"}",
              "response": "Function result text"
            }
          ]
        }
      ]
    },

    // --- Initial greeting ---
    "greeting": "Hello! How can I help you today?"  // Agent speaks this first (optional)
  }
}
```

### AWS Bedrock Credentials Object

```json
{
  "type": "iam",           // "iam" or "sts"
  "region": "us-east-2",
  "access_key_id": "AKIA...",
  "secret_access_key": "...",
  "session_token": "..."   // Required for "sts" type only
}
```

---

## 3. WebSocket Message Types -- Server Events

All server events are JSON text frames except TTS audio which arrives as binary frames.

### Complete Server Event Reference

| # | Message Type | Fields | Description |
|---|-------------|--------|-------------|
| 1 | `Welcome` | `type`, `request_id` | Confirms WebSocket opened; sent immediately on connect |
| 2 | `SettingsApplied` | `type` | Confirms Settings config accepted and applied |
| 3 | `ConversationText` | `type`, `role`, `content` | Real-time transcribed text from user or agent |
| 4 | `UserStartedSpeaking` | `type` | VAD detected user speech; **client must stop playing agent audio and clear buffer** |
| 5 | `AgentStartedSpeaking` | `type`, `total_latency`, `tts_latency`, `ttt_latency` | Agent began TTS output; includes latency breakdown |
| 6 | `AgentThinking` | `type`, `content` | Agent's internal reasoning (non-verbalized); useful for function selection visibility |
| 7 | `AgentAudioDone` | `type` | Server finished sending final audio segment for current turn |
| 8 | `FunctionCallRequest` | `type`, `functions[]` | Agent needs function(s) executed (see Function Calling) |
| 9 | `FunctionCallResponse` | `type`, `id`, `name`, `content` | Server-side function execution result (when `client_side: false`) |
| 10 | `History` | `type`, `role`, `content` OR `function_calls[]` | Post-hoc transcript of conversation turns (if `flags.history: true`) |
| 11 | `PromptUpdated` | `type` | Confirms UpdatePrompt was applied |
| 12 | `SpeakUpdated` | `type` | Confirms UpdateSpeak was applied |
| 13 | `ThinkUpdated` | `type` | Confirms UpdateThink was applied |
| 14 | `InjectionRefused` | `type`, `message` | InjectAgentMessage rejected (user speaking or agent already responding) |
| 15 | `Error` | `type`, `description`, `code` | Fatal or significant error (see Error Codes) |
| 16 | `Warning` | `type`, `description`, `code` | Non-fatal issue (e.g., poor audio quality) |

### Detailed Message Schemas

#### Welcome
```json
{
  "type": "Welcome",
  "request_id": "fc553ec9-5874-49ca-a47c-b670d525a4b1"
}
```

#### ConversationText
```json
{
  "type": "ConversationText",
  "role": "user",        // "user" or "assistant"
  "content": "I need help with my medication."
}
```
Sent in real time as speech is detected (user) or generated (agent). Distinct from History -- ConversationText is live, History is post-hoc.

#### AgentStartedSpeaking
```json
{
  "type": "AgentStartedSpeaking",
  "total_latency": 0.832,   // Total end-to-end latency in seconds
  "tts_latency": 0.215,     // Text-to-speech processing time
  "ttt_latency": 0.617      // Text-to-text (LLM) processing time
}
```

#### AgentThinking
```json
{
  "type": "AgentThinking",
  "content": "The user is asking about side effects. I should check if this qualifies as an adverse event..."
}
```

#### UserStartedSpeaking
```json
{
  "type": "UserStartedSpeaking"
}
```
**Critical behavior:** On receipt, the client MUST immediately stop playback of agent audio and clear any buffered audio. This enables barge-in / interruption handling.

#### FunctionCallRequest
```json
{
  "type": "FunctionCallRequest",
  "functions": [
    {
      "id": "fc_12345678-90ab-cdef-1234-567890abcdef",
      "name": "report_adverse_event",
      "arguments": "{\"event_description\": \"headache\", \"severity\": \"mild\"}",
      "client_side": true
    }
  ]
}
```

#### History (Conversation)
```json
{
  "type": "History",
  "role": "user",
  "content": "I've been having headaches since starting the medication."
}
```

#### History (Function Call)
```json
{
  "type": "History",
  "function_calls": [
    {
      "id": "fc_12345678",
      "name": "report_adverse_event",
      "client_side": true,
      "arguments": "{\"event_description\": \"headache\"}",
      "response": "Adverse event logged."
    }
  ]
}
```

#### Error
```json
{
  "type": "Error",
  "description": "The Settings message contained invalid values.",
  "code": "INVALID_SETTINGS"
}
```

#### InjectionRefused
```json
{
  "type": "InjectionRefused",
  "message": "Injection refused: agent is currently speaking."
}
```

### Binary Frames (TTS Audio)

TTS audio from the agent arrives as raw binary WebSocket frames in the encoding/sample_rate specified in `audio.output`. No container headers are included (when `container: "none"`). For browser playback, the client must prepend WAV headers.

---

## 4. WebSocket Message Types -- Client Messages

| # | Message Type | Fields | Description |
|---|-------------|--------|-------------|
| 1 | `Settings` | (see Section 2) | Initialize agent configuration; **must be first message** |
| 2 | `KeepAlive` | `type` | Prevent connection timeout during idle periods |
| 3 | `FunctionCallResponse` | `type`, `id`, `name`, `content` | Return result of client-side function execution |
| 4 | `InjectAgentMessage` | `type`, `message` | Force agent to speak a specific statement |
| 5 | `InjectUserMessage` | `type`, `content` | Send text as if user spoke it (no audio needed) |
| 6 | `UpdateSpeak` | `type`, `speak` | Change TTS provider/model mid-conversation |
| 7 | `UpdatePrompt` | `type`, `prompt` | **Append to** (not replace) system prompt |
| 8 | `UpdateThink` | `type`, `think` | **Replace entire** Think provider config (model, prompt, functions) |
| 9 | Binary audio | Raw bytes | Microphone audio in format specified by `audio.input` |

### Detailed Client Message Schemas

#### KeepAlive
```json
{ "type": "KeepAlive" }
```
Send every 8 seconds during idle periods. No server response.

#### FunctionCallResponse
```json
{
  "type": "FunctionCallResponse",
  "id": "fc_12345678-90ab-cdef-1234-567890abcdef",
  "name": "report_adverse_event",
  "content": "Adverse event has been logged in the pharmacovigilance system."
}
```

#### InjectAgentMessage
```json
{
  "type": "InjectAgentMessage",
  "message": "Are you still on the line?"
}
```
Only succeeds during silent moments. Returns `AgentAudioDone` on success, `InjectionRefused` on failure.

#### InjectUserMessage
```json
{
  "type": "InjectUserMessage",
  "content": "I want to enroll in the patient support program."
}
```

#### UpdateSpeak
```json
{
  "type": "UpdateSpeak",
  "speak": {
    "provider": {
      "type": "deepgram",
      "model": "aura-2-andromeda-en"
    }
  }
}
```
Server responds with `SpeakUpdated` after processing remaining audio.

#### UpdatePrompt
```json
{
  "type": "UpdatePrompt",
  "prompt": "The patient has confirmed they are over 18 years of age."
}
```
**ADDITIVE** -- appends to existing prompt, does not replace. Max 25,000 chars for managed LLMs. Server responds with `PromptUpdated`.

#### UpdateThink
```json
{
  "type": "UpdateThink",
  "think": {
    "provider": {
      "type": "anthropic",
      "model": "claude-sonnet-4-5",
      "temperature": 0.5
    },
    "prompt": "New system prompt replaces the old one entirely.",
    "functions": [ ... ]
  }
}
```
**REPLACEMENT** -- replaces the entire Think configuration. Server responds with `ThinkUpdated`.

---

## 5. Function Calling Protocol

### Defining Functions (in Settings)

Functions are defined in `agent.think.functions[]` using JSON Schema format:

```json
{
  "name": "report_adverse_event",
  "description": "Report an adverse event. Call when a patient describes a side effect.",
  "parameters": {
    "type": "object",
    "properties": {
      "event_description": {
        "type": "string",
        "description": "Description of the adverse event"
      },
      "severity": {
        "type": "string",
        "enum": ["mild", "moderate", "severe", "life-threatening"]
      }
    },
    "required": ["event_description", "severity"]
  }
}
```

### Client-Side vs. Server-Side Execution

| Execution Mode | `endpoint` field | `client_side` flag | Who executes? |
|---------------|------------------|-------------------|---------------|
| Client-side | Omitted | `true` | Client handles, sends FunctionCallResponse |
| Server-side | Provided (url, method, headers) | `false` | Server calls endpoint, sends FunctionCallResponse to client |

### Server-Side Function Endpoint Config

```json
{
  "name": "check_inventory",
  "description": "Check drug inventory",
  "parameters": { ... },
  "endpoint": {
    "url": "https://api.example.com/inventory/check",
    "method": "post",
    "headers": {
      "authorization": "Bearer {{token}}"
    }
  }
}
```

### Flow: Client-Side Function Call

```
1. Server --> FunctionCallRequest { functions: [{ id, name, arguments, client_side: true }] }
2. Client executes function locally
3. Client --> FunctionCallResponse { type, id, name, content }
4. Server processes response, agent continues conversation
```

### Flow: Server-Side Function Call

```
1. Server --> FunctionCallRequest { functions: [{ id, name, arguments, client_side: false }] }
2. Server calls the configured endpoint
3. Server --> FunctionCallResponse { type, id, name, content }   (informational, to client)
4. Agent continues conversation using the result
```

### FunctionCallRequest Schema

```json
{
  "type": "FunctionCallRequest",
  "functions": [
    {
      "id": "fc_12345678-90ab-cdef-1234-567890abcdef",
      "name": "report_adverse_event",
      "arguments": "{\"event_description\": \"headache\", \"severity\": \"mild\"}",
      "client_side": true
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique function call identifier (UUID) |
| `name` | string | Function name matching a definition in `think.functions` |
| `arguments` | string | **JSON-encoded string** of parameters |
| `client_side` | boolean | `true` = client must handle; `false` = server handles |

### FunctionCallResponse Schema

```json
{
  "type": "FunctionCallResponse",
  "id": "fc_12345678-90ab-cdef-1234-567890abcdef",
  "name": "report_adverse_event",
  "content": "Adverse event logged successfully."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Must match the `id` from FunctionCallRequest |
| `name` | string | Function name |
| `content` | string | Result text or JSON string; passed to LLM for continuation |

---

## 6. STT Models (Listen Provider)

### Available Models for Voice Agent

| Model | Identifier | Best For | Key Features |
|-------|-----------|----------|--------------|
| **Flux** | `flux-general-en` | Voice agents | Built-in end-of-turn detection, ultra-low latency, English only, uses `version: "v2"` |
| **Nova-3** | `nova-3` | General (recommended) | 53% lower WER, 30+ languages, <300ms latency, multilingual code-switching |
| **Nova-3 Medical** | `nova-3-medical` | Medical/clinical | Optimized for medical terminology |
| **Nova-2** | `nova-2` | General | Mature, many variants |
| **Nova-2 Variants** | `nova-2-phonecall`, `nova-2-voicemail`, `nova-2-medical`, etc. | Domain-specific | phonecall, voicemail, finance, conversationalai, video, medical, drivethru, automotive, atc |
| **Whisper** | `whisper-large` | Batch/pre-recorded | OpenAI Whisper, limited concurrency |

### Listen Provider Config Options

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | `"deepgram"` |
| `model` | string | Model identifier |
| `version` | string | `"v1"` (default) or `"v2"` (Flux) |
| `language` | string | BCP-47 code (`"en"`, `"es"`, `"fr"`, etc.) or `"multi"` for code-switching |
| `smart_format` | boolean | Apply smart formatting (not supported with Flux) |
| `keyterms` | string[] | Boost recognition of specific terms (drug names, acronyms) |

### Nova-3 Multilingual Code-Switching Languages

English, Spanish, French, German, Hindi, Russian, Portuguese, Japanese, Italian, Dutch (10 languages, real-time switching).

---

## 7. TTS Models (Speak Provider)

### Provider Options

| Provider | `type` value | Models | Notes |
|----------|-------------|--------|-------|
| **Deepgram** | `deepgram` | Aura-2 (95 voices), Aura-1 (12 voices) | Native integration, lowest latency |
| **OpenAI** | `open_ai` | `tts-1`, `tts-1-hd` | Voices: alloy, echo, fable, onyx, nova, shimmer |
| **ElevenLabs** | `eleven_labs` | `eleven_turbo_v2_5` | Custom voice cloning, multilingual |
| **Cartesia** | `cartesia` | `sonic-2` | Included in Standard pricing tier |
| **AWS Polly** | `aws_polly` | Various | Engines: standard, neural, generative |

### Aura-2 English Voices (44 voices)

| Model ID | Gender | Age | Accent | Characteristics |
|----------|--------|-----|--------|-----------------|
| `aura-2-amalthea-en` | F | Young Adult | Filipino | Engaging, Natural, Cheerful |
| `aura-2-andromeda-en` | F | Adult | American | Casual, Expressive, Comfortable |
| `aura-2-apollo-en` | M | Adult | American | Confident, Comfortable, Casual |
| `aura-2-arcas-en` | M | Adult | American | Natural, Smooth, Clear, Comfortable |
| `aura-2-aries-en` | M | Adult | American | Warm, Energetic, Caring |
| `aura-2-asteria-en` | F | Adult | American | Clear, Confident, Knowledgeable, Energetic |
| `aura-2-athena-en` | F | Mature | American | Calm, Smooth, Professional |
| `aura-2-atlas-en` | M | Mature | American | Enthusiastic, Confident, Approachable, Friendly |
| `aura-2-aurora-en` | F | Adult | American | Cheerful, Expressive, Energetic |
| `aura-2-callista-en` | F | Adult | American | Clear, Energetic, Professional, Smooth |
| `aura-2-cora-en` | F | Adult | American | Smooth, Melodic, Caring |
| `aura-2-cordelia-en` | F | Young Adult | American | Approachable, Warm, Polite |
| `aura-2-delia-en` | F | Young Adult | American | Casual, Friendly, Cheerful, Breathy |
| `aura-2-draco-en` | M | Adult | British | Warm, Approachable, Trustworthy, Baritone |
| `aura-2-electra-en` | F | Adult | American | Professional, Engaging, Knowledgeable |
| `aura-2-harmonia-en` | F | Adult | American | Empathetic, Clear, Calm, Confident |
| `aura-2-helena-en` | F | Adult | American | Caring, Natural, Positive, Friendly, Raspy |
| `aura-2-hera-en` | F | Adult | American | Smooth, Warm, Professional |
| `aura-2-hermes-en` | M | Adult | American | Expressive, Engaging, Professional |
| `aura-2-hyperion-en` | M | Adult | Australian | Caring, Warm, Empathetic |
| `aura-2-iris-en` | F | Young Adult | American | Cheerful, Positive, Approachable |
| `aura-2-janus-en` | F | Adult | American | Southern, Smooth, Trustworthy |
| `aura-2-juno-en` | F | Adult | American | Natural, Engaging, Melodic, Breathy |
| `aura-2-jupiter-en` | M | Adult | American | Expressive, Knowledgeable, Baritone |
| `aura-2-luna-en` | F | Young Adult | American | Friendly, Natural, Engaging |
| `aura-2-mars-en` | M | Adult | American | Smooth, Patient, Trustworthy, Baritone |
| `aura-2-minerva-en` | F | Adult | American | Positive, Friendly, Natural |
| `aura-2-neptune-en` | M | Adult | American | Professional, Patient, Polite |
| `aura-2-odysseus-en` | M | Adult | American | Calm, Smooth, Comfortable, Professional |
| `aura-2-ophelia-en` | F | Adult | American | Expressive, Enthusiastic, Cheerful |
| `aura-2-orion-en` | M | Adult | American | Approachable, Comfortable, Calm, Polite |
| `aura-2-orpheus-en` | M | Adult | American | Professional, Clear, Confident, Trustworthy |
| `aura-2-pandora-en` | F | Adult | British | Smooth, Calm, Melodic, Breathy |
| `aura-2-phoebe-en` | F | Adult | American | Energetic, Warm, Casual |
| `aura-2-pluto-en` | M | Adult | American | Smooth, Calm, Empathetic, Baritone |
| `aura-2-saturn-en` | M | Adult | American | Knowledgeable, Confident, Baritone |
| `aura-2-selene-en` | F | Adult | American | Expressive, Engaging, Energetic |
| `aura-2-thalia-en` | F | Adult | American | Clear, Confident, Energetic, Enthusiastic |
| `aura-2-theia-en` | F | Adult | Australian | Expressive, Polite, Sincere |
| `aura-2-vesta-en` | F | Adult | American | Natural, Expressive, Patient, Empathetic |
| `aura-2-zeus-en` | M | Adult | American | Deep, Trustworthy, Smooth |

**Additional Aura-2 languages:** Spanish (17 voices), Dutch (9), German (7), Italian (10), French (2), Japanese (5).

### Recommended Voices for Pharma / Patient Support

| Use Case | Recommended Voice | Rationale |
|----------|------------------|-----------|
| Patient support (warm) | `aura-2-harmonia-en` | Empathetic, Clear, Calm, Confident |
| Patient support (caring) | `aura-2-vesta-en` | Natural, Expressive, Patient, Empathetic |
| HCP professional | `aura-2-hera-en` | Smooth, Warm, Professional |
| HCP professional (male) | `aura-2-orpheus-en` | Professional, Clear, Confident, Trustworthy |
| Current: thalia | `aura-2-thalia-en` | Clear, Confident, Energetic, Enthusiastic |

---

## 8. LLM Models (Think Provider)

### Supported Providers & Models

#### OpenAI (`type: "open_ai"`)

| Model | Notes |
|-------|-------|
| `gpt-5-nano` | Smallest, fastest |
| `gpt-5-mini` | |
| `gpt-5` | |
| `gpt-5.1` | |
| `gpt-5.1-chat-latest` | |
| `gpt-5.2-chat-latest` | |
| `gpt-5.2` | |
| `gpt-5.3-chat-latest` | |
| `gpt-5.4` | |
| `gpt-4.1` | |
| `gpt-4.1-mini` | |
| `gpt-4.1-nano` | |
| `gpt-4o` | Current production standard |
| `gpt-4o-mini` | **Currently used in our implementation** |

#### Anthropic (`type: "anthropic"`)

| Model | Notes |
|-------|-------|
| `claude-sonnet-4-5` | Latest Sonnet |
| `claude-4-5-haiku-latest` | Fast, cost-effective |
| `claude-3-5-haiku-latest` | Previous gen Haiku |
| `claude-sonnet-4-20250514` | Dated version |

#### Google (`type: "google"`)

| Model | Notes |
|-------|-------|
| `gemini-3.1-flash-lite` | Fastest |
| `gemini-3-flash-preview` | |
| `gemini-3-pro-preview` | |
| `gemini-2.5-flash-lite` | |
| `gemini-2.5-flash` | |
| `gemini-2.0-flash` | |

#### Groq (`type: "groq"`)

| Model | Notes |
|-------|-------|
| `openai/gpt-oss-20b` | Requires custom endpoint |

#### AWS Bedrock (`type: "aws_bedrock"`)

Requires credentials object with `access_key_id`, `secret_access_key`, `region`, and optionally `session_token`.

### Provider Configuration Details

| Provider | Endpoint Required? | Managed by Deepgram? | Temperature Range |
|----------|-------------------|---------------------|-------------------|
| `open_ai` | Optional | Yes | 0 - 2 |
| `anthropic` | Optional | Yes | 0 - 1 |
| `google` | Optional | Yes | Model-dependent |
| `groq` | **Required** | No | Provider-dependent |
| `aws_bedrock` | **Required** | No | Provider-dependent |

### Think Provider Fallback

The `think` object accepts either a single provider object **or an array** for fallback configuration -- if the primary LLM fails, the next provider in the array is used.

---

## 9. Audio Encoding Options

### Input Encodings

| Encoding | Description | Typical Use |
|----------|-------------|-------------|
| `linear16` | 16-bit PCM, little-endian | Default, high quality |
| `mulaw` | G.711 mu-law | **Telephony (Twilio, PSTN)** |
| `alaw` | G.711 A-law | European telephony |
| `opus` | Opus codec | WebRTC, low bandwidth |
| `ogg-opus` | Opus in OGG container | Browser recording |
| `flac` | FLAC lossless | High quality archival |
| `mp3` | MPEG Audio Layer 3 | Pre-recorded files |
| `amr-nb` | AMR Narrowband | Mobile telephony |
| `amr-wb` | AMR Wideband | Mobile telephony |
| `speex` | Speex codec | Legacy VoIP |
| `g729` | G.729 | Low bandwidth telephony |

### Output Encodings

| Encoding | Description | Notes |
|----------|-------------|-------|
| `linear16` | 16-bit PCM | Default, requires WAV header for browser playback |
| `mulaw` | G.711 mu-law | **Best for telephony output** |
| `alaw` | G.711 A-law | European telephony |

### Common Sample Rates

| Rate | Use Case |
|------|----------|
| 8000 Hz | Telephony (mulaw/alaw) -- **our current config** |
| 16000 Hz | Default for Deepgram STT |
| 24000 Hz | High-quality TTS |
| 44100 Hz | CD quality |
| 48000 Hz | Professional audio |

---

## 10. Rate Limits & Pricing

### Concurrent Connection Limits

| Plan | Voice Agent Connections | STT Streaming | TTS Streaming |
|------|------------------------|---------------|---------------|
| Pay as You Go | 45 | 150 | 45 |
| Growth | 60 | 225 | 45 |
| Enterprise | Starting at 100 | Starting at 300 | Starting at 100 |

### Pricing

| Service | Rate |
|---------|------|
| Voice Agent API | **$4.50 / hour** (flat rate) |
| Enterprise | Custom pricing available |

### Capacity

- Up to **140,000+ concurrent connections** at enterprise scale
- Default **500 concurrent streams** per project, scales on request
- 3x increased rate limits for Voice Agent on Pay-as-You-Go and Growth plans (recent change)

### Rate Limit Error

Exceeding limits returns HTTP `429: Too Many Requests`. Concurrency limits are per **project**, not per API key.

---

## 11. Error Codes

### WebSocket Close Codes

| Code | Meaning | Action |
|------|---------|--------|
| 1000 | Normal closure | None |
| 1006 | Abnormal closure | Network issue; reconnect |
| 1008 | Policy violation | Check API key validity |
| 1011 | Server error | Retry; contact support |

### Voice Agent Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `INTERNAL_SERVER_ERROR` | Server-side processing failure | Retry; contact support with `request_id` |
| `CLIENT_MESSAGE_TIMEOUT` | Server waited too long for client message | Verify timely message transmission |
| `UNPARSABLE_CLIENT_MESSAGE` | Invalid JSON or schema mismatch | Validate JSON format and message types |
| `NON_SETTINGS_MESSAGE_BEFORE_SETTINGS` | Non-Settings message sent before Settings | Always send Settings as first message |
| `SETTINGS_ALREADY_APPLIED` | Duplicate Settings message | Only send one Settings per session |
| `INVALID_SETTINGS` | Settings contained invalid values | Review config against schema |
| `FAILED_TO_LISTEN` | STT connection failed | Verify account access; retry |
| `ASR_CONNECTION_CLOSED` | STT connection dropped | Reconnect session |
| `ASR_DRIVER_TIMEOUT` | No transcript received in time | Verify audio format matches config |
| `USER_AUDIO_FORMAT` | Audio doesn't match declared format | Ensure encoding/sample_rate match Settings |
| `FAILED_TO_SPEAK` | TTS failed after retries and fallbacks | Configure fallback speak provider |
| `FAILED_TO_THINK` | LLM failed after retries | Configure fallback think provider |
| `SERVER_GOING_AWAY` | Server shutting down | Reconnect to new session |
| `NON_EXISTENT_FUNCTION_CALLED` | LLM called undefined function | Verify function definitions in Settings |
| `AGENT_ID_NOT_SUPPORTED` | Agent ID not supported | Authenticate project properly |
| `INVALID_AGENT_ID` | Bad Agent ID format | Verify Agent ID |

### Reconnection Strategy

```
1. On close code 1006/1011 or FAILED_TO_LISTEN/ASR_CONNECTION_CLOSED/SERVER_GOING_AWAY:
   - Reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s)
   - Re-send Settings on new connection
   - Optionally inject conversation history via context.messages

2. On close code 1008 or INVALID_SETTINGS:
   - Do NOT reconnect automatically (auth/config issue)
   - Log error, alert, and fix configuration

3. On FAILED_TO_SPEAK / FAILED_TO_THINK:
   - Consider configuring fallback providers in Settings
```

---

## 12. Gap Analysis vs. Current Implementation

### File: `ws-backend/src/services/deepgram-agent.ts`

### What We Handle vs. What's Available

#### Server Events

| Message Type | We Handle? | Notes |
|-------------|-----------|-------|
| `Welcome` | YES | Log only; we could capture `request_id` for tracing |
| `SettingsApplied` | YES | Triggers `onReady` callback |
| `ConversationText` | YES | Maps role to caller/agent |
| `UserStartedSpeaking` | YES | Triggers callback |
| `AgentStartedSpeaking` | **NO** | **Missing: could capture latency metrics** |
| `AgentThinking` | **NO** | **Missing: could log agent reasoning for debugging** |
| `AgentAudioDone` | YES | Triggers callback |
| `FunctionCallRequest` | YES | Handles both new (functions[]) and legacy format |
| `FunctionCallResponse` (server-sent) | **NO** | Not applicable (all our functions are client-side) |
| `History` | YES | Maps to transcript; correctly avoids triggering VAD |
| `EndOfThought` | YES (no-op) | Silent handling |
| `PromptUpdated` | **NO** | We don't use UpdatePrompt yet |
| `SpeakUpdated` | **NO** | We don't use UpdateSpeak yet |
| `ThinkUpdated` | **NO** | We don't use UpdateThink yet |
| `InjectionRefused` | **NO** | We don't use InjectAgentMessage yet |
| `Error` | YES | Logs error JSON |
| `Warning` | **NO** | **Missing: should handle warnings (e.g., POOR_AUDIO_QUALITY)** |

#### Client Messages We Send

| Message Type | We Send? | Notes |
|-------------|---------|-------|
| `Settings` | YES | Full config on connect |
| Binary audio | YES | mulaw 8kHz |
| `FunctionCallResponse` | YES | For all function calls |
| `KeepAlive` | **NO** | **Missing: should send every 8s during idle** |
| `InjectAgentMessage` | **NO** | Could use for silence re-engagement |
| `InjectUserMessage` | **NO** | Could use for programmatic input |
| `UpdateSpeak` | **NO** | Could use for dynamic voice switching |
| `UpdatePrompt` | **NO** | Could use for dynamic context injection |
| `UpdateThink` | **NO** | Could use for mid-call LLM/function changes |

#### Settings Config Fields Used vs. Available

| Field | We Use? | Current Value | Opportunity |
|-------|---------|---------------|-------------|
| `audio.input.encoding` | YES | `mulaw` | Correct for telephony |
| `audio.input.sample_rate` | YES | `8000` | Correct for telephony |
| `audio.output.encoding` | YES | `mulaw` | Correct for telephony |
| `audio.output.sample_rate` | YES | `8000` | Correct for telephony |
| `audio.output.container` | YES | `"none"` | Correct |
| `agent.language` | YES | `"en"` | **DEPRECATED** -- move to listen/speak provider |
| `agent.listen.provider.type` | YES | `"deepgram"` | Correct |
| `agent.listen.provider.model` | YES | `"nova-3"` | Good choice |
| `agent.listen.provider.keyterms` | **NO** | -- | **Should add**: `["ELEX", "Euloxacaltenamide", "Relutrigine", "Praxis"]` |
| `agent.listen.provider.smart_format` | **NO** | -- | Consider enabling for better formatting |
| `agent.listen.provider.language` | **NO** | -- | Should set `"en"` here instead of top-level |
| `agent.think.provider.type` | YES | `"open_ai"` | Good |
| `agent.think.provider.model` | YES | `"gpt-4o-mini"` | Consider `gpt-4.1-mini` or `gpt-4.1-nano` for newer models |
| `agent.think.provider.temperature` | **NO** | default | **Should set explicitly** for consistent behavior |
| `agent.think.prompt` | YES | Dynamic per contact | Good |
| `agent.think.functions` | YES | 12 functions | Good coverage |
| `agent.think.context_length` | **NO** | default | Consider setting for long conversations |
| `agent.speak.provider.type` | YES | `"deepgram"` | Good |
| `agent.speak.provider.model` | YES | `"aura-2-thalia-en"` | Good; consider alternatives per agent type |
| `agent.greeting` | YES | Dynamic per contact | Good |
| `agent.context.messages` | **NO** | -- | **Could use for session continuity** |
| `tags` | **NO** | -- | **Should add** for analytics (`agentType`, `contactType`) |
| `mip_opt_out` | **NO** | false (default) | **Consider opting out** for HIPAA/pharma compliance |
| `flags.history` | **NO** | true (default) | Current behavior is fine |
| `experimental` | **NO** | false (default) | -- |

### Identified Improvements

#### Priority 1 -- Quick Wins

1. **Add `keyterms`** to listen provider for drug name recognition:
   ```json
   "keyterms": ["ELEX", "Euloxacaltenamide", "Relutrigine", "Praxis", "C-SSRS", "TETRAS"]
   ```

2. **Add `tags`** for analytics:
   ```json
   "tags": ["agentType:patient-support", "contactId:abc123"]
   ```

3. **Set `mip_opt_out: true`** for pharma data privacy compliance.

4. **Handle `Warning` messages** -- log them for audio quality monitoring.

5. **Handle `AgentStartedSpeaking`** -- capture latency metrics for performance monitoring.

6. **Set explicit `temperature`** (e.g., `0.4`) for more consistent medical/regulatory responses.

7. **Capture `request_id`** from Welcome message for tracing and debugging.

#### Priority 2 -- Architectural Improvements

8. **Implement `KeepAlive`** -- send every 8s during idle to prevent connection drops on long calls.

9. **Use `InjectAgentMessage`** for silence detection re-engagement ("Are you still there?").

10. **Use `UpdatePrompt`** to inject real-time context (e.g., screening results, CRM data) mid-call without reconnecting.

11. **Migrate from deprecated `agent.language`** to `listen.provider.language` and `speak.provider.language`.

12. **Add `context.messages`** for warm-transfer scenarios where conversation history should carry over.

#### Priority 3 -- Advanced Features

13. **Consider `flux-general-en`** model for STT -- purpose-built for voice agents with end-of-turn detection.

14. **Dynamic voice switching** with `UpdateSpeak` based on agent type (e.g., warmer voice for patient support, professional voice for HCP).

15. **Think provider fallback** array for LLM resilience (e.g., OpenAI primary, Anthropic fallback).

16. **Server-side function endpoints** for functions that call external APIs (could offload some function handling to Deepgram).

### Authentication Format Note

Our implementation uses `Token ${apiKey}` which works. Deepgram also accepts `Bearer ${apiKey}`. Both are valid.

---

## 13. Sources

- [Voice Agent Getting Started](https://developers.deepgram.com/docs/voice-agent)
- [Voice Agent API Reference](https://developers.deepgram.com/reference/voice-agent/voice-agent)
- [Settings Configuration](https://developers.deepgram.com/docs/voice-agent-settings)
- [Configure the Voice Agent](https://developers.deepgram.com/docs/configure-voice-agent)
- [Server Events (Outputs)](https://developers.deepgram.com/docs/voice-agent-outputs)
- [Client Messages (Inputs)](https://developers.deepgram.com/docs/voice-agent-inputs)
- [Function Calling](https://developers.deepgram.com/docs/voice-agents-function-calling)
- [FunctionCallRequest](https://developers.deepgram.com/docs/voice-agent-function-call-request)
- [FunctionCallResponse](https://developers.deepgram.com/docs/voice-agent-function-call-response)
- [Build a Function Call](https://developers.deepgram.com/docs/build-a-function-call)
- [LLM Models](https://developers.deepgram.com/docs/voice-agent-llm-models)
- [TTS Models (Voice Agent)](https://developers.deepgram.com/docs/voice-agent-tts-models)
- [TTS Voices and Languages](https://developers.deepgram.com/docs/tts-models)
- [STT Model Options](https://developers.deepgram.com/docs/model)
- [Welcome Message](https://developers.deepgram.com/docs/voice-agent-welcome-message)
- [ConversationText](https://developers.deepgram.com/docs/voice-agent-conversation-text)
- [UserStartedSpeaking](https://developers.deepgram.com/docs/voice-agent-user-started-speaking)
- [AgentThinking](https://developers.deepgram.com/docs/voice-agent-agent-thinking)
- [Agent Errors](https://developers.deepgram.com/docs/voice-agent-errors)
- [InjectAgentMessage](https://developers.deepgram.com/docs/voice-agent-inject-agent-message)
- [UpdateSpeak](https://developers.deepgram.com/docs/voice-agent-update-speak)
- [UpdatePrompt](https://developers.deepgram.com/docs/voice-agent-update-prompt)
- [KeepAlive](https://developers.deepgram.com/docs/agent-keep-alive)
- [Audio & Playback](https://developers.deepgram.com/docs/voice-agent-audio-playback)
- [API Rate Limits](https://developers.deepgram.com/reference/api-rate-limits)
- [History Message](https://developers.deepgram.com/docs/voice-agent-history)
- [Feature Overview](https://developers.deepgram.com/docs/voice-agent-feature-overview)
