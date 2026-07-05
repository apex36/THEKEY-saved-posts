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
    <section className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="border-y border-[#C7D2C8] py-4 lg:sticky lg:top-6 lg:self-start">
        <p className="font-ledger-utility text-xs text-[#225E68]">{t('saved.ledgerLabel')}</p>
        <h2 className="font-ledger-display mt-1 text-3xl font-semibold leading-tight">{t('saved.title')}</h2>
        <p className="mt-5 text-sm font-medium text-[#4F615A]">{t('saved.railLabel')}</p>
      </aside>

      <section className="min-w-0" aria-label={t('saved.title')}>
        <div className="mb-4 hidden border-b border-[#C7D2C8] pb-3 sm:block">
          <p className="font-ledger-utility text-xs text-[#4F615A]">{t('saved.railLabel')}</p>
          <h2 className="font-ledger-display text-3xl font-semibold leading-tight">{t('saved.title')}</h2>
        </div>

        {items.length === 0 ? (
          <EmptyState
            message={t('saved.empty')}
            action={(
              <Link
                href="/"
                className="inline-flex rounded-[4px] border border-[#225E68] bg-[#225E68] px-3 py-2 text-sm font-medium text-[#FFFDF6] transition hover:bg-[#194F59] focus:outline-none focus:ring-2 focus:ring-[#225E68]/25"
              >
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
      </section>
    </section>
  );
}
