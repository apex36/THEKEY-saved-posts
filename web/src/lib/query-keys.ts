/**
 * Query-key factory: broad keys are prefixes of narrow ones, so
 * `invalidateQueries({ queryKey: feedKeys.all })` reaches every page of every
 * course feed with one call. The queryOptions helpers pair each key with its
 * typed fetcher.
 */
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { api, unwrap } from './api-client';

export const courseKeys = {
  all: ['courses'] as const,
  list: (userId: string) => [...courseKeys.all, userId] as const,
};

export const feedKeys = {
  all: ['feed'] as const,
  list: (userId: string, courseId: string) => [...feedKeys.all, userId, courseId] as const,
};

export const savedKeys = {
  all: ['saved'] as const,
  list: (userId: string) => [...savedKeys.all, userId, 'list'] as const,
};

// Small page size keeps "Load more" demonstrable with the seeded data volume.
const PAGE_SIZE = 5;

export const coursesOptions = (userId: string) => queryOptions({
  queryKey: courseKeys.list(userId),
  queryFn: async () => unwrap(await api.api.courses.get()),
});

export const feedInfiniteOptions = (userId: string, courseId: string) => infiniteQueryOptions({
  queryKey: feedKeys.list(userId, courseId),
  queryFn: async ({ pageParam }) => unwrap(await api.api.courses({ courseId }).posts.get({
    query: pageParam ? { cursor: pageParam, limit: PAGE_SIZE } : { limit: PAGE_SIZE },
  })),
  initialPageParam: null as string | null,
  getNextPageParam: (last) => last.nextCursor,
  enabled: courseId !== '',
});

export const savedInfiniteOptions = (userId: string) => infiniteQueryOptions({
  queryKey: savedKeys.list(userId),
  queryFn: async ({ pageParam }) => unwrap(await api.api.me.saved.get({
    query: pageParam ? { cursor: pageParam, limit: PAGE_SIZE } : { limit: PAGE_SIZE },
  })),
  initialPageParam: null as string | null,
  getNextPageParam: (last) => last.nextCursor,
});
