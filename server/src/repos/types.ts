import type { Cursor } from '../domain/cursor';

export type Role = 'student' | 'moderator';

export interface User {
  id: string;
  name: string;
  role: Role;
}

export interface Course {
  id: string;
  title: string;
}

export interface SaveRecord {
  id: string;
  userId: string;
  postId: string;
  savedAt: Date;
  deletedAt: Date | null;
}

/** Post as rendered in feeds/saved lists — hydrated for the current viewer (doc req 4). */
export interface PostView {
  id: string;
  courseId: string;
  title: string;
  body: string;
  authorName: string;
  createdAt: string;
  hasSaved: boolean;
  savesCount: number;
}

export interface SavedPostView extends PostView {
  savedAt: string;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface SaveState {
  hasSaved: boolean;
  savesCount: number;
}

export interface PostMeta {
  id: string;
  courseId: string;
}

export const isUuid = (s: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export interface UsersRepo {
  findById(id: string): Promise<User | null>;
  listAll(): Promise<User[]>;
}

export interface CoursesRepo {
  findById(id: string): Promise<Course | null>;
  /** Moderators see every course; students only the ones they're enrolled in. */
  listForUser(user: User): Promise<Course[]>;
}

export interface EnrollmentsRepo {
  isEnrolled(userId: string, courseId: string): Promise<boolean>;
}

export interface PostsRepo {
  /** Null when the post is absent OR soft-deleted — a removed post "doesn't exist" for clients. */
  findVisibleMetaById(id: string): Promise<PostMeta | null>;
  listFeedPage(viewerId: string, courseId: string, cursor: Cursor | null, limit: number): Promise<Page<PostView>>;
  softDelete(id: string): Promise<void>;
}

/** Raised when an insert loses the (user_id, post_id) unique-constraint race. */
export class DuplicateSaveError extends Error {
  constructor() {
    super('duplicate save');
  }
}

export interface SavedRepo {
  find(userId: string, postId: string): Promise<SaveRecord | null>;
  /** Throws DuplicateSaveError if a row (active or soft-deleted) already exists for the pair. */
  createSave(userId: string, postId: string): Promise<void>;
  /** deletedAt = null, savedAt = now() — a fresh save event on the same row. */
  reactivateSave(id: string): Promise<void>;
  softDeleteSave(id: string): Promise<void>;
  getPostSaveState(userId: string, postId: string): Promise<SaveState>;
  listSavedPage(userId: string, cursor: Cursor | null, limit: number): Promise<Page<SavedPostView>>;
}

export interface Repos {
  users: UsersRepo;
  courses: CoursesRepo;
  enrollments: EnrollmentsRepo;
  posts: PostsRepo;
  saved: SavedRepo;
}
