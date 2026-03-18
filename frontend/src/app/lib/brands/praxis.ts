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
      accent2: '#EFBC66',
      accent3: '#FF7D78',
      info: '#2C59AB',
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
