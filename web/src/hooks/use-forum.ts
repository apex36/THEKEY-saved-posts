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

// The post being saved is always visible in a feed page (saves originate from
// the feed), so we can source its data from the feed snapshot for a symmetric
// optimistic insert into the saved list.
const findInSnapshots = (
  snapshots: ReadonlyArray<readonly [unknown, Lists | undefined]>,
  postId: string,
): PostItem | undefined => {
  for (const [, data] of snapshots) {
    for (const page of data?.pages ?? []) {
      const hit = page.items.find((item) => item.id === postId);
      if (hit) return hit;
    }
  }
  return undefined;
};

export function useToggleSave() {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  // Scope every cache op to the acting identity — `hasSaved` is per-user, so a
  // toggle must never touch another user's cached feed/saved entries.
  const feedScope = feedKeys.user(user.id);
  const savedScope = savedKeys.user(user.id);

  return useMutation({
    mutationFn: async ({ postId, nextSaved }: { postId: string; nextSaved: boolean }) =>
      unwrap(nextSaved
        ? await api.api.posts({ postId }).save.post()
        : await api.api.posts({ postId }).save.delete()),

    // Re-entrancy: PostCard disables the toggle while this mutation is pending
    // for the same postId, so two overlapping toggles on one post can't race
    // (a slow rollback stomping a newer settled state) — the invariant this
    // optimistic path relies on lives with its consumer, by design.
    onMutate: async ({ postId, nextSaved }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: feedScope }),
        queryClient.cancelQueries({ queryKey: savedScope }),
      ]);

      const prevFeed = queryClient.getQueriesData<Lists>({ queryKey: feedScope });
      const prevSaved = queryClient.getQueriesData<Lists>({ queryKey: savedScope });
      // Snapshot the source BEFORE patching the feed, so its savesCount is pre-toggle.
      const source = findInSnapshots(prevFeed, postId);

      queryClient.setQueriesData<Lists>({ queryKey: feedScope }, (old) =>
        patchItems(old, postId, nextSaved));

      // Saved list stays symmetric with the feed: un-save drops the row, a new
      // save prepends it (most-recent-first) so both caches update instantly;
      // the settle-refetch still reconciles exact ordering with server truth.
      queryClient.setQueriesData<Lists>({ queryKey: savedScope }, (old) => {
        if (!old || old.pages.length === 0) return old;
        if (!nextSaved) {
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.filter((item) => item.id !== postId),
            })),
          };
        }
        const present = old.pages.some((page) => page.items.some((item) => item.id === postId));
        const [first, ...rest] = old.pages;
        if (present || !source || !first) return old;
        const savedItem: PostItem = {
          ...source,
          hasSaved: true,
          savesCount: source.savesCount + 1,
          savedAt: new Date().toISOString(),
        };
        return { ...old, pages: [{ ...first, items: [savedItem, ...first.items] }, ...rest] };
      });

      return { prevFeed, prevSaved };
    },

    onError: (_error, _variables, context) => {
      context?.prevFeed.forEach(([key, data]) => queryClient.setQueryData(key, data));
      context?.prevSaved.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },

    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: feedScope }),
        queryClient.invalidateQueries({ queryKey: savedScope }),
      ]);
    },
  });
}

export function useRemovePost() {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  return useMutation({
    // unwrap() keeps this on the same typed-error contract (ApiClientError) as
    // every other call, so getApiErrorCode() reads it like any other failure.
    mutationFn: async ({ postId }: { postId: string }) => {
      unwrap(await api.api.posts({ postId }).delete());
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: feedKeys.user(user.id) }),
        queryClient.invalidateQueries({ queryKey: savedKeys.user(user.id) }),
      ]);
    },
  });
}
