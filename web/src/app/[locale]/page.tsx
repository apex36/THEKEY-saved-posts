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
  const courseId = selected ?? courses.data?.[0]?.id ?? '';
  const feed = useFeed(courseId);
  const toggle = useToggleSave();
  const remove = useRemovePost();

  if (courses.isPending) return <Skeletons />;
  if (courses.isError) {
    return <ErrorState code={getApiErrorCode(courses.error)} onRetry={() => void courses.refetch()} />;
  }
  if (courses.data.length === 0) return <EmptyState message={t('feed.noCourses')} />;

  const items = feed.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('feed.coursesLabel')}>
        {courses.data.map((course) => (
          <button
            key={course.id}
            type="button"
            role="tab"
            aria-selected={course.id === courseId}
            onClick={() => setSelected(course.id)}
            className={`rounded-full px-3 py-1 text-sm ${course.id === courseId ? 'bg-slate-900 text-white' : 'border border-slate-300 text-slate-600 hover:bg-slate-100'}`}
          >
            {course.title}
          </button>
        ))}
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
    </div>
  );
}
