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
  const [brandId, setBrandIdState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vi-demo-brand') || DEFAULT_BRAND_ID;
    }
    return DEFAULT_BRAND_ID;
  });

  const setBrandId = (id: string) => {
    setBrandIdState(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vi-demo-brand', id);
    }
  };

  const brand = useMemo(() => getBrand(brandId), [brandId]);

  const value = useMemo<BrandContextValue>(
    () => ({ brand, setBrandId, allBrands }),
    [brand]
  );

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrand(): BrandContextValue {
  const ctx = useContext(BrandContext);
  if (!ctx) throw new Error('useBrand must be used within BrandProvider');
  return ctx;
}
