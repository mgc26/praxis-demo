# Databricks REST API Integration Report for Vi Operate

**Prepared:** 2026-03-18
**Context:** Greenfield integration with Databricks as the data persistence and analytics layer for Vi Operate. Ambit (consulting partner) is building data foundations on Databricks. Backend is Node.js/TypeScript.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Node.js Client Strategy](#2-nodejs-client-strategy)
3. [SQL Statement Execution API](#3-sql-statement-execution-api)
4. [Delta Table Schemas for Vi Operate](#4-delta-table-schemas-for-vi-operate)
5. [WRITE: Pushing Data into Delta Lake](#5-write-pushing-data-into-delta-lake)
6. [READ: Pre-Call Enrichment Queries](#6-read-pre-call-enrichment-queries)
7. [Jobs API and TRIGGER: Batch Outbound Call Notifications](#7-jobs-api-and-trigger-batch-outbound-call-notifications)
8. [Unity Catalog REST API](#8-unity-catalog-rest-api)
9. [Delta Sharing: Cross-Org Data Access](#9-delta-sharing-cross-org-data-access)
10. [Rate Limits](#10-rate-limits)
11. [Error Handling and Retry Patterns](#11-error-handling-and-retry-patterns)
12. [Implementation Roadmap](#12-implementation-roadmap)

---

## 1. Authentication

### Recommended: OAuth 2.0 M2M (Service Principal)

Databricks recommends OAuth 2.0 over Personal Access Tokens for automated systems.

**Setup Steps:**

1. Create a Databricks service principal via the account console (Settings > Identity and access > Service principals)
2. Generate OAuth client credentials:
   - Navigate to the service principal's **Secrets** tab
   - Click "Generate secret" (max lifetime: 730 days)
   - Copy the `client_id` and `client_secret` immediately (secret shown only once)
   - A service principal can hold up to 5 OAuth secrets
3. Assign the service principal to the target workspace with appropriate permissions

**Token Endpoint URLs:**

```
# Account-level operations
POST https://accounts.cloud.databricks.com/oidc/accounts/{account-id}/v1/token

# Workspace-level operations (what we'll use for SQL, Jobs, Unity Catalog)
POST https://{workspace-host}/oidc/v1/token
```

**Token Request:**

```bash
curl --request POST \
  --url https://{workspace-host}/oidc/v1/token \
  --user "$CLIENT_ID:$CLIENT_SECRET" \
  --data 'grant_type=client_credentials&scope=all-apis'
```

**Token Response:**

```json
{
  "access_token": "eyJraWQiOiJkYTA4ZTVjZ...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

- Tokens expire after **1 hour**; re-request via the same credential exchange
- The only supported scope is `all-apis` (grants access to all APIs the service principal has permissions for)

**Environment Variables (for our Node.js service):**

```bash
DATABRICKS_HOST=https://dbc-a1b2345c-d6e7.cloud.databricks.com
DATABRICKS_CLIENT_ID=<service-principal-client-id>
DATABRICKS_CLIENT_SECRET=<service-principal-secret>
DATABRICKS_SQL_WAREHOUSE_ID=<warehouse-id>
```

### Legacy: Personal Access Token (PAT)

For development/testing only. Pass as `Authorization: Bearer {pat}` header.

---

## 2. Node.js Client Strategy

### There Is No Official Databricks REST SDK for Node.js

Databricks provides official SDKs for **Python, Java, Go, and R only**. There is no JavaScript/TypeScript SDK that covers the full API surface (Jobs, Unity Catalog, SQL Statements, Delta Sharing).

### What Exists for Node.js

| Package | Coverage | Use For |
|---------|----------|---------|
| `@databricks/sql` (v1.13.0) | SQL warehouse connectivity via Thrift/ODBC | High-throughput queries, streaming results |
| **Direct REST API calls** | Full API surface | Jobs, Unity Catalog, Delta Sharing, SQL Statement Execution |

### Recommended Architecture

Build a thin TypeScript REST client wrapper around `fetch`/`axios`:

```typescript
// databricks-client.ts
interface DatabricksConfig {
  host: string;          // e.g., "https://dbc-xxx.cloud.databricks.com"
  clientId: string;
  clientSecret: string;
  warehouseId: string;
}

class DatabricksClient {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(private config: DatabricksConfig) {}

  private async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry - 60_000) {
      return this.accessToken;
    }
    const resp = await fetch(`${this.config.host}/oidc/v1/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(
          `${this.config.clientId}:${this.config.clientSecret}`
        ).toString('base64'),
      },
      body: 'grant_type=client_credentials&scope=all-apis',
    });
    const data = await resp.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + data.expires_in * 1000;
    return this.accessToken!;
  }

  async request(method: string, path: string, body?: unknown): Promise<any> {
    const token = await this.getToken();
    const resp = await fetch(`${this.config.host}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new DatabricksApiError(resp.status, err);
    }
    return resp.json();
  }
}
```

Additionally, use `@databricks/sql` for the SQL connector path when you need high-throughput result streaming:

```typescript
import { DBSQLClient } from '@databricks/sql';

const client = new DBSQLClient();
await client.connect({
  host: process.env.DATABRICKS_HOST!.replace('https://', ''),
  path: `/sql/2.0/warehouses/${process.env.DATABRICKS_SQL_WAREHOUSE_ID}`,
  token: '<pat-or-oauth-token>',
});
const session = await client.openSession();
const op = await session.executeStatement('SELECT * FROM vi_operate.call_outcomes LIMIT 10');
const rows = await op.fetchAll();
await op.close();
await session.close();
await client.close();
```

---

## 3. SQL Statement Execution API

This is the primary API for reading from and writing to Delta Lake tables.

### Endpoints

| Operation | Method | Path |
|-----------|--------|------|
| Execute Statement | POST | `/api/2.0/sql/statements` |
| Get Statement Status/Result | GET | `/api/2.0/sql/statements/{statement_id}` |
| Cancel Statement | POST | `/api/2.0/sql/statements/{statement_id}/cancel` |
| Get Result Chunk | GET | `/api/2.0/sql/statements/{statement_id}/result/chunks/{chunk_index}` |

### Execute Statement Request Schema

```typescript
interface ExecuteStatementRequest {
  warehouse_id: string;                      // REQUIRED - SQL warehouse ID
  statement: string;                         // REQUIRED - SQL statement to execute
  catalog?: string;                          // Default catalog context
  schema?: string;                           // Default schema context
  parameters?: StatementParameter[];         // Parameterized query values
  wait_timeout?: string;                     // "0s" or "5s"-"50s" (default: "10s")
  on_wait_timeout?: 'CONTINUE' | 'CANCEL';  // Default: CONTINUE
  disposition?: 'INLINE' | 'EXTERNAL_LINKS'; // Default: INLINE (max 25 MiB)
  format?: 'JSON_ARRAY' | 'ARROW_STREAM' | 'CSV'; // Default: JSON_ARRAY
  byte_limit?: number;                       // Max bytes to return
  row_limit?: number;                        // Max rows to return
  query_tags?: { key: string; value: string }[]; // Cost attribution tags
}

interface StatementParameter {
  name: string;       // Parameter name (referenced as :name in SQL)
  value: string;      // Parameter value (always a string)
  type?: string;      // SQL type, e.g., "DECIMAL(18,2)", "DATE", "INT" (default: "STRING")
}
```

### Execute Statement Response Schema

```typescript
interface StatementResponse {
  statement_id: string;
  status: {
    state: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED' | 'CLOSED';
    error?: {
      error_code: string;
      message: string;
    };
  };
  manifest?: {
    format: 'JSON_ARRAY' | 'ARROW_STREAM' | 'CSV';
    schema: {
      column_count: number;
      columns: ColumnInfo[];
    };
    total_chunk_count: number;
    total_row_count: number;
    total_byte_count?: number;
    truncated: boolean;
    chunks: ChunkInfo[];
  };
  result?: {
    chunk_index: number;
    row_offset: number;
    row_count: number;
    byte_count?: number;
    data_array?: string[][];              // For INLINE disposition
    external_links?: ExternalLink[];      // For EXTERNAL_LINKS disposition
    next_chunk_index?: number;
    next_chunk_internal_link?: string;    // Relative URL to fetch next chunk
  };
}

interface ColumnInfo {
  name: string;
  position: number;
  type_name: string;    // e.g., "LONG", "STRING", "DECIMAL", "DATE", "TIMESTAMP"
  type_text: string;    // e.g., "BIGINT", "DECIMAL(18,2)"
  type_precision?: number;
  type_scale?: number;
  type_interval_type?: string;
}

interface ChunkInfo {
  chunk_index: number;
  row_count: number;
  row_offset: number;
  byte_count?: number;
}

interface ExternalLink {
  external_link: string;            // Pre-signed URL for download (DO NOT send Auth header)
  expiration: string;               // Timestamp when URL expires
  http_headers?: Record<string, string>;
  chunk_index: number;
  row_offset: number;
  row_count: number;
  byte_count: number;
  next_chunk_index?: number;
  next_chunk_internal_link?: string;
}
```

### Statement States

| State | Description |
|-------|-------------|
| `PENDING` | Statement queued, warehouse may be starting |
| `RUNNING` | Statement actively executing |
| `SUCCEEDED` | Execution complete, results available |
| `FAILED` | Execution failed (check `status.error`) |
| `CANCELED` | Statement was canceled |
| `CLOSED` | Results have been consumed or expired |

### Async Polling Pattern

```typescript
async function executeAndWait(
  client: DatabricksClient,
  sql: string,
  params?: StatementParameter[],
  maxWaitMs = 120_000
): Promise<StatementResponse> {
  // Step 1: Submit with short wait
  const resp = await client.request('POST', '/api/2.0/sql/statements', {
    warehouse_id: process.env.DATABRICKS_SQL_WAREHOUSE_ID,
    catalog: 'vi_operate',
    schema: 'prod',
    statement: sql,
    parameters: params,
    wait_timeout: '50s',        // Max allowed inline wait
    on_wait_timeout: 'CONTINUE', // Don't cancel, we'll poll
    disposition: 'INLINE',
    format: 'JSON_ARRAY',
  });

  // Step 2: If completed immediately, return
  if (resp.status.state === 'SUCCEEDED') return resp;
  if (resp.status.state === 'FAILED') throw new Error(resp.status.error?.message);
  if (resp.status.state === 'CANCELED') throw new Error('Statement canceled');

  // Step 3: Poll until complete
  const deadline = Date.now() + maxWaitMs;
  const statementId = resp.statement_id;
  while (Date.now() < deadline) {
    await sleep(1000); // Poll every 1s
    const poll = await client.request('GET', `/api/2.0/sql/statements/${statementId}`);
    if (poll.status.state === 'SUCCEEDED') return poll;
    if (poll.status.state === 'FAILED') throw new Error(poll.status.error?.message);
    if (poll.status.state === 'CANCELED') throw new Error('Statement canceled');
  }
  // Timeout: cancel the statement
  await client.request('POST', `/api/2.0/sql/statements/${statementId}/cancel`);
  throw new Error('Statement execution timed out');
}
```

### Chunked Result Retrieval

When results exceed the inline size, follow `next_chunk_internal_link`:

```typescript
async function fetchAllChunks(
  client: DatabricksClient,
  initialResponse: StatementResponse
): Promise<string[][]> {
  let allRows: string[][] = initialResponse.result?.data_array ?? [];
  let nextLink = initialResponse.result?.next_chunk_internal_link;

  while (nextLink) {
    const chunk = await client.request('GET', nextLink);
    allRows = allRows.concat(chunk.data_array ?? []);
    nextLink = chunk.next_chunk_internal_link;
  }
  return allRows;
}
```

### Warehouse Auto-Start Behavior

- If a SQL warehouse is **stopped** and a statement is submitted, the warehouse **auto-starts**.
- Serverless warehouses offer "instant and elastic compute" -- typical cold start is **~5-10 seconds**.
- Classic/Pro warehouses can take **2-5 minutes** to cold start.
- The `wait_timeout` parameter controls how long the API waits before returning a PENDING response.
- **Recommendation:** Set `wait_timeout: "50s"` (the maximum) and use `on_wait_timeout: "CONTINUE"` with polling to handle cold starts gracefully.
- Configure auto-stop timeout to balance cost vs. latency (e.g., 10-15 minutes of idle time for serverless).

### Parameterized Query Examples

```json
{
  "warehouse_id": "abc123",
  "catalog": "vi_operate",
  "schema": "prod",
  "statement": "SELECT * FROM hcp_profiles WHERE npi_number = :npi AND specialty = :specialty",
  "parameters": [
    { "name": "npi", "value": "1234567890", "type": "STRING" },
    { "name": "specialty", "value": "Neurology", "type": "STRING" }
  ]
}
```

Parameters prevent SQL injection. Always use them for user-supplied or variable values.

---

## 4. Delta Table Schemas for Vi Operate

### 4.1 Call Outcomes Table

```sql
CREATE OR REPLACE TABLE vi_operate.prod.call_outcomes (
  -- Primary key
  call_outcome_id       STRING        NOT NULL  COMMENT 'UUID generated by Vi Operate',

  -- Call identification
  call_id               STRING        NOT NULL  COMMENT 'Unique call session ID',
  campaign_id           STRING                  COMMENT 'Outbound campaign identifier',
  program_id            STRING                  COMMENT 'Patient support or medical information program ID',

  -- Participants
  agent_id              STRING        NOT NULL  COMMENT 'Vi Operate agent ID (human or AI)',
  agent_type            STRING        NOT NULL  COMMENT 'HUMAN | AI_AGENT',
  hcp_npi               STRING                  COMMENT 'HCP National Provider Identifier',
  patient_id            STRING                  COMMENT 'De-identified patient reference',

  -- Call metadata
  call_direction        STRING        NOT NULL  COMMENT 'INBOUND | OUTBOUND',
  call_start_ts         TIMESTAMP     NOT NULL  COMMENT 'UTC timestamp of call start',
  call_end_ts           TIMESTAMP               COMMENT 'UTC timestamp of call end',
  call_duration_seconds INT                     COMMENT 'Total call duration in seconds',
  call_disposition       STRING        NOT NULL  COMMENT 'COMPLETED | NO_ANSWER | VOICEMAIL | CALLBACK_REQUESTED | TRANSFERRED',

  -- Classification
  call_type             STRING        NOT NULL  COMMENT 'MEDICAL_INFORMATION | PATIENT_SUPPORT | AE_REPORT | PRODUCT_COMPLAINT | SAMPLE_REQUEST',
  therapeutic_area      STRING                  COMMENT 'e.g., Neurology, Oncology',
  product_name          STRING                  COMMENT 'Product discussed',
  inquiry_topics        ARRAY<STRING>           COMMENT 'Array of topic codes discussed',

  -- Outcomes
  resolution_status     STRING        NOT NULL  COMMENT 'RESOLVED | PENDING_FOLLOWUP | ESCALATED',
  followup_required     BOOLEAN       NOT NULL  DEFAULT false,
  followup_date         DATE                    COMMENT 'Scheduled follow-up date if applicable',
  sentiment_score       DOUBLE                  COMMENT 'NLP-derived sentiment (-1.0 to 1.0)',
  call_quality_score    DOUBLE                  COMMENT 'QA score (0.0 to 1.0)',

  -- Adverse event flags
  ae_detected           BOOLEAN       NOT NULL  DEFAULT false  COMMENT 'Whether an AE was identified',
  ae_severity           STRING                  COMMENT 'MILD | MODERATE | SEVERE | LIFE_THREATENING',
  ae_case_id            STRING                  COMMENT 'Safety database case reference',
  ae_reported_ts        TIMESTAMP               COMMENT 'When AE was flagged for safety reporting',

  -- Transcript reference
  transcript_storage_path STRING               COMMENT 'Cloud storage path to full transcript',

  -- Audit
  created_at            TIMESTAMP     NOT NULL  DEFAULT current_timestamp(),
  updated_at            TIMESTAMP     NOT NULL  DEFAULT current_timestamp(),
  source_system         STRING        NOT NULL  DEFAULT 'vi_operate'  COMMENT 'Originating system'
)
USING DELTA
PARTITIONED BY (call_type, call_direction)
COMMENT 'Vi Operate call outcome records for analytics and compliance'
TBLPROPERTIES (
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact' = 'true',
  'delta.enableChangeDataFeed' = 'true',
  'delta.logRetentionDuration' = 'interval 90 days',
  'delta.deletedFileRetentionDuration' = 'interval 30 days'
);
```

### 4.2 Call Transcripts Table

```sql
CREATE OR REPLACE TABLE vi_operate.prod.call_transcripts (
  transcript_id         STRING        NOT NULL  COMMENT 'UUID',
  call_id               STRING        NOT NULL  COMMENT 'FK to call_outcomes.call_id',

  -- Transcript content
  full_transcript_text  STRING                  COMMENT 'Complete transcript text',
  transcript_segments   ARRAY<STRUCT<
    speaker: STRING,
    start_seconds: DOUBLE,
    end_seconds: DOUBLE,
    text: STRING,
    confidence: DOUBLE
  >>                                            COMMENT 'Segmented transcript with timestamps',

  -- NLP extractions
  summary               STRING                  COMMENT 'AI-generated call summary',
  key_topics            ARRAY<STRING>           COMMENT 'Extracted topic labels',
  entities_mentioned    ARRAY<STRUCT<
    entity_type: STRING,
    entity_value: STRING,
    confidence: DOUBLE
  >>                                            COMMENT 'Named entities: drugs, conditions, etc.',

  -- Classification outputs
  intent_classification STRING                  COMMENT 'Primary intent category',
  compliance_flags      ARRAY<STRING>           COMMENT 'Any compliance concerns detected',

  -- Audit
  created_at            TIMESTAMP     NOT NULL  DEFAULT current_timestamp(),
  language              STRING        NOT NULL  DEFAULT 'en'
)
USING DELTA
COMMENT 'Vi Operate call transcript data with NLP extractions'
TBLPROPERTIES (
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact' = 'true'
);
```

### 4.3 HCP Profiles Table (read-side, managed by Ambit)

```sql
-- This table would be created/managed by Ambit's data engineering team.
-- Vi Operate reads from it for pre-call enrichment.
CREATE OR REPLACE TABLE vi_operate.prod.hcp_profiles (
  npi_number            STRING        NOT NULL  COMMENT 'National Provider Identifier',
  first_name            STRING,
  last_name             STRING,
  credentials           STRING                  COMMENT 'e.g., MD, DO, PharmD',
  primary_specialty     STRING,
  sub_specialty         STRING,
  practice_name         STRING,
  practice_address      STRING,
  city                  STRING,
  state                 STRING,
  zip_code              STRING,

  -- Segmentation (populated by Ambit analytics)
  segment_code          STRING                  COMMENT 'Ambit-defined HCP segment',
  engagement_tier       STRING                  COMMENT 'HIGH | MEDIUM | LOW',
  decile_rank           INT                     COMMENT 'Prescribing decile (1-10)',
  therapeutic_focus     ARRAY<STRING>           COMMENT 'Therapeutic areas of interest',

  -- Prior engagement summary
  total_calls_90d       INT                     COMMENT 'Call count in last 90 days',
  last_call_date        DATE,
  last_call_disposition STRING,
  preferred_contact_time STRING                 COMMENT 'e.g., MORNING, AFTERNOON',
  opt_out_status        BOOLEAN       NOT NULL  DEFAULT false,

  -- Metadata
  updated_at            TIMESTAMP     NOT NULL
)
USING DELTA
COMMENT 'HCP profile and segmentation data for pre-call enrichment'
TBLPROPERTIES (
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.enableChangeDataFeed' = 'true'
);
```

---

## 5. WRITE: Pushing Data into Delta Lake

### 5.1 Single Call Outcome INSERT (via SQL Statement Execution API)

```typescript
const insertCallOutcome = async (client: DatabricksClient, outcome: CallOutcome) => {
  const sql = `
    INSERT INTO vi_operate.prod.call_outcomes (
      call_outcome_id, call_id, campaign_id, program_id,
      agent_id, agent_type, hcp_npi, patient_id,
      call_direction, call_start_ts, call_end_ts, call_duration_seconds, call_disposition,
      call_type, therapeutic_area, product_name, inquiry_topics,
      resolution_status, followup_required, followup_date, sentiment_score,
      ae_detected, ae_severity, ae_case_id, ae_reported_ts
    ) VALUES (
      :call_outcome_id, :call_id, :campaign_id, :program_id,
      :agent_id, :agent_type, :hcp_npi, :patient_id,
      :call_direction, :call_start_ts, :call_end_ts, :call_duration_seconds, :call_disposition,
      :call_type, :therapeutic_area, :product_name, ARRAY(:topic1, :topic2),
      :resolution_status, :followup_required, :followup_date, :sentiment_score,
      :ae_detected, :ae_severity, :ae_case_id, :ae_reported_ts
    )`;

  const params = [
    { name: 'call_outcome_id', value: outcome.id, type: 'STRING' },
    { name: 'call_id', value: outcome.callId, type: 'STRING' },
    { name: 'campaign_id', value: outcome.campaignId ?? '', type: 'STRING' },
    { name: 'program_id', value: outcome.programId ?? '', type: 'STRING' },
    { name: 'agent_id', value: outcome.agentId, type: 'STRING' },
    { name: 'agent_type', value: outcome.agentType, type: 'STRING' },
    { name: 'hcp_npi', value: outcome.hcpNpi ?? '', type: 'STRING' },
    { name: 'patient_id', value: outcome.patientId ?? '', type: 'STRING' },
    { name: 'call_direction', value: outcome.direction, type: 'STRING' },
    { name: 'call_start_ts', value: outcome.startTs, type: 'TIMESTAMP' },
    { name: 'call_end_ts', value: outcome.endTs ?? '', type: 'TIMESTAMP' },
    { name: 'call_duration_seconds', value: String(outcome.durationSec), type: 'INT' },
    { name: 'call_disposition', value: outcome.disposition, type: 'STRING' },
    { name: 'call_type', value: outcome.callType, type: 'STRING' },
    { name: 'therapeutic_area', value: outcome.therapeuticArea ?? '', type: 'STRING' },
    { name: 'product_name', value: outcome.productName ?? '', type: 'STRING' },
    { name: 'topic1', value: outcome.topics?.[0] ?? '', type: 'STRING' },
    { name: 'topic2', value: outcome.topics?.[1] ?? '', type: 'STRING' },
    { name: 'resolution_status', value: outcome.resolution, type: 'STRING' },
    { name: 'followup_required', value: String(outcome.followupRequired), type: 'BOOLEAN' },
    { name: 'followup_date', value: outcome.followupDate ?? '', type: 'DATE' },
    { name: 'sentiment_score', value: String(outcome.sentimentScore ?? 0), type: 'DOUBLE' },
    { name: 'ae_detected', value: String(outcome.aeDetected), type: 'BOOLEAN' },
    { name: 'ae_severity', value: outcome.aeSeverity ?? '', type: 'STRING' },
    { name: 'ae_case_id', value: outcome.aeCaseId ?? '', type: 'STRING' },
    { name: 'ae_reported_ts', value: outcome.aeReportedTs ?? '', type: 'TIMESTAMP' },
  ];

  return executeAndWait(client, sql, params);
};
```

### 5.2 Batch INSERT using VALUES list

For writing multiple records in a single API call (more efficient):

```sql
INSERT INTO vi_operate.prod.call_outcomes
  (call_outcome_id, call_id, agent_id, agent_type, call_direction,
   call_start_ts, call_disposition, call_type, resolution_status,
   followup_required, ae_detected)
VALUES
  ('uuid-1', 'call-001', 'agent-a', 'AI_AGENT', 'OUTBOUND',
   '2026-03-18T10:30:00Z', 'COMPLETED', 'MEDICAL_INFORMATION', 'RESOLVED',
   false, false),
  ('uuid-2', 'call-002', 'agent-b', 'HUMAN', 'INBOUND',
   '2026-03-18T11:15:00Z', 'COMPLETED', 'AE_REPORT', 'ESCALATED',
   true, true),
  ('uuid-3', 'call-003', 'agent-a', 'AI_AGENT', 'OUTBOUND',
   '2026-03-18T12:00:00Z', 'NO_ANSWER', 'PATIENT_SUPPORT', 'PENDING_FOLLOWUP',
   true, false);
```

### 5.3 MERGE INTO (Upsert Pattern)

Use MERGE when updating existing records (e.g., adding AE info to an existing call record):

```sql
MERGE INTO vi_operate.prod.call_outcomes AS target
USING (
  SELECT
    :call_outcome_id AS call_outcome_id,
    :ae_detected AS ae_detected,
    :ae_severity AS ae_severity,
    :ae_case_id AS ae_case_id,
    :ae_reported_ts AS ae_reported_ts,
    :resolution_status AS resolution_status,
    current_timestamp() AS updated_at
) AS source
ON target.call_outcome_id = source.call_outcome_id
WHEN MATCHED THEN UPDATE SET
  target.ae_detected = source.ae_detected,
  target.ae_severity = source.ae_severity,
  target.ae_case_id = source.ae_case_id,
  target.ae_reported_ts = source.ae_reported_ts,
  target.resolution_status = source.resolution_status,
  target.updated_at = source.updated_at
WHEN NOT MATCHED THEN INSERT *
```

### Full MERGE for complete call outcome upsert:

```sql
MERGE INTO vi_operate.prod.call_outcomes AS target
USING (
  SELECT
    :call_outcome_id AS call_outcome_id,
    :call_id AS call_id,
    :campaign_id AS campaign_id,
    :agent_id AS agent_id,
    :agent_type AS agent_type,
    :hcp_npi AS hcp_npi,
    :call_direction AS call_direction,
    :call_start_ts AS call_start_ts,
    :call_end_ts AS call_end_ts,
    :call_duration_seconds AS call_duration_seconds,
    :call_disposition AS call_disposition,
    :call_type AS call_type,
    :therapeutic_area AS therapeutic_area,
    :product_name AS product_name,
    :resolution_status AS resolution_status,
    :followup_required AS followup_required,
    :ae_detected AS ae_detected,
    :ae_severity AS ae_severity,
    :ae_case_id AS ae_case_id,
    :sentiment_score AS sentiment_score
) AS source
ON target.call_outcome_id = source.call_outcome_id
WHEN MATCHED THEN UPDATE SET
  target.call_end_ts = source.call_end_ts,
  target.call_duration_seconds = source.call_duration_seconds,
  target.call_disposition = source.call_disposition,
  target.resolution_status = source.resolution_status,
  target.followup_required = source.followup_required,
  target.ae_detected = source.ae_detected,
  target.ae_severity = source.ae_severity,
  target.ae_case_id = source.ae_case_id,
  target.sentiment_score = source.sentiment_score,
  target.updated_at = current_timestamp()
WHEN NOT MATCHED BY TARGET THEN INSERT (
  call_outcome_id, call_id, campaign_id, agent_id, agent_type, hcp_npi,
  call_direction, call_start_ts, call_end_ts, call_duration_seconds, call_disposition,
  call_type, therapeutic_area, product_name, resolution_status, followup_required,
  ae_detected, ae_severity, ae_case_id, sentiment_score
) VALUES (
  source.call_outcome_id, source.call_id, source.campaign_id, source.agent_id,
  source.agent_type, source.hcp_npi, source.call_direction, source.call_start_ts,
  source.call_end_ts, source.call_duration_seconds, source.call_disposition,
  source.call_type, source.therapeutic_area, source.product_name, source.resolution_status,
  source.followup_required, source.ae_detected, source.ae_severity, source.ae_case_id,
  source.sentiment_score
)
```

### 5.4 MERGE INTO Syntax Reference

```sql
MERGE [WITH SCHEMA EVOLUTION] INTO target_table [target_alias]
  USING source_table_or_subquery [source_alias]
  ON merge_condition
  { WHEN MATCHED [AND condition] THEN matched_action |
    WHEN NOT MATCHED [BY TARGET] [AND condition] THEN not_matched_action |
    WHEN NOT MATCHED BY SOURCE [AND condition] THEN not_matched_by_source_action } [...]

-- matched_action: UPDATE SET col = expr | UPDATE SET * | DELETE
-- not_matched_action: INSERT (cols) VALUES (exprs) | INSERT *
-- not_matched_by_source_action: UPDATE SET col = expr | DELETE
```

---

## 6. READ: Pre-Call Enrichment Queries

### 6.1 HCP Profile Lookup (Single)

```sql
SELECT
  npi_number,
  first_name,
  last_name,
  credentials,
  primary_specialty,
  sub_specialty,
  practice_name,
  segment_code,
  engagement_tier,
  decile_rank,
  therapeutic_focus,
  total_calls_90d,
  last_call_date,
  last_call_disposition,
  preferred_contact_time,
  opt_out_status
FROM vi_operate.prod.hcp_profiles
WHERE npi_number = :npi_number
  AND opt_out_status = false
```

### 6.2 Pre-Call Context Package (HCP + Recent Call History)

```sql
WITH recent_calls AS (
  SELECT
    call_id,
    call_start_ts,
    call_type,
    call_disposition,
    resolution_status,
    inquiry_topics,
    ae_detected,
    sentiment_score,
    followup_required,
    followup_date
  FROM vi_operate.prod.call_outcomes
  WHERE hcp_npi = :npi_number
    AND call_start_ts >= dateadd(DAY, -90, current_date())
  ORDER BY call_start_ts DESC
  LIMIT 10
),
hcp AS (
  SELECT *
  FROM vi_operate.prod.hcp_profiles
  WHERE npi_number = :npi_number
)
SELECT
  hcp.*,
  collect_list(
    named_struct(
      'call_id', rc.call_id,
      'date', rc.call_start_ts,
      'type', rc.call_type,
      'disposition', rc.call_disposition,
      'resolution', rc.resolution_status,
      'topics', rc.inquiry_topics,
      'ae_flag', rc.ae_detected,
      'sentiment', rc.sentiment_score
    )
  ) AS recent_call_history
FROM hcp
LEFT JOIN recent_calls rc ON true
GROUP BY hcp.npi_number, hcp.first_name, hcp.last_name, hcp.credentials,
         hcp.primary_specialty, hcp.sub_specialty, hcp.practice_name,
         hcp.practice_address, hcp.city, hcp.state, hcp.zip_code,
         hcp.segment_code, hcp.engagement_tier, hcp.decile_rank,
         hcp.therapeutic_focus, hcp.total_calls_90d, hcp.last_call_date,
         hcp.last_call_disposition, hcp.preferred_contact_time,
         hcp.opt_out_status, hcp.updated_at
```

### 6.3 Batch Pre-Call Enrichment (Campaign List)

```sql
SELECT
  hp.npi_number,
  hp.first_name,
  hp.last_name,
  hp.primary_specialty,
  hp.segment_code,
  hp.engagement_tier,
  hp.preferred_contact_time,
  hp.opt_out_status,
  hp.last_call_date,
  hp.last_call_disposition,
  co_agg.calls_30d,
  co_agg.last_ae_flag
FROM vi_operate.prod.hcp_profiles hp
LEFT JOIN (
  SELECT
    hcp_npi,
    COUNT(*) AS calls_30d,
    MAX(CASE WHEN ae_detected THEN 1 ELSE 0 END) AS last_ae_flag
  FROM vi_operate.prod.call_outcomes
  WHERE call_start_ts >= dateadd(DAY, -30, current_date())
  GROUP BY hcp_npi
) co_agg ON hp.npi_number = co_agg.hcp_npi
WHERE hp.npi_number IN (:npi1, :npi2, :npi3, :npi4, :npi5)
  AND hp.opt_out_status = false
```

### 6.4 TypeScript Pre-Call Enrichment Function

```typescript
interface PreCallContext {
  hcp: HcpProfile;
  recentCalls: RecentCallSummary[];
  pendingFollowups: FollowupItem[];
}

async function getPreCallContext(
  client: DatabricksClient,
  npiNumber: string
): Promise<PreCallContext | null> {
  const resp = await executeAndWait(client, `
    SELECT
      hp.npi_number, hp.first_name, hp.last_name, hp.credentials,
      hp.primary_specialty, hp.segment_code, hp.engagement_tier,
      hp.preferred_contact_time, hp.opt_out_status,
      hp.total_calls_90d, hp.last_call_date
    FROM vi_operate.prod.hcp_profiles hp
    WHERE hp.npi_number = :npi
      AND hp.opt_out_status = false
  `, [{ name: 'npi', value: npiNumber, type: 'STRING' }]);

  if (!resp.result?.data_array?.length) return null;

  const hcpRow = resp.result.data_array[0];
  // Map columns by position based on manifest.schema.columns
  const hcp = mapRowToHcpProfile(hcpRow, resp.manifest!.schema.columns);

  // Fetch recent calls separately
  const callsResp = await executeAndWait(client, `
    SELECT call_id, call_start_ts, call_type, call_disposition,
           resolution_status, ae_detected, sentiment_score,
           followup_required, followup_date
    FROM vi_operate.prod.call_outcomes
    WHERE hcp_npi = :npi
      AND call_start_ts >= dateadd(DAY, -90, current_date())
    ORDER BY call_start_ts DESC
    LIMIT 10
  `, [{ name: 'npi', value: npiNumber, type: 'STRING' }]);

  const recentCalls = (callsResp.result?.data_array ?? [])
    .map(row => mapRowToCallSummary(row, callsResp.manifest!.schema.columns));

  const pendingFollowups = recentCalls
    .filter(c => c.followupRequired && c.followupDate);

  return { hcp, recentCalls, pendingFollowups };
}
```

---

## 7. Jobs API and TRIGGER: Batch Outbound Call Notifications

### 7.1 Jobs API Endpoints

| Operation | Method | Path |
|-----------|--------|------|
| Create Job | POST | `/api/2.2/jobs/create` |
| Run Now (trigger) | POST | `/api/2.2/jobs/run-now` |
| List Jobs | GET | `/api/2.2/jobs/list` |
| Get Job | GET | `/api/2.2/jobs/get` |
| Delete Job | POST | `/api/2.2/jobs/delete` |
| Get Run | GET | `/api/2.2/jobs/runs/get` |
| List Runs | GET | `/api/2.2/jobs/runs/list` |
| Cancel Run | POST | `/api/2.2/jobs/runs/cancel` |

### 7.2 Webhook Notification Architecture

Databricks uses a **notification destination** pattern for webhooks:

1. **Create a Notification Destination** (generic webhook) pointing to Vi Operate's ingest endpoint
2. **Attach the destination** to a job's `webhook_notifications` on the `on_success` event
3. When the job completes, Databricks POSTs a payload to your webhook URL

**Step 1: Create Notification Destination (Webhook)**

```
POST /api/2.0/notification-destinations
```

```json
{
  "display_name": "Vi Operate - Batch Outbound Trigger",
  "config": {
    "generic_webhook": {
      "url": "https://api.vioperate.com/webhooks/databricks/job-complete",
      "username": "databricks-webhook",
      "password": "<shared-secret>"
    }
  }
}
```

Notification Destination API endpoints:

| Operation | Method | Path |
|-----------|--------|------|
| Create | POST | `/api/2.0/notification-destinations` |
| Get | GET | `/api/2.0/notification-destinations/{id}` |
| List | GET | `/api/2.0/notification-destinations` |
| Update | PATCH | `/api/2.0/notification-destinations/{id}` |
| Delete | DELETE | `/api/2.0/notification-destinations/{id}` |

Supported destination types: `EMAIL`, `SLACK`, `WEBHOOK`, `MICROSOFT_TEAMS`, `PAGERDUTY`

Requirements: HTTPS only with SSL certificates from a trusted CA.

**Step 2: Create a Job with Webhook Notifications**

```json
{
  "name": "Ambit - HCP Outbound List Generation",
  "webhook_notifications": {
    "on_success": [
      { "id": "<notification-destination-id>" }
    ],
    "on_failure": [
      { "id": "<notification-destination-id-for-alerts>" }
    ]
  },
  "email_notifications": {
    "on_failure": ["ops@vioperate.com"],
    "no_alert_for_skipped_runs": true
  },
  "tasks": [
    {
      "task_key": "generate_outbound_list",
      "sql_task": {
        "warehouse_id": "<warehouse-id>",
        "query": {
          "query_id": "<saved-query-id>"
        }
      }
    }
  ]
}
```

**WebhookNotifications structure:**

```typescript
interface WebhookNotifications {
  on_start?: WebhookNotification[];
  on_success?: WebhookNotification[];
  on_failure?: WebhookNotification[];
  on_duration_warning_threshold_exceeded?: WebhookNotification[];
}

interface WebhookNotification {
  id: string;  // Notification destination ID
}
```

Note: Each job supports up to **3 system destinations per event type**.

**Step 3: Webhook Payload (on job completion)**

```json
{
  "event_type": "jobs.on_success",
  "workspace_id": "your_workspace_id",
  "run": {
    "run_id": "12345"
  },
  "job": {
    "job_id": "67890",
    "name": "Ambit - HCP Outbound List Generation"
  }
}
```

### 7.3 Vi Operate Webhook Handler

```typescript
// POST /webhooks/databricks/job-complete
app.post('/webhooks/databricks/job-complete', async (req, res) => {
  const { event_type, job, run } = req.body;

  if (event_type === 'jobs.on_success') {
    console.log(`Job ${job.name} (${job.job_id}) completed. Run: ${run.run_id}`);

    // Query the output table for the new outbound call list
    const outboundList = await executeAndWait(databricksClient, `
      SELECT
        hcp_npi, first_name, last_name, phone_number,
        preferred_contact_time, campaign_id, priority_score,
        talking_points
      FROM vi_operate.prod.outbound_call_queue
      WHERE batch_run_id = :run_id
        AND status = 'PENDING'
      ORDER BY priority_score DESC
    `, [{ name: 'run_id', value: run.run_id, type: 'STRING' }]);

    // Trigger outbound campaign
    await triggerOutboundCampaign(outboundList.result?.data_array ?? []);
  }

  res.status(200).json({ received: true });
});
```

### 7.4 Trigger a Job Run Programmatically

```typescript
// Trigger Ambit's batch job from Vi Operate (e.g., end-of-day processing)
async function triggerBatchJob(client: DatabricksClient, jobId: string) {
  const resp = await client.request('POST', '/api/2.2/jobs/run-now', {
    job_id: jobId,
  });
  // Response: { run_id: number, number_in_job: number }
  return resp.run_id;
}
```

### 7.5 Rate Limits for Jobs API

| Endpoint | Rate Limit |
|----------|------------|
| `/jobs/create` | 20 req/sec |
| `/jobs/delete` | 10 req/sec |
| `/jobs/runs/submit` | 35 req/sec |
| `/jobs/runs/get` | 100 req/sec |
| `/jobs/runs/list` | 30 req/sec |

---

## 8. Unity Catalog REST API

### 8.1 Endpoints

| Operation | Method | Path |
|-----------|--------|------|
| Create Catalog | POST | `/api/2.1/unity-catalog/catalogs` |
| Get Catalog | GET | `/api/2.1/unity-catalog/catalogs/{name}` |
| List Catalogs | GET | `/api/2.1/unity-catalog/catalogs` |
| Update Catalog | PATCH | `/api/2.1/unity-catalog/catalogs/{name}` |
| Delete Catalog | DELETE | `/api/2.1/unity-catalog/catalogs/{name}` |
| Create Schema | POST | `/api/2.1/unity-catalog/schemas` |
| Get Schema | GET | `/api/2.1/unity-catalog/schemas/{full_name}` |
| List Schemas | GET | `/api/2.1/unity-catalog/schemas` |
| Delete Schema | DELETE | `/api/2.1/unity-catalog/schemas/{full_name}` |
| Get Table | GET | `/api/2.1/unity-catalog/tables/{full_name}` |
| List Tables | GET | `/api/2.1/unity-catalog/tables` |
| Delete Table | DELETE | `/api/2.1/unity-catalog/tables/{full_name}` |
| Get Permissions | GET | `/api/2.1/unity-catalog/permissions/{securable_type}/{full_name}` |
| Update Permissions | PATCH | `/api/2.1/unity-catalog/permissions/{securable_type}/{full_name}` |
| Get Effective Perms | GET | `/api/2.1/unity-catalog/effective-permissions/{securable_type}/{full_name}` |

### 8.2 Create Catalog

```json
POST /api/2.1/unity-catalog/catalogs

{
  "name": "vi_operate",
  "comment": "Vi Operate platform data catalog",
  "properties": {
    "owner_team": "vi-operate-engineering",
    "environment": "production"
  }
}
```

### 8.3 Create Schema

```json
POST /api/2.1/unity-catalog/schemas

{
  "name": "prod",
  "catalog_name": "vi_operate",
  "comment": "Production schema for Vi Operate call data"
}
```

### 8.4 Grant Permissions

```
PATCH /api/2.1/unity-catalog/permissions/{securable_type}/{full_name}
```

Securable types: `CATALOG`, `SCHEMA`, `TABLE`, `VIEW`, `FUNCTION`, `EXTERNAL_LOCATION`, `STORAGE_CREDENTIAL`

**Grant Vi Operate service principal access to tables:**

```json
PATCH /api/2.1/unity-catalog/permissions/SCHEMA/vi_operate.prod

{
  "changes": [
    {
      "principal": "vi-operate-service-principal",
      "add": ["USE_SCHEMA", "SELECT", "MODIFY", "CREATE_TABLE"]
    }
  ]
}
```

**Grant read-only access for analytics team:**

```json
PATCH /api/2.1/unity-catalog/permissions/SCHEMA/vi_operate.prod

{
  "changes": [
    {
      "principal": "analytics-team",
      "add": ["USE_SCHEMA", "SELECT"]
    }
  ]
}
```

### 8.5 Table Creation via API vs SQL

Tables can be created via:

1. **Unity Catalog REST API** (`POST /api/2.1/unity-catalog/tables`) -- programmatic, but complex for Delta tables
2. **SQL Statement Execution API** with `CREATE TABLE` statements (recommended) -- use the DDL in Section 4

**Recommendation:** Use the SQL Statement Execution API to run `CREATE TABLE` DDL. It is simpler and supports all Delta-specific features (partitioning, properties, generated columns, etc.).

### 8.6 Setup Script (TypeScript)

```typescript
async function setupViOperateCatalog(client: DatabricksClient) {
  // Create catalog
  await client.request('POST', '/api/2.1/unity-catalog/catalogs', {
    name: 'vi_operate',
    comment: 'Vi Operate platform data catalog',
  });

  // Create schemas
  for (const schema of ['prod', 'staging', 'dev']) {
    await client.request('POST', '/api/2.1/unity-catalog/schemas', {
      name: schema,
      catalog_name: 'vi_operate',
      comment: `Vi Operate ${schema} schema`,
    });
  }

  // Create tables via SQL DDL (see Section 4 for full CREATE TABLE statements)
  await executeAndWait(client, CREATE_CALL_OUTCOMES_DDL);
  await executeAndWait(client, CREATE_CALL_TRANSCRIPTS_DDL);

  // Grant permissions
  await client.request(
    'PATCH',
    '/api/2.1/unity-catalog/permissions/CATALOG/vi_operate',
    {
      changes: [
        {
          principal: 'vi-operate-service-principal',
          add: ['USE_CATALOG', 'USE_SCHEMA', 'SELECT', 'MODIFY', 'CREATE_TABLE'],
        },
      ],
    }
  );

  console.log('Vi Operate catalog setup complete');
}
```

---

## 9. Delta Sharing: Cross-Org Data Access

### 9.1 Overview

Delta Sharing enables secure data exchange between Vi Operate and Ambit (or any external partner) without data copying. The protocol supports:

- **Databricks-to-Databricks sharing** (native, no token management needed within same account)
- **Open sharing** via bearer tokens (cross-org, cross-platform)
- **OIDC federation** for short-lived token exchange

### 9.2 Sharing API Endpoints

**Shares:**

| Operation | Method | Path |
|-----------|--------|------|
| Create Share | POST | `/api/2.1/unity-catalog/shares` |
| Get Share | GET | `/api/2.1/unity-catalog/shares/{name}` |
| List Shares | GET | `/api/2.1/unity-catalog/shares` |
| Update Share | PATCH | `/api/2.1/unity-catalog/shares/{name}` |
| Delete Share | DELETE | `/api/2.1/unity-catalog/shares/{name}` |
| Get Permissions | GET | `/api/2.1/unity-catalog/shares/{name}/permissions` |
| Update Permissions | PATCH | `/api/2.1/unity-catalog/shares/{name}/permissions` |

**Recipients:**

| Operation | Method | Path |
|-----------|--------|------|
| Create Recipient | POST | `/api/2.1/unity-catalog/recipients` |
| Get Recipient | GET | `/api/2.1/unity-catalog/recipients/{name}` |
| List Recipients | GET | `/api/2.1/unity-catalog/recipients` |
| Update Recipient | PATCH | `/api/2.1/unity-catalog/recipients/{name}` |
| Delete Recipient | DELETE | `/api/2.1/unity-catalog/recipients/{name}` |
| Rotate Token | POST | `/api/2.1/unity-catalog/recipients/{name}/rotate-token` |
| Get Share Perms | GET | `/api/2.1/unity-catalog/recipients/{name}/share-permissions` |

**Providers:**

| Operation | Method | Path |
|-----------|--------|------|
| Create Provider | POST | `/api/2.1/unity-catalog/providers` |
| Get Provider | GET | `/api/2.1/unity-catalog/providers/{name}` |
| List Providers | GET | `/api/2.1/unity-catalog/providers` |
| Update Provider | PATCH | `/api/2.1/unity-catalog/providers/{name}` |
| Delete Provider | DELETE | `/api/2.1/unity-catalog/providers/{name}` |
| List Provider Shares | GET | `/api/2.1/unity-catalog/providers/{name}/shares` |

**Recipient Activation (public endpoints):**

| Operation | Method | Path |
|-----------|--------|------|
| Get Activation Info | GET | `/api/2.1/unity-catalog/public/data_sharing_activation_info/{activationUrl}` |
| Retrieve Token | GET | `/api/2.1/unity-catalog/public/data_sharing_activation/{activationUrl}` |

### 9.3 Setup: Share Vi Operate Call Data with Ambit

**Step 1: Create a share**

```json
POST /api/2.1/unity-catalog/shares

{
  "name": "vi_operate_call_data_share",
  "comment": "Vi Operate call outcomes and transcripts for Ambit analytics"
}
```

**Step 2: Add tables to the share**

```json
PATCH /api/2.1/unity-catalog/shares/vi_operate_call_data_share

{
  "updates": [
    {
      "action": "ADD",
      "data_object": {
        "name": "vi_operate.prod.call_outcomes",
        "data_object_type": "TABLE",
        "comment": "Call outcome records",
        "cdf_enabled": true,
        "shared_as": "call_outcomes",
        "history_data_sharing_status": "ENABLED"
      }
    },
    {
      "action": "ADD",
      "data_object": {
        "name": "vi_operate.prod.call_transcripts",
        "data_object_type": "TABLE",
        "comment": "Call transcript data",
        "shared_as": "call_transcripts"
      }
    }
  ]
}
```

**Step 3: Create a recipient (Ambit)**

```json
POST /api/2.1/unity-catalog/recipients

{
  "name": "ambit_analytics",
  "authentication_type": "TOKEN",
  "comment": "Ambit consulting partner - data foundations team",
  "expiration_time": 1743465600000,
  "ip_access_list": {
    "allowed_ip_addresses": ["203.0.113.0/24"]
  }
}
```

Response includes an `activation_url` that Ambit uses to download their access credentials.

Authentication types:
- `TOKEN` -- Long-lived bearer token (for open sharing / cross-platform)
- `DATABRICKS` -- Native Databricks-to-Databricks (no token management)

**Step 4: Grant recipient access to the share**

```json
PATCH /api/2.1/unity-catalog/shares/vi_operate_call_data_share/permissions

{
  "changes": [
    {
      "principal": "ambit_analytics",
      "add": ["SELECT"]
    }
  ]
}
```

**Step 5: Rotate tokens (periodic security maintenance)**

```json
POST /api/2.1/unity-catalog/recipients/ambit_analytics/rotate-token

{
  "existing_token_expire_in_seconds": 86400
}
```

### 9.4 Receiving Shared Data from Ambit (HCP Profiles)

If Ambit shares HCP enrichment data back to Vi Operate:

1. Ambit creates a share on their side containing HCP profile tables
2. They create Vi Operate as a recipient and provide the activation URL
3. Vi Operate retrieves credentials and creates a provider reference:

```json
POST /api/2.1/unity-catalog/providers

{
  "name": "ambit_data_provider",
  "comment": "Ambit data foundations - HCP enrichment data",
  "authentication_type": "TOKEN",
  "recipient_profile_str": "<JSON-credential-string-from-activation>"
}
```

4. Create a catalog from the shared data:

```json
POST /api/2.1/unity-catalog/catalogs

{
  "name": "ambit_shared",
  "provider_name": "ambit_data_provider",
  "share_name": "hcp_enrichment_share",
  "comment": "Ambit-provided HCP enrichment data"
}
```

### 9.5 Delta Sharing Rate Limits

| API Area | Rate Limit |
|----------|------------|
| Provider API | 400 req/sec |
| Recipient API | 400 req/sec |
| Shares API | 400 req/sec |

---

## 10. Rate Limits

### Known Rate Limits by API

| API / Endpoint | Rate Limit |
|----------------|------------|
| **Jobs API** | |
| `POST /jobs/create` | 20 req/sec |
| `POST /jobs/delete` | 10 req/sec |
| `POST /jobs/runs/submit` | 35 req/sec |
| `GET /jobs/runs/get` | 100 req/sec |
| `GET /jobs/runs/list` | 30 req/sec |
| **Delta Sharing** | |
| Provider / Recipient / Shares APIs | 400 req/sec each |
| **Permissions API** | |
| `GET` permissions | 100 req/sec |
| **SQL Statement Execution API** | Not officially documented |

### SQL Statement Execution API -- Practical Limits

While Databricks does not publish explicit rate limits for the SQL Statement Execution API, practical limits are governed by:

- **Concurrent queries per warehouse**: Varies by warehouse size (Small = ~10, Medium = ~20, Large = ~40 concurrent queries)
- **Inline result size**: Max 25 MiB (use `EXTERNAL_LINKS` disposition for larger results)
- **External links result size**: Up to 100 GiB
- **Statement timeout**: Default 10s wait, configurable 5-50s
- **Statement result retention**: Results expire and statement moves to CLOSED state

**Recommendation:** Implement client-side rate limiting at ~10 req/sec for SQL Statement Execution to be safe, with exponential backoff on 429 responses.

---

## 11. Error Handling and Retry Patterns

### HTTP Status Codes

| Status | Meaning | Action |
|--------|---------|--------|
| 200 | Success | Process response |
| 400 | Bad request (invalid SQL, missing params) | Fix request, do not retry |
| 401 | Unauthorized (token expired) | Refresh OAuth token, retry |
| 403 | Forbidden (insufficient permissions) | Check grants, do not retry |
| 404 | Resource not found | Check statement_id / resource name |
| 429 | Rate limited | Retry with exponential backoff |
| 500 | Internal server error | Retry with backoff |
| 503 | Service unavailable (warehouse starting) | Retry with backoff (up to 5 min) |

### Statement-Level Errors

When `status.state` is `FAILED`:

```json
{
  "status": {
    "state": "FAILED",
    "error": {
      "error_code": "RESOURCE_DOES_NOT_EXIST",
      "message": "Table 'vi_operate.prod.nonexistent' does not exist"
    }
  }
}
```

Common error codes: `RESOURCE_DOES_NOT_EXIST`, `PERMISSION_DENIED`, `BAD_REQUEST`, `INTERNAL_ERROR`

### Retry Strategy (TypeScript)

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { maxRetries: number; baseDelayMs: number; maxDelayMs: number } = {
    maxRetries: 5,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
  }
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const status = err.statusCode ?? err.status;

      // Don't retry client errors (except 429 and 401)
      if (status && status >= 400 && status < 500 && status !== 429 && status !== 401) {
        throw err;
      }

      // Refresh token on 401
      if (status === 401) {
        await refreshToken();
        continue; // Retry immediately after token refresh
      }

      if (attempt === opts.maxRetries) break;

      const delay = Math.min(
        opts.baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
        opts.maxDelayMs
      );
      await sleep(delay);
    }
  }
  throw lastError;
}
```

---

## 12. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

1. **Databricks workspace provisioning** (coordinate with Ambit)
   - Create service principal for Vi Operate
   - Generate OAuth credentials
   - Provision serverless SQL warehouse
2. **Build TypeScript Databricks client** (`databricks-client.ts`)
   - OAuth token management with auto-refresh
   - SQL Statement Execution wrapper with async polling
   - Retry logic with exponential backoff
3. **Create Unity Catalog structure**
   - `vi_operate` catalog with `prod`, `staging`, `dev` schemas
   - Run DDL from Section 4 to create Delta tables
   - Configure permissions for the service principal

### Phase 2: WRITE Path (Week 2-3)

4. **Implement call outcome persistence**
   - Post-call hook that writes to `call_outcomes` via SQL INSERT
   - MERGE pattern for updating records (AE flags, follow-up status)
   - Batch INSERT for bulk operations
5. **Implement transcript persistence**
   - Write transcript data after NLP processing
   - Store full text + structured segments

### Phase 3: READ Path (Week 3-4)

6. **Implement pre-call enrichment**
   - HCP profile lookup query
   - Recent call history aggregation
   - Cache layer (Redis/in-memory) for frequently accessed HCP profiles
7. **Install `@databricks/sql` package** for high-throughput read scenarios
   - Use for batch pre-call enrichment (campaign lists)
   - Fallback to REST API for lightweight lookups

### Phase 4: TRIGGER Path (Week 4-5)

8. **Set up notification destinations**
   - Create webhook endpoint in Vi Operate API
   - Register as notification destination in Databricks
9. **Configure job notifications**
   - Attach webhook to Ambit's batch processing jobs
   - Implement webhook handler to trigger outbound campaigns
10. **Implement job triggering**
    - API to trigger Ambit batch jobs from Vi Operate

### Phase 5: SHARE Path (Week 5-6)

11. **Configure Delta Sharing**
    - Create share for Vi Operate call data
    - Set up Ambit as recipient
    - Configure incoming share for HCP enrichment data from Ambit
12. **Token management**
    - Implement token rotation schedule
    - IP access list configuration

### Key Dependencies on Ambit

- Databricks workspace and account details
- SQL warehouse ID and configuration
- HCP profile table schema and access
- Batch job IDs for webhook notification setup
- Delta Sharing activation credentials (if cross-workspace)

---

## Appendix A: Environment Configuration

```bash
# .env (DO NOT commit to git)
DATABRICKS_HOST=https://dbc-XXXXXXX.cloud.databricks.com
DATABRICKS_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
DATABRICKS_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DATABRICKS_SQL_WAREHOUSE_ID=xxxxxxxxxxxxxxxx
DATABRICKS_CATALOG=vi_operate
DATABRICKS_SCHEMA=prod
```

## Appendix B: Package Dependencies

```json
{
  "dependencies": {
    "@databricks/sql": "^1.13.0"
  }
}
```

No official Databricks REST SDK exists for Node.js. The recommended approach is a thin REST client wrapper (Section 2) over `fetch` or `axios`, combined with `@databricks/sql` for high-throughput SQL queries.

## Appendix C: Quick Reference -- All API Paths

```
# SQL Statement Execution
POST   /api/2.0/sql/statements
GET    /api/2.0/sql/statements/{statement_id}
POST   /api/2.0/sql/statements/{statement_id}/cancel
GET    /api/2.0/sql/statements/{statement_id}/result/chunks/{chunk_index}

# Jobs
POST   /api/2.2/jobs/create
POST   /api/2.2/jobs/run-now
GET    /api/2.2/jobs/list
GET    /api/2.2/jobs/get
POST   /api/2.2/jobs/delete
GET    /api/2.2/jobs/runs/get
GET    /api/2.2/jobs/runs/list
POST   /api/2.2/jobs/runs/cancel

# Notification Destinations
POST   /api/2.0/notification-destinations
GET    /api/2.0/notification-destinations/{id}
GET    /api/2.0/notification-destinations
PATCH  /api/2.0/notification-destinations/{id}
DELETE /api/2.0/notification-destinations/{id}

# Unity Catalog
POST   /api/2.1/unity-catalog/catalogs
GET    /api/2.1/unity-catalog/catalogs/{name}
GET    /api/2.1/unity-catalog/catalogs
PATCH  /api/2.1/unity-catalog/catalogs/{name}
DELETE /api/2.1/unity-catalog/catalogs/{name}
POST   /api/2.1/unity-catalog/schemas
GET    /api/2.1/unity-catalog/schemas/{full_name}
GET    /api/2.1/unity-catalog/schemas
DELETE /api/2.1/unity-catalog/schemas/{full_name}
GET    /api/2.1/unity-catalog/tables/{full_name}
GET    /api/2.1/unity-catalog/tables
DELETE /api/2.1/unity-catalog/tables/{full_name}
GET    /api/2.1/unity-catalog/permissions/{securable_type}/{full_name}
PATCH  /api/2.1/unity-catalog/permissions/{securable_type}/{full_name}
GET    /api/2.1/unity-catalog/effective-permissions/{securable_type}/{full_name}

# Delta Sharing -- Shares
POST   /api/2.1/unity-catalog/shares
GET    /api/2.1/unity-catalog/shares/{name}
GET    /api/2.1/unity-catalog/shares
PATCH  /api/2.1/unity-catalog/shares/{name}
DELETE /api/2.1/unity-catalog/shares/{name}
GET    /api/2.1/unity-catalog/shares/{name}/permissions
PATCH  /api/2.1/unity-catalog/shares/{name}/permissions

# Delta Sharing -- Recipients
POST   /api/2.1/unity-catalog/recipients
GET    /api/2.1/unity-catalog/recipients/{name}
GET    /api/2.1/unity-catalog/recipients
PATCH  /api/2.1/unity-catalog/recipients/{name}
DELETE /api/2.1/unity-catalog/recipients/{name}
POST   /api/2.1/unity-catalog/recipients/{name}/rotate-token
GET    /api/2.1/unity-catalog/recipients/{name}/share-permissions

# Delta Sharing -- Providers
POST   /api/2.1/unity-catalog/providers
GET    /api/2.1/unity-catalog/providers/{name}
GET    /api/2.1/unity-catalog/providers
PATCH  /api/2.1/unity-catalog/providers/{name}
DELETE /api/2.1/unity-catalog/providers/{name}
GET    /api/2.1/unity-catalog/providers/{name}/shares

# OAuth Token
POST   https://{workspace-host}/oidc/v1/token
POST   https://accounts.cloud.databricks.com/oidc/accounts/{account-id}/v1/token
```
