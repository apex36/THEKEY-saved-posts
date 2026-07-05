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

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{post.title}</h3>
          <p className="text-sm text-slate-500">
            {t('by', { name: post.authorName })}
            {' · '}
            {format.dateTime(new Date(post.createdAt), { dateStyle: 'medium' })}
          </p>
        </div>
        {showRemove && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            disabled={pending}
            className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
          >
            {t('remove')}
          </button>
        )}
      </div>
      <p className="mt-2 line-clamp-3 text-sm text-slate-700">{post.body}</p>
      <div className="mt-3 flex items-center justify-between">
        <SaveButton
          saved={post.hasSaved}
          count={post.savesCount}
          pending={pending}
          onToggle={() => onToggleSave(!post.hasSaved)}
        />
        {post.savedAt && (
          <span className="text-xs text-slate-400">
            {tSaved('savedAt', { relative: format.relativeTime(new Date(post.savedAt), now) })}
          </span>
        )}
      </div>
    </article>
  );
}
