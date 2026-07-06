/**
 * In-memory Repos implementation. Mirrors the database contract exactly —
 * including the (user_id, post_id) uniqueness rule — so the service layer and
 * API can be tested from a clean checkout with no infrastructure.
 */
import { randomUUID } from 'node:crypto';
import type { Cursor } from '../domain/cursor';
import { toPage } from './pagination';
import {
  DuplicateSaveError,
  type Course,
  type CoursesRepo,
  type EnrollmentsRepo,
  type Page,
  type PostMeta,
  type PostView,
  type PostsRepo,
  type Repos,
  type SaveRecord,
  type SaveState,
  type SavedPostView,
  type SavedRepo,
  type User,
  type UsersRepo,
} from './types';
import {
  POSTS, PRE_SAVES, SEED_COURSES, SEED_ENROLLMENTS, SEED_USERS,
  type SeedPost, type SeedSave, type SeedUser,
} from '../db/seed-data';

interface MemoryPost {
  id: string;
  courseId: string;
  authorId: string;
  title: string;
  body: string;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface MemoryFixtures {
  users?: SeedUser[];
  courses?: Course[];
  enrollments?: { userId: string; courseId: string }[];
  posts?: SeedPost[];
  saves?: SeedSave[];
}

export class MemoryRepos implements Repos {
  private readonly usersData: User[];
  private readonly coursesData: Course[];
  private readonly enrollmentsData: { userId: string; courseId: string }[];
  private readonly postsData: MemoryPost[];
  private readonly savesData: SaveRecord[];
  private duplicateOnNextCreate = false;

  constructor(fixtures: MemoryFixtures = {}) {
    this.usersData = (fixtures.users ?? SEED_USERS).map((u) => ({ ...u }));
    this.coursesData = (fixtures.courses ?? SEED_COURSES).map((c) => ({ ...c }));
    this.enrollmentsData = (fixtures.enrollments ?? SEED_ENROLLMENTS).map((e) => ({ ...e }));
    this.postsData = (fixtures.posts ?? POSTS).map((p) => ({
      ...p,
      createdAt: new Date(p.createdAt),
      deletedAt: null,
    }));
    this.savesData = (fixtures.saves ?? PRE_SAVES).map((s) => ({
      id: s.id,
      userId: s.userId,
      postId: s.postId,
      savedAt: new Date(s.savedAt),
      deletedAt: s.deletedAt ? new Date(s.deletedAt) : null,
    }));
  }

  // ── test hooks ────────────────────────────────────────────────────────────
  /** Simulate losing the unique-constraint race: the winner's row lands, our insert throws. */
  failNextCreateWithDuplicate(): void {
    this.duplicateOnNextCreate = true;
  }

  getRawSave(userId: string, postId: string): SaveRecord | null {
    return this.savesData.find((s) => s.userId === userId && s.postId === postId) ?? null;
  }

  countRawSaves(userId: string, postId: string): number {
    return this.savesData.filter((s) => s.userId === userId && s.postId === postId).length;
  }

  // ── repos ─────────────────────────────────────────────────────────────────
  readonly users: UsersRepo = {
    findById: async (id) => this.usersData.find((u) => u.id === id) ?? null,
    listAll: async () => [...this.usersData],
  };

  readonly courses: CoursesRepo = {
    findById: async (id) => this.coursesData.find((c) => c.id === id) ?? null,
    listForUser: async (user) => {
      if (user.role === 'moderator') return [...this.coursesData];
      const enrolled = new Set(
        this.enrollmentsData.filter((e) => e.userId === user.id).map((e) => e.courseId),
      );
      return this.coursesData.filter((c) => enrolled.has(c.id));
    },
  };

  readonly enrollments: EnrollmentsRepo = {
    isEnrolled: async (userId, courseId) =>
      this.enrollmentsData.some((e) => e.userId === userId && e.courseId === courseId),
  };

