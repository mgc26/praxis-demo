# Brand Identity: Amgen

**Source:** https://www.amgen.com/
**Extracted:** 2026-03-18
**Confidence:** High — cross-referenced live CSS across 4+ pages, unofficial brand book (Issuu), and multiple brand reference databases

## Colors

### Primary Palette
| Role | Hex | RGB | Usage |
|------|-----|-----|-------|
| Primary Blue (Heritage Blue) | #0063C3 | rgb(0, 99, 195) | Dominant brand color — CTAs, links, headings, panel headers, logo |
| Secondary Blue | #0675E0 | rgb(6, 117, 224) | Gradient end for buttons, hover states |
| Heritage Dark Blue | #1A3856 | rgb(26, 56, 86) | Dark backgrounds, footer, supporting materials |
| Dark Teal | #032E44 | rgb(3, 46, 68) | Deep text color, dark sections |

### Accent Colors
| Role | Hex | RGB | Usage |
|------|-----|-----|-------|
| Orange | #EC951A | rgb(236, 149, 26) | Panel headers (orange variant), highlights |
| Orange Light | #FEAB35 | rgb(254, 171, 53) | Gradient end for orange elements |
| Green | #88C765 | rgb(136, 199, 101) | Panel headers (green variant), success indicators |
| Green Dark | #74BA4D | rgb(116, 186, 77) | Gradient end for green elements |

### Neutrals
| Role | Hex | Usage |
|------|-----|-------|
| Background | #FFFFFF | Page background |
| Surface / Card BG | #EDF2F7 | Cards, content panels, section backgrounds |
| Border Light | #D7D7D7 | Tab borders, subtle dividers |
| Border Medium | #CCCCCC | Input borders, panel dividers |
| Text Primary | #032E44 | Headings, body text on light backgrounds |
| Text Secondary | #545255 | Muted text, captions, descriptions |
| Divider | #EEEEEE | HR elements, fine separators |

### Gradients (used on buttons and panel headers)
```css
/* Primary CTA button */
background: linear-gradient(to right, #0063C3, #0675E0);

/* Orange panel header */
background: linear-gradient(to right, #EC951A, #FEAB35);

/* Green panel header */
background: linear-gradient(to right, #74BA4D, #88C765);

/* Image overlay (dark gradient for CTAs over images) */
background: linear-gradient(0deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%);
```

### Pantone / Print Reference
| Color | Pantone | CMYK |
|-------|---------|------|
| Heritage Blue | ~2175 C (closest match) | 100, 49, 0, 24 |
| Heritage Dark Blue | — | 95, 65, 20, 35 |

## Typography

Amgen uses **Adobe Typekit** for font delivery. The site has two font stacks depending on page age/section:

| Role | Font Family | Weight(s) | Context |
|------|-------------|-----------|---------|
| Headings (modern pages) | Poppins | 600 (semibold) | Homepage, newer sections |
| Body (modern pages) | Poppins | 400, 600 | Homepage, newer sections |
| Headings (legacy pages) | Myriad Pro | 400, 600, 700 | Inner/responsibility pages |
| Body (legacy pages) | Myriad Pro | 400 | Inner content pages |
| Fallback stack (modern) | Century Gothic, Helvetica, Arial, sans-serif | — | CSS fallback |
| Fallback stack (legacy) | Gill Sans, Gill Sans MT, Calibri, sans-serif | — | CSS fallback |
| System/secondary | Helvetica Neue, Helvetica, Tahoma, Geneva, Arial, sans-serif | — | Utility text, forms |

**Brand guidelines fonts** (from Issuu brand book — may be used in marketing/print):
- **Recoleta** — serif display font (Thin through Black, 7 weights)
- **Nexa / Nexa Text** — sans-serif body font (Thin through Black, 6 weights)

**Font import (for reskinning, use Poppins as the current primary):**
```html
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
```

**CSS font stacks:**
```css
--font-heading: 'Poppins', 'Century Gothic', 'Helvetica', 'Arial', sans-serif;
--font-body: 'Poppins', 'Century Gothic', 'Helvetica', 'Arial', sans-serif;
```

**Note:** The logo typeface is custom-drawn and not available as a commercial font. Three characters (A, M, N) have elongated endpoints making it unique to Amgen.

## Visual Style

- **Corner radius:** 1px — sharp/minimal. Amgen uses virtually no border radius. Panels, cards, and buttons are squared off.
- **Shadows:** None to minimal. Clean flat design, no prominent box-shadows.
- **Spacing:** Spacious — generous padding (2rem on panels), large hero sections, airy layout.
- **Imagery:** Photography-heavy — professional lab imagery, leadership headshots, facility photography. Also uses a decorative "genetics pattern" (DNA strands) as a brand motif with 50-90% opacity overlays.
- **Dark mode:** No.
- **Overall aesthetic:** Clean corporate pharmaceutical. Blue-dominant with confident, trustworthy tone. Spacious layout with large imagery. Warm accents (orange, green) used sparingly for variety across content sections. Flat design with sharp corners and gradient buttons.

## UI Components

