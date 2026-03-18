# Brand Context Switcher — Design Spec

**Date:** 2026-03-18
**Status:** Approved
**Approach:** Phased Config Packs (Approach C)
**Brands:** Praxis Precision Medicines, Amgen, PTC Therapeutics

## Overview

Add full white-label brand switching to the praxis-demo platform. Sales reps select a brand on the login page; the entire experience — visual theme, product content, agent personas, backend prompts — adapts to that brand. The demo is functionally identical across brands; only the aesthetic, clinical content, and terminology change.

## Constraints

- **Do not break the existing demo.** Praxis is always the default fallback. Every phase must leave the Praxis experience working exactly as it does today.
- **Aesthetic and branding refresh only.** No new features, pages, or capabilities.
- **Three brands total:** Praxis (existing), Amgen (new), PTC Therapeutics (new).

## Phased Delivery

### Phase 1 — Visual + Identity
CSS variable injection, brand selector on login page, logo/name/tagline swap. Demo works with Praxis content but looks like Amgen/PTC.

### Phase 2 — Frontend Content
Brand config drives drug names, therapeutic areas, seed data, dashboard labels, agent persona names.

### Phase 3 — Backend Prompts & Config
Backend receives brand ID via the Twilio call flow (frontend API → Twilio custom params → media stream handler), loads brand-specific prompts, support knowledge, screening instruments, outcomes, SMS templates, vocabulary boosts.

---

## Brand Pack Data Model

```typescript
interface BrandPack {
  // Identity
  id: string;                    // 'praxis' | 'amgen' | 'ptc'
  companyName: string;           // 'Praxis Precision Medicines'
  shortName: string;             // 'Praxis'
  tagline: string;               // 'DARE FOR MORE®'
  website: string;
  logoAsset: string;             // path to /public/brand-assets/{id}/logo.svg

  // Visual Theme (Phase 1)
  theme: {
    colors: {
      primary: string;
      primaryDark: string;
      primaryLight: string;
      secondary: string;
      accent: string;
      accent2: string;             // Praxis: gold, Amgen: green, PTC: sky-blue
      accent3: string;             // Praxis: coral, Amgen: sunrise, PTC: orange
      info: string;                // Praxis: blue, Amgen: secondary-blue, PTC: violet
      surface: string;
      border: string;
      textPrimary: string;
      textSecondary: string;
      background: string;
    };
    fonts: {
      heading: string;
      body: string;
      googleFontsUrl: string;
    };
    radius: string;
    shadow: string;
    buttonStyle: 'solid' | 'gradient';
    buttonGradient?: string;       // CSS gradient value if buttonStyle is 'gradient'
  };

  // Products (Phase 2)
  products: BrandProduct[];
  therapeuticAreas: BrandTherapeuticArea[];
  supportPathways: BrandSupportPathway[];
  agentPersonas: BrandAgentPersona[];
  hubName: string;
  phoneNumbers: {
    patientSupport: string;
    medicalInfo: string;
    safety: string;
  };
  urls: {
    patientPortal: string;
    hcpPortal: string;
  };
  advocacyOrgs: { name: string; focus: string }[];
  demoScenarios: BrandDemoScenario[];
  seedDataConfig: BrandSeedDataConfig;

  // Backend Content (Phase 3) — maps to BrandBackendConfig
  drugProfiles: BrandDrugProfile[];
  contactNetwork: BrandContactNetwork;
  smsTemplates: Record<string, BrandSmsTemplate>;
  screeningInstruments: BrandScreeningInstrument[];
  vocabBoosts: { word: string; boost: number }[];
  promptConfig: BrandPromptConfig;
}
```

### BrandBackendConfig (Backend-Only Interface)

The backend brand config is the subset of `BrandPack` that the backend needs, plus prompt-specific fields. Each `ws-backend/src/brands/{id}.ts` file exports this shape:

