/** Color math utilities for the brand theming system */

/** Parse hex (#RRGGBB or #RGB) to { r, g, b } object. Returns null if invalid. */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.replace("#", "").match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return null;

  let h = match[1];
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }

  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

/** Convert hex to "R G B" string format for Tailwind CSS variable usage */
export function hexToRgbString(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "0 0 0";
  return `${rgb.r} ${rgb.g} ${rgb.b}`;
}

/** Check if a hex color is light (luminance > 0.5) for contrast detection */
export function isLight(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance > 0.5;
}

/** Mix a hex color with white by ratio (0=original, 1=white) */
export function lighten(hex: string, ratio: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const mix = (c: number) => Math.round(c + (255 - c) * ratio);
  return rgbToHex(mix(rgb.r), mix(rgb.g), mix(rgb.b));
}

/** Mix a hex color with black by ratio (0=original, 1=black) */
export function darken(hex: string, ratio: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const mix = (c: number) => Math.round(c * (1 - ratio));
  return rgbToHex(mix(rgb.r), mix(rgb.g), mix(rgb.b));
}

/** Convert RGB components to hex string */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) =>
    Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Generate a 10-shade palette from a single hex color. Returns { '50': hex, '100': hex, ..., '900': hex } */
export function generatePalette(hex: string): Record<string, string> {
  return {
    "50": lighten(hex, 0.94),
    "100": lighten(hex, 0.87),
    "200": lighten(hex, 0.75),
    "300": lighten(hex, 0.55),
    "400": lighten(hex, 0.25),
    "500": hex,
    "600": darken(hex, 0.12),
    "700": darken(hex, 0.25),
    "800": darken(hex, 0.40),
    "900": darken(hex, 0.55),
  };
}
