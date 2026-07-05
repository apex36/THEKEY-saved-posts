/**
 * Fixed-UUID fixtures — the single source of truth for seeds, tests, and the
 * web demo user switcher (mirrored in web/src/lib/demo-users.ts).
 * Pure data: no I/O, importable anywhere.
 */
import type { Role } from '../repos/types';

export const COURSE_TS = '11111111-1111-4111-8111-111111111111'; // TypeScript 101
export const COURSE_DB = '22222222-2222-4222-8222-222222222222'; // Databases 201

export const ALICE = { id: 'a1111111-1111-4111-8111-111111111111', name: 'Alice', role: 'student' } as const satisfies SeedUser;
export const BILAL = { id: 'b2222222-2222-4222-8222-222222222222', name: 'Bilal', role: 'student' } as const satisfies SeedUser;
export const CHEN = { id: 'c3333333-3333-4333-8333-333333333333', name: 'Chen', role: 'student' } as const satisfies SeedUser;
export const MONA = { id: 'd4444444-4444-4444-8444-444444444444', name: 'Mona', role: 'moderator' } as const satisfies SeedUser;

export interface SeedUser {
  id: string;
  name: string;
  role: Role;
}

export interface SeedPost {
  id: string;
  courseId: string;
  authorId: string;
  title: string;
  body: string;
  /** ISO-8601 — converted to Date at the persistence boundary. */
  createdAt: string;
}

export interface SeedSave {
  id: string;
  userId: string;
  postId: string;
  savedAt: string;
  deletedAt: string | null;
}

export const SEED_USERS: SeedUser[] = [ALICE, BILAL, CHEN, MONA];

export const SEED_COURSES = [
  { id: COURSE_TS, title: 'TypeScript 101' },
  { id: COURSE_DB, title: 'Databases 201' },
];

/** Alice → TS only; Bilal → DB only; Chen → both; Mona (moderator) → none. */
export const SEED_ENROLLMENTS = [
  { userId: ALICE.id, courseId: COURSE_TS },
  { userId: BILAL.id, courseId: COURSE_DB },
  { userId: CHEN.id, courseId: COURSE_TS },
  { userId: CHEN.id, courseId: COURSE_DB },
];

const pid = (n: number): string => `f${String(n).padStart(7, '0')}-0000-4000-8000-00000000000${n % 10}`;