  readonly posts: PostsRepo = {
    findVisibleMetaById: async (id): Promise<PostMeta | null> => {
      const post = this.postsData.find((p) => p.id === id && p.deletedAt === null);
      return post ? { id: post.id, courseId: post.courseId } : null;
    },

    listFeedPage: async (viewerId, courseId, cursor, limit) => {
      const rows = this.postsData
        .filter((p) => p.courseId === courseId && p.deletedAt === null)
        .sort(byTsIdDesc((p) => p.createdAt, (p) => p.id))
        .filter(afterCursor(cursor, (p) => p.createdAt, (p) => p.id));
      return toPage(rows, limit, (p) => this.toPostView(p, viewerId), (p) => ({
        ts: p.createdAt.toISOString(),
        id: p.id,
      }));
    },

    softDelete: async (id) => {
      const post = this.postsData.find((p) => p.id === id);
      if (post) post.deletedAt = new Date();
    },
  };

  readonly saved: SavedRepo = {
    find: async (userId, postId) => this.getRawSave(userId, postId),

    createSave: async (userId, postId) => {
      if (this.duplicateOnNextCreate) {
        this.duplicateOnNextCreate = false;
        // the concurrent winner's row is already in place
        if (!this.getRawSave(userId, postId)) {
          this.savesData.push({ id: randomUUID(), userId, postId, savedAt: new Date(), deletedAt: null });
        }
        throw new DuplicateSaveError();
      }
      if (this.getRawSave(userId, postId)) throw new DuplicateSaveError();
      this.savesData.push({ id: randomUUID(), userId, postId, savedAt: new Date(), deletedAt: null });
    },

    reactivateSave: async (id) => {
      const save = this.savesData.find((s) => s.id === id);
      if (save) {
        save.deletedAt = null;
        save.savedAt = new Date();
      }
    },

    softDeleteSave: async (id) => {
      const save = this.savesData.find((s) => s.id === id);
      if (save) save.deletedAt = new Date();
    },

    getPostSaveState: async (userId, postId): Promise<SaveState> =>
      this.saveStateFor(postId, userId),

    listSavedPage: async (userId, cursor, limit) => {
      const visiblePostIds = new Set(
        this.postsData.filter((p) => p.deletedAt === null).map((p) => p.id),
      );
      const rows = this.savesData
        .filter((s) => s.userId === userId && s.deletedAt === null && visiblePostIds.has(s.postId))
        .sort(byTsIdDesc((s) => s.savedAt, (s) => s.id))
        .filter(afterCursor(cursor, (s) => s.savedAt, (s) => s.id));
      return toPage(
        rows,
        limit,
        (s): SavedPostView => ({
          ...this.toPostView(this.postsData.find((p) => p.id === s.postId)!, userId),
          savedAt: s.savedAt.toISOString(),
        }),
        (s) => ({ ts: s.savedAt.toISOString(), id: s.id }),
      );
    },
  };

  // ── helpers ───────────────────────────────────────────────────────────────
  private toPostView(post: MemoryPost, viewerId: string): PostView {
    return {
      id: post.id,
      courseId: post.courseId,
      title: post.title,
      body: post.body,
      authorName: this.usersData.find((u) => u.id === post.authorId)?.name ?? 'Unknown',
      createdAt: post.createdAt.toISOString(),
      ...this.saveStateFor(post.id, viewerId),
    };
  }

  /** hasSaved + savesCount for one post in a single pass over the saves. */
  private saveStateFor(postId: string, viewerId: string): SaveState {
    let savesCount = 0;
    let hasSaved = false;
    for (const s of this.savesData) {
      if (s.postId === postId && s.deletedAt === null) {
        savesCount += 1;
        if (s.userId === viewerId) hasSaved = true;
      }
    }
    return { hasSaved, savesCount };
  }

}

const byTsIdDesc = <Row>(ts: (r: Row) => Date, id: (r: Row) => string) =>
  (a: Row, b: Row): number =>
    ts(b).getTime() - ts(a).getTime() || id(b).localeCompare(id(a));

const afterCursor = <Row>(cursor: Cursor | null, ts: (r: Row) => Date, id: (r: Row) => string) =>
  (row: Row): boolean => {
    if (!cursor) return true;
    const cursorTime = Date.parse(cursor.ts);
    const rowTime = ts(row).getTime();
    return rowTime < cursorTime || (rowTime === cursorTime && id(row) < cursor.id);
  };
