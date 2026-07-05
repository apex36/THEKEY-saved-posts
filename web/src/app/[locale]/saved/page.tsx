'use client';

/** Saved view — the doc's required second view, with its empty state. */
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useSaved, useToggleSave } from '@/hooks/use-forum';
import { getApiErrorCode } from '@/lib/api-client';
import { PostCard } from '@/components/post-card';
import { EmptyState, ErrorState, LoadMore, Skeletons } from '@/components/states';

export default function SavedPage() {
  const t = useTranslations();
  const saved = useSaved();
  const toggle = useToggleSave();

  if (saved.isPending) return <Skeletons />;
  if (saved.isError) {
    return <ErrorState code={getApiErrorCode(saved.error)} onRetry={() => void saved.refetch()} />;
  }

  const items = saved.data.pages.flatMap((page) => page.items);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t('saved.title')}</h2>

      {items.length === 0 ? (
        <EmptyState
          message={t('saved.empty')}
          action={(
            <Link href="/" className="text-sm font-medium text-slate-900 underline">
              {t('saved.goToFeed')}
            </Link>
          )}
        />
      ) : (
        <div className="space-y-3">
          {items.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              pending={toggle.isPending && toggle.variables?.postId === post.id}
              showRemove={false}
              onToggleSave={(nextSaved) => toggle.mutate({ postId: post.id, nextSaved })}
            />
          ))}
        </div>
      )}

      <LoadMore
        hasMore={Boolean(saved.hasNextPage)}
        loading={saved.isFetchingNextPage}
        onClick={() => void saved.fetchNextPage()}
        label={t('feed.loadMore')}
        loadingLabel={t('common.loading')}
      />
    </div>
  );
}
