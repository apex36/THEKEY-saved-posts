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
      className={`inline-flex min-h-9 items-center gap-2 rounded-[4px] border px-2.5 py-1 text-sm font-medium transition
        ${saved ? 'border-[#A85A28] bg-[#F1DFCC] text-[#7A441E]' : 'border-[#C7D2C8] bg-[#FFFDF6] text-[#4F615A] hover:border-[#A85A28] hover:text-[#7A441E]'}
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
