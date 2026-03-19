'use client';

import { useEffect } from 'react';
import { useBrand } from './BrandContext';
import { hexToRgbString, generatePalette } from '@/app/lib/theme-utils';

/**
 * Injects CSS custom properties onto :root whenever the selected brand changes.
 * Renders nothing — pure side-effect component.
 */
export default function ThemeInjector() {
  const { brand } = useBrand();

  useEffect(() => {
    const root = document.documentElement;
    const { colors, fonts, radius, buttonStyle, buttonGradient, shadow } = brand.theme;

    // Helper: set both RGB-triplet and raw-hex variants
    const setColor = (token: string, hex: string) => {
      root.style.setProperty(`--brand-${token}`, hexToRgbString(hex));
      root.style.setProperty(`--brand-${token}-hex`, hex);
    };

    // Core color tokens
    setColor('primary', colors.primary);
    setColor('primary-dark', colors.primaryDark);
    setColor('primary-light', colors.primaryLight);
    setColor('secondary', colors.secondary);
    setColor('accent', colors.accent);
    setColor('accent2', colors.accent2);
    setColor('accent3', colors.accent3);
    setColor('info', colors.info);
    setColor('surface', colors.surface);
    setColor('border', colors.border);

    // Text & background (aliased names)
    setColor('text', colors.textPrimary);
    setColor('text-muted', colors.textSecondary);
    setColor('bg', colors.background);

    // Generated 50-900 palette from primary
    const palette = generatePalette(colors.primary);
    for (const [shade, hex] of Object.entries(palette)) {
      root.style.setProperty(`--brand-${shade}`, hexToRgbString(hex));
    }

    // Typography
    root.style.setProperty('--brand-heading-font', `'${fonts.heading}', sans-serif`);
    root.style.setProperty('--brand-body-font', `'${fonts.body}', sans-serif`);

    // Shape & button style
    root.style.setProperty('--brand-radius', radius);
    root.style.setProperty('--brand-shadow', shadow);
    root.style.setProperty('--brand-button-style', buttonStyle);
    if (buttonStyle === 'gradient' && buttonGradient) {
      root.style.setProperty('--brand-button-gradient', buttonGradient);
    }

    // Data attribute for CSS selectors
    root.setAttribute('data-brand', brand.id);
  }, [brand]);

  return null;
}
