'use client';

/** Feed view — the container: hooks live here, components stay presentational. */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useCourses, useFeed, useRemovePost, useToggleSave } from '@/hooks/use-forum';
import { useCurrentUser } from '@/lib/current-user';
import { getApiErrorCode } from '@/lib/api-client';
import { PostCard } from '@/components/post-card';
import { EmptyState, ErrorState, LoadMore, Skeletons } from '@/components/states';

export default function FeedPage() {
  const t = useTranslations();
  const { user } = useCurrentUser();
  const courses = useCourses();
  const [selected, setSelected] = useState<string | null>(null);
  // A course selected as one identity may not exist for the next (switching users
  // does not remount this page). Fall back to the first available course rather
  // than fetching a course this user isn't enrolled in and rendering a 403.
  const courseId =
    (selected && courses.data?.some((c) => c.id === selected) ? selected : courses.data?.[0]?.id) ?? '';
  const feed = useFeed(courseId);
  const toggle = useToggleSave();
  const remove = useRemovePost();

  if (courses.isPending) return <Skeletons />;
  if (courses.isError) {
    return <ErrorState code={getApiErrorCode(courses.error)} onRetry={() => void courses.refetch()} />;
  }
  if (courses.data.length === 0) return <EmptyState message={t('feed.noCourses')} />;

  const items = feed.data?.pages.flatMap((page) => page.items) ?? [];
  const selectedCourse = courses.data.find((course) => course.id === courseId) ?? courses.data[0];

  return (
    <section className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="border-y border-[#C7D2C8] py-4 lg:sticky lg:top-6 lg:self-start">
        <p className="font-ledger-utility text-xs text-[#225E68]">{t('feed.ledgerLabel')}</p>
        <h2 className="font-ledger-display mt-1 text-3xl font-semibold leading-tight">
          {selectedCourse?.title}
        </h2>
        <p className="mt-5 text-sm font-medium text-[#4F615A]">{t('feed.trackLabel')}</p>
        <div className="mt-2 space-y-2" role="tablist" aria-label={t('feed.coursesLabel')}>
          {courses.data.map((course) => {
            const active = course.id === courseId;
            return (
              <button
                key={course.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelected(course.id)}
                className={`w-full rounded-[6px] border px-3 py-3 text-start text-sm transition ${
                  active
                    ? 'border-[#225E68] bg-[#225E68] text-[#FFFDF6] shadow-[0_8px_24px_rgba(36,86,107,0.18)]'
                    : 'border-[#C7D2C8] bg-[#FFFDF6] text-[#17201C] hover:border-[#225E68] hover:bg-[#E1EBDD]'
                }`}
              >
                <span className="block font-semibold">{course.title}</span>
                {active && (
                  <span className="mt-1 block text-xs text-[#DDEDEC]">{t('feed.current')}</span>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      <section className="min-w-0" aria-label={selectedCourse?.title}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-[#C7D2C8] pb-3">
          <div>
            <p className="font-ledger-utility text-xs text-[#4F615A]">{t('feed.streamLabel')}</p>
            <h2 className="font-ledger-display text-3xl font-semibold leading-tight">
              {selectedCourse?.title}
            </h2>
          </div>
          <p className="text-sm text-[#4F615A]">{t('feed.orderLabel')}</p>
        </div>

        {feed.isPending && <Skeletons />}
        {feed.isError && (
          <ErrorState code={getApiErrorCode(feed.error)} onRetry={() => void feed.refetch()} />
        )}
        {feed.isSuccess && items.length === 0 && <EmptyState message={t('feed.empty')} />}

        <div className="space-y-3">
          {items.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              pending={
                (toggle.isPending && toggle.variables?.postId === post.id) ||
                (remove.isPending && remove.variables?.postId === post.id)
              }
              showRemove={user.role === 'moderator'}
              onToggleSave={(nextSaved) => toggle.mutate({ postId: post.id, nextSaved })}
              onRemove={() => remove.mutate({ postId: post.id })}
            />
          ))}
        </div>

        <LoadMore
          hasMore={Boolean(feed.hasNextPage)}
          loading={feed.isFetchingNextPage}
          onClick={() => void feed.fetchNextPage()}
          label={t('feed.loadMore')}
          loadingLabel={t('common.loading')}
        />
      </section>
    </section>
  );
}
