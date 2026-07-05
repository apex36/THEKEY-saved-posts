/**
 * Integration proof against real Postgres semantics (PGlite, in-process — no
 * Docker): the committed migration applies, the unique constraint fires, and
 * the one-query hydrated-flags SQL is correct including soft-delete exclusion.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
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

beforeAll(async () => {
  const db = drizzle(new PGlite(), { schema });
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

  it('saved list: most-recently-saved first, excludes removed posts', async () => {
    const list = await repos.saved.listSavedPage(ALICE.id, null, 10);
    expect(list.items.length).toBeGreaterThanOrEqual(2);
    const times = list.items.map((i) => Date.parse(i.savedAt));
    expect([...times].sort((a, b) => b - a)).toEqual(times);

    await repos.posts.softDelete(tsPosts[1]!.id);
    const after = await repos.saved.listSavedPage(ALICE.id, null, 10);
    expect(after.items.find((i) => i.id === tsPosts[1]!.id)).toBeUndefined();
  });
});
