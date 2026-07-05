import { sql } from 'drizzle-orm';
import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role', { enum: ['student', 'moderator'] }).notNull(),
});

export const courses = pgTable('courses', {
  id: uuid('id').primaryKey(),
  title: text('title').notNull(),
});

export const enrollments = pgTable('enrollments', {
  userId: uuid('user_id').notNull().references(() => users.id),
  courseId: uuid('course_id').notNull().references(() => courses.id),
}, (t) => [
  primaryKey({ columns: [t.userId, t.courseId] }),
]);

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').notNull().references(() => courses.id),
  authorId: uuid('author_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  index('posts_feed_idx').on(t.courseId, t.createdAt.desc(), t.id.desc()),
]);

export const savedPosts = pgTable('saved_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  postId: uuid('post_id').notNull().references(() => posts.id),
  savedAt: timestamp('saved_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  // ONE row per (user, post) forever — re-save reactivates it; doubles as the concurrency backstop.
  uniqueIndex('saved_posts_user_post_uq').on(t.userId, t.postId),
  index('saved_lookup_idx').on(t.userId, t.deletedAt, t.savedAt.desc()),
  index('saved_count_idx').on(t.postId).where(sql`${t.deletedAt} is null`),
]);