```typescript
interface BrandBackendConfig {
  id: string;
  companyName: string;              // 'Praxis Precision Medicines'
  companyLegalName: string;         // 'Praxis BioSciences'
  shortName: string;                // 'Praxis'
  hubName: string;                  // 'PraxisConnect'
  phoneNumbers: {
    patientSupport: string;
    medicalInfo: string;
    safety: string;
  };
  urls: {
    patientPortal: string;
    hcpPortal: string;
  };

  // Agent identity
  agentName: string;                // 'Emma'
  disclosureText: string;           // "I'm Emma, an AI patient support coordinator for..."
  gatekeeperGreeting: string;       // "Hello, this is Emma from..."

  // Products — full clinical profiles for prompt injection
  drugProfiles: BrandDrugProfile[];  // MOA, indications, dosing, AEs, trial data, etc.

  // Support infrastructure
  supportPathways: BrandSupportPathway[];
  contactNetwork: BrandContactNetwork;  // MSLs, nurse educators, specialty pharmacy, etc.
  advocacyOrgs: { name: string; focus: string }[];

  // Screening instruments — brand defines which instruments apply
  screeningInstruments: BrandScreeningInstrument[];

  // SMS templates — parameterized with agentName, hubName, phoneNumbers, urls
  smsTemplates: Record<string, BrandSmsTemplate>;

  // Deepgram voice config
  vocabBoosts: { word: string; boost: number }[];

  // Outcome descriptions — brand-specific labels for shared outcome IDs
  outcomeOverrides: Record<string, { label: string; description: string }>;
}
```

### Brand-Specific Screening Instruments

Each brand defines screening instruments appropriate to its therapeutic areas:

| Brand | Instrument 1 | Instrument 2 | Shared |
|-------|-------------|-------------|--------|
| Praxis | TETRAS-LITE (tremor assessment) | C-SSRS-LITE (suicidality, anti-epileptics) | AE-TRIAGE, MMAS-4, ADHERENCE-CHECK |
| Amgen | LDL-C-ASSESS (lipid panel review) | ASTHMA-CONTROL (ACQ/ACT symptom check) | AE-TRIAGE, ADHERENCE-CHECK |
| PTC | PHE-MONITOR (phenylalanine level check) | MOTOR-FUNCTION (6MWT/timed function) | AE-TRIAGE, ADHERENCE-CHECK |

Shared instruments (AE-TRIAGE, ADHERENCE-CHECK) remain in the common `screening-instruments.ts`. Brand-specific instruments are defined in each brand config and merged at load time.

### Product Selection Per Brand

| Brand | Drug 1 | Drug 2 |
|-------|--------|--------|
| Praxis | ELEX (euloxacaltenamide) — Essential Tremor | Relutrigine — DEE / Dravet |
| Amgen | Repatha (evolocumab) — Cardiovascular / ASCVD | TEZSPIRE (tezepelumab) — Severe Asthma |
| PTC | Sephience (sepiapterin) — PKU | Emflaza (deflazacort) — DMD |

### Visual Theme Per Brand

