'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { UserSwitcher } from './user-switcher';
import { LocaleSwitcher } from './locale-switcher';

export function Header() {
  const t = useTranslations();
  const pathname = usePathname();

  const tab = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 text-sm ${active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
    >
      {label}
    </Link>
  );

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-3 px-4 py-3">
        <h1 className="me-auto text-lg font-bold">{t('app.title')}</h1>
        <nav className="flex gap-1" aria-label={t('nav.main')}>
          {tab('/', t('nav.feed'), pathname === '/')}
          {tab('/saved', t('nav.saved'), pathname === '/saved')}
        </nav>
        <LocaleSwitcher />
        <UserSwitcher />
      </div>
    </header>
  );
}
