'use client';

import { useState, useRef, useEffect } from 'react';
import { useBrand } from './BrandContext';

export default function BrandSelector() {
  const { brand, setBrandId, allBrands } = useBrand();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
      >
        <span
          className="inline-block h-3 w-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: brand.theme.colors.primary }}
        />
        <span>
          Presenting for: <span className="font-semibold text-gray-900">{brand.companyName}</span>
        </span>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {open && (
        <div className="absolute left-0 z-50 mt-1 w-56 origin-top-left rounded-lg border border-gray-200 bg-white shadow-lg ring-1 ring-black/5 focus:outline-none">
          <div className="py-1">
            {allBrands.map((b) => {
              const isSelected = b.id === brand.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setBrandId(b.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                    isSelected
                      ? 'bg-gray-100 text-gray-900 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span
                    className="inline-block h-3 w-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: b.theme.colors.primary }}
                  />
                  {b.shortName}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
