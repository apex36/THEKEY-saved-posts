import type { ReactNode } from 'react';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
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

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <NextIntlClientProvider>
          <Providers>
            <CurrentUserProvider>
              <Header />
              <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
            </CurrentUserProvider>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
