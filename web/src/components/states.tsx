'use client';

import { useTranslations } from 'next-intl';

export function Skeletons() {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-28 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
      ))}
    </div>
  );
}

export function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
      <svg
        viewBox="0 0 24 24"
        className="mx-auto size-8 text-slate-300"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path d="M6 3h12v18l-6-4-6 4V3z" />
      </svg>
      <p className="mt-3 text-sm text-slate-500">{message}</p>
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
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="text-sm text-red-700">{t(key)}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-md border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-100"
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
      className="mx-auto block rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50"
    >
      {loading ? loadingLabel : label}
    </button>
  );
}
