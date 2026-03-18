# Evidence Engine — Design Spec

**Date:** 2026-03-18
**Status:** Approved
**Scope:** Demo feature addition — Storyboard Step 5 + Outcomes & Evidence tab

---

## 1. Purpose

Reframe the Vi Operate platform from "patient support hub" to "evidence infrastructure for outcomes-based payer contracting." Two additions to the demo:

1. **Storyboard Step 5 ("Evidence Capture")** — shows screening data from a single call flowing into a population-level evidence dataset. Makes the mechanism visible.
2. **New top-level tab ("Outcomes & Evidence")** — shows the population-level payoff: cohort outcome trajectories, persistence data, an auto-generated payer evidence card, and an interactive contract simulator.

The demo moment this creates: Praxis's CMO watches a patient support call, sees the TETRAS-LITE score get captured, watches it land on a cohort trajectory chart, clicks over to the Outcomes tab, and realizes the support hub she just watched is simultaneously generating the evidence she needs to negotiate outcomes-based payer contracts. That reframe is the pitch.

---

## 2. Information Architecture

### Tab placement

```
Agent Storyboard | Interaction Data | Medical Intelligence | Performance | Outcomes & Evidence | Implementation
```

"Outcomes & Evidence" is the 5th tab (between Performance and Implementation & Compliance). Badge: cohort enrolled count (e.g., "437").

### Storyboard step placement

```
Data Drop → Agent Config → Conversation → Transcript → Call Log → Evidence Capture
```

Step 5 ("Evidence Capture") is conditional — it only renders when the storyboard call includes screening results with a TETRAS-LITE instrument. If the selected scenario doesn't produce a TETRAS-LITE screen, the storyboard ends at Step 4 (Call Log) as it does today.

### Scope constraint

Focus exclusively on **ET / ELEX with TETRAS-LITE** as the primary evidence instrument. MMAS-4 (adherence) is secondary supporting data. DEE / Relutrigine gets a placeholder note in the Outcomes tab ("Seizure frequency reduction data available for Relutrigine cohort") but no full build. One therapeutic area done well beats two done halfway.

---

## 3. Data Model

All new types added to `frontend/src/app/lib/types.ts`.

### 3.0 Existing type update: ScreeningInstrumentId

The existing `ScreeningInstrumentId` union in `types.ts` is:

```ts
export type ScreeningInstrumentId = 'AE-SCREEN' | 'ADHERENCE-CHECK' | 'DOSING-VERIFY' | 'SWITCH-ASSESS';
```

This must be extended to include the instruments used by the Evidence Engine:

```ts
export type ScreeningInstrumentId =
  | 'AE-SCREEN' | 'ADHERENCE-CHECK' | 'DOSING-VERIFY' | 'SWITCH-ASSESS'
  | 'AE-TRIAGE' | 'C-SSRS-LITE' | 'TETRAS-LITE' | 'MMAS-4';
```

This is required because `ScreeningResult.instrumentId` is typed as `ScreeningInstrumentId`. Without this update, any screening result with `instrumentId: 'TETRAS-LITE'` will be a TypeScript error, and the Step 5 trigger condition (checking `instrumentId === 'TETRAS-LITE'` on `CallRecord.screeningResults`) will not compile.

### 3.1 OutcomeTimepoint

```ts
export type OutcomeTimepoint = 'baseline' | '30d' | '60d' | '90d';
```

### 3.2 PatientOutcomeRecord

Individual patient's screening trajectory across timepoints.

```ts
export interface PatientOutcomeRecord {
  patientId: string;
  therapeuticArea: TherapeuticArea;
  drugProduct: DrugProduct;
  enrolledAt: string;                                    // ISO date
  tetrasScores: Partial<Record<OutcomeTimepoint, number>>; // 0-8
  mmasScores: Partial<Record<OutcomeTimepoint, number>>;   // 0-4
  persistedAt90d: boolean;
  aeReported: boolean;
  seriousAeReported: boolean;
}
```

**Why `Partial<Record>`:** Patients who discontinue before 90d won't have later timepoint scores. Missing data = realistic. The cohort stats computation skips missing values and reports n at each timepoint.

**`seriousAeReported`:** Needed to compute `PayerEvidenceCard.seriousAeRate`. During seed generation, ~2.3% of total patients are flagged `seriousAeReported: true` (a subset of the ~12% with `aeReported: true`).

### 3.3 CohortTimepointStats

Aggregated statistics at a single timepoint.

```ts
export interface CohortTimepointStats {
  timepoint: OutcomeTimepoint;
  n: number;
  mean: number;
  median: number;
  stdDev: number;
  ci95Lower: number;
  ci95Upper: number;
  percentImprovedFromBaseline: number;
}
```

