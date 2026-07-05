'use client';

/**
 * Client data hooks. The bookmark toggle is optimistic across EVERY cached
 * list (all feed pages of all courses + the saved list): snapshot → patch →
 * rollback on error → invalidate on settle so the cache always reconverges to
 * server truth.
 */
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api-client';
import { useCurrentUser } from '@/lib/current-user';
import {
  coursesOptions,
  feedInfiniteOptions,
  feedKeys,
  savedInfiniteOptions,
  savedKeys,
} from '@/lib/query-keys';

export interface PostItem {
  id: string;
  courseId: string;
  title: string;
  body: string;
  authorName: string;
  createdAt: string;
  hasSaved: boolean;
  savesCount: number;
  savedAt?: string;
}

type Page = { items: PostItem[]; nextCursor: string | null };
type Lists = InfiniteData<Page>;

export const useCourses = () => {
  const { user } = useCurrentUser();
  return useQuery(coursesOptions(user.id));
};

export const useFeed = (courseId: string) => {
  const { user } = useCurrentUser();
  return useInfiniteQuery(feedInfiniteOptions(user.id, courseId));
};

export const useSaved = () => {
  const { user } = useCurrentUser();
  return useInfiniteQuery(savedInfiniteOptions(user.id));
};

const patchItems = (data: Lists | undefined, postId: string, nextSaved: boolean): Lists | undefined =>
  data && {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((item) =>
        item.id === postId && item.hasSaved !== nextSaved
          ? { ...item, hasSaved: nextSaved, savesCount: item.savesCount + (nextSaved ? 1 : -1) }
          : item,
      ),
    })),
  };

export function useToggleSave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, nextSaved }: { postId: string; nextSaved: boolean }) =>
      unwrap(nextSaved
        ? await api.api.posts({ postId }).save.post()
        : await api.api.posts({ postId }).save.delete()),

    onMutate: async ({ postId, nextSaved }) => {
      await queryClient.cancelQueries({ queryKey: feedKeys.all });
      await queryClient.cancelQueries({ queryKey: savedKeys.all });

      const prevFeed = queryClient.getQueriesData<Lists>({ queryKey: feedKeys.all });
      const prevSaved = queryClient.getQueriesData<Lists>({ queryKey: savedKeys.all });

      queryClient.setQueriesData<Lists>({ queryKey: feedKeys.all }, (old) =>
        patchItems(old, postId, nextSaved));
      // Saved list: un-saving removes the row optimistically; a new save is
      // inserted by the settle-refetch (ordering is server truth).
      queryClient.setQueriesData<Lists>({ queryKey: savedKeys.all }, (old) =>
        old && {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: nextSaved ? page.items : page.items.filter((item) => item.id !== postId),
          })),
        });

      return { prevFeed, prevSaved };
    },

    onError: (_error, _variables, context) => {
      context?.prevFeed.forEach(([key, data]) => queryClient.setQueryData(key, data));
      context?.prevSaved.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },

    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: feedKeys.all });
      await queryClient.invalidateQueries({ queryKey: savedKeys.all });
    },
  });
}

export function useRemovePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId }: { postId: string }) => {
      const res = await api.api.posts({ postId }).delete();
      if (res.error) throw res.error;
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: feedKeys.all });
      await queryClient.invalidateQueries({ queryKey: savedKeys.all });
    },
  });
}
