'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push('/dashboard');
        return;
      }
    } catch {
      // fall through to error state
    }

    setError(true);
    setShaking(true);
    window.setTimeout(() => setShaking(false), 420);
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#F5F5F5] font-sans">
      {/* Subtle decorative background geometry */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(0,185,206,0.06)_0%,transparent_70%)]" />
        <div className="absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(72,93,97,0.04)_0%,transparent_70%)]" />
        <div className="absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(0,185,206,0.03)_0%,transparent_70%)]" />
      </div>

      {/* Login card */}
      <form
        onSubmit={handleSubmit}
        className={cn(
          'relative w-full max-w-md bg-white p-10 shadow-lg',
          shaking && 'animate-shake',
        )}
      >
        {/* Logos + subtitle */}
        <div className="flex flex-col items-center gap-4">
          <img
            src="/brand-assets/praxis/logo-primary.svg"
            alt="Praxis Precision Medicines"
            className="h-10"
          />
          <div className="flex items-center gap-2 text-xs text-[#ACB0B3]">
            <span>Powered by</span>
            <span className="font-bold text-[#485D61]">Vi</span>
            <span className="inline-block h-[4px] w-[4px] rounded-full bg-[#00B9CE]" />
            <span>Operate</span>
          </div>
        </div>

        {/* Divider */}
        <div className="my-6 h-px w-full bg-[#E2E7EA]" />

        {/* Title */}
        <div className="mb-6 text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-[#485D61]">
            Pharma Engagement Platform
          </p>
        </div>

        {/* Access code field */}
        <div className="mb-6">
          <label
            htmlFor="password"
            className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#ACB0B3]"
          >
            Access Code
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(false);
            }}
            placeholder="Enter access code"
            autoFocus
            aria-invalid={error}
            className={cn(
              'h-11 w-full border bg-white px-4 text-sm text-[#000000] placeholder:text-[#ACB0B3] transition-colors focus:outline-none focus:ring-2 focus:ring-[#00B9CE]/30 focus:border-[#00B9CE]',
              error ? 'border-[#FF7D78]' : 'border-[#E2E7EA]',
            )}
          />
          <div className="mt-1.5 min-h-[20px] text-xs text-[#FF7D78]">
            {error ? 'Incorrect access code. Please try again.' : ''}
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          className="h-11 w-full bg-[#00B9CE] font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#009AAD] active:bg-[#008A9B]"
        >
          Enter Dashboard
        </button>
      </form>

      {/* Below card info */}
      <div className="relative mt-8 flex flex-col items-center gap-1.5 text-center">
        <p className="text-xs text-[#ACB0B3]">
          Workshop &middot; March 24, 2026
        </p>
        <p className="text-xs text-[#ACB0B3]">
          Praxis Precision Medicines &middot; Neurology Portfolio
        </p>
        <div className="my-2 h-px w-16 bg-[#E2E7EA]" />
        <p className="text-[10px] uppercase tracking-wider text-[#ACB0B3]">
          Confidential &mdash; Vi Technologies
        </p>
      </div>
    </main>
  );
}
