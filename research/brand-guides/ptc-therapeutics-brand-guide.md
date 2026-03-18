# Brand Identity: PTC Therapeutics

**Source:** https://www.ptcbio.com/
**Extracted:** 2026-03-18
**Confidence:** High — complete WordPress design token system (`--wp--preset--color--*`) extracted from CSS custom properties, verified across 5 pages (homepage, about, science, pipeline, newsroom)

## Colors

### Primary Palette
| Role | Hex | RGB | CSS Token | Usage |
|------|-----|-----|-----------|-------|
| Purple Steel | #231D35 | rgb(35, 29, 53) | `--wp--preset--color--purple-steel` | Dominant brand color — dark hero backgrounds, navigation, headers, footers |
| Atlantic Blue | #38518F | rgb(56, 81, 143) | `--wp--preset--color--atlantic-blue` | Primary blue — section backgrounds, links, secondary brand color |
| Denim Blue | #38518F | rgb(56, 81, 143) | `--wp--preset--color--denim-blue` | Alias for Atlantic Blue (same value) |
| Violet | #5C0F8C | rgb(92, 15, 140) | `--wp--preset--color--violet` | Purple accent — gradient endpoints, featured sections |

### Accent Colors
| Role | Hex | RGB | CSS Token | Usage |
|------|-----|-----|-----------|-------|
| Sky Blue | #4BC1E1 | rgb(75, 193, 225) | `--wp--preset--color--sky-blue` | Bright accent — highlights, decorative elements |
| Sky Blue Partial | #80D3EA | rgb(128, 211, 234) | `--wp--preset--color--sky-blue-partial` | Lighter sky blue — softer accents |
| Sunrise | #F9A05E | rgb(249, 160, 94) | `--wp--preset--color--sunrise` | Warm accent — highlights, warm section accents |
| Classic Orange | #EE7624 | rgb(238, 118, 36) | `--wp--preset--color--classic-orange` | Bolder orange — emphasis, icons |
| Reddish (CTA) | #D34531 | rgb(211, 69, 49) | `--wp--preset--color--reddish` | Primary CTA button color |

### Neutrals
| Role | Hex | CSS Token | Usage |
|------|-----|-----------|-------|
| White | #FFFFFF | `--wp--preset--color--white` | Page background, text on dark sections |
| Light Blue | #EAEDF4 | `--wp--preset--color--light-blue` | Surface/card backgrounds, section alternate BG |
| Gray | #A8A8AA | `--wp--preset--color--gray` | Muted text, captions, secondary info |
| Black | #000000 | `--wp--preset--color--black` | Base text color |
| WP Button Default | #32373C | — | WordPress default button (not primary brand) |

### Gradients
```css
/* Warm gradient — CTAs, accent bars */
--wp--preset--gradient--grd-1: linear-gradient(90deg, #C55139, #EEA468);

/* Dark purple gradient — hero sections, dark panels */
--wp--preset--gradient--grd-2: linear-gradient(90deg, #231D35, #5C0F8C);

/* Dark section alternate */
background: linear-gradient(90deg, #231D35, #541687);
```

