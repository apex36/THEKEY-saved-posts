'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

const LOCALE_LABELS: Record<string, string> = { en: 'English', ar: 'العربية' };

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  return (
    <select
      value={locale}
      onChange={(event) => router.replace(pathname, { locale: event.target.value })}
      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-600"
      aria-label={LOCALE_LABELS[locale] ?? locale}
    >
      {routing.locales.map((l) => (
        <option key={l} value={l}>{LOCALE_LABELS[l] ?? l}</option>
      ))}
    </select>
  );
}
