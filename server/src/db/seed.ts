/**
 * Idempotent reseed: applies migrations, wipes in FK order, inserts fixtures.
 * Includes one soft-deleted save (Alice → p03) so reactivation/history is
 * demonstrable from the very first run.
 */
import { createDb } from './client';
import { runMigrations } from './migrate';
import { courses, enrollments, posts, savedPosts, users } from './schema';
import { POSTS, PRE_SAVES, SEED_COURSES, SEED_ENROLLMENTS, SEED_USERS } from './seed-data';

await runMigrations();
const db = createDb();

await db.delete(savedPosts);
await db.delete(posts);
await db.delete(enrollments);
await db.delete(courses);
await db.delete(users);

await db.insert(users).values([...SEED_USERS]);
await db.insert(courses).values([...SEED_COURSES]);
await db.insert(enrollments).values([...SEED_ENROLLMENTS]);
await db.insert(posts).values(POSTS.map((p) => ({ ...p, createdAt: new Date(p.createdAt) })));
await db.insert(savedPosts).values(PRE_SAVES.map((s) => ({
  ...s,
  savedAt: new Date(s.savedAt),
  deletedAt: s.deletedAt ? new Date(s.deletedAt) : null,
})));

console.log(
  `seeded: ${SEED_USERS.length} users, ${SEED_COURSES.length} courses, ` +
  `${POSTS.length} posts, ${PRE_SAVES.length} saves (1 soft-deleted)`,
);
process.exit(0);