### CSS Variables (complete token set from source)
```css
:root {
  /* Brand colors */
  --wp--preset--color--purple-steel: #231D35;
  --wp--preset--color--atlantic-blue: #38518F;
  --wp--preset--color--denim-blue: #38518F;
  --wp--preset--color--sky-blue: #4BC1E1;
  --wp--preset--color--sky-blue-partial: #80d3ea;
  --wp--preset--color--sunrise: #F9A05E;
  --wp--preset--color--violet: #5C0F8C;
  --wp--preset--color--classic-orange: #EE7624;
  --wp--preset--color--reddish: #D34531;
  --wp--preset--color--gray: #A8A8AA;
  --wp--preset--color--light-blue: #eaedf4;
  --wp--preset--color--white: #ffffff;
  --wp--preset--color--black: #000000;

  /* Gradients */
  --wp--preset--gradient--grd-1: linear-gradient(90deg, #C55139, #EEA468);
  --wp--preset--gradient--grd-2: linear-gradient(90deg, #231D35, #5C0F8C);

  /* Typography */
  --wp--custom--font-family--sans-1: 'Plus Jakarta Sans', sans-serif;
  --wp--custom--font-family--sans-2: 'Montserrat', sans-serif;
  --wp--custom--font-family--sans-3: 'Inter', sans-serif;
  --wp--custom--font-family--mono: Monaco, Consolas, monospace;

  /* Font sizes */
  --wp--preset--font-size--small: 13px;
  --wp--preset--font-size--medium: 20px;
  --wp--preset--font-size--large: 36px;
  --wp--preset--font-size--x-large: 42px;

  /* Layout */
  --wp--custom--content-size: 1440px;
  --wp--custom--wide-size: 1920px;
  --wp--custom--narrow-size: 982px;
}
```

## Typography

| Role | Font Family | CSS Token | Weight(s) | Size |
|------|-------------|-----------|-----------|------|
| Primary (headings + body) | Plus Jakarta Sans | `--sans-1` | 400, 500, 600, 700 | 13–42px |
| Secondary (accents) | Montserrat | `--sans-2` | 400, 600, 700 | — |
| Tertiary (UI/data) | Inter | `--sans-3` | 400, 500 | — |
| Monospace | Monaco, Consolas | `--mono` | 400 | — |

**Font import (copy-paste ready):**
```html
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Montserrat:wght@400;600;700&family=Inter:wght@400;500&display=swap" rel="stylesheet">
```

**CSS font stacks:**
```css
--font-heading: 'Plus Jakarta Sans', sans-serif;
--font-body: 'Plus Jakarta Sans', sans-serif;
--font-accent: 'Montserrat', sans-serif;
--font-ui: 'Inter', sans-serif;
```

**Note:** All three fonts are Google Fonts — free to use, no licensing concerns.

## Visual Style

