# OpenAI Chat Completions API -- Integration Report

**Date:** 2026-03-18
**Scope:** Post-call classification for Vi Praxis BioSciences
**Current implementation:** `ws-backend/src/services/groq-classifier.ts`

---

## Table of Contents

1. [Current Implementation Summary](#1-current-implementation-summary)
2. [Chat Completions API Reference](#2-chat-completions-api-reference)
3. [Model Selection Analysis](#3-model-selection-analysis)
4. [Structured Outputs vs JSON Mode](#4-structured-outputs-vs-json-mode)
5. [Batch API for Bulk Classification](#5-batch-api-for-bulk-classification)
6. [Rate Limits and Tiers](#6-rate-limits-and-tiers)
7. [Error Handling and Retry Patterns](#7-error-handling-and-retry-patterns)
8. [Advanced Features](#8-advanced-features)
9. [Recommendations](#9-recommendations)
10. [Migration Checklist](#10-migration-checklist)

---

## 1. Current Implementation Summary

**File:** `ws-backend/src/services/groq-classifier.ts`

| Setting | Current Value | Notes |
|---------|---------------|-------|
| Model | `gpt-4o` | General-purpose flagship |
| Response format | `{ type: 'json_object' }` | JSON mode (not Structured Outputs) |
| Temperature | `0.1` | Low for deterministic classification |
| Timeout | `30000ms` | Per-request timeout |
| Seed | Not set | No reproducibility guarantee |
| Logprobs | Not enabled | Confidence is LLM-self-reported (0-1) |
| Max tokens | Not set | Unbounded output |
| Retries | SDK default (2) | Exponential backoff on 429/5xx |
| Error handling | Single try/catch, returns default result | No retry logic beyond SDK defaults |

**Classification schema:** 20+ fields including outcome (16 enum values), support_pathway (6 enum values), urgency (3 enum values), sentiment (0-100), arrays of strings, nested objects (appointment_details), and booleans (ae_detected).

**Key concern:** We rely on the model to produce correct JSON keys and valid enum values via prompt instruction only. No schema enforcement exists -- invalid enum values are silently coerced (e.g., unrecognized outcome falls back to `'information-provided'`).

---

## 2. Chat Completions API Reference

### Request Parameters (Key Subset)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `model` | string | **required** | Model ID (e.g., `gpt-4o`, `gpt-4.1-mini`) |
| `messages` | array | **required** | Array of message objects (role + content) |
| `response_format` | object | `{ type: "text" }` | `"text"`, `"json_object"`, or `"json_schema"` |
| `temperature` | number | 1.0 | Sampling temperature 0-2. Lower = more deterministic |
| `top_p` | number | 1.0 | Nucleus sampling. Alternative to temperature |
| `max_completion_tokens` | integer | model-dependent | Hard cap on output tokens (replaces deprecated `max_tokens`) |
| `seed` | integer | null | For reproducible outputs. Same seed + params = same `system_fingerprint` |
| `logprobs` | boolean | false | Return log probabilities of output tokens |
| `top_logprobs` | integer | null | 0-20. Number of most likely tokens to return per position |
| `n` | integer | 1 | Number of completions to generate |
| `stop` | string/array | null | Stop sequences |
| `presence_penalty` | number | 0 | -2.0 to 2.0. Penalize tokens already present |
| `frequency_penalty` | number | 0 | -2.0 to 2.0. Penalize frequent tokens |
| `tools` | array | null | List of function/tool definitions |
| `tool_choice` | string/object | "auto" | Controls which tool the model calls |
| `service_tier` | string | "auto" | `"auto"` or `"default"` or `"flex"` |
| `store` | boolean | false | Whether to store the completion for later retrieval |
| `metadata` | object | null | Key-value metadata for stored completions |

### Response Object

```typescript
{
  id: string;                    // "chatcmpl-abc123"
  object: "chat.completion";
  created: number;               // Unix timestamp
  model: string;                 // Actual model used
  choices: [{
    index: number;
    message: {
      role: "assistant";
      content: string | null;
      refusal: string | null;    // Safety refusal (Structured Outputs)
      tool_calls?: ToolCall[];
    };
    finish_reason: "stop" | "length" | "content_filter" | "tool_calls";
    logprobs: {                  // Only if logprobs: true
      content: [{
        token: string;
        logprob: number;
        top_logprobs: [{ token: string; logprob: number }]
      }]
    } | null;
  }];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_tokens_details?: { cached_tokens: number };
    completion_tokens_details?: { reasoning_tokens: number };
  };
  system_fingerprint: string;    // For reproducibility with seed
  service_tier?: string;
}
```

### response_format Options

| Type | Value | Behavior |
|------|-------|----------|
| Plain text | `{ type: "text" }` | Default. Unstructured text output |
| JSON mode | `{ type: "json_object" }` | Valid JSON guaranteed; no schema enforcement |
| Structured Outputs | `{ type: "json_schema", json_schema: { name, schema, strict: true } }` | Valid JSON + strict schema adherence guaranteed |

---

## 3. Model Selection Analysis

### Current Generation Models (as of March 2026)

The newest frontier is GPT-5.4, but GPT-4o, GPT-4.1, and their variants remain actively supported.

#### GPT-4o Family

| Model | Context | Max Output | Input $/MTok | Output $/MTok | Best For |
|-------|---------|------------|-------------|--------------|----------|
| `gpt-4o` | 128K | 16K | $2.50 | $10.00 | Multi-modal, general purpose |
| `gpt-4o-mini` | 128K | 16K | $0.15 | $0.60 | Cost-efficient tasks, classification |

#### GPT-4.1 Family (Released April 2025)

| Model | Context | Max Output | Input $/MTok | Output $/MTok | Best For |
|-------|---------|------------|-------------|--------------|----------|
| `gpt-4.1` | 1M | 32K | $2.00 | $8.00 | Coding, instruction following, long context |
| `gpt-4.1-mini` | 1M | 32K | $0.40 | $1.60 | Balanced cost/quality |
| `gpt-4.1-nano` | 1M | 32K | $0.10 | $0.40 | High-volume simple tasks, classification |

#### GPT-5.4 Family (Current Frontier)

| Model | Context | Max Output | Input $/MTok | Output $/MTok | Best For |
|-------|---------|------------|-------------|--------------|----------|
| `gpt-5.4` | 1M | 128K | $2.50 | $15.00 | Agentic, coding, professional workflows |
| `gpt-5.4-mini` | 400K | 128K | $0.75 | $4.50 | Sub-agents, coding, computer use |
| `gpt-5.4-nano` | 400K | 128K | $0.20 | $1.25 | Simple high-volume tasks |

**All models above support Structured Outputs and function calling.**

### Model Recommendation for Classification

Our classification task has these characteristics:
- Input: ~1-3K tokens (system prompt + transcript)
- Output: ~300-600 tokens (JSON classification)
- Requires: Enum adherence, nested object handling, numerical ranges
- Does NOT require: Multi-modal, reasoning chains, long context, code generation

**Ranking for our use case:**

| Rank | Model | Why | Est. Cost/Call | Latency |
|------|-------|-----|----------------|---------|
| 1 | `gpt-4.1-nano` | Purpose-built for high-volume structured tasks. 75x cheaper than gpt-4o. Supports structured outputs. | ~$0.0004 | Fastest |
| 2 | `gpt-4.1-mini` | Better instruction following than nano, still 6x cheaper than gpt-4o. | ~$0.0014 | Fast |
| 3 | `gpt-4o-mini` | Proven for classification. 17x cheaper than gpt-4o. | ~$0.0005 | Fast |
| 4 | `gpt-4.1` | Overkill for classification but better instruction following than 4o. | ~$0.007 | Moderate |
| 5 | `gpt-4o` (current) | Overpowered and expensive for this task. | ~$0.009 | Moderate |

**Bottom line:** Switch from `gpt-4o` to `gpt-4.1-mini` or `gpt-4.1-nano`. The GPT-4.1 family was specifically designed for better instruction following and structured output compliance. For classification at scale, `gpt-4.1-nano` at $0.10/$0.40 per MTok is the cost-optimal choice -- approximately **25x cheaper** than `gpt-4o` per call with comparable classification accuracy.

**Recommended approach:** Test `gpt-4.1-nano` first. If classification accuracy (especially for edge cases like AE detection and crisis escalation) is insufficient, step up to `gpt-4.1-mini`.

---

## 4. Structured Outputs vs JSON Mode

This is the single highest-impact improvement we can make.

### Current State: JSON Mode

```typescript
// Current implementation
response_format: { type: 'json_object' }
```

**What JSON mode does:**
- Guarantees the response is valid JSON (will parse without error)
- Does NOT enforce any schema
- The model can omit keys, invent extra keys, or hallucinate invalid enum values
- We must manually validate every field (lines 134-214 of groq-classifier.ts)

**What goes wrong:**
- Model returns `"outcome": "information_provided"` (underscore instead of hyphen) -- silently falls back to default
- Model omits `liaison_summary` -- falls back to empty string
- Model returns `"confidence": 95` (0-100 scale) instead of `0.95` (0-1 scale) -- clamped but incorrect
- Model invents `"risk_level": "high"` -- ignored but wastes tokens

### Recommended State: Structured Outputs

```typescript
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';

const ClassificationSchema = z.object({
  outcome: z.enum([
    'ae-reported', 'ae-escalated', 'medical-info-provided',
    'sample-request', 'copay-card-issued', 'hub-enrollment',
    'prior-auth-assist', 'nurse-educator-referral',
    'speaker-program-interest', 'appointment-scheduled',
    'information-provided', 'callback-requested', 'declined',
    'no-answer', 'voicemail', 'crisis-escalation',
  ]),
  confidence: z.number(),
  support_pathway: z.enum([
    'medication-access', 'safety-reporting', 'clinical-education',
    'patient-education', 'adherence-support', 'crisis-support',
  ]).nullable(),
  urgency: z.enum(['routine', 'soon', 'urgent']),
  sentiment: z.number(),
  key_moments: z.array(z.string()),
  contact_concerns: z.array(z.string()),
  behavioral_signals_referenced: z.array(z.string()),
  next_action: z.string(),
  liaison_summary: z.string(),
  context_summary: z.string(),
  what_happened: z.string(),
  what_changed_since_last_touch: z.string(),
  clinical_questions_raised: z.array(z.string()),
  recommended_action: z.string(),
  appointment_details: z.object({
    provider: z.string(),
    specialty: z.string(),
    date: z.string(),
    location: z.string(),
  }).nullable(),
  ae_detected: z.boolean(),
  competitive_intel_notes: z.array(z.string()),
  msl_followup_requested: z.boolean(),
  msl_followup_topic: z.string().nullable(),
  payer_name: z.string().nullable(),
  prior_auth_status: z.enum([
    'not-needed', 'pending', 'approved', 'denied', 'appealing',
  ]).nullable(),
  denial_reason: z.string().nullable(),
});

// Usage
const completion = await openai.beta.chat.completions.parse({
  model: 'gpt-4.1-mini',
  messages: [
    { role: 'system', content: classificationPrompt },
  ],
  response_format: zodResponseFormat(ClassificationSchema, 'call_classification'),
  temperature: 0.1,
}, { timeout: 30000 });

// Parsed and type-safe -- no manual validation needed
const result = completion.choices[0].message.parsed;

// Check for safety refusal
if (completion.choices[0].message.refusal) {
  console.warn('Model refused:', completion.choices[0].message.refusal);
  return createDefaultResult();
}
```

### Comparison Table

| Aspect | JSON Mode (Current) | Structured Outputs (Recommended) |
|--------|---------------------|----------------------------------|
| Valid JSON | Yes | Yes |
| Schema adherence | No -- best effort | **Guaranteed** |
| Enum validation | Manual (lines 134-150) | **Automatic** |
| Missing keys | Possible, must check | **Impossible** |
| Extra keys | Possible, ignored | **Impossible** |
| Type safety | Manual casting | **Zod-derived TypeScript types** |
| Validation code | ~80 lines of manual parsing | **0 lines -- SDK handles it** |
| Refusal detection | No mechanism | **Programmatic via `message.refusal`** |
| Model support | All GPT models | gpt-4o-2024-08-06+, gpt-4o-mini, gpt-4.1-* |
| Performance | ~99% schema compliance | **100% schema compliance** |

### Schema Requirements for Structured Outputs

When using `strict: true`, schemas must follow these rules:

1. **All fields must be in `required` array** -- Zod handles this automatically
2. **`additionalProperties: false`** on every object -- Zod handles this automatically
3. **Root type must be `object`** -- not array or primitive
4. **Supported types:** String, Number, Integer, Boolean, Object, Array, Enum, Null
5. **Nullable fields:** Use `z.string().nullable()` (generates `"type": ["string", "null"]`)
6. **Max nesting depth:** 5 levels (our schema uses 2 -- appointment_details is the deepest)
7. **Max total properties:** 100 across all objects (our schema has ~25 -- well within limits)
8. **No recursive schemas** (not relevant to our use case)
9. **`anyOf` supported** for union types (used internally for nullable)

### What This Eliminates

The entire manual validation block (lines 134-214 of groq-classifier.ts) can be replaced:

- Lines 134-138: Outcome validation -- **eliminated** (enum enforced by schema)
- Lines 141-145: Pathway validation -- **eliminated** (nullable enum enforced)
- Lines 148-150: Urgency validation -- **eliminated** (enum enforced)
- Lines 153-170: Appointment parsing -- **eliminated** (nested object enforced)
- Lines 172-177: Confidence clamping -- **reduced** (type enforced as number, but range still needs prompt guidance)
- Lines 179-184: Sentiment clamping -- **reduced** (same as confidence)
- Lines 187-194: AE detection -- **eliminated** (boolean enforced)
- Lines 196-215: Result assembly -- **simplified** to direct assignment from `parsed`

**Remaining concern:** Structured Outputs enforces types and enums but not numerical ranges (e.g., confidence 0-1, sentiment 0-100). Keep prompt instructions for ranges and add lightweight post-processing for clamping.

---

## 5. Batch API for Bulk Classification

### Overview

The Batch API allows submitting up to 50,000 requests in a single batch for asynchronous processing.

| Feature | Detail |
|---------|--------|
| Pricing | **50% discount** vs synchronous API |
| Endpoint | `/v1/chat/completions` (supported) |
| Format | JSONL file (one request per line) |
| Max batch size | 50,000 requests / 200 MB |
| Completion window | 24 hours (often faster) |
| Rate limits | Separate from synchronous limits, substantially higher |
| Creation rate | Up to 2,000 batches per hour |

### JSONL Request Format

```jsonl
{"custom_id": "call-001", "method": "POST", "url": "/v1/chat/completions", "body": {"model": "gpt-4.1-nano", "messages": [{"role": "system", "content": "...prompt..."}], "response_format": {"type": "json_schema", "json_schema": {"name": "call_classification", "schema": {...}, "strict": true}}, "temperature": 0.1}}
{"custom_id": "call-002", "method": "POST", "url": "/v1/chat/completions", "body": {"model": "gpt-4.1-nano", "messages": [{"role": "system", "content": "...prompt..."}], "response_format": {"type": "json_schema", "json_schema": {"name": "call_classification", "schema": {...}, "strict": true}}, "temperature": 0.1}}
```

### Workflow

1. Upload `.jsonl` file via Files API
2. Create batch with `completion_window: "24h"`
3. Poll status: `validating` -> `in_progress` -> `finalizing` -> `completed`
4. Download results (JSONL, use `custom_id` to map back -- order not guaranteed)
5. Failed requests appear in a separate error file

### Applicability to Our Use Case

| Scenario | Use Batch API? | Rationale |
|----------|---------------|-----------|
| Real-time post-call classification | **No** | Need result within seconds of call ending |
| Nightly re-classification of day's calls | **Yes** | 50% cost savings, non-urgent |
| Historical transcript backfill | **Yes** | Bulk processing, massive cost savings |
| Quality audit re-scoring | **Yes** | Batch + compare results |
| A/B testing model changes | **Yes** | Run same transcripts through two models in batch |

**Recommendation:** Implement batch classification as an optional mode for non-real-time scenarios. The 50% cost discount is significant at scale. For our real-time post-call flow, continue using synchronous API.

---

## 6. Rate Limits and Tiers

### Tier Qualification

| Tier | Requirement | Monthly Usage Limit |
|------|------------|-------------------|
| Free | Allowed geography | $100/month |
| Tier 1 | $5 paid | $100/month |
| Tier 2 | $50 paid + 7 days | $500/month |
| Tier 3 | $100 paid + 7 days | $1,000/month |
| Tier 4 | $250 paid + 14 days | $5,000/month |
| Tier 5 | $1,000 paid + 30 days | $200,000/month |

Tier upgrades are automatic as spending increases.

### Rate Limit Headers

Every API response includes these headers:

| Header | Description |
|--------|-------------|
| `x-ratelimit-limit-requests` | Max RPM for this model |
| `x-ratelimit-remaining-requests` | Remaining requests in current window |
| `x-ratelimit-reset-requests` | Time until request limit resets |
| `x-ratelimit-limit-tokens` | Max TPM for this model |
| `x-ratelimit-remaining-tokens` | Remaining tokens in current window |
| `x-ratelimit-reset-tokens` | Time until token limit resets |

### Capacity Planning

For post-call classification:
- Average call volume: ~100-500 calls/day (demo scale)
- Tokens per classification: ~2,000 input + ~500 output = ~2,500 total
- At 500 calls/day: ~1.25M tokens/day
- At Tier 1 with `gpt-4.1-nano`: Well within limits

Even at production scale (10,000 calls/day = 25M tokens/day), Tier 3+ handles this comfortably.

---

## 7. Error Handling and Retry Patterns

### Error Codes

| HTTP Code | Error Type | Cause | Action |
|-----------|-----------|-------|--------|
| 400 | `BadRequestError` | Malformed request, invalid params | Fix request, do not retry |
| 401 | `AuthenticationError` | Invalid/expired API key | Check API key, do not retry |
| 403 | `PermissionDeniedError` | IP not allowed, region blocked | Check permissions, do not retry |
| 404 | `NotFoundError` | Invalid model or endpoint | Fix model name, do not retry |
| 429 | `RateLimitError` | Rate limit or quota exceeded | Retry with exponential backoff |
| 500 | `InternalServerError` | OpenAI server issue | Retry with backoff |
| 502 | `BadGateway` | Gateway issue | Retry with backoff |
| 503 | `ServiceUnavailableError` | Engine overloaded | Retry with backoff, reduce rate |

### SDK Default Retry Behavior

The OpenAI Node.js SDK automatically retries:
- **Connection errors** (network failures)
- **408** Request Timeout
- **409** Conflict
- **429** Rate Limited
- **>=500** Server errors

Default: **2 retries** with short exponential backoff.

### Recommended Error Handling Pattern

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3,           // Increase from default 2
  timeout: 30_000,         // 30s timeout (our current setting)
});

try {
  const completion = await openai.beta.chat.completions.parse({
    model: 'gpt-4.1-mini',
    messages: [...],
    response_format: zodResponseFormat(ClassificationSchema, 'call_classification'),
    temperature: 0.1,
  });

  if (completion.choices[0].message.refusal) {
    // Safety refusal -- model declined to classify
    console.warn('[Classifier] Model refused:', completion.choices[0].message.refusal);
    return createDefaultResult();
  }

  return completion.choices[0].message.parsed;

} catch (error) {
  if (error instanceof OpenAI.APIError) {
    console.error(`[Classifier] API Error ${error.status}: ${error.message}`);

    if (error.status === 429) {
      // Rate limited -- SDK already retried, this is the final failure
      // Log for monitoring; consider queue-based retry
    }
  } else if (error instanceof OpenAI.APIConnectionTimeoutError) {
    console.error('[Classifier] Timeout after 30s');
    // Consider increasing timeout for complex transcripts
  }

  return createDefaultResult();
}
```

### Our 30-Second Timeout Assessment

| Factor | Assessment |
|--------|-----------|
| Typical classification latency | 2-8 seconds for gpt-4o, 1-4 seconds for gpt-4.1-mini/nano |
| Our transcript size | 1-3K tokens input, ~500 tokens output |
| 30s timeout | **Generous but appropriate** as a safety net |
| Recommendation | Keep 30s. Could reduce to 15s with gpt-4.1-nano but not worth the risk |

---

## 8. Advanced Features

### 8.1 Seed Parameter for Reproducibility

```typescript
const completion = await openai.chat.completions.create({
  model: 'gpt-4.1-mini',
  messages: [...],
  seed: 42,
  temperature: 0.1,
});

// Check system_fingerprint to verify determinism
console.log(completion.system_fingerprint); // "fp_abc123"
```

- Same `seed` + same parameters + same `system_fingerprint` = deterministic output
- `system_fingerprint` changes when OpenAI updates model infrastructure
- **Use case for us:** Reproducible classifications for audit/compliance. Set a fixed seed per call ID for reproducibility.
- **Limitation:** Not a guarantee -- infrastructure changes can alter fingerprint

### 8.2 Logprobs for Confidence Estimation

Currently, our confidence score is self-reported by the model (`"confidence": 0.85`). This is unreliable -- LLMs are poorly calibrated at self-assessing certainty.

Logprobs provide the actual model probability for each output token:

```typescript
const completion = await openai.chat.completions.create({
  model: 'gpt-4.1-mini',
  messages: [...],
  logprobs: true,
  top_logprobs: 5,
});

// Each token in the output has log probabilities
const tokenProbs = completion.choices[0].logprobs.content;
// tokenProbs[i].logprob = log probability of token i
// tokenProbs[i].top_logprobs = top 5 alternative tokens with their probs
```

**How to compute a real confidence score from logprobs:**

1. Find the token(s) where the model outputs the outcome value (e.g., `"ae-reported"`)
2. Look at `Math.exp(logprob)` for those tokens -- this is the true model probability
3. Check `top_logprobs` to see what alternatives the model considered
4. If the top alternative has a similar probability, confidence is genuinely low

**Example:** If the model outputs `"ae-reported"` with logprob `-0.05` (probability 95%) and the top alternative is `"ae-escalated"` with logprob `-3.0` (probability 5%), that's a genuinely high-confidence classification.

**Limitation with Structured Outputs:** When using `response_format: json_schema`, logprobs reflect the constrained generation (model can only output valid tokens). This makes logprobs less informative for confidence because the model is forced into valid enum values regardless.

**Recommendation:** Use logprobs with JSON mode or as a secondary confidence signal, not as a replacement for self-reported confidence when using Structured Outputs.

### 8.3 Token Usage Tracking

```typescript
const completion = await openai.chat.completions.create({...});

console.log({
  promptTokens: completion.usage.prompt_tokens,
  completionTokens: completion.usage.completion_tokens,
  totalTokens: completion.usage.total_tokens,
  cachedTokens: completion.usage.prompt_tokens_details?.cached_tokens,
});
```

**Recommendation:** Log token usage per classification for cost monitoring and anomaly detection (e.g., a 10K token transcript that should have been truncated).

### 8.4 Service Tier

```typescript
const completion = await openai.chat.completions.create({
  model: 'gpt-4.1-mini',
  service_tier: 'auto',  // or 'default' or 'flex'
  ...
});
```

- `"default"`: Standard latency and throughput
- `"auto"`: May route to faster infrastructure when available
- `"flex"`: Lower priority, potential cost savings (similar to Batch but synchronous)

### 8.5 Stored Completions

```typescript
const completion = await openai.chat.completions.create({
  model: 'gpt-4.1-mini',
  store: true,
  metadata: {
    call_id: 'call-001',
    contact_id: 'contact-123',
    classification_version: 'v2',
  },
  ...
});

// Later: retrieve, list, or delete stored completions
const stored = await openai.chat.completions.retrieve(completion.id);
```

**Use case for us:** Store classifications for audit trail. Metadata allows filtering by call_id, contact_id, or classification version.

---

## 9. Recommendations

### Priority 1: Switch to Structured Outputs (HIGH IMPACT)

**What:** Replace `{ type: 'json_object' }` with `zodResponseFormat` + `client.beta.chat.completions.parse()`

**Why:**
- Eliminates ~80 lines of manual validation code
- Guarantees schema compliance (no more silent enum fallbacks)
- Type-safe parsed response (no more `as Record<string, unknown>` casting)
- Programmatic refusal detection
- Zero risk of malformed classification reaching the dashboard

**Effort:** Medium (define Zod schema, replace API call, simplify post-processing)

### Priority 2: Switch Model to gpt-4.1-mini or gpt-4.1-nano (HIGH IMPACT)

**What:** Change `model: 'gpt-4o'` to `model: 'gpt-4.1-mini'` (or `gpt-4.1-nano`)

**Why:**
- GPT-4.1 family has better instruction following (purpose-built for structured tasks)
- `gpt-4.1-mini` is **6x cheaper** than `gpt-4o` ($0.40/$1.60 vs $2.50/$10.00)
- `gpt-4.1-nano` is **25x cheaper** than `gpt-4o` ($0.10/$0.40 vs $2.50/$10.00)
- Faster response times (smaller model = lower latency)
- Classification accuracy is comparable for well-prompted structured tasks

**Effort:** Low (change one string, run validation tests)

**Validation plan:** Run 50 representative transcripts through both models, compare classification accuracy on outcome, urgency, and ae_detected.

### Priority 3: Add Seed for Reproducibility (LOW EFFORT)

**What:** Add `seed: hashOfCallId` to the API call

**Why:** Enables reproducible classifications for audit and debugging

**Effort:** Trivial (one parameter)

### Priority 4: Track Token Usage (LOW EFFORT)

**What:** Log `completion.usage` after each classification

**Why:** Cost monitoring, anomaly detection, capacity planning

**Effort:** Trivial (add logging after API call)

### Priority 5: Set max_completion_tokens (LOW EFFORT)

**What:** Add `max_completion_tokens: 2000` to prevent runaway generation

**Why:** Safety net against unexpectedly long outputs. Our classification JSON is typically 300-600 tokens.

**Effort:** Trivial (one parameter)

### Priority 6: Increase SDK Retries (LOW EFFORT)

**What:** Set `maxRetries: 3` on the OpenAI client constructor

**Why:** One more retry attempt for transient failures. Default is 2.

**Effort:** Trivial (one parameter on client init)

### Priority 7: Implement Batch Classification (MEDIUM EFFORT, FUTURE)

**What:** Add a batch classification pipeline for non-real-time scenarios

**Why:** 50% cost savings for historical backfill, re-classification, QA audits

**Effort:** Medium (JSONL generation, file upload, polling, result mapping)

**When:** After core classification is stable with Structured Outputs

### Cost Impact Summary

| Scenario | Current (gpt-4o, JSON mode) | Recommended (gpt-4.1-nano, Structured Outputs) | Savings |
|----------|---------------------------|-----------------------------------------------|---------|
| Per call (~2.5K tokens) | ~$0.009 | ~$0.0004 | 96% |
| 500 calls/day | ~$4.50/day | ~$0.20/day | $4.30/day |
| 10,000 calls/day | ~$90/day | ~$4/day | $86/day |
| With Batch API (50% off) | N/A | ~$2/day (batch mode) | 98% |

---

## 10. Migration Checklist

### Phase 1: Structured Outputs + Model Switch

- [ ] Install/confirm `zod` dependency in ws-backend
- [ ] Define `ClassificationSchema` as a Zod object matching current JSON structure
- [ ] Replace `openai.chat.completions.create()` with `openai.beta.chat.completions.parse()`
- [ ] Replace `response_format: { type: 'json_object' }` with `zodResponseFormat(ClassificationSchema, 'call_classification')`
- [ ] Add refusal handling (`completion.choices[0].message.refusal`)
- [ ] Remove manual validation/parsing block (lines 134-214)
- [ ] Map `completion.choices[0].message.parsed` directly to `ClassificationResult`
- [ ] Keep clamping for confidence (0-1) and sentiment (0-100) as post-processing
- [ ] Switch model from `gpt-4o` to `gpt-4.1-mini`
- [ ] Add `seed` parameter (hash of call ID or fixed value)
- [ ] Add `max_completion_tokens: 2000`
- [ ] Add token usage logging
- [ ] Set `maxRetries: 3` on OpenAI client
- [ ] Run validation suite against 50+ representative transcripts
- [ ] Compare classification accuracy: gpt-4o vs gpt-4.1-mini vs gpt-4.1-nano

### Phase 2: Monitoring and Optimization

- [ ] Add token usage dashboard/logging
- [ ] Monitor classification latency (p50, p95, p99)
- [ ] Track refusal rates
- [ ] Set up alerts for error rates > threshold
- [ ] Evaluate gpt-4.1-nano if gpt-4.1-mini accuracy is strong

### Phase 3: Batch API (Future)

- [ ] Implement JSONL generation for batch classification
- [ ] Build batch submission and polling workflow
- [ ] Add result mapping (custom_id -> call record)
- [ ] Deploy for nightly re-classification or historical backfill

---

## Sources

- OpenAI Node.js SDK: https://github.com/openai/openai-node
- Structured Outputs Guide: https://developers.openai.com/docs/guides/structured-outputs
- Function Calling Guide: https://developers.openai.com/docs/guides/function-calling
- Batch API Guide: https://developers.openai.com/docs/guides/batch
- Rate Limits Guide: https://developers.openai.com/docs/guides/rate-limits
- Error Codes: https://developers.openai.com/docs/guides/error-codes
- Models Reference: https://developers.openai.com/docs/models
- Deprecations: https://developers.openai.com/docs/deprecations
- Latency Optimization: https://developers.openai.com/docs/guides/latency-optimization
