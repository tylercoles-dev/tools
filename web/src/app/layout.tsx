import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MCP Tools',
  description: 'Modern productivity suite with advanced workflow management',
  keywords: ['productivity', 'kanban', 'memory', 'wiki', 'collaboration'],
  authors: [{ name: 'MCP Tools Team' }],
  openGraph: {
    title: 'MCP Tools',
    description: 'Modern productivity suite with advanced workflow management',
    type: 'website',
    locale: 'en_US',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#3b82f6',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.className} h-full bg-gray-50 antialiased`}>
        <Providers>
          <div id="root" className="h-full">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}