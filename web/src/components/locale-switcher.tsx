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
      className="h-9 rounded-[4px] border border-[#C7D2C8] bg-[#FFFDF6] px-2 text-sm text-[#4F615A] outline-none transition hover:border-[#225E68] focus:border-[#225E68] focus:ring-2 focus:ring-[#225E68]/20"
      aria-label={LOCALE_LABELS[locale] ?? locale}
    >
      {routing.locales.map((l) => (
        <option key={l} value={l}>{LOCALE_LABELS[l] ?? l}</option>
      ))}
    </select>
  );
}
