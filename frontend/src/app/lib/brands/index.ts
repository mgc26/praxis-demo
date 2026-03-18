import { amgenBrand } from './amgen';
import { praxisBrand } from './praxis';
import { ptcBrand } from './ptc';

// ---------------------------------------------------------------------------
// Brand Pack types
// ---------------------------------------------------------------------------

export interface BrandPackTheme {
  colors: {
    primary: string;        // hex
    primaryDark: string;
    primaryLight: string;
    secondary: string;
    accent: string;
    accent2: string;        // Praxis: gold, Amgen: green, PTC: sky-blue
    accent3: string;        // Praxis: coral, Amgen: sunrise, PTC: orange
    info: string;           // Praxis: blue, Amgen: secondary-blue, PTC: violet
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
    agentType: string;
    name: string;
    greeting: string;
    description: string;
  }[];
  outcomeLabels: Record<string, string>;
  demoScenarios: {
    agentType: string;
    label: string;
    description: string;
  }[];
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const DEFAULT_BRAND_ID = 'praxis';

const brandRegistry: Record<string, BrandPack> = {
  [amgenBrand.id]: amgenBrand,
  [praxisBrand.id]: praxisBrand,
  [ptcBrand.id]: ptcBrand,
};

export const allBrands: BrandPack[] = Object.values(brandRegistry);

export function getBrand(id: string): BrandPack {
  return brandRegistry[id] ?? brandRegistry[DEFAULT_BRAND_ID];
}