- **Corner radius:** 11px on CTA buttons — slightly rounded, modern feel. Other elements appear squared off.
- **Shadows:** None to minimal. Clean flat design.
- **Spacing:** Spacious — generous padding, large hero sections, 1440px content width with 1920px wide breakout.
- **Imagery:** Photography-heavy — rare disease patients, families, scientists, lab environments. Emotional and human-centered.
- **Dark mode:** No dedicated dark mode, but site heavily uses dark purple-steel (#231D35) backgrounds with white text for hero/feature sections.
- **Overall aesthetic:** Deep purple-dominant with warm orange/sunrise accents. Modern and human — not the typical sterile pharma look. The purple-steel-to-violet gradient creates a distinctive, recognizable brand feel that differentiates from the sea of blue pharma sites. Spacious, confident, approachable.

## UI Components

### Primary CTA Button
```css
.btn-cta,
.wp-block-button__link {
  background-color: #D34531;
  color: #FFFFFF;
  border-radius: 11px;
  padding: 1.1875rem 2.125rem 1.125rem;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 600;
  font-size: 16px;
  text-decoration: none;
  border: none;
}
```

### Hero Section (Dark)
```css
.hero-dark {
  background: linear-gradient(90deg, #231D35, #5C0F8C);
  color: #FFFFFF;
  font-family: 'Plus Jakarta Sans', sans-serif;
}
```

### Section (Light Surface)
```css
.section-light {
  background: #EAEDF4;
  color: #231D35;
}
```

### Five-Seven Split Layout (signature component)
```css
.five-seven-split {
  /* PTC's signature asymmetric layout: 5/12 text + 7/12 image */
  gap: 2.5rem; /* desktop */
  background: #38518F; /* atlantic-blue, varies per section */
  color: #FFFFFF;
  border-top: 1px solid #FFFFFF;
}
```

### Links
```css
a {
  color: #38518F; /* atlantic-blue on light backgrounds */
  text-decoration: none;
}
```

### Navigation
Dark purple-steel (#231D35) background, white text, logo on left. Clean horizontal menu.

### Footer
Dark purple-steel (#231D35) background, white text, multi-column link layout.

## Brand Guidelines

No public brand guidelines found for PTC Therapeutics. The company's Media Asset Library is not publicly accessible.

- **Newsroom:** https://www.ptcbio.com/newsroom/
- **Logo:** Available as PNG favicon at `https://www.ptcbio.com/wp-content/uploads/sites/2/2023/01/ptcLogo.png`
- **Logo variants:** Not documented publicly. Site uses white logo on dark backgrounds.

**Important:** Do NOT confuse with PTC Inc. (ptc.com) — that is a completely different company (CAD/PLM software). PTC Therapeutics is at ptcbio.com.

## Reskinning Quick-Start

### Tailwind Config
```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#231D35',       // purple-steel
          secondary: '#38518F',     // atlantic-blue
          violet: '#5C0F8C',        // violet
          'sky-blue': '#4BC1E1',    // sky-blue
          'sky-light': '#80D3EA',   // sky-blue-partial
          sunrise: '#F9A05E',       // sunrise
          orange: '#EE7624',        // classic-orange
          cta: '#D34531',           // reddish — primary CTA
        },
        surface: '#EAEDF4',        // light-blue
        background: '#FFFFFF',
        muted: '#A8A8AA',          // gray
      },
      fontFamily: {
        heading: ['Plus Jakarta Sans', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'sans-serif'],
        accent: ['Montserrat', 'sans-serif'],
        ui: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '11px',
      },
      maxWidth: {
        content: '1440px',
        wide: '1920px',
        narrow: '982px',
      },
    },
  },
}
```

### CSS Variables Template
```css
:root {
  /* Primary palette */
  --color-primary: #231D35;
  --color-secondary: #38518F;
  --color-violet: #5C0F8C;
  --color-cta: #D34531;
  --color-gradient-dark: linear-gradient(90deg, #231D35, #5C0F8C);
  --color-gradient-warm: linear-gradient(90deg, #C55139, #EEA468);

  /* Accent colors */
  --color-sky-blue: #4BC1E1;
  --color-sky-light: #80D3EA;
  --color-sunrise: #F9A05E;
  --color-orange: #EE7624;

  /* Neutrals */
  --color-bg: #FFFFFF;
  --color-surface: #EAEDF4;
  --color-text: #231D35;
  --color-text-muted: #A8A8AA;
  --color-text-on-dark: #FFFFFF;
  --color-border: #A8A8AA;

  /* Typography */
  --font-heading: 'Plus Jakarta Sans', sans-serif;
  --font-body: 'Plus Jakarta Sans', sans-serif;
  --font-accent: 'Montserrat', sans-serif;
  --font-ui: 'Inter', sans-serif;

  /* Shape */
  --radius: 11px;
  --shadow: none;

  /* Layout */
  --content-width: 1440px;
  --wide-width: 1920px;
  --narrow-width: 982px;
}
```

## Source URLs
| Source | URL | What Was Extracted |
|--------|-----|--------------------|
| Homepage | https://www.ptcbio.com/ | Full color token set, font families, favicon/logo |
| About | https://www.ptcbio.com/about-ptc/ | Confirmed color palette, button styles (#D34531, 11px radius) |
| Science | https://www.ptcbio.com/our-science/ | Complete WP preset CSS variables, gradients, font sizes |
| Pipeline | https://www.ptcbio.com/our-pipeline/ | Full `--wp--preset--color--*` token dump, gradient definitions, layout widths |
| Newsroom | https://www.ptcbio.com/newsroom/ | Confirmed consistency of all tokens |
| CSS file | .../ptc-redesign/dist/five-seven-split/style-index.css | Layout component tokens, atlantic-blue usage |