### 3.4 CohortOutcomeData

The full cohort evidence dataset for one instrument.

```ts
export interface CohortOutcomeData {
  therapeuticArea: TherapeuticArea;
  drugProduct: DrugProduct;
  instrumentId: 'TETRAS-LITE' | 'MMAS-4';
  instrumentLabel: string;
  totalEnrolled: number;
  trajectory: CohortTimepointStats[];
  persistenceRate: Record<Exclude<OutcomeTimepoint, 'baseline'>, number>; // % still on therapy at 30d/60d/90d (baseline is always 100% by definition)
  aeIncidenceRate: number;
}
```

### 3.5 PayerEvidenceCard

Auto-generated evidence summary formatted for payer consumption.

```ts
export interface PayerEvidenceCard {
  generatedAt: string;
  cohortSize: number;
  meanBaselineScore: number;
  mean90dScore: number;
  meanImprovementPct: number;
  ci95: [number, number];
  persistenceRate90d: number;
  adherenceRate90d: number;
  aeRate: number;
  seriousAeRate: number;
  headline: string;
}
```

### 3.6 ContractSimulation (UI state, not persisted)

```ts
interface ContractSimulation {
  thresholdPct: number;   // required improvement %, slider: 20-50
  rebatePct: number;      // rebate if not met, slider: 25-75
  // Computed from PatientOutcomeRecord[]:
  pctMeetingThreshold: number;
  patientsAbove: number;
  patientsBelow: number;
  estimatedRebateExposurePct: number;
  confidence: 'HIGH' | 'MODERATE' | 'LOW';
}
```

This is local component state in `dashboard/page.tsx`, not a shared type. It's computed by filtering the `PatientOutcomeRecord[]` array against the current slider values.

---

## 4. Seed Data Generation

All generation in `frontend/src/app/lib/seed-data.ts` using the existing deterministic PRNG (`mulberry32` with seed 3917).

### 4.1 Cohort size

**437 patients.** Specific enough to feel real (not a round number), plausible for a 6-month hub enrollment of a newly launched specialty neurology drug.

### 4.2 TETRAS-LITE distribution

Scores are integers 0-8 (sum of two questions, each 0-4).

| Timepoint | n | Mean | SD | Mean improvement from baseline |
|-----------|---|------|----|-------------------------------|
| Baseline | 437 | 5.5 | 1.2 | — |
| 30d | 406 (93%) | 4.3 | 1.3 | 22% |
| 60d | 376 (86%) | 3.8 | 1.1 | 31% |
| 90d | 345 (79%) | 3.6 | 1.0 | 35% |

**Generation algorithm:**
1. For each of 437 patients, generate a baseline TETRAS-LITE score from a clamped normal distribution (mean 5.5, SD 1.2, clamped to 1-8).
2. For each subsequent timepoint, apply a patient-specific improvement factor (drawn from a normal distribution) multiplied by a timepoint multiplier. Clamp result to 0-8.
3. At each timepoint, some patients drop out (persistence curve). Dropout is biased toward patients with higher scores (less improvement = more likely to stop). Patients who drop out have no further scores.
4. ~12% of patients are flagged `aeReported: true` (uniformly distributed). Of those, ~19% (i.e., ~2.3% of total) are also flagged `seriousAeReported: true`.

### 4.3 MMAS-4 distribution

Scores are integers 0-4.

| Timepoint | % with score 0 (high adherence) |
|-----------|---------------------------------|
| 30d | 81% |
| 60d | 76% |
| 90d | 71% |

Generated as a secondary dataset alongside TETRAS-LITE for the same patient set.

### 4.4 Pre-computed aggregations

At module load, compute and export:
- `COHORT_OUTCOME_DATA: CohortOutcomeData` — aggregated TETRAS-LITE trajectory
- `PAYER_EVIDENCE_CARD: PayerEvidenceCard` — summary card data
- `PATIENT_OUTCOMES: PatientOutcomeRecord[]` — raw patient array (needed for contract simulator filtering)

These are exported alongside existing `SEED_CALLS`, `SEED_CONTACTS`, etc.

---

## 5. Storyboard Step 5: Evidence Capture

### 5.1 Trigger condition

Step 5 renders only when the storyboard demo call includes screening results containing a TETRAS-LITE instrument. The `STORYBOARD_STEPS` array is dynamically extended when this condition is met.

### 5.2 Layout

Two-column layout on desktop (stacks on mobile):

**Left column (40%):** "This Call's Contribution"
- Card showing the individual screening result: instrument name, score, interpretation
- Reuses existing screening result visual style from the Call Detail Drawer
- Subtle pulse animation on mount to draw attention

