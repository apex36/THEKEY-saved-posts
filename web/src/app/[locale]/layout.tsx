import type { ReactNode } from 'react';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Providers } from '@/lib/providers';
import { CurrentUserProvider } from '@/lib/current-user';
import { Header } from '@/components/header';
import '../globals.css';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <body className="min-h-screen bg-[#EAF0E6] text-[#17201C] antialiased">
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <CurrentUserProvider>
              <Header />
              <main
                data-visual-system="course-ledger"
                className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8"
              >
                {children}
              </main>
            </CurrentUserProvider>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
