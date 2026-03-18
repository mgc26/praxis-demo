import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Vi Operate — Praxis Precision Medicines',
    template: 'Vi Operate — %s',
  },
  description: 'Pharma Engagement Platform powered by Vi',
  icons: {
    icon: '/brand-assets/praxis/favicon.jpg',
  },
};

export const viewport: Viewport = {
  themeColor: '#00B9CE',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#F5F5F5]">{children}</body>
    </html>
  );
}
