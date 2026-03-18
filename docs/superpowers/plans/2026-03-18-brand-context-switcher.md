# Brand Context Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full white-label brand switching so sales reps select Praxis, Amgen, or PTC Therapeutics on the login page and the entire demo — visuals, content, backend prompts — adapts.

**Architecture:** Phased Config Packs. Phase 1 (visual theming via CSS variable injection), Phase 2 (frontend content switching), Phase 3 (backend prompt/config switching). Each phase is independently deployable. Praxis is always the default fallback.

**Tech Stack:** Next.js 14 (App Router), React Context, Tailwind CSS, CSS custom properties, TypeScript, Express/WebSocket backend

**Spec:** `docs/superpowers/specs/2026-03-18-brand-context-switcher-design.md`

**Reference research:**
- `research/brand-guides/amgen-brand-guide.md` — Amgen visual identity (colors, fonts, UI patterns)
- `research/brand-guides/ptc-therapeutics-brand-guide.md` — PTC visual identity
- `research/amgen-product-portfolio.md` — Amgen drugs, support programs, screening
- Wellness demo brand switcher: `/Users/mgc50/Dropbox/1. Worked On FILES/(34) Vi/wellness_demo/` — reference implementation for ClientContext, ThemeInjector, theme-tokens patterns

**Spec deviation note:** The spec lists `frontend/src/app/lib/font-loader.ts` as a new file for dynamic Google Font loading. This plan intentionally replaces that with a static multi-font import in `globals.css` (all three brand fonts pre-loaded). No `font-loader.ts` is needed for three brands. If more brands are added later, revisit this decision.

---

## Phase 1 — Visual + Identity

### Task 1: Brand Pack Interface + Praxis Config

**Files:**
- Create: `frontend/src/app/lib/brands/index.ts`
- Create: `frontend/src/app/lib/brands/praxis.ts`

- [ ] **Step 1: Create the BrandPack interface and brand registry**

Create `frontend/src/app/lib/brands/index.ts`. Define the `BrandPack` interface (Phase 1 fields only — identity + theme). Include `getBrand(id)`, `allBrands`, and default to `'praxis'`. See spec lines 34-69 for the full interface shape.

Phase 1 subset of BrandPack:
```typescript
export interface BrandPackTheme {
  colors: {
    primary: string;        // hex
    primaryDark: string;
    primaryLight: string;
    secondary: string;
    accent: string;
    accent2: string;
    accent3: string;
    info: string;
    surface: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    background: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  radius: string;
  shadow: string;
  buttonStyle: 'solid' | 'gradient';
  buttonGradient?: string;
}

export interface BrandPack {
  id: string;
  companyName: string;
  shortName: string;
  tagline: string;
  website: string;
  logoAsset: string;
  theme: BrandPackTheme;
}
```

Export `getBrand(id: string): BrandPack` (defaults to praxis), `allBrands: BrandPack[]`, and `DEFAULT_BRAND_ID = 'praxis'`.

- [ ] **Step 2: Create the Praxis brand config**

Create `frontend/src/app/lib/brands/praxis.ts`. Extract ALL visual values from the current `constants.ts` COLORS object and `globals.css` :root variables. This must produce the exact same visual output as the current hardcoded values.

```typescript
import type { BrandPack } from './index';

export const praxisBrand: BrandPack = {
  id: 'praxis',
  companyName: 'Praxis Precision Medicines',
  shortName: 'Praxis',
  tagline: 'DARE FOR MORE\u00AE',
  website: 'https://praxismedicines.com',
  logoAsset: '/brand-assets/praxis/logo-primary.svg',
  theme: {
    colors: {
      primary: '#00B9CE',
      primaryDark: '#009AAD',
      primaryLight: '#25C8D9',
      secondary: '#485D61',
      accent: '#DE7D00',
      accent2: '#EFBC66',    // gold
      accent3: '#FF7D78',    // coral
      info: '#2C59AB',       // blue
      surface: '#F5F5F5',
      border: '#E2E7EA',
      textPrimary: '#000000',
      textSecondary: '#485D61',
      background: '#FFFFFF',
    },
    fonts: { heading: 'Roboto', body: 'Roboto' },
    radius: '0px',
    shadow: '0 1px 3px rgba(0,0,0,0.06)',
    buttonStyle: 'solid',
  },
};
```

- [ ] **Step 3: Wire up the registry in index.ts**

Import `praxisBrand` in `index.ts`, add to `allBrands` array, implement `getBrand()`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/lib/brands/
git commit -m "feat(brands): add BrandPack interface and Praxis config"
```

---

### Task 2: Amgen + PTC Brand Configs

**Files:**
- Create: `frontend/src/app/lib/brands/amgen.ts`
- Create: `frontend/src/app/lib/brands/ptc.ts`
- Modify: `frontend/src/app/lib/brands/index.ts`

- [ ] **Step 1: Create Amgen brand config**

Use values from `research/brand-guides/amgen-brand-guide.md`. Key values:
- Primary: `#0063C3`, Secondary: `#1A3856`, Accent: `#EE7624`
- Fonts: Poppins
- Radius: `1px`, Button: gradient `#0063C3` → `#0675E0`

- [ ] **Step 2: Create PTC brand config**

Use values from `research/brand-guides/ptc-therapeutics-brand-guide.md`. Key values:
- Primary: `#231D35`, Secondary: `#38518F`, Accent: `#D34531`
- Fonts: Plus Jakarta Sans
- Radius: `11px`, Button: solid `#D34531`

- [ ] **Step 3: Register both in index.ts**

