import type { Metadata, Viewport } from 'next';
import { Inter, Nunito } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

// Rounded headings echo the logo lettering; Inter keeps forms and tables readable
const nunito = Nunito({ variable: '--font-nunito', subsets: ['latin'], weight: ['600', '700', '800'] });
const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'Sonho de Criança', template: '%s · Sonho de Criança' },
  description: 'Portal do Centro Infantil Sonho de Criança para famílias, educadores e administração.',
  applicationName: 'Sonho de Criança',
  // iPhone/iPad: open full screen from the home screen, under the system status bar
  appleWebApp: { capable: true, title: 'Sonho de Criança', statusBarStyle: 'default' },
  formatDetection: { telephone: false }
};

export const viewport: Viewport = {
  themeColor: '#608034',
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-MZ" className={`${nunito.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