export const POSTS: SeedPost[] = [
  { id: pid(1), courseId: COURSE_TS, authorId: ALICE.id, title: 'Narrowing unions without pain', body: 'Discriminated unions plus exhaustive switches keep refactors honest. Here is the pattern I reach for first…', createdAt: '2026-06-01T09:00:00.000Z' },
  { id: pid(2), courseId: COURSE_DB, authorId: BILAL.id, title: 'When to reach for a partial index', body: 'Partial indexes shine when most rows never match the predicate — soft-deleted rows being the classic case…', createdAt: '2026-06-02T10:30:00.000Z' },
  { id: pid(3), courseId: COURSE_TS, authorId: CHEN.id, title: 'satisfies vs as const', body: 'satisfies checks a value against a type while preserving inference. Combined with as const it removes whole classes of bugs…', createdAt: '2026-06-03T08:15:00.000Z' },
  { id: pid(4), courseId: COURSE_DB, authorId: CHEN.id, title: 'Keyset pagination beats OFFSET', body: 'OFFSET re-scans everything it skips and drifts when rows are inserted. A (created_at, id) cursor does neither…', createdAt: '2026-06-04T14:45:00.000Z' },
  { id: pid(5), courseId: COURSE_TS, authorId: ALICE.id, title: 'Zod coercion at the edges', body: 'Query strings arrive as strings. z.coerce.number() at the boundary keeps the rest of the codebase honest…', createdAt: '2026-06-05T11:20:00.000Z' },
  { id: pid(6), courseId: COURSE_DB, authorId: BILAL.id, title: 'Upserts and unique constraints', body: 'ON CONFLICT DO UPDATE with a setWhere clause gives you idempotent writes with exactly-once side effects…', createdAt: '2026-06-06T16:00:00.000Z' },
  { id: pid(7), courseId: COURSE_TS, authorId: CHEN.id, title: 'verbatimModuleSyntax explained', body: 'It forces type-only imports to be written as such, which is exactly what type-erasing bundlers need…', createdAt: '2026-06-07T09:40:00.000Z' },
  { id: pid(8), courseId: COURSE_DB, authorId: CHEN.id, title: 'Soft delete is a product decision', body: 'deleted_at columns preserve history and enable undo, but every query must remember the filter — centralize it…', createdAt: '2026-06-08T13:10:00.000Z' },
  { id: pid(9), courseId: COURSE_TS, authorId: ALICE.id, title: 'Testing pure cores', body: 'Push I/O to the edges and the interesting logic becomes plain functions you can test in microseconds…', createdAt: '2026-06-09T10:05:00.000Z' },
  { id: pid(10), courseId: COURSE_DB, authorId: BILAL.id, title: 'Counting with FILTER', body: 'count(*) FILTER (WHERE …) beats a correlated CASE WHEN sum and reads exactly like the business rule…', createdAt: '2026-06-10T12:00:00.000Z' },
  { id: pid(11), courseId: COURSE_TS, authorId: CHEN.id, title: 'Branded types for ids', body: 'A UserId that cannot be passed where a PostId belongs catches whole categories of bugs at compile time…', createdAt: '2026-06-11T09:30:00.000Z' },
  { id: pid(12), courseId: COURSE_DB, authorId: CHEN.id, title: 'EXPLAIN before you index', body: 'Guessing at indexes wastes write throughput. Read the plan, find the seq scan, then add exactly one index…', createdAt: '2026-06-12T10:15:00.000Z' },
  { id: pid(13), courseId: COURSE_TS, authorId: ALICE.id, title: 'Errors as values vs exceptions', body: 'Result types make failure paths explicit, but TypeScript ergonomics still favor exceptions at I/O edges…', createdAt: '2026-06-13T15:45:00.000Z' },
  { id: pid(14), courseId: COURSE_DB, authorId: BILAL.id, title: 'Timestamptz or bust', body: 'Naive timestamps drift the moment two systems disagree on timezone. Store timestamptz, render locally…', createdAt: '2026-06-14T08:20:00.000Z' },
  { id: pid(15), courseId: COURSE_TS, authorId: CHEN.id, title: 'The case for readonly everywhere', body: 'Mutation at a distance is the hardest bug class to trace. readonly arrays and object fields make it opt-in…', createdAt: '2026-06-15T11:50:00.000Z' },
  { id: pid(16), courseId: COURSE_DB, authorId: CHEN.id, title: 'Connection pools are not optional', body: 'Every serverless cold start opening its own connection is how databases fall over. Pool at the edge…', createdAt: '2026-06-16T13:35:00.000Z' },
];

/**
 * Pre-existing saves. Alice's save of p03 is SOFT-DELETED on purpose: the very
 * first re-save in a demo exercises reactivation of an existing row (doc req 6).
 */
export const PRE_SAVES: SeedSave[] = [
  { id: 'e0000001-0000-4000-8000-000000000001', userId: CHEN.id, postId: pid(1), savedAt: '2026-06-15T09:00:00.000Z', deletedAt: null },
  { id: 'e0000002-0000-4000-8000-000000000002', userId: BILAL.id, postId: pid(2), savedAt: '2026-06-15T10:00:00.000Z', deletedAt: null },
  { id: 'e0000003-0000-4000-8000-000000000003', userId: CHEN.id, postId: pid(2), savedAt: '2026-06-16T11:00:00.000Z', deletedAt: null },
  { id: 'e0000004-0000-4000-8000-000000000004', userId: ALICE.id, postId: pid(3), savedAt: '2026-06-16T12:00:00.000Z', deletedAt: '2026-06-17T08:00:00.000Z' },
];