Add imports and register in `allBrands` array.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/lib/brands/
git commit -m "feat(brands): add Amgen and PTC Therapeutics brand configs"
```

---

### Task 3: Theme Utilities

**Files:**
- Create: `frontend/src/app/lib/theme-utils.ts`

- [ ] **Step 1: Create color math utilities**

Port the essential utilities from the wellness demo's `theme-utils.ts` at `/Users/mgc50/Dropbox/1. Worked On FILES/(34) Vi/wellness_demo/src/app/lib/theme-utils.ts`. We need:

```typescript
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null
export function hexToRgbString(hex: string): string  // "R G B" format for Tailwind
export function isLight(hex: string): boolean         // luminance check for contrast
export function lighten(hex: string, ratio: number): string
export function darken(hex: string, ratio: number): string
export function generatePalette(hex: string): Record<string, string>  // 50-900 shades
```

The `generatePalette` function should produce 10 shades (50, 100, 200, ..., 900) from a single hex color using the same lighten/darken ratios as the wellness demo.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/lib/theme-utils.ts
git commit -m "feat(brands): add theme color math utilities"
```

---

### Task 4: BrandContext Provider

**Files:**
- Create: `frontend/src/app/components/BrandContext.tsx`

- [ ] **Step 1: Create the BrandContext provider**

Port the pattern from wellness demo's `ClientContext.tsx` at `/Users/mgc50/Dropbox/1. Worked On FILES/(34) Vi/wellness_demo/src/app/components/ClientContext.tsx`. Adapted for our brand system:

```typescript
'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { getBrand, allBrands, DEFAULT_BRAND_ID, type BrandPack } from '@/app/lib/brands';

interface BrandContextValue {
  brand: BrandPack;
  setBrandId: (id: string) => void;
  allBrands: BrandPack[];
}

const BrandContext = createContext<BrandContextValue | null>(null);

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brandId, setBrandId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vi-demo-brand') || DEFAULT_BRAND_ID;
    }
    return DEFAULT_BRAND_ID;
  });

  const handleSetBrandId = (id: string) => {
    setBrandId(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vi-demo-brand', id);
    }
  };

  const brand = useMemo(() => getBrand(brandId), [brandId]);

  const value = useMemo<BrandContextValue>(
    () => ({ brand, setBrandId: handleSetBrandId, allBrands }),
    [brand]
  );

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrand(): BrandContextValue {
  const ctx = useContext(BrandContext);
  if (!ctx) throw new Error('useBrand must be used within BrandProvider');
  return ctx;
}
```

Key behaviors:
- Reads initial brand from `localStorage('vi-demo-brand')`, falls back to `'praxis'`
- `setBrandId` writes to both state and localStorage
- `useBrand()` hook for consumers

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/components/BrandContext.tsx
git commit -m "feat(brands): add BrandContext provider with localStorage persistence"
```

---

### Task 5: ThemeInjector Component

**Files:**
- Create: `frontend/src/app/components/ThemeInjector.tsx`

- [ ] **Step 1: Create the ThemeInjector**

Port the pattern from wellness demo's `ThemeInjector.tsx` at `/Users/mgc50/Dropbox/1. Worked On FILES/(34) Vi/wellness_demo/src/app/components/ThemeInjector.tsx`. This component watches the brand context and writes CSS custom properties to `:root`.

```typescript
'use client';

import { useEffect } from 'react';
import { useBrand } from './BrandContext';
import { hexToRgbString, generatePalette } from '@/app/lib/theme-utils';
```

On brand change (useEffect with `brand` dependency):
1. Get the brand's theme colors
2. Convert each color to RGB triplet string using `hexToRgbString()`
3. Generate a 50-900 palette from the primary color using `generatePalette()`
4. Set ALL CSS custom properties on `document.documentElement.style`:
   - `--brand-primary` (RGB triplet), `--brand-primary-hex` (hex)
   - Same pattern for primaryDark, primaryLight, secondary, accent, accent2, accent3, info, surface, border, textPrimary, textSecondary, background
   - `--brand-50` through `--brand-900` (generated palette)
   - `--brand-heading-font`, `--brand-body-font`
   - `--brand-radius`
   - `--brand-button-style` (solid or gradient)
   - `--brand-button-gradient` (if gradient)
5. Set `data-brand` attribute on `<html>` element

The component renders `null` — it's a side-effect-only component.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/components/ThemeInjector.tsx
git commit -m "feat(brands): add ThemeInjector for CSS variable injection"
```

---

### Task 6: Update globals.css + Font Imports

**Files:**
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Update the Google Fonts import**

Replace the current Roboto-only import (line 1) with all three brand fonts:

```css
@import url('https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;0,500;0,600;0,700;0,900;1,700;1,900&family=Roboto+Condensed:wght@400;700&family=Roboto+Mono:wght@400;500&family=Poppins:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
```

- [ ] **Step 2: Add brand CSS variable defaults to :root**

Add brand-prefixed CSS variables alongside the existing praxis-prefixed ones. The brand variables default to Praxis values (so the app works before JS hydration). ThemeInjector will overwrite these at runtime.

Add to the `:root` block:

```css
/* Brand theme (defaults to Praxis, overridden by ThemeInjector at runtime) */
--brand-primary: 0 185 206;        /* RGB triplet of #00B9CE */
--brand-primary-hex: #00B9CE;
--brand-primary-dark: 0 154 173;
--brand-primary-dark-hex: #009AAD;
--brand-primary-light: 37 200 217;
--brand-primary-light-hex: #25C8D9;
--brand-secondary: 72 93 97;
--brand-secondary-hex: #485D61;
--brand-accent: 222 125 0;
--brand-accent-hex: #DE7D00;
--brand-accent2: 239 188 102;
--brand-accent2-hex: #EFBC66;
--brand-accent3: 255 125 120;
--brand-accent3-hex: #FF7D78;
--brand-info: 44 89 171;
--brand-info-hex: #2C59AB;
--brand-surface: 245 245 245;
--brand-surface-hex: #F5F5F5;
--brand-border: 226 231 234;
--brand-border-hex: #E2E7EA;
--brand-text: 0 0 0;
--brand-text-hex: #000000;
--brand-text-muted: 72 93 97;
--brand-text-muted-hex: #485D61;
--brand-bg: 255 255 255;
--brand-bg-hex: #FFFFFF;
--brand-heading-font: 'Roboto', 'Segoe UI', system-ui, sans-serif;
--brand-body-font: 'Roboto', 'Segoe UI', system-ui, sans-serif;
--brand-radius: 0px;
```