**Right column (60%):** "Population Evidence"
- Mini SVG trajectory chart (~100% width, 120px height)
- 4 data points (baseline, 30d, 60d, 90d) connected by a teal line
- CI band as a filled SVG path (teal at 8% opacity)
- The new patient's score animates as a dot dropping onto the chart at the appropriate position
- Below chart: enrolled counter animates from 436 → 437
- Below counter: headline stat — "90-day mean TETRAS improvement: 34.2%"

### 5.3 Animation timing

- Auto-play duration: 4 seconds
- 0ms: Left card fades in
- 800ms: Right chart fades in with CI band
- 1500ms: Patient dot animates down to position (ease-out, 400ms)
- 2000ms: Counter ticks 436 → 437
- 2400ms: Headline stat fades in
- 4000ms: Auto-advance (if auto-play is on)

### 5.4 Caption

Bottom of the step panel, small text:

> "Every screening administered generates clinical evidence. This patient's TETRAS-LITE score joins 437 others in a continuously updated real-world evidence dataset."

---

## 6. Outcomes & Evidence Tab

### 6.1 Tab header

Description text (matching other tabs' pattern):

> "Real-world evidence generated from hub interactions. TETRAS-LITE outcome trajectories, therapy persistence, and payer-ready evidence summaries — powered by screening data collected during routine patient support calls."

### 6.2 Panel layout

2x2 grid on desktop (`grid-cols-2 gap-6`), single column on mobile. All panels use existing card styling (`bg-white border p-6`, PX tokens).

### 6.3 Panel 1: TETRAS-LITE Cohort Trajectory (top-left)

**Title:** "TETRAS-LITE Score Trajectory — ELEX Cohort"

**Chart:** Hand-rolled SVG, responsive width, 240px height.
- X-axis: 4 labeled timepoints (Baseline, 30d, 60d, 90d)
- Y-axis: "% Improvement from Baseline" (0% at bottom, 40% at top) — framed as improvement so the line goes UP (positive story)
- Solid teal line connecting 4 data points
- CI band: filled SVG path, teal at 8% opacity
- Data point circles (6px radius, teal fill, white stroke)
- Score labels above each point (e.g., "22%", "31%", "35%")
- N labels below x-axis (e.g., "n=437", "n=406", "n=376", "n=345")

**Below chart:** 4 inline stat pills using positive improvement framing (consistent with the upward chart axis — lower TETRAS score = better, shown as positive improvement):

```
[Baseline: 5.5/8]  [30d: 22% improved]  [60d: 31% improved]  [90d: 35% improved]
```

Style: small rounded badges, teal background at 10%, teal text.

### 6.4 Panel 2: 90-Day Persistence Waterfall (top-right)

**Title:** "Therapy Persistence — ELEX Cohort"

**Chart:** Horizontal CSS bars (matching Performance tab pattern).
- 4 bars: Enrolled (100%), 30d (93%), 60d (86%), 90d (79%)
- Bar width proportional to percentage
- Color: teal, with decreasing opacity per bar (100%, 85%, 70%, 55%)
- Percentage label at end of each bar
- N label after percentage (e.g., "93% · n=406")

**Below bars:** Discontinuation reason breakdown for patients who stopped by 90d (n=92):
- Small horizontal stacked bar or simple text list:
  - Cost barrier: 34%
  - Side effects: 28%
  - Insufficient efficacy: 22%
  - Other: 16%

### 6.5 Panel 3: Payer Evidence Card (bottom-left)

**Title:** "Payer Evidence Summary"

Styled distinctly from other panels to feel like a generated document:
- Slightly different card treatment: thicker left border (4px, teal), or a subtle background tint
- Header: **"Real-World Evidence Summary — ELEX (Euloxacaltenamide)"**
- Subheader: "Generated from Vi Operate Hub Data · March 18, 2026" (uses current date)

**Metrics grid (2 columns x 3 rows):**

| Metric | Value |
|--------|-------|
| Cohort size | 437 patients |
| Mean TETRAS improvement (90d) | 34.2% (95% CI: 30.1–38.3%) |
| 90-day persistence | 79% |
| Adherence (MMAS-4 high) | 71% |
| AE incidence | 12.1% |
| Serious AE | 2.3% |

Each metric: label in muted text (10px uppercase), value in bold primary text (14px).

**Footer text (small, muted):**
> "Data source: Validated TETRAS-LITE and MMAS-4 screening instruments administered via Vi Operate patient support hub during routine engagement calls. N varies by timepoint due to expected therapy discontinuation."

### 6.6 Panel 4: Contract Simulator (bottom-right)

**Title:** "Outcomes-Based Contract Simulator"

**Controls:**

1. **Slider: "Required TETRAS Improvement"**
   - Range: 20% to 50%, step 1%
   - Default: 30%
   - Label shows current value
   - Native HTML `<input type="range">` styled with PX tokens (teal thumb, navy track)

2. **Slider: "Rebate if Threshold Not Met"**
   - Range: 25% to 75%, step 5%
   - Default: 50%
   - Same styling as above

**Computed results (update instantly on slider change):**

Results area below the sliders with clear visual hierarchy:

- **Primary metric (large):** "Patients meeting threshold: **312 / 437 (71.4%)**"
  - Horizontal bar visualization: teal portion (71.4%) + coral portion (28.6%)

- **Secondary metrics (smaller):**
  - "Patients NOT meeting threshold: 125 / 437 (28.6%)"
  - "Estimated rebate exposure: **14.3% of gross revenue**"
    - Calculation: (patients below threshold / total) × rebate %
    - i.e., 28.6% × 50% = 14.3%

- **Confidence badge:**
  - GREEN "HIGH CONFIDENCE" if >70% meet threshold
  - AMBER "MODERATE CONFIDENCE" if 50-70%
  - RED "LOW CONFIDENCE" if <50%
  - Badge uses existing priority tier color styling

**Computation logic:**

```
For each patient in PATIENT_OUTCOMES where tetrasScores.baseline and tetrasScores['90d'] both exist:
  improvement = (baseline - score90d) / baseline
  if improvement >= thresholdPct / 100 → meets threshold
pctMeeting = meetingCount / eligibleCount
rebateExposure = (1 - pctMeeting) * (rebatePct / 100)
```

Patients without 90d scores (dropouts) are excluded from the threshold calculation but noted: "92 patients discontinued before 90-day assessment — excluded from threshold calculation."

**Bottom caption:**
> "Adjust thresholds to model contract terms. Data updates in real-time from hub-collected TETRAS-LITE scores."

---

## 7. SVG Chart Implementation

No chart library. Hand-rolled SVG to match the existing pattern of CSS/HTML-only visualization throughout the dashboard.

### 7.1 Trajectory chart (used in both Step 5 mini-chart and Panel 1)

Shared SVG generation logic, parameterized by dimensions:

```
Props:
  - width: number (responsive, use 100% of parent)
  - height: number (120px for storyboard, 240px for full tab)
  - data: CohortTimepointStats[]
  - showLabels: boolean (false for mini, true for full)
  - showCI: boolean (true for both)
  - animatePatient?: { timepoint: OutcomeTimepoint; score: number } (storyboard only)
```

SVG structure:
- `<path>` for CI band (filled, teal 8% opacity)
- `<polyline>` for mean trend line (teal, 2px stroke)
- `<circle>` for data points (6px, teal fill)
- `<text>` for labels (if showLabels)
- `<circle>` for animated patient dot (if animatePatient, with CSS animation)

Coordinate mapping:
- X: evenly spaced across width with padding (10% left/right)
- Y: linear scale from 0% to max improvement % with padding (10% top/bottom)

### 7.2 Reusable pattern

Extract the SVG chart as a function component within `dashboard/page.tsx` (not a separate file — follows existing pattern where all dashboard components are in the single page file). Two variants:

- `EvidenceMiniChart` — compact, no labels, used in storyboard Step 5
- Full chart rendered inline in the Outcomes tab panel

---

## 8. State Management

### 8.1 New state in dashboard component

```ts
// Contract simulator
const [contractThreshold, setContractThreshold] = useState(30);
const [contractRebate, setContractRebate] = useState(50);

// Computed from PATIENT_OUTCOMES on slider change (useMemo)
const contractResults = useMemo(() => {
  // filter patients with both baseline and 90d scores
  // compute meeting/not-meeting counts
  // compute rebate exposure
  // return ContractSimulation
}, [contractThreshold, contractRebate]);
```

### 8.2 Data imports

```ts
import {
  PATIENT_OUTCOMES,
  COHORT_OUTCOME_DATA,
  PAYER_EVIDENCE_CARD,
} from '@/app/lib/seed-data';
```

### 8.3 Storyboard step conditional logic

The module-level `STORYBOARD_STEPS` constant (`as const`) becomes a `useMemo` computed from whether the current scenario includes TETRAS-LITE screening:

```ts
const storyboardSteps = useMemo(() => {
  const base = [
    { id: 'data-drop', label: 'Data Drop' },
    { id: 'agent-config', label: 'Agent Config' },
    { id: 'conversation', label: 'Conversation' },
    { id: 'transcript', label: 'Transcript' },
    { id: 'call-log', label: 'Call Log' },
  ];
  if (currentCallHasTetrasScreening) {
    base.push({ id: 'evidence-capture', label: 'Evidence Capture' });
  }
  return base;
}, [currentCallHasTetrasScreening]);
```

**Critical: Hard-coded step bounds must be refactored.** The existing code has multiple locations that hard-code `4` as the last step index (0-based, for 5 steps). All of these must be updated to use `storyboardSteps.length - 1` instead:

- `disabled={storyStep === 4}` on the Next button → `disabled={storyStep === storyboardSteps.length - 1}`
- `storyStep < 4` guards in auto-play advancement → `storyStep < storyboardSteps.length - 1`
- The `durations` array (currently 5 entries) must gain a 6th entry for the Evidence Capture step: `4000` (4 seconds, matching Section 5.3 timing)
- Any `STORYBOARD_STEPS.length` references become `storyboardSteps.length`
- Any `STORYBOARD_STEPS.map(...)` references become `storyboardSteps.map(...)`

Without these changes, auto-play stops at Call Log and the Next button disables before Evidence Capture is reachable.

---

## 9. Visual Design

All styling uses existing PX design tokens. No new colors, fonts, or spacing values.

### Key visual treatments:

- **Payer Evidence Card:** Distinguished with a 4px left border in teal. Slightly elevated shadow. Header text in navy. Metrics in a clean grid.
- **Contract Simulator sliders:** Teal accent on thumb/track. Value label updates live.
- **Confidence badge:** Reuses priority tier colors (green/amber/red) and existing badge styling.
- **SVG charts:** Teal primary (#00B9CE), teal at 8% for CI band, navy for axis text.
- **Storyboard Step 5:** Consistent with existing step card pattern. Two-column layout matches the Data Drop step's structure.

### Animation:

- Storyboard Step 5 elements use staggered `animate-fade-in` (existing CSS class) with delays.
- Patient dot drop uses a CSS keyframe: `translateY(-20px)` → `translateY(0)` with `ease-out`.
- Counter tick (436→437) uses a simple setTimeout-based increment.
- Contract simulator results update synchronously on input change (no animation needed — instant feedback is the point).

---

## 10. YAGNI — Explicitly Out of Scope

- No DEE/Relutrigine evidence build (placeholder text only)
- No export, download, or print functionality
- No historical trend of the cohort over time (it's a point-in-time snapshot)
- No integration with backend analytics API — all client-side seed data
- No per-patient drill-down from cohort view
- No multi-instrument comparison charts
- No actual statistical engine — seed data generator pre-computes stats
- No 180d timepoint toggle in contract simulator (just 90d — simpler)
- No real API calls or data persistence

---

## 11. Files Modified

| File | Changes | Estimated lines |
|------|---------|----------------|
| `frontend/src/app/lib/types.ts` | Extend ScreeningInstrumentId union; add OutcomeTimepoint, PatientOutcomeRecord, CohortTimepointStats, CohortOutcomeData, PayerEvidenceCard types | ~55 |
| `frontend/src/app/lib/seed-data.ts` | Add cohort generation functions, PATIENT_OUTCOMES, COHORT_OUTCOME_DATA, PAYER_EVIDENCE_CARD exports | ~150 |
| `frontend/src/app/dashboard/page.tsx` | Add Tab type union member, storyboard Step 5, Outcomes & Evidence tab content, contract simulator state, SVG chart components | ~350 |

**Total estimated additions:** ~550 lines across 3 existing files.
**Files created:** None.
**Dependencies added:** None.

---

## 12. Demo Narrative

The intended walkthrough:

1. Demo operator selects a patient support scenario involving an ET patient (e.g., Margaret Sullivan — adherence check-in)
2. Walks through Data Drop → Agent Config → Conversation → Transcript → Call Log as normal
3. After Call Log, Step 5 ("Evidence Capture") appears — the TETRAS-LITE score from the call animates into the cohort trajectory. The operator says: *"Every support call you just watched also captured structured clinical outcome data."*
4. Operator clicks the "Outcomes & Evidence" tab. The cohort trajectory, persistence curve, and payer evidence card appear.
5. Operator says: *"After 6 months, 437 hub-enrolled patients have generated this. This is the evidence card your market access team hands to Express Scripts."*
6. Operator opens the Contract Simulator. Adjusts the improvement threshold slider. *"What if you offered Express Scripts an outcomes-based contract? Set the threshold. Set the rebate. See how many patients meet it. This is your risk exposure — calculated from real hub data."*
7. The room is quiet. That's the moment.