| Element | Praxis | Amgen | PTC |
|---------|--------|-------|-----|
| Primary color | #00B9CE (teal) | #0063C3 (blue) | #231D35 (purple-steel) |
| Secondary | #485D61 (dark gray) | #1A3856 (navy) | #38518F (atlantic blue) |
| Accent | #DE7D00 (orange) | #EE7624 (orange) | #D34531 (reddish CTA) |
| Heading font | Roboto | Poppins | Plus Jakarta Sans |
| Body font | Roboto | Poppins | Plus Jakarta Sans |
| Border radius | 0px (sharp) | 1px (sharp) | 11px (rounded) |
| Button style | Solid teal | Blue gradient (#0063C3 → #0675E0) | Solid reddish |
| Logo | Pulled SVG from praxismedicines.com | Pulled SVG from amgen.com | Pulled SVG/PNG from ptcbio.com |

### Backend Content Per Brand

| Content | Praxis | Amgen | PTC |
|---------|--------|-------|-----|
| Agent name | Emma | Sarah | Hannah |
| Hub name | PraxisConnect | Amgen SupportPlus | PTC Cares |
| Phone (patient) | 1-800-PRAXIS-PS | 1-800-AMGEN-SP | 1-844-478-2227 |
| Phone (medical) | 1-800-PRAXIS-MI | 1-800-AMGEN-MI | 1-866-PTC-MEDI |
| Phone (safety) | 1-800-PRAXIS-AE | 1-800-AMGEN-AE | 1-866-PTC-SAFE |
| MSL team | 3 named MSLs | 3 named MSLs | 3 named MSLs |
| Nurse educators | 2 named (per TA) | 2 named (Nurse Ambassadors) | 2 named (Case Managers) |
| Advocacy orgs | Dravet Foundation, IETF | AHA, Asthma & Allergy Foundation | NPKUA, Parent Project MD |
| Vocab boosts | ELEX, Relutrigine, Dravet | Repatha, TEZSPIRE, evolocumab | Sephience, Emflaza, sepiapterin |
| Key screening | C-SSRS, TETRAS | LDL-C levels, FeNO/IgE | Phe levels, 6MWT, genetic testing |
| HCP specialties | Neurologists, Epileptologists | Cardiologists, Pulmonologists | Metabolic Geneticists, Pediatric Neurologists |

---

## Phase 1 — Visual + Identity

### Brand Selector on Login Page
- Dropdown below the access code input: "Presenting for: [Praxis ▾]"
- Selecting a brand immediately re-themes the login page (colors, logo, fonts, tagline)
- Selection saved to `localStorage('vi-demo-brand')`
- On login, brand ID carries into the dashboard session via React context

### Theme Injection Mechanism
- `BrandContext.tsx` — React Context holding active brand pack, `setBrandId()`, all brand packs
- `ThemeInjector.tsx` — watches brand changes via useEffect, writes CSS custom properties to `document.documentElement.style`, loads Google Fonts dynamically via `font-loader.ts`
- Tailwind config maps `brand-*` colors to CSS variables: `rgb(var(--brand-primary) / <alpha-value>)`

### CSS Variable Mapping
ThemeInjector writes these CSS custom properties to `:root`:
```css
--brand-primary: R G B;          /* RGB triplet for Tailwind alpha support */
--brand-primary-hex: #XXXXXX;    /* Hex for non-Tailwind usage */
--brand-primary-dark: R G B;
--brand-primary-light: R G B;
--brand-secondary: R G B;
--brand-accent: R G B;
--brand-surface: R G B;
--brand-text: R G B;
--brand-text-muted: R G B;
--brand-border: R G B;
--brand-heading-font: 'FontName', fallback, sans-serif;
--brand-body-font: 'FontName', fallback, sans-serif;
--brand-radius: Xpx;
/* Plus generated palette: --brand-50 through --brand-900 */
```

### Refactoring Scope
- Replace hardcoded `praxis-*` Tailwind classes with `brand-*` equivalents
- Replace `PX` / `COLORS` constant object in `constants.ts` to read from active brand theme
- Login page reads brand context for logo, company name, tagline
- Dashboard header/nav reads brand context for logo and company name
- `globals.css` gets brand variable defaults (Praxis values) so the app works without JS-injected values

### Dashboard PX Object Migration Strategy

The `dashboard/page.tsx` has a local `PX` constant object (lines 31-59) that duplicates `COLORS` from `constants.ts`, with ~859 usage sites referencing `PX.teal`, `PX.navy`, etc. via inline styles and Tailwind arbitrary values.

**Approach:** Redefine `PX` values to read from CSS variables. This lets all 859 usage sites continue working without individual changes:

```typescript
// Before
const PX = { teal: '#00B9CE', navy: '#485D61', ... };

// After — PX becomes a thin wrapper over CSS variables
const PX = {
  teal: 'var(--brand-primary-hex)',
  navy: 'var(--brand-secondary-hex)',
  accent: 'var(--brand-accent-hex)',
  // ... all values map to brand CSS variables
};
```

This is the largest single migration task in Phase 1 but is mechanically straightforward: define the PX-to-CSS-variable mapping once, then verify visually.

### Font Loading Strategy

To avoid FOUC (Flash of Unstyled Content), include all three brand fonts in the static Google Fonts import in `globals.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;600;700;900&family=Poppins:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
```

The active font is selected via CSS variables (`--brand-heading-font`, `--brand-body-font`). All fonts are pre-loaded; only the CSS variable reference changes on brand switch. No runtime font loading needed for the initial three brands.

### Layout Metadata

`layout.tsx` is a Next.js Server Component and cannot read React context. The metadata (title, favicon, theme-color) is handled as follows:

- **Title:** Use neutral Vi branding: `'Vi Operate'` (not brand-specific)
- **Favicon:** Use Vi favicon (brand-neutral), or use `generateMetadata` reading brand from cookies if brand-specific favicon is needed later
- **Theme color:** Set to a neutral value or omit; the ThemeInjector handles the visual theme client-side

This keeps `layout.tsx` simple and avoids Server Component complexity in Phase 1.

### What Does NOT Change in Phase 1
- Drug names, therapeutic areas, seed data, support pathways (still Praxis content)
- Backend prompts, screening instruments, outcomes (still Praxis)

---

## Phase 2 — Frontend Content Switching

### Type Migration Strategy

The frontend and backend currently have divergent enum values for the same concepts. Phase 2 aligns them:

**Current divergence:**
| Concept | Frontend Value | Backend Value |
|---------|---------------|---------------|
| Therapeutic area (Dravet) | `'dee'` | `'dee-dravet'` |
| Support pathway (hub) | `'hub-enrollment'` | `'medication-access'` |
| Support pathway (safety) | `'ae-reporting'` | `'safety-reporting'` |
| Outcome (AE) | `'ae-reported'` | `'ae-report-filed'` |

**Resolution:** Both frontend and backend loosen to `string` types. The brand pack is the single source of truth for valid values. Runtime validation uses the brand pack's arrays, not compile-time enums.

```typescript
// Before (both frontend and backend)
type DrugProduct = 'euloxacaltenamide' | 'relutrigine';
type TherapeuticArea = 'essential-tremor' | 'dee';

// After (both frontend and backend)
type DrugProductId = string;       // validated against active brand pack
type TherapeuticAreaId = string;   // validated against active brand pack
type SupportPathwayId = string;
type OutcomeId = string;
```

Valid values for each brand come from the brand pack's `products`, `therapeuticAreas`, `supportPathways` arrays. All label lookups (`DRUG_PRODUCTS`, `THERAPEUTIC_AREAS`, `SUPPORT_PATHWAYS`, `OUTCOME_LABELS`) move from static objects in `constants.ts` into the brand pack.

### Outcome IDs: Shared Structure, Brand-Specific Labels

Outcome IDs are **shared across all brands** — they represent structural call outcomes, not brand-specific events. The dashboard, classifier JSON schema, and analytics all reference these IDs. Only the labels and descriptions change per brand.

```typescript
// Shared outcome IDs (same across all brands)
const SHARED_OUTCOME_IDS = [
  'ae-reported', 'ae-escalated', 'medical-info-provided',
  'sample-requested', 'copay-card-issued', 'hub-enrolled',
  'callback-scheduled', 'declined', 'voicemail', 'no-answer',
  'transferred', 'nurse-educator-referral', 'prior-auth-assist',
  'speaker-program-interest', 'msl-followup-requested', 'crisis-escalated'
];

// Brand pack provides overrides for labels/descriptions
outcomeOverrides: {
  'hub-enrolled': {
    label: 'Amgen SupportPlus Enrollment',
    description: 'Patient enrolled in Amgen SupportPlus hub services'
  },
  'copay-card-issued': {
    label: 'Amgen FIRST STEP Copay',
    description: 'Patient enrolled in Amgen FIRST STEP copay program'
  }
}
```

### Seed Data Generator
`seed-data.ts` accepts a brand pack parameter. Contact names and call structures stay generic; drug names, therapeutic areas, and condition-specific details come from brand config.

### Dashboard Content
- Tab labels stay the same (Agent Storyboard, Interaction Data, etc.) — platform features, not brand-specific
- Drug name dropdowns, therapeutic area filters, support pathway labels read from brand context
- KPI cards structurally identical, display brand-appropriate metric labels
- Agent persona names change per brand
- Demo scenarios reference brand-specific drugs and conditions

---

## Phase 3 — Backend Content Switching

### Brand ID Propagation

The frontend does not connect directly to the backend via WebSocket. The actual call flow is Twilio-mediated:

1. Frontend calls `POST /api/demo-call` with `brandId` in the request body
2. Backend API route initiates a Twilio outbound call, passing `brandId` as a custom parameter
3. Twilio hits the `/twilio/voice` webhook; TwiML opens a media stream to `/twilio/media-stream`
4. The media-stream handler reads `brandId` from Twilio Stream custom parameters
5. `getBrandConfig(brandId)` loads the brand config used for the entire call session (Deepgram agent, prompts, SMS templates, classifier)

If `brandId` is missing or unrecognized, defaults to `'praxis'`.

### Backend Brand Config Structure
```
ws-backend/src/brands/
  index.ts              // getBrandConfig(id): BrandBackendConfig, defaults to praxis
  praxis.ts             // Extracted from current hardcoded content
  amgen.ts              // New
  ptc.ts                // New
```

### Content Migration

| Current File | Change |
|-------------|--------|
| `support-knowledge.ts` | Drug profiles, support pathways, contact network extracted per brand. Shared function loads from brand config. |
| `outcomes.ts` | Core outcomes shared. Brand-specific descriptions (hub name, program name) parameterized. |
| `behavioral-signals.ts` | Signal categories shared. Talking point text references brand config for hub names, drug names, advocacy orgs. |
| `screening-instruments.ts` | Instrument definitions stay generic. Brand config specifies which instruments to use. |
| Agent prompts (4 files) | Become template functions: `buildPatientSupportPrompt(brandConfig)`. Company name, drug names, phone numbers, persona names, clinical data injected from brand config. |
| `classification-prompt.ts` | Same template approach — receives brand config. |
| `sms-templates.ts` | Template structure stays shared. All brand-specific strings (`agentName`, `hubName`, `phoneNumbers`, `urls`, `companyName`) injected from brand config at render time. Templates are NOT duplicated per brand — they are parameterized functions. |
| `deepgram-agent.ts` | Vocabulary boosts and function definitions load from brand config. |
| `groq-classifier.ts` | System prompt references brand config. |

### What Stays Shared
- WebSocket connection handling, Deepgram/Twilio service plumbing
- Core outcome types (ae-reported, declined, voicemail, callback-scheduled)
- Agent type structure (patient-support, hcp-support, hcp-outbound, medcomms-qa)
- Call flow logic, SMS sending mechanics, classifier service structure

---

## File Structure

### New Files

```
frontend/
  src/app/
    components/
      BrandContext.tsx
      ThemeInjector.tsx
      BrandSelector.tsx
    lib/
      brands/
        index.ts               // BrandPack interface, getBrand(), allBrands
        praxis.ts
        amgen.ts
        ptc.ts
      theme-utils.ts           // Color math (palette generation, contrast)
      font-loader.ts           // Dynamic Google Font loading
  public/
    brand-assets/
      praxis/                  // existing
      amgen/                   // pulled logo from amgen.com
      ptc/                     // pulled logo from ptcbio.com

ws-backend/
  src/
    brands/
      index.ts
      praxis.ts
      amgen.ts
      ptc.ts
```

### Modified Files

| File | Change | Risk |
|------|--------|------|
| `frontend/tailwind.config.ts` | Add `brand-*` color mappings to CSS vars | Low |
| `frontend/src/app/globals.css` | Brand CSS variable defaults, refactor `praxis-*` to `brand-*` | Medium |
| `frontend/src/app/layout.tsx` | Wrap app in `BrandProvider` | Low |
| `frontend/src/app/page.tsx` | Add BrandSelector, read brand context | Medium |
| `frontend/src/app/dashboard/page.tsx` | Replace hardcoded color refs, read brand context for labels | High |
| `frontend/src/app/lib/constants.ts` | COLORS reads from brand pack, drug/TA lookups brand-aware | Medium |
| `frontend/src/app/lib/types.ts` | Loosen enums to string types | Medium |
| `frontend/src/app/lib/seed-data.ts` | Accept brand pack parameter | Medium |
| `ws-backend/src/routes/twilio-voice.ts` | Read brandId from WS query params | Low |
| `ws-backend/src/services/deepgram-agent.ts` | Vocab boosts + function defs from brand config | Medium |
| `ws-backend/src/prompts/*.ts` (6 files) | Template functions accepting brand config | High |
| `ws-backend/src/config/*.ts` (4 files) | Parameterize with brand config | Medium |
| `ws-backend/src/services/groq-classifier.ts` | Brand config in system prompt | Low |
| `ws-backend/src/services/sms-service.ts` | Pass brand config to templates | Low |
| `ws-backend/src/prompts/sms-templates.ts` | Parameterize with brand config values | Medium |
| `ws-backend/src/routes/api-demo-call.ts` | Accept and forward brandId | Low |

---

## Migration Safety

1. **Praxis is always the default.** No brand selected = Praxis. Every code path has a Praxis fallback.
2. **Phase 1 is additive.** New files + CSS variable layer on top of existing styles. Existing `praxis-*` classes remain as fallbacks until fully migrated.
3. **No types.ts enum changes until Phase 2.** Phase 1 uses only visual theming.
4. **Backend changes behind brandId parameter.** Connections without it get Praxis config.
5. **Each phase gets a test pass** against Praxis brand to confirm zero regressions.

## Scope Exclusions

1. **No new features** — same demo, different skin + content.
2. **No dashboard restructuring** — 1600-line page.tsx stays monolithic. Color refs and label lookups change, component structure doesn't.
3. **No URL routing per brand** — localStorage + context, no `/amgen/dashboard` routes.
4. **No dark mode toggle** — brands set their own palette, that's it.
5. **No runtime brand creation** — three hardcoded configs. Adding a brand = new config file + redeploy.
6. **No backend A/B testing** — brand switches the whole experience.
7. **No changes to call flow logic** — service plumbing stays identical.

## Reference Materials

- Brand guide: `research/brand-guides/amgen-brand-guide.md`
- Brand guide: `research/brand-guides/ptc-therapeutics-brand-guide.md`
- Product research: `research/amgen-product-portfolio.md`
- Product research: `research/ptc-therapeutics-product-portfolio.md` (output file)
- Wellness demo brand switcher architecture: `/Users/mgc50/Dropbox/1. Worked On FILES/(34) Vi/wellness_demo/` (ClientContext, ThemeInjector, clients.ts, theme-tokens.ts pattern)