- [ ] **Step 3: Update body font-family to use brand variable**

Change the body rule:
```css
body {
  font-family: var(--brand-body-font);
  color: var(--text-primary);
  background-color: var(--bg-cream);
}
```

- [ ] **Step 4: Audit and update hardcoded Praxis colors in animations**

Search `globals.css` for hardcoded Praxis hex values in `@keyframes` and utility classes. Known instances:
- `highlight-pulse` animation uses `rgba(0, 185, 206, 0.4)` (Praxis teal) — replace with `rgb(var(--brand-primary) / 0.4)`
- `skeleton` shimmer uses `#E2E7EA` / `#F0F2F3` — these are neutral grays, can stay as-is
- Any other `#00B9CE`, `#485D61`, `#DE7D00` references in animations should use CSS variable equivalents

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/globals.css
git commit -m "feat(brands): add brand CSS variable defaults and multi-font import"
```

---

### Task 7: Update Tailwind Config

**Files:**
- Modify: `frontend/tailwind.config.ts`

- [ ] **Step 1: Add brand-* color mappings**

Add a `brand` color group that references CSS variables with Tailwind alpha support. Keep existing `praxis` colors as-is (they're still used as fallbacks during migration).

```typescript
brand: {
  DEFAULT: 'rgb(var(--brand-primary) / <alpha-value>)',
  dark: 'rgb(var(--brand-primary-dark) / <alpha-value>)',
  light: 'rgb(var(--brand-primary-light) / <alpha-value>)',
  secondary: 'rgb(var(--brand-secondary) / <alpha-value>)',
  accent: 'rgb(var(--brand-accent) / <alpha-value>)',
  accent2: 'rgb(var(--brand-accent2) / <alpha-value>)',
  accent3: 'rgb(var(--brand-accent3) / <alpha-value>)',
  info: 'rgb(var(--brand-info) / <alpha-value>)',
  surface: 'rgb(var(--brand-surface) / <alpha-value>)',
},
```

- [ ] **Step 2: Add brand font families**

```typescript
fontFamily: {
  sans: ['Roboto', 'Segoe UI', 'system-ui', 'sans-serif'],
  mono: ['Roboto Mono', 'Fira Code', 'monospace'],
  'brand-heading': ['var(--brand-heading-font)'],
  'brand-body': ['var(--brand-body-font)'],
},
```

- [ ] **Step 3: Commit**

```bash
git add frontend/tailwind.config.ts
git commit -m "feat(brands): add brand-* Tailwind color and font mappings"
```

---

### Task 8: Update Layout + Wire BrandProvider

**Files:**
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Wrap app in BrandProvider, add ThemeInjector**

```typescript
import { BrandProvider } from './components/BrandContext';
import { ThemeInjector } from './components/ThemeInjector';
```

Update metadata to neutral Vi branding:
```typescript
export const metadata: Metadata = {
  title: {
    default: 'Vi Operate',
    template: 'Vi Operate — %s',
  },
  description: 'Pharma Engagement Platform powered by Vi',
  icons: {
    icon: '/brand-assets/praxis/favicon.jpg', // keep Praxis favicon for now
  },
};
```

Remove the hardcoded themeColor or set to neutral.

Wrap body children:
```tsx
<body className="antialiased bg-[#F5F5F5]">
  <BrandProvider>
    <ThemeInjector />
    {children}
  </BrandProvider>
</body>
```

- [ ] **Step 2: Verify the app still loads with Praxis defaults**

Run: `cd frontend && npm run dev`

Open `http://localhost:3000`. The login page should look exactly the same as before — Praxis colors, Roboto font, everything unchanged. The ThemeInjector should have written brand CSS variables to `:root` (check in DevTools > Elements > html element > style attribute).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/layout.tsx
git commit -m "feat(brands): wire BrandProvider and ThemeInjector into root layout"
```

---

### Task 9: Brand Logos

**Files:**
- Create: `frontend/public/brand-assets/amgen/` directory with logo file(s)
- Create: `frontend/public/brand-assets/ptc/` directory with logo file(s)

- [ ] **Step 1: Pull Amgen logo**

Fetch the Amgen logo from their media asset library or website. Save as SVG if available, PNG fallback. Place in `frontend/public/brand-assets/amgen/logo-primary.svg` (or `.png`). Also save a nav-sized variant as `logo-nav.png` if different.

The Amgen logo is a blue wordmark. Available as SVG from the website source or as ZIP from `https://www.amgen.com/newsroom/image-library`.

- [ ] **Step 2: Pull PTC Therapeutics logo**

Fetch from ptcbio.com. The favicon PNG is at `https://www.ptcbio.com/wp-content/uploads/sites/2/2023/01/ptcLogo.png`. Also check the site source for inline SVG. Save to `frontend/public/brand-assets/ptc/logo-primary.png`.

- [ ] **Step 3: Verify logo assets exist**

```bash
ls -la frontend/public/brand-assets/amgen/
ls -la frontend/public/brand-assets/ptc/
ls -la frontend/public/brand-assets/praxis/
```

- [ ] **Step 4: Commit**

```bash
git add frontend/public/brand-assets/
git commit -m "feat(brands): add Amgen and PTC logo assets"
```

---

### Task 10: BrandSelector Component

**Files:**
- Create: `frontend/src/app/components/BrandSelector.tsx`

- [ ] **Step 1: Create the brand selector dropdown**

A `'use client'` component rendered on the login page. Shows a dropdown: "Presenting for: [Brand Name ▾]". Each option shows the brand name and a color swatch.

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { useBrand } from './BrandContext';
```

Key behaviors:
- Uses `useBrand()` to get current brand and `setBrandId`
- Dropdown button shows current brand name + small color swatch (circle of primary color)
- Dropdown menu lists all brands with name + primary color swatch
- Clicking a brand calls `setBrandId(brand.id)` and closes dropdown
- Click-outside closes dropdown
- Styled with brand-neutral colors (gray/white) so it looks good on any brand theme

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/components/BrandSelector.tsx
git commit -m "feat(brands): add BrandSelector dropdown component"
```

