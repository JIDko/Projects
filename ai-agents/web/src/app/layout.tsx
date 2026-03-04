import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { FloatingNav } from '@/components/layout/floating-nav';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'AI Командный Центр',
  description: 'Панель управления экосистемой AI-агентов',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <div className="mesh-gradient" aria-hidden="true" />
        <div className="mesh-gradient-extra" aria-hidden="true" />
        <FloatingNav />
        <main className="relative z-10 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
