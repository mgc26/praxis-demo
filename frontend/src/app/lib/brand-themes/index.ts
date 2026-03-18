export interface BrandThemeMeta {
  name: string;
  slug: string;
  website: string;
  scrapedAt: string;
  confidence: 'high' | 'medium' | 'low';
  cssPath: string;
  jsonPath: string;
}

export const brandThemes: Record<string, BrandThemeMeta> = {
  'praxis': {
    name: 'Praxis Precision Medicines',
    slug: 'praxis',
    website: 'https://praxismedicines.com',
    scrapedAt: '2026-03-17T14:15:00Z',
    confidence: 'high',
    cssPath: './praxis.css',
    jsonPath: './praxis.json',
  },
};
