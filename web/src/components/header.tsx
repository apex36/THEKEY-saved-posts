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
      className={`rounded-[4px] px-3 py-1.5 text-sm transition ${
        active
          ? 'bg-[#17201C] text-[#FFFDF6] shadow-[0_1px_0_rgba(23,32,28,0.2)]'
          : 'text-[#4F615A] hover:bg-[#DFE9DF] hover:text-[#17201C]'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="border-b border-[#C7D2C8] bg-[#FFFDF6]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-6">
        <div className="me-auto min-w-48">
          <p className="font-ledger-utility text-[0.72rem] text-[#225E68]">{t('app.eyebrow')}</p>
          <h1 className="font-ledger-display text-2xl font-semibold leading-none">{t('app.title')}</h1>
        </div>
        <nav className="flex rounded-[6px] border border-[#C7D2C8] bg-[#EAF0E6] p-1" aria-label={t('nav.main')}>
          {tab('/', t('nav.feed'), pathname === '/')}
          {tab('/saved', t('nav.saved'), pathname === '/saved')}
        </nav>
        <LocaleSwitcher />
        <UserSwitcher />
      </div>
    </header>
  );
}
