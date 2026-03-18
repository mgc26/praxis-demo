import type { BrandPack } from './index';

export const amgenBrand: BrandPack = {
  id: 'amgen',
  companyName: 'Amgen',
  shortName: 'Amgen',
  tagline: 'To serve patients',
  website: 'https://www.amgen.com',
  logoAsset: '/brand-assets/amgen/logo-primary.svg',
  theme: {
    colors: {
      primary: '#0063C3',
      primaryDark: '#1A3856',
      primaryLight: '#0675E0',
      secondary: '#1A3856',
      accent: '#EE7624',
      accent2: '#88C765',
      accent3: '#F9A05E',
      info: '#0675E0',
      surface: '#EDF2F7',
      border: '#D7D7D7',
      textPrimary: '#032E44',
      textSecondary: '#545255',
      background: '#FFFFFF',
    },
    fonts: { heading: 'Poppins', body: 'Poppins' },
    radius: '1px',
    shadow: 'none',
    buttonStyle: 'gradient',
    buttonGradient: 'linear-gradient(to right, #0063C3, #0675E0)',
  },
};
