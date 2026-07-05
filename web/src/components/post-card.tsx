'use client';

import { useFormatter, useNow, useTranslations } from 'next-intl';
import { SaveButton } from './save-button';

export interface PostCardData {
  id: string;
  title: string;
  body: string;
  authorName: string;
  createdAt: string;
  hasSaved: boolean;
  savesCount: number;
  savedAt?: string;
}

export function PostCard({ post, pending, showRemove, onToggleSave, onRemove }: {
  post: PostCardData;
  pending: boolean;
  showRemove: boolean;
  onToggleSave: (nextSaved: boolean) => void;
  onRemove?: () => void;
}) {
  const t = useTranslations('post');
  const tSaved = useTranslations('saved');
  const format = useFormatter();
  const now = useNow();
  const created = new Date(post.createdAt);
  const dateStamp = format.dateTime(created, { month: 'short', day: 'numeric' });
  const yearStamp = format.dateTime(created, { year: 'numeric' });

  return (
    <article
      data-card-style="ledger-entry"
      className="grid gap-4 rounded-[6px] border border-[#C7D2C8] bg-[#FFFDF6] px-4 py-4 shadow-[0_1px_0_rgba(23,32,28,0.06)] transition hover:border-[#225E68]/70 sm:grid-cols-[7.5rem_minmax(0,1fr)]"
    >
      <div className="flex items-center gap-3 border-b border-[#C7D2C8] pb-3 sm:block sm:border-b-0 sm:border-e sm:pb-0 sm:pe-4">
        <time className="font-ledger-display block text-2xl font-semibold leading-none text-[#225E68]" dateTime={post.createdAt}>
          {dateStamp}
        </time>
        <span className="font-ledger-utility text-xs text-[#4F615A]">{yearStamp}</span>
      </div>

      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-ledger-display text-xl font-semibold leading-snug text-[#17201C]">
              {post.title}
            </h3>
            <p className="mt-1 text-sm text-[#4F615A]">
              {t('by', { name: post.authorName })}
              {' · '}
              {format.dateTime(created, { dateStyle: 'medium' })}
            </p>
          </div>
          {showRemove && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              disabled={pending}
              className="rounded-[4px] border border-[#9E3D2E]/35 px-2.5 py-1 text-xs font-medium text-[#9E3D2E] transition hover:bg-[#9E3D2E]/10 disabled:opacity-50"
            >
              {t('remove')}
            </button>
          )}
        </div>

        <p className="mt-3 line-clamp-3 text-[0.95rem] leading-6 text-[#26332E]">{post.body}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <SaveButton
            saved={post.hasSaved}
            count={post.savesCount}
            pending={pending}
            onToggle={() => onToggleSave(!post.hasSaved)}
          />
          {post.savedAt && (
            <span className="font-ledger-utility text-xs text-[#4F615A]">
              {tSaved('savedAt', { relative: format.relativeTime(new Date(post.savedAt), now) })}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
