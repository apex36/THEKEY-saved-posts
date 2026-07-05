'use client';

import { useTranslations } from 'next-intl';

export function Skeletons() {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-32 animate-pulse rounded-[6px] border border-[#C7D2C8] bg-[#FFFDF6]" />
      ))}
    </div>
  );
}

export function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[6px] border border-[#C7D2C8] bg-[#FFFDF6] px-6 py-12 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.65)]">
      <div className="absolute inset-x-0 top-0 h-1 bg-[#225E68]" aria-hidden="true" />
      <svg
        viewBox="0 0 24 24"
        className="mx-auto size-10 text-[#A85A28]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        aria-hidden="true"
      >
        <path d="M6 3h12v18l-6-4-6 4V3z" />
      </svg>
      <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#4F615A]">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const KNOWN_ERROR_CODES = [
  'UNAUTHENTICATED', 'NOT_ENROLLED', 'NOT_MODERATOR',
  'POST_NOT_FOUND', 'COURSE_NOT_FOUND', 'INVALID_CURSOR',
] as const;

export function ErrorState({ code, onRetry }: { code: string; onRetry: () => void }) {
  const t = useTranslations('errors');
  const key = (KNOWN_ERROR_CODES as readonly string[]).includes(code) ? code : 'generic';
  return (
    <div className="rounded-[6px] border border-[#9E3D2E]/35 bg-[#FFF7F2] p-6 text-center">
      <p className="text-sm text-[#9E3D2E]">{t(key)}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-[4px] border border-[#9E3D2E]/35 px-3 py-1.5 text-sm font-medium text-[#9E3D2E] transition hover:bg-[#9E3D2E]/10"
      >
        {t('retry')}
      </button>
    </div>
  );
}

export function LoadMore({ hasMore, loading, onClick, label, loadingLabel }: {
  hasMore: boolean;
  loading: boolean;
  onClick: () => void;
  label: string;
  loadingLabel: string;
}) {
  if (!hasMore) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="mx-auto mt-5 block rounded-[4px] border border-[#225E68] bg-[#FFFDF6] px-4 py-2 text-sm font-medium text-[#225E68] transition hover:bg-[#DCEBEE] disabled:opacity-50"
    >
      {loading ? loadingLabel : label}
    </button>
  );
}
