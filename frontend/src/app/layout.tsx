import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { BrandProvider } from './components/BrandContext';
import ThemeInjector from './components/ThemeInjector';

export const metadata: Metadata = {
  title: {
    default: 'Vi Operate',
    template: 'Vi Operate — %s',
  },
  description: 'Pharma Engagement Platform powered by Vi',
  icons: {
    icon: '/brand-assets/praxis/favicon.jpg',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#F5F5F5]">
        <BrandProvider>
          <ThemeInjector />
          {children}
        </BrandProvider>
      </body>
    </html>
  );
}