---

### Task 11: Update Login Page

**Files:**
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Read the current login page**

Read `frontend/src/app/page.tsx` in full to understand the current structure (decorative gradients, logo, form, footer).

- [ ] **Step 2: Add brand context and BrandSelector**

Import `useBrand` and `BrandSelector`. Read `brand` from context. Replace:
- Hardcoded "Praxis Precision Medicines" → `brand.companyName`
- Hardcoded logo path → `brand.logoAsset`
- Hardcoded tagline references → `brand.tagline`
- Hardcoded color values in inline styles (teal gradient, teal buttons, etc.) → use `brand.theme.colors.primary` or CSS variables
- Footer "Praxis Precision Medicines · Neurology Portfolio" → `brand.companyName`

Add the `<BrandSelector />` below the access code input. Since the component is already `'use client'`, this works directly.

For the decorative radial gradients in the background, use `brand.theme.colors.primary` and `brand.theme.colors.secondary` instead of hardcoded hex values.

- [ ] **Step 3: Verify login page renders correctly for all 3 brands**

Run `npm run dev`, open the login page. Use the BrandSelector to switch between all three brands. Verify:
- Logo changes per brand
- Colors change (background gradients, button color, text accents)
- Font changes (Roboto → Poppins → Plus Jakarta Sans)
- Company name and tagline update
- The access code form still works

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat(brands): brand-aware login page with BrandSelector"
```

---

### Task 12: Dashboard PX Object Migration

**Files:**
- Modify: `frontend/src/app/dashboard/page.tsx`

This is the largest and highest-risk task in Phase 1. The dashboard has a local `PX` constant object (lines 31-59) with ~859 usage sites.

- [ ] **Step 1: Read the current PX object and understand the mapping**

Read `frontend/src/app/dashboard/page.tsx` lines 31-59 to see all PX keys and their current hex values.

- [ ] **Step 2: Redefine PX to reference CSS variables**

Replace the static hex values with CSS variable references. This is the single change that makes all 859 usage sites dynamic:

```typescript
const PX = {
  bg: 'var(--brand-surface-hex)',
  cardBg: 'var(--brand-bg-hex)',
  cardBorder: 'var(--brand-border-hex)',
  cardShadow: '0 1px 3px rgba(0,0,0,0.06)',  // keep static
  teal: 'var(--brand-primary-hex)',
  tealLight: 'var(--brand-primary-light-hex)',
  tealBg: '#E0F7FA',                            // keep static light tint (or use brand-50)
  navy: 'var(--brand-secondary-hex)',
  navyDeep: 'var(--brand-primary-dark-hex)',
  textPrimary: 'var(--brand-text-hex)',
  textSecondary: 'var(--brand-text-muted-hex)',
  textMuted: '#ACB0B3',                          // keep static neutral
  btnDark: 'var(--brand-secondary-hex)',
  btnDarkHover: 'var(--brand-primary-dark-hex)',
  success: '#34A853',                            // keep static semantic
  error: 'var(--brand-accent3-hex)',
  warning: 'var(--brand-accent-hex)',
  purple: 'var(--brand-info-hex)',
  priorityHigh: 'var(--brand-accent3-hex)',
  priorityMedium: 'var(--brand-accent-hex)',
  priorityLow: '#34A853',                        // keep static semantic
  skelBase: 'var(--brand-border-hex)',
  skelShimmer: '#F0F2F3',                         // keep static
  accent: 'var(--brand-accent-hex)',
  gold: 'var(--brand-accent2-hex)',
  coral: 'var(--brand-accent3-hex)',
  blue: 'var(--brand-info-hex)',
} as const;
```

**IMPORTANT:** Remove the `as const` assertion since values are now dynamic strings, not literal types. Change to a regular typed object or use `satisfies` if type safety is needed.

- [ ] **Step 3: Update dashboard company name only (Phase 1 scope)**

Add `useBrand()` import at the top of the component. Search the dashboard file for hardcoded "Praxis" strings that appear in **headers, breadcrumbs, and labels** (company name references). Replace those with `brand.shortName` or `brand.companyName`. Do NOT replace drug names, persona names, or clinical content — those are Phase 2 (Task 18).

- [ ] **Step 4: Verify the dashboard renders correctly with Praxis brand**

Run `npm run dev`, log in, verify the dashboard looks exactly the same as before with Praxis selected. All colors should match. Switch brands in localStorage (or go back to login and switch) and verify the dashboard re-renders with new brand colors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/dashboard/page.tsx
git commit -m "feat(brands): migrate dashboard PX tokens to CSS variable references"
```

---

### Task 13: Phase 1 Verification + Commit

- [ ] **Step 1: Full visual verification**

With `npm run dev` running, test each brand by selecting it on the login page and navigating to the dashboard:

**Praxis:** Teal primary, Roboto font, sharp corners (0px radius), solid teal buttons. Should look identical to the pre-migration state.

