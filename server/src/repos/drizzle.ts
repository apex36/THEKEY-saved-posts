/**
 * Production Repos over Drizzle/Postgres. Each method is one named query; the
 * hydrated flags (savesCount + hasSaved) ride along in the page query itself —
 * one round trip per page, no N+1 (spec §6 "efficiently").
 *
 * Accepts any Postgres-dialect Drizzle database (postgres.js in production,
 * PGlite in the integration tests) — same SQL, same semantics.
 */
import { and, desc, eq, isNull, lt, or, sql, type SQL } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from '../db/schema';
import { courses, enrollments, posts, savedPosts, users } from '../db/schema';
import { encodeCursor, type Cursor } from '../domain/cursor';
import {
  DuplicateSaveError,
  type Page,
  type PostView,
  type Repos,
  type SavedPostView,
} from './types';

export type AppDb = PgDatabase<PgQueryResultHKT, typeof schema>;

/** Active saves for the post under selection. Correlates with the outer `posts` row. */
const savesCount = sql<number>`(
  select count(*) from ${savedPosts}
  where ${savedPosts.postId} = ${posts.id} and ${savedPosts.deletedAt} is null
)`.mapWith(Number);

const hasSavedFor = (viewerId: string) => sql<boolean>`exists(
  select 1 from ${savedPosts}
  where ${savedPosts.postId} = ${posts.id}
    and ${savedPosts.userId} = ${viewerId}
    and ${savedPosts.deletedAt} is null
)`;

/** Keyset predicate for (timestamp, id) descending order. */
const afterCursor = (
  cursor: Cursor | null,
  tsColumn: typeof posts.createdAt | typeof savedPosts.savedAt,
  idColumn: typeof posts.id | typeof savedPosts.id,
): SQL | undefined =>
  cursor
    ? or(
        lt(tsColumn, new Date(cursor.ts)),
        and(eq(tsColumn, new Date(cursor.ts)), lt(idColumn, cursor.id)),
      )
    : undefined;

const isUniqueViolation = (error: unknown): boolean => {
  for (let e = error; typeof e === 'object' && e !== null; e = (e as { cause?: unknown }).cause) {
    if ((e as { code?: unknown }).code === '23505') return true;
  }
  return false;
};

export function createDrizzleRepos(db: AppDb): Repos {
  const toPage = <Row, View>(
    rows: Row[],
    limit: number,
    toView: (row: Row) => View,
    toCursor: (row: Row) => Cursor,
  ): Page<View> => {
    const pageRows = rows.slice(0, limit);
    const last = pageRows[pageRows.length - 1];
    return {
      items: pageRows.map(toView),
      nextCursor: rows.length > limit && last !== undefined ? encodeCursor(toCursor(last)) : null,
    };
  };

  return {
    users: {
      findById: async (id) => {
        const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
        return row ?? null;
      },
      listAll: async () => db.select().from(users),
    },

    courses: {
      findById: async (id) => {
        const [row] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
        return row ?? null;
      },
      listForUser: async (user) => {
        if (user.role === 'moderator') return db.select().from(courses);
        return db
          .select({ id: courses.id, title: courses.title })
          .from(courses)
          .innerJoin(enrollments, and(
            eq(enrollments.courseId, courses.id),
            eq(enrollments.userId, user.id),
          ));
      },
    },

    enrollments: {
      isEnrolled: async (userId, courseId) => {
        const [row] = await db
          .select({ userId: enrollments.userId })
          .from(enrollments)
          .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)))
          .limit(1);
        return row !== undefined;
      },
    },

    posts: {
      findVisibleMetaById: async (id) => {
        const [row] = await db
          .select({ id: posts.id, courseId: posts.courseId })
          .from(posts)
          .where(and(eq(posts.id, id), isNull(posts.deletedAt)))
          .limit(1);
        return row ?? null;
      },

      listFeedPage: async (viewerId, courseId, cursor, limit) => {
        const rows = await db
          .select({
            id: posts.id,
            courseId: posts.courseId,
            title: posts.title,
            body: posts.body,
            authorName: users.name,
            createdAt: posts.createdAt,
            savesCount,
            hasSaved: hasSavedFor(viewerId),
          })
          .from(posts)
          .innerJoin(users, eq(posts.authorId, users.id))
          .where(and(
            eq(posts.courseId, courseId),
            isNull(posts.deletedAt),
            afterCursor(cursor, posts.createdAt, posts.id),
          ))
          .orderBy(desc(posts.createdAt), desc(posts.id))
          .limit(limit + 1);

        return toPage(
          rows,
          limit,
          (r): PostView => ({ ...r, createdAt: r.createdAt.toISOString() }),
          (r) => ({ ts: r.createdAt.toISOString(), id: r.id }),
        );
      },

      softDelete: async (id) => {
        await db.update(posts).set({ deletedAt: sql`now()` }).where(eq(posts.id, id));
      },
    },

    saved: {
      find: async (userId, postId) => {
        const [row] = await db
          .select()
          .from(savedPosts)
          .where(and(eq(savedPosts.userId, userId), eq(savedPosts.postId, postId)))
          .limit(1);
        return row ?? null;
      },

      createSave: async (userId, postId) => {
        try {
          await db.insert(savedPosts).values({ userId, postId });
        } catch (error) {
          if (isUniqueViolation(error)) throw new DuplicateSaveError();
          throw error;
        }
      },

      reactivateSave: async (id) => {
        await db
          .update(savedPosts)
          .set({ deletedAt: null, savedAt: sql`now()` })
          .where(eq(savedPosts.id, id));
      },

      softDeleteSave: async (id) => {
        await db.update(savedPosts).set({ deletedAt: sql`now()` }).where(eq(savedPosts.id, id));
      },

      getPostSaveState: async (userId, postId) => {
        const [row] = await db
          .select({ savesCount, hasSaved: hasSavedFor(userId) })
          .from(posts)
          .where(eq(posts.id, postId))
          .limit(1);
        return row ?? { hasSaved: false, savesCount: 0 };
      },

      listSavedPage: async (userId, cursor, limit) => {
        const rows = await db
          .select({
            id: posts.id,
            courseId: posts.courseId,
            title: posts.title,
            body: posts.body,
            authorName: users.name,
            createdAt: posts.createdAt,
            savesCount,
            savedAt: savedPosts.savedAt,
            saveId: savedPosts.id,
          })
          .from(savedPosts)
          .innerJoin(posts, and(eq(savedPosts.postId, posts.id), isNull(posts.deletedAt)))
          .innerJoin(users, eq(posts.authorId, users.id))
          .where(and(
            eq(savedPosts.userId, userId),
            isNull(savedPosts.deletedAt),
            afterCursor(cursor, savedPosts.savedAt, savedPosts.id),
          ))
          .orderBy(desc(savedPosts.savedAt), desc(savedPosts.id))
          .limit(limit + 1);

        return toPage(
          rows,
          limit,
          ({ saveId: _saveId, savedAt, createdAt, ...rest }): SavedPostView => ({
            ...rest,
            createdAt: createdAt.toISOString(),
            savedAt: savedAt.toISOString(),
            hasSaved: true, // definitionally: these are the viewer's own active saves
          }),
          (r) => ({ ts: r.savedAt.toISOString(), id: r.saveId }),
        );
      },
    },
  };
}
