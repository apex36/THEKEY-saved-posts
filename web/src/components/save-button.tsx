'use client';

import { useTranslations } from 'next-intl';

export function SaveButton({ saved, count, pending, onToggle }: {
  saved: boolean;
  count: number;
  pending: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations('post');
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? t('unsave') : t('save')}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition
        ${saved ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}
        ${pending ? 'opacity-50' : ''}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M6 3h12v18l-6-4-6 4V3z" />
      </svg>
      <span>{t('saves', { count })}</span>
    </button>
  );
}