### Primary Button (CTA)
```css
.quantum-button--primary {
  background: linear-gradient(to right, #0063C3, #0675E0);
  color: #FFFFFF;
  border: 1px solid #FFFFFF;
  border-radius: 1px;
  max-height: 50px;
  padding: 12px 24px;
  font-family: 'Poppins', 'Century Gothic', sans-serif;
  font-weight: 600;
  font-size: 14px;
  text-decoration: none;
  text-transform: none;
}
```

### Card Title
```css
.card-title {
  font-family: 'Poppins', 'Century Gothic', 'Helvetica', 'Arial', sans-serif;
  font-size: 20px;
  font-weight: 600;
  color: #0063C3;
  margin: 22px 0;
}
```

### Card / Content Panel
```css
.card {
  background: #EDF2F7;
  border: 0;
  border-radius: 1px;
  box-shadow: none;
}
```

### Panel Header (Blue Variant)
```css
.panel-primary .panel-heading {
  background: linear-gradient(to right, #0063C3, #0675E0);
  color: #FFFFFF;
  padding: 2rem;
  font-size: 2rem;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
}
```

### Links
```css
a {
  color: #0063C3;
  text-decoration: none;
}
```

### Navigation
Sticky top navigation, white background, blue links/text. Logo on left, horizontal menu items. Mega-dropdown menus on hover.

### Tab Component
```css
.quantum-tabs__labels {
  background: #FFFFFF;
  border-top: 1px solid #D7D7D7;
  border-bottom: 1px solid #D7D7D7;
}
```

### Footer
Dark background (Heritage Dark Blue #1A3856 or #032E44), white text, standard corporate footer with link columns.

## Brand Guidelines

- **Official brand guidelines:** Not publicly available. Amgen's Media Asset Library (https://www.amgen.com/newsroom/image-library) provides logo downloads in blue, black, and white variants (ZIP files).
- **Unofficial brand book:** https://issuu.com/long.dnt/docs/amgen_book — includes color palette (CMYK), typography (Recoleta/Nexa), logo specs, genetics pattern usage.
- **Logo rules:** Do not stretch, rotate, skew, crop, or alter colors. Minimum size: 100px (screen) / 1.5cm (print). Clear space required around logo.
- **Logo variants:** Full-color gradient, single-color blue, white-out, grey.
- **Decorative motif:** Genetics/DNA strand pattern — blue on light backgrounds, white on dark; 50-90% opacity overlay.

## Reskinning Quick-Start

### Tailwind Config
```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0063C3',
          'primary-light': '#0675E0',
          dark: '#1A3856',
          'dark-deep': '#032E44',
          orange: '#EC951A',
          'orange-light': '#FEAB35',
          green: '#88C765',
          'green-dark': '#74BA4D',
        },
        surface: '#EDF2F7',
        background: '#FFFFFF',
        border: '#D7D7D7',
      },
      fontFamily: {
        heading: ['Poppins', 'Century Gothic', 'Helvetica', 'Arial', 'sans-serif'],
        body: ['Poppins', 'Century Gothic', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '1px',
      },
    },
  },
}
```

### CSS Variables Template
```css
:root {
  /* Primary palette */
  --color-primary: #0063C3;
  --color-primary-light: #0675E0;
  --color-primary-gradient: linear-gradient(to right, #0063C3, #0675E0);
  --color-dark: #1A3856;
  --color-dark-deep: #032E44;

  /* Accent colors */
  --color-orange: #EC951A;
  --color-orange-light: #FEAB35;
  --color-green: #88C765;
  --color-green-dark: #74BA4D;

  /* Neutrals */
  --color-bg: #FFFFFF;
  --color-surface: #EDF2F7;
  --color-text: #032E44;
  --color-text-muted: #545255;
  --color-border: #D7D7D7;
  --color-border-light: #EEEEEE;

  /* Typography */
  --font-heading: 'Poppins', 'Century Gothic', 'Helvetica', 'Arial', sans-serif;
  --font-body: 'Poppins', 'Century Gothic', 'Helvetica', 'Arial', sans-serif;

  /* Shape */
  --radius: 1px;
  --shadow: none;
}
```

## Source URLs
| Source | URL | What Was Extracted |
|--------|-----|--------------------|
| Homepage | https://www.amgen.com/ | Poppins font, #0063C3 primary blue, card styles, link color |
| About page | https://www.amgen.com/about | Confirmed #0063C3, Typekit font loading |
| Responsibility page | https://www.amgen.com/responsibility | Full color palette (blue, orange, green), gradient buttons, Myriad Pro stack, panel styles |
| Media Asset Library | https://www.amgen.com/newsroom/image-library | Logo variants (blue, black, white ZIPs) |
| Issuu Brand Book | https://issuu.com/long.dnt/docs/amgen_book | CMYK values, Recoleta/Nexa typography, logo specs, genetics pattern rules |
| BrandColorCode | https://www.brandcolorcode.com/amgen | Pantone ~2175 C, CMYK confirmation |
| Logotyp.us | https://logotyp.us/logo/amgen/ | Custom logo typeface confirmation |
