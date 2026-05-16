import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { ToastProvider } from '@/components/ui/Toast';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: {
    default:  'BookedUp — Stay Booked.',
    template: '%s | BookedUp',
  },
  description:
    'Trouve ton coiffeur et réserve en 30 secondes. Acomptes Stripe, confirmations instantanées, fini les coups de fil.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    title:       'BookedUp — Stay Booked.',
    description: 'Trouve ton coiffeur et réserve en 30 secondes.',
    type:        'website',
    siteName:    'BookedUp',
    locale:      'fr_FR',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'BookedUp — Stay Booked.',
    description: 'Trouve ton coiffeur et réserve en 30 secondes.',
    creator:     '@bookedup_fr',
  },
  robots: {
    index:  true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#050608',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`dark ${jakarta.variable}`}>
      <body className="min-h-screen bg-ink-950 font-sans text-white antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ToastProvider>
            {children}
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
