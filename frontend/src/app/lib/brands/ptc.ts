import type { BrandPack } from './index';

export const ptcBrand: BrandPack = {
  id: 'ptc',
  companyName: 'PTC Therapeutics',
  shortName: 'PTC',
  tagline: 'Translating Science. Transforming Lives.',
  website: 'https://www.ptcbio.com',
  logoAsset: '/brand-assets/ptc/logo-primary.png',
  theme: {
    colors: {
      primary: '#231D35',
      primaryDark: '#1a1528',
      primaryLight: '#38518F',
      secondary: '#38518F',
      accent: '#D34531',
      accent2: '#4BC1E1',
      accent3: '#EE7624',
      info: '#5C0F8C',
      surface: '#EAEDF4',
      border: '#A8A8AA',
      textPrimary: '#231D35',
      textSecondary: '#A8A8AA',
      background: '#FFFFFF',
    },
    fonts: { heading: 'Plus Jakarta Sans', body: 'Plus Jakarta Sans' },
    radius: '11px',
    shadow: 'none',
    buttonStyle: 'solid',
  },
};