**Amgen:** Blue primary (#0063C3), Poppins font, sharp corners (1px radius), gradient blue buttons. Amgen logo on login page. Dashboard colors shift to blue palette.

**PTC:** Purple-steel primary (#231D35), Plus Jakarta Sans font, rounded corners (11px), solid reddish buttons (#D34531). PTC logo on login page. Dashboard colors shift to purple/atlantic-blue palette.

- [ ] **Step 2: Run existing tests to confirm no regressions**

```bash
cd frontend && npx vitest run
```

All existing tests should pass. The tests reference Praxis values which should still be the defaults.

- [ ] **Step 3: Commit the verification milestone**

If any visual fixes were needed during verification, commit them:

```bash
git add -A
git commit -m "feat(brands): Phase 1 complete — visual brand switching on login + dashboard"
```

---

## Phase 2 — Frontend Content Switching

### Task 14: Extend Brand Packs with Product Content

**Files:**
- Modify: `frontend/src/app/lib/brands/index.ts`
- Modify: `frontend/src/app/lib/brands/praxis.ts`
- Modify: `frontend/src/app/lib/brands/amgen.ts`
- Modify: `frontend/src/app/lib/brands/ptc.ts`

- [ ] **Step 1: Extend BrandPack interface with Phase 2 fields**

Add to the `BrandPack` interface in `index.ts`:

```typescript
// Product content (Phase 2)
products: {
  id: string;
  brandName: string;
  genericName: string;
  therapeuticArea: string;
  therapeuticAreaLabel: string;
  indication: string;
}[];
therapeuticAreas: { id: string; label: string }[];
supportPathways: { id: string; label: string; color: string }[];
hubName: string;
agentPersonas: {
  agentType: string;       // 'patient-support' | 'hcp-support' | etc.
  name: string;
  greeting: string;
}[];
outcomeLabels: Record<string, string>;  // outcome ID -> display label
demoScenarios: {
  agentType: string;
  label: string;
  description: string;
}[];
```

- [ ] **Step 2: Populate Praxis brand pack with existing content**

Extract from current `constants.ts`: `DRUG_PRODUCTS`, `THERAPEUTIC_AREAS`, `SUPPORT_PATHWAYS`, `OUTCOME_LABELS`, `DEFAULT_PERSONAS`, `DEMO_SCENARIOS` values into the Praxis brand config. This is a straight extraction — same values, new structure.

- [ ] **Step 3: Populate Amgen brand pack**

Using `research/amgen-product-portfolio.md`:
- Products: Repatha (evolocumab, cardiovascular) + TEZSPIRE (tezepelumab, severe asthma)
- Therapeutic areas: cardiovascular, severe-asthma
- Hub name: Amgen SupportPlus
- Agent name: Sarah
- Support pathways with Amgen-appropriate labels and colors
- Outcome labels with Amgen program names (e.g., "Amgen SupportPlus Enrollment" for hub-enrolled)

- [ ] **Step 4: Populate PTC brand pack**

Using PTC research:
- Products: Sephience (sepiapterin, PKU) + Emflaza (deflazacort, DMD)
- Therapeutic areas: pku, dmd
- Hub name: PTC Cares
- Agent name: Hannah
- Support pathways reflecting rare disease context (case manager referral instead of copay card, genetic testing referral, etc.)
- Outcome labels with PTC program names

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/lib/brands/
git commit -m "feat(brands): add product content to all three brand packs"
```

---

### Task 15: Loosen Frontend Types

**Files:**
- Modify: `frontend/src/app/lib/types.ts`
- Modify: `frontend/src/app/lib/types.test.ts`

- [ ] **Step 1: Read current types.ts**

Read `frontend/src/app/lib/types.ts` to see all the enums that need loosening.

- [ ] **Step 2: Change hardcoded union types to string types**

Replace:
```typescript
// Before
export type DrugProduct = 'euloxacaltenamide' | 'relutrigine';
export type TherapeuticArea = 'essential-tremor' | 'dee';
export type SupportPathwayId = 'hub-enrollment' | 'copay-assistance' | ...;
```

With:
```typescript
// After
export type DrugProductId = string;
export type TherapeuticAreaId = string;
export type SupportPathwayId = string;
export type InteractionOutcome = string;
```

Update all interfaces that reference these types (`ContactRecord`, `CallRecord`, etc.) to use the new type names.

- [ ] **Step 3: Update type tests**

Update `types.test.ts` to reflect the loosened types. Tests should verify that the brand pack's product/TA arrays provide valid values rather than testing compile-time enums.

- [ ] **Step 4: Run tests**

```bash
cd frontend && npx vitest run
```

Fix any type errors in consuming files.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/lib/types.ts frontend/src/app/lib/types.test.ts
git commit -m "refactor(types): loosen drug/TA/pathway enums to brand-driven string types"
```

---

### Task 16: Brand-Aware Constants

**Files:**
- Modify: `frontend/src/app/lib/constants.ts`

- [ ] **Step 1: Read current constants.ts in full**

Read `frontend/src/app/lib/constants.ts` to understand all the lookup objects.

- [ ] **Step 2: Replace static lookup objects with functions that accept brand context**

Instead of exported static objects, export functions that take a `BrandPack` and return the lookups:

```typescript
import type { BrandPack } from './brands';

// Drug products lookup from brand pack
export function getDrugProducts(brand: BrandPack) {
  return Object.fromEntries(
    brand.products.map(p => [p.id, { brandName: p.brandName, genericName: p.genericName, therapeuticArea: p.therapeuticArea }])
  );
}

// Therapeutic areas lookup from brand pack
export function getTherapeuticAreas(brand: BrandPack) {
  return Object.fromEntries(
    brand.therapeuticAreas.map(ta => [ta.id, ta.label])
  );
}

// Support pathways lookup from brand pack
export function getSupportPathways(brand: BrandPack) {
  return Object.fromEntries(
    brand.supportPathways.map(sp => [sp.id, sp.label])
  );
}
```

Keep `COLORS` as a read-through to CSS variables (already done in Phase 1), and keep any truly static constants (e.g., `CONVERSION_OUTCOMES` list if it's structural).

- [ ] **Step 3: Update all consumers**

Search for imports of the old static objects and update to use the function-based lookups with brand context.

- [ ] **Step 4: Run tests**

```bash
cd frontend && npx vitest run
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/lib/constants.ts
git commit -m "refactor(constants): make drug/TA/pathway lookups brand-aware"
```

---

### Task 17: Brand-Aware Seed Data

**Files:**
- Modify: `frontend/src/app/lib/seed-data.ts`
- Modify: `frontend/src/app/lib/seed-data.test.ts`

- [ ] **Step 1: Read current seed-data.ts**

Read `frontend/src/app/lib/seed-data.ts` to understand the data generation functions and where they reference Praxis-specific drugs/TAs.

- [ ] **Step 2: Add brand pack parameter to generation functions**

The main generation functions should accept a `BrandPack` parameter. Inside, replace hardcoded drug names with `brand.products[0].brandName`, therapeutic areas with `brand.therapeuticAreas[0].id`, etc.

Contact names, call timestamps, and structural data stay generic. Only clinical context (drug, TA, condition-specific details) comes from the brand pack.

- [ ] **Step 3: Update seed data tests**

Update `seed-data.test.ts` to pass a brand pack (use Praxis for backward compatibility). Verify generated records contain the correct brand-specific drug/TA values.

- [ ] **Step 4: Run tests**

```bash
cd frontend && npx vitest run
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/lib/seed-data.ts frontend/src/app/lib/seed-data.test.ts
git commit -m "feat(brands): make seed data generator brand-aware"
```

---

### Task 18: Dashboard Content Switching

**Files:**
- Modify: `frontend/src/app/dashboard/page.tsx`

- [ ] **Step 1: Read dashboard for all Praxis-specific content references**

Search `dashboard/page.tsx` for: drug names (ELEX, Relutrigine, euloxacaltenamide), therapeutic areas (Essential Tremor, DEE, Dravet), company name (Praxis), hub name (PraxisConnect), persona names (Emma, Aria, Marcus, Rachel).

- [ ] **Step 2: Replace content references with brand context**

The dashboard already has `useBrand()` from Task 12. Now use `brand` for content:
- Drug name dropdowns → `brand.products.map(p => ...)`
- Therapeutic area filters → `brand.therapeuticAreas.map(ta => ...)`
- Support pathway labels → `brand.supportPathways`
- Agent type labels → keep structural labels, but use `brand.agentPersonas` for persona names
- Outcome labels → `brand.outcomeLabels`
- Demo scenario dropdowns → `brand.demoScenarios`
- Any "Praxis" text in headers/labels → `brand.shortName` or `brand.companyName`

- [ ] **Step 3: Pass brand pack to seed data calls**

Update calls to seed data functions to pass the current brand.

- [ ] **Step 4: Verify all three brands show correct content**

Test each brand: drug names, TA filters, pathway labels, persona names, outcome labels should all reflect the selected brand.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/dashboard/page.tsx
git commit -m "feat(brands): Phase 2 complete — dashboard content driven by brand config"
```

---

## Phase 3 — Backend Content Switching

### Task 19: Loosen Backend Types + Reconcile Outcome IDs

**Files:**
- Modify: `ws-backend/src/types/index.ts`

- [ ] **Step 1: Read current backend types**

Read `ws-backend/src/types/index.ts` to catalog all hardcoded union types: `TherapeuticArea`, `DrugProduct`, `OutcomeType`, `SupportPathway`, `ScreeningInstrumentId`, etc.

- [ ] **Step 2: Loosen backend types to string**

Mirror the frontend loosening from Task 15. Replace:
```typescript
// Before
export type TherapeuticArea = 'essential-tremor' | 'dee-dravet';
export type DrugProduct = 'euloxacaltenamide' | 'relutrigine';
export type OutcomeType = 'ae-reported' | 'hub-enrollment' | ...;
export type SupportPathway = 'medication-access' | 'safety-reporting' | ...;
export type ScreeningInstrumentId = 'AE-TRIAGE' | 'C-SSRS-LITE' | ...;

// After
export type TherapeuticAreaId = string;
export type DrugProductId = string;
export type OutcomeId = string;
export type SupportPathwayId = string;
export type ScreeningInstrumentId = string;
```

Update all interfaces that reference these types.

- [ ] **Step 3: Reconcile outcome IDs between frontend and backend**

The frontend and backend currently use different IDs for the same outcomes. Establish the canonical set by auditing both:
- Frontend `types.ts`: `'ae-report-filed'`, `'hub-enrolled'`, `'callback-requested'`, etc.
- Backend `types/index.ts`: `'ae-reported'`, `'hub-enrollment'`, `'appointment-scheduled'`, etc.

**Decision:** Use the backend IDs as canonical (they're more established and used in the classifier JSON schema). Update frontend outcome references to match backend IDs. This is a mechanical find-and-replace within `types.ts`, `constants.ts`, `seed-data.ts`, and `dashboard/page.tsx`.

Document the mapping in a comment at the top of the backend types file for reference.

- [ ] **Step 4: Run all backend tests**

```bash
cd ws-backend && npx vitest run
```

Fix any type errors.

- [ ] **Step 5: Run all frontend tests**

```bash
cd frontend && npx vitest run
```

Fix any type errors from the outcome ID reconciliation.

- [ ] **Step 6: Commit**

```bash
git add ws-backend/src/types/ frontend/src/app/lib/types.ts frontend/src/app/lib/constants.ts
git commit -m "refactor(types): loosen backend types to string, reconcile outcome IDs"
```

---

### Task 20: Backend Brand Config Interface + Praxis Extraction

**Depends on:** Task 19 (backend types must be loosened first)

**Files:**
- Create: `ws-backend/src/brands/index.ts`
- Create: `ws-backend/src/brands/praxis.ts`

- [ ] **Step 1: Create BrandBackendConfig interface**

Create `ws-backend/src/brands/index.ts` with the `BrandBackendConfig` interface from the spec (lines 105-145). Include `getBrandConfig(id: string): BrandBackendConfig` that defaults to praxis.

- [ ] **Step 2: Extract Praxis backend config**

Create `ws-backend/src/brands/praxis.ts`. Extract ALL brand-specific content from:
- `ws-backend/src/config/support-knowledge.ts` — drug profiles, support pathways, contact network
- `ws-backend/src/prompts/agent-prompts.ts` — agent name, greetings, company name
- `ws-backend/src/prompts/sms-templates.ts` — phone numbers, URLs, agent name
- `ws-backend/src/services/deepgram-agent.ts` — vocabulary boosts

This is a data extraction — pull the Praxis-specific values into a config object. The existing files still work as-is during migration.

- [ ] **Step 3: Commit**

```bash
git add ws-backend/src/brands/
git commit -m "feat(brands): add BrandBackendConfig interface and Praxis extraction"
```

---

### Task 21: Amgen + PTC Backend Configs

**Depends on:** Task 20

**Files:**
- Create: `ws-backend/src/brands/amgen.ts`
- Create: `ws-backend/src/brands/ptc.ts`
- Modify: `ws-backend/src/brands/index.ts`

- [ ] **Step 1: Create Amgen backend config**

Using `research/amgen-product-portfolio.md`, populate:
- Drug profiles for Repatha and TEZSPIRE (MOA, indications, dosing, AEs, trial data)
- Support pathways (Amgen SupportPlus enrollment, Amgen FIRST STEP copay, AE reporting, adherence support, sample request, medical inquiry)
- Contact network (3 MSLs, 2 Nurse Ambassadors, specialty pharmacy contacts)
- SMS template values (agent name: Sarah, company: Amgen, phone numbers, URLs)
- Vocabulary boosts: Repatha, TEZSPIRE, evolocumab, tezepelumab, Amgen (with boost values)
- Outcome overrides with Amgen program names
- Screening instruments: LDL-C-ASSESS, ASTHMA-CONTROL (define question sets)

- [ ] **Step 2: Create PTC backend config**

Using PTC research, populate:
- Drug profiles for Sephience and Emflaza
- Support pathways (PTC Cares enrollment, copay assistance, genetic testing referral, AE reporting, adherence support, medical inquiry)
- Contact network (3 MSLs, 2 Case Managers)
- SMS template values (agent name: Hannah, company: PTC Therapeutics)
- Vocabulary boosts: Sephience, Emflaza, sepiapterin, deflazacort, Duchenne, PKU, phenylalanine
- Screening instruments: PHE-MONITOR, MOTOR-FUNCTION (define question sets)

- [ ] **Step 3: Register in index.ts**

Add imports and register in the brand config map.

- [ ] **Step 4: Commit**

```bash
git add ws-backend/src/brands/
git commit -m "feat(brands): add Amgen and PTC backend configs"
```

---

### Task 22: Brand ID Propagation Through Twilio Call Flow

**Files:**
- Modify: `frontend/src/app/api/demo-call/route.ts` (Next.js API route — proxies to backend)
- Modify: `ws-backend/src/routes/twilio-voice.ts` (receives Twilio webhook, generates TwiML)

- [ ] **Step 1: Read the current call flow**

Read `ws-backend/src/routes/twilio-voice.ts` and the frontend demo-call API route to understand how calls are initiated and how custom parameters flow through Twilio.

- [ ] **Step 2: Add brandId to the frontend demo-call API route**

Read `frontend/src/app/api/demo-call/route.ts`. The current request body destructures `{ phoneNumber, scenarioId, persona, agentType }`. Add `brandId` to the destructuring and forward it in the POST body to the backend:

```typescript
const { phoneNumber, scenarioId, persona, agentType, brandId } = await req.json();
// Forward brandId in the fetch to the backend
```

Also update the frontend dashboard where it calls this API to include `brandId: brand.id` from the brand context.

- [ ] **Step 3: Accept brandId in the backend route handler**

In the backend route that receives the proxied demo-call request, read `brandId` from the request body. Pass it as a custom Twilio parameter when initiating the outbound call, so it flows through to the TwiML webhook.

- [ ] **Step 4: Read brandId in the Twilio voice webhook and media stream handler**

In `twilio-voice.ts`, read `brandId` from the Twilio request parameters (same pattern as existing custom params like contact info). Include it as a `<Parameter>` in the TwiML `<Stream>` block so it's available in the media-stream handler.

In the media-stream handler, read `brandId` from Stream custom parameters. Call `getBrandConfig(brandId)` and pass the config to the Deepgram agent builder and prompt builders.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/api/demo-call/ ws-backend/src/routes/
git commit -m "feat(brands): propagate brandId through Twilio call flow"
```

---

### Task 23: Refactor Prompts to Template Functions

**Files:**
- Modify: `ws-backend/src/prompts/agent-prompts.ts`
- Modify: `ws-backend/src/prompts/agents/patient-support.ts`
- Modify: `ws-backend/src/prompts/agents/hcp-support.ts`
- Modify: `ws-backend/src/prompts/agents/hcp-outbound.ts`
- Modify: `ws-backend/src/prompts/agents/medcomms-qa.ts`
- Modify: `ws-backend/src/prompts/classification-prompt.ts`

- [ ] **Step 1: Read all prompt files to catalog brand-specific strings**

Read each file. Catalog every instance of: "Praxis", "Emma", "Marcus", "Rachel", "ELEX", "Relutrigine", "euloxacaltenamide", "PraxisConnect", "1-800-PRAXIS-*", drug-specific clinical data, trial names, dosing details.

- [ ] **Step 2: Refactor agent-prompts.ts**

Change `buildAgentGreeting()`, `buildGatekeeperGreeting()`, `buildAgentVoicemailMessage()` to accept `BrandBackendConfig`. Replace all hardcoded company names, agent names, phone numbers, drug names with config values.

- [ ] **Step 3: Refactor individual agent prompt files**

Each of the 4 agent prompt files becomes a template function that accepts `BrandBackendConfig`. The prompt text is parameterized with brand values. Drug-specific clinical data (MOA, trial results, dosing) comes from `config.drugProfiles`.

**CRITICAL:** Maintain prompt quality. The prompts are carefully written — the refactoring should be mechanical string replacement, not rewriting prompt logic.

- [ ] **Step 4: Refactor classification-prompt.ts**

Change `buildClassificationPrompt()` to accept `BrandBackendConfig`. Replace drug name mappings, TA mappings, and company references.

- [ ] **Step 5: Run prompt tests**

```bash
cd ws-backend && npx vitest run src/prompts/
```

Fix any failures. Tests should still pass with Praxis config as default.

- [ ] **Step 6: Commit**

```bash
git add ws-backend/src/prompts/
git commit -m "feat(brands): refactor all prompts to brand-parameterized template functions"
```

---

### Task 24: Refactor SMS Templates

**Files:**
- Modify: `ws-backend/src/prompts/sms-templates.ts`

This is a dedicated task because `sms-templates.ts` has ~30 hardcoded "Praxis" references across 178 lines: agent name "Emma", company "Praxis Patient Support", phone "1-800-PRAXIS-PS", URLs "PraxisPatientSupport.com", "PraxisHCP.com", hub "PraxisConnect", etc.

- [ ] **Step 1: Read sms-templates.ts in full**

Read `ws-backend/src/prompts/sms-templates.ts` and catalog every brand-specific string.

- [ ] **Step 2: Add BrandBackendConfig parameter to template functions**

The `SMSTemplateData` interface currently does not include brand fields. Add:
```typescript
interface SMSTemplateData {
  // ... existing fields ...
  agentName: string;
  companyName: string;
  hubName: string;
  phoneNumbers: { patientSupport: string; medicalInfo: string; safety: string };
  urls: { patientPortal: string; hcpPortal: string };
}
```

- [ ] **Step 3: Parameterize getSignature() and all template bodies**

Replace every hardcoded reference:
- `"Emma"` → `data.agentName`
- `"Praxis Patient Support"` → `data.companyName + " Patient Support"`
- `"1-800-PRAXIS-PS"` → `data.phoneNumbers.patientSupport`
- `"1-800-PRAXIS-MI"` → `data.phoneNumbers.medicalInfo`
- `"1-800-PRAXIS-AE"` → `data.phoneNumbers.safety`
- `"PraxisPatientSupport.com"` → `data.urls.patientPortal`
- `"PraxisHCP.com"` → `data.urls.hcpPortal`
- `"PraxisConnect"` → `data.hubName`

- [ ] **Step 4: Update callers to pass brand config values**

Update `sms-service.ts` to inject brand config values when constructing `SMSTemplateData`.

- [ ] **Step 5: Run tests**

```bash
cd ws-backend && npx vitest run src/prompts/
```

- [ ] **Step 6: Commit**

```bash
git add ws-backend/src/prompts/sms-templates.ts ws-backend/src/services/sms-service.ts
git commit -m "feat(brands): parameterize SMS templates with brand config"
```

---

### Task 25: Refactor Backend Configs + Services

**Files:**
- Modify: `ws-backend/src/config/support-knowledge.ts`
- Modify: `ws-backend/src/config/outcomes.ts`
- Modify: `ws-backend/src/config/behavioral-signals.ts`
- Modify: `ws-backend/src/config/screening-instruments.ts`
- Modify: `ws-backend/src/services/deepgram-agent.ts`
- Modify: `ws-backend/src/services/groq-classifier.ts`

- [ ] **Step 1: Refactor support-knowledge.ts**

Change exported functions to accept `BrandBackendConfig`. Drug profiles, support pathways, and contact network come from the brand config instead of hardcoded constants. Keep shared utility functions (like formatDrugProfile) as-is.

- [ ] **Step 2: Refactor outcomes.ts**

Keep shared outcome IDs and base definitions. Add a function `getOutcomeLabels(config: BrandBackendConfig)` that merges base labels with `config.outcomeOverrides`.

- [ ] **Step 3: Refactor behavioral-signals.ts**

Parameterize talking point text that references brand-specific hub names, drug names, and advocacy orgs.

- [ ] **Step 4: Refactor screening-instruments.ts**

Keep shared instruments (AE-TRIAGE, ADHERENCE-CHECK). Add a function `getScreeningInstruments(config: BrandBackendConfig)` that merges shared instruments with brand-specific ones from the config.

- [ ] **Step 5: Refactor deepgram-agent.ts**

Vocabulary boosts and function definitions (report_adverse_event, enroll_in_hub, etc.) load drug names and descriptions from brand config. The `record_screening_result` function's `instrument_id` enum must be dynamically populated from the brand config's screening instruments.

- [ ] **Step 6: Refactor groq-classifier.ts**

System prompt references brand config for company name and product context.

- [ ] **Step 7: Run all backend tests**

```bash
cd ws-backend && npx vitest run
```

Fix any failures.

- [ ] **Step 8: Commit**

```bash
git add ws-backend/src/config/ ws-backend/src/services/
git commit -m "feat(brands): all backend configs and services brand-aware"
```

---

### Task 26: End-to-End Verification

- [ ] **Step 1: Start both frontend and backend**

```bash
cd ws-backend && npm run dev &
cd frontend && npm run dev &
```

- [ ] **Step 2: Test Praxis brand end-to-end**

1. Select Praxis on login page → verify logo, colors, fonts
2. Log in → verify dashboard shows Praxis colors, ELEX/Relutrigine drugs, Essential Tremor/DEE TAs
3. If call flow is testable, verify agent greets as "Emma from Praxis BioSciences"

- [ ] **Step 3: Test Amgen brand end-to-end**

1. Select Amgen on login page → verify Amgen logo, blue palette, Poppins font
2. Log in → verify dashboard shows Repatha/TEZSPIRE drugs, Cardiovascular/Severe Asthma TAs
3. If call flow is testable, verify agent greets as "Sarah from Amgen"

- [ ] **Step 4: Test PTC brand end-to-end**

1. Select PTC on login page → verify PTC logo, purple-steel palette, Plus Jakarta Sans font
2. Log in → verify dashboard shows Sephience/Emflaza drugs, PKU/DMD TAs
3. If call flow is testable, verify agent greets as "Hannah from PTC Therapeutics"

- [ ] **Step 5: Run all test suites**

```bash
cd frontend && npx vitest run
cd ws-backend && npx vitest run
```

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat(brands): end-to-end brand context switcher complete — Praxis, Amgen, PTC"
```
