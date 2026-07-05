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
};

export const feedKeys = {
  all: ['feed'] as const,
  list: (courseId: string) => [...feedKeys.all, courseId] as const,
};

export const savedKeys = {
  all: ['saved'] as const,
  list: () => [...savedKeys.all, 'list'] as const,
};

const PAGE_SIZE = 10;

export const coursesOptions = () => queryOptions({
  queryKey: courseKeys.all,
  queryFn: async () => unwrap(await api.api.courses.get()),
});

export const feedInfiniteOptions = (courseId: string) => infiniteQueryOptions({
  queryKey: feedKeys.list(courseId),
  queryFn: async ({ pageParam }) => unwrap(await api.api.courses({ courseId }).posts.get({
    query: pageParam ? { cursor: pageParam, limit: PAGE_SIZE } : { limit: PAGE_SIZE },
  })),
  initialPageParam: null as string | null,
  getNextPageParam: (last) => last.nextCursor,
  enabled: courseId !== '',
});

export const savedInfiniteOptions = () => infiniteQueryOptions({
  queryKey: savedKeys.list(),
  queryFn: async ({ pageParam }) => unwrap(await api.api.me.saved.get({
    query: pageParam ? { cursor: pageParam, limit: PAGE_SIZE } : { limit: PAGE_SIZE },
  })),
  initialPageParam: null as string | null,
  getNextPageParam: (last) => last.nextCursor,
});
