/**
 * Integration proof against real Postgres semantics (PGlite, in-process — no
 * Docker): the committed migration applies, the unique constraint fires, and
 * the one-query hydrated-flags SQL is correct including soft-delete exclusion.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as schema from '../../src/db/schema';
import { createDrizzleRepos } from '../../src/repos/drizzle';
import { decodeCursor } from '../../src/domain/cursor';
import { DuplicateSaveError, type Repos } from '../../src/repos/types';
import {
  ALICE, CHEN, COURSE_TS, POSTS, SEED_COURSES, SEED_ENROLLMENTS, SEED_USERS,
} from '../../src/db/seed-data';

const tsPosts = POSTS.filter((p) => p.courseId === COURSE_TS);

let repos: Repos;
let db: PgliteDatabase<typeof schema>;

beforeAll(async () => {
  db = drizzle(new PGlite(), { schema });
  const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), '../../drizzle');
  await migrate(db, { migrationsFolder });
  await db.insert(schema.users).values([...SEED_USERS]);
  await db.insert(schema.courses).values([...SEED_COURSES]);
  await db.insert(schema.enrollments).values([...SEED_ENROLLMENTS]);
  await db.insert(schema.posts).values(POSTS.map((p) => ({ ...p, createdAt: new Date(p.createdAt) })));
  repos = createDrizzleRepos(db);
});

describe('UNIQUE(user_id, post_id) — real constraint semantics', () => {
  it('duplicate insert surfaces as DuplicateSaveError', async () => {
    await repos.saved.createSave(ALICE.id, tsPosts[0]!.id);
    await expect(repos.saved.createSave(ALICE.id, tsPosts[0]!.id))
      .rejects.toBeInstanceOf(DuplicateSaveError);
  });

  it('reactivation reuses the same row and bumps savedAt', async () => {
    const before = await repos.saved.find(ALICE.id, tsPosts[0]!.id);
    expect(before).not.toBeNull();
    await repos.saved.softDeleteSave(before!.id);
    await repos.saved.reactivateSave(before!.id);
    const after = await repos.saved.find(ALICE.id, tsPosts[0]!.id);
    expect(after!.id).toBe(before!.id);
    expect(after!.deletedAt).toBeNull();
    expect(after!.savedAt.getTime()).toBeGreaterThanOrEqual(before!.savedAt.getTime());
  });
});

describe('hydrated flags in one query', () => {
  it('savesCount counts only ACTIVE saves; hasSaved is viewer-scoped; both are real numbers/booleans', async () => {
    await repos.saved.createSave(CHEN.id, tsPosts[1]!.id);
    const chenRow = await repos.saved.find(CHEN.id, tsPosts[1]!.id);
    await repos.saved.softDeleteSave(chenRow!.id); // soft-deleted ⇒ must not count
    await repos.saved.createSave(ALICE.id, tsPosts[1]!.id);

    const page = await repos.posts.listFeedPage(ALICE.id, COURSE_TS, null, 50);
    const row = page.items.find((i) => i.id === tsPosts[1]!.id)!;
    expect(row.savesCount).toBe(1);
    expect(typeof row.savesCount).toBe('number'); // mapWith(Number) — PG count is a string otherwise
    expect(row.hasSaved).toBe(true);
    expect(typeof row.hasSaved).toBe('boolean');

    const chenView = await repos.posts.listFeedPage(CHEN.id, COURSE_TS, null, 50);
    expect(chenView.items.find((i) => i.id === tsPosts[1]!.id)!.hasSaved).toBe(false);
  });

  it('feed keyset pagination: newest-first, stable, no overlap', async () => {
    const p1 = await repos.posts.listFeedPage(ALICE.id, COURSE_TS, null, 2);
    expect(p1.items.length).toBe(2);
    expect(Date.parse(p1.items[0]!.createdAt)).toBeGreaterThanOrEqual(Date.parse(p1.items[1]!.createdAt));
    expect(p1.nextCursor).not.toBeNull();
    const p2 = await repos.posts.listFeedPage(ALICE.id, COURSE_TS, decodeCursor(p1.nextCursor!), 50);
    const seen = new Set(p1.items.map((i) => i.id));
    expect(p2.items.length).toBeGreaterThan(0);
    expect(p2.items.every((i) => !seen.has(i.id))).toBe(true);
  });

  it('saved list: most-recently-saved first, hydrated flags correct, excludes removed posts', async () => {
    const list = await repos.saved.listSavedPage(ALICE.id, null, 10);
    expect(list.items.length).toBeGreaterThanOrEqual(2);
    const times = list.items.map((i) => Date.parse(i.savedAt));
    expect([...times].sort((a, b) => b - a)).toEqual(times);

    // hydrated flags inside the saved list itself (doc req 4 covers BOTH lists):
    // tsPosts[1] has Alice active + Chen soft-deleted ⇒ count 1, and it's Alice's own save.
    const hydrated = list.items.find((i) => i.id === tsPosts[1]!.id)!;
    expect(hydrated.savesCount).toBe(1);
    expect(hydrated.hasSaved).toBe(true);

    await repos.posts.softDelete(tsPosts[1]!.id);
    const after = await repos.saved.listSavedPage(ALICE.id, null, 10);
    expect(after.items.find((i) => i.id === tsPosts[1]!.id)).toBeUndefined();
  });

  it('millisecond-precision cursor: two saves in the same ms both survive limit-1 pagination (F2 regression)', async () => {
    // A fresh user with exactly two saves whose saved_at differ ONLY below the
    // millisecond — the precision the app/cursor never carry. With timestamptz(3)
    // both truncate to the same stored ms, so the keyset falls back to the id
    // tiebreak instead of a sub-ms boundary the ms cursor cannot represent.
    // On a µs column, the row between the ms-floor and the cursor's µs would be
    // matched by neither the `lt` nor the `eq` branch and vanish forever.
    const DANA = { id: '00000000-0000-4000-8000-0000000da4a0', name: 'Dana', role: 'student' as const };
    await db.insert(schema.users).values(DANA);
    const [pa, pb] = [tsPosts[2]!, tsPosts[3]!];
    await db.insert(schema.savedPosts).values([
      { userId: DANA.id, postId: pa.id, savedAt: sql`'2026-06-01T00:00:00.123400Z'::timestamptz` },
      { userId: DANA.id, postId: pb.id, savedAt: sql`'2026-06-01T00:00:00.123800Z'::timestamptz` },
    ]);

    const collected: string[] = [];
    let cursor: ReturnType<typeof decodeCursor> = null;
    for (let i = 0; i < 5; i++) {
      const page = await repos.saved.listSavedPage(DANA.id, cursor, 1);
      collected.push(...page.items.map((it) => it.id));
      if (!page.nextCursor) break;
      cursor = decodeCursor(page.nextCursor);
    }
    expect(collected).toContain(pa.id); // neither row dropped across the cursor boundary
    expect(collected).toContain(pb.id);
    expect(new Set(collected).size).toBe(collected.length); // and none duplicated
  });
});
