/**
 * Orchestration layer: authorize → decide (pure domain) → apply (repo primitive).
 * Owns the status-code order (401 → 404 → 403) and the concurrency posture:
 * the DB unique constraint is the backstop; a lost first-save race is the
 * logical no-op idempotency promises.
 */
import { decideSave, decideUnsave } from '../domain/saved-posts';
import { decodeCursor, type Cursor } from '../domain/cursor';
import {
  BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError,
} from '../http/errors';
import {
  DuplicateSaveError, isUuid,
  type Course, type Page, type PostMeta, type PostView, type Repos,
  type SaveState, type SavedPostView, type User,
} from '../repos/types';

export class ForumService {
  constructor(private readonly repos: Repos) {}

  /** 401 for a missing, malformed, or unknown id. Role always comes from the record. */
  async requireUser(userId: string | undefined): Promise<User> {
    if (!userId || !isUuid(userId)) throw new UnauthorizedError();
    const user = await this.repos.users.findById(userId);
    if (!user) throw new UnauthorizedError();
    return user;
  }

  listUsers(): Promise<User[]> {
    return this.repos.users.listAll();
  }

  listCourses(actor: User): Promise<Course[]> {
    return this.repos.courses.listForUser(actor);
  }

  async getFeed(actor: User, courseId: string, cursor: string | undefined, limit: number): Promise<Page<PostView>> {
    if (!isUuid(courseId)) throw new NotFoundError('COURSE_NOT_FOUND');
    const course = await this.repos.courses.findById(courseId);
    if (!course) throw new NotFoundError('COURSE_NOT_FOUND');
    await this.assertCanAccessCourse(actor, courseId);
    return this.repos.posts.listFeedPage(actor.id, courseId, this.decodeCursorOr400(cursor), limit);
  }

  async savePost(actor: User, postId: string): Promise<SaveState> {
    await this.requireVisiblePost(actor, postId);
    const existing = await this.repos.saved.find(actor.id, postId);
    const action = decideSave(existing);
    if (action === 'create') {
      try {
        await this.repos.saved.createSave(actor.id, postId);
      } catch (error) {
        // Lost the unique-constraint race: the save exists, which is exactly
        // what this request wanted — idempotency holds under concurrency.
        if (!(error instanceof DuplicateSaveError)) throw error;
      }
    } else if (action === 'reactivate' && existing) {
      await this.repos.saved.reactivateSave(existing.id);
    }
    return this.repos.saved.getPostSaveState(actor.id, postId);
  }

  async unsavePost(actor: User, postId: string): Promise<SaveState> {
    await this.requireVisiblePost(actor, postId);
    const existing = await this.repos.saved.find(actor.id, postId);
    if (decideUnsave(existing) === 'softDelete' && existing) {
      await this.repos.saved.softDeleteSave(existing.id);
    }
    return this.repos.saved.getPostSaveState(actor.id, postId);
  }

  /** Own-only by construction: the caller's identity is the only user id in play. */
  getSavedList(actor: User, cursor: string | undefined, limit: number): Promise<Page<SavedPostView>> {
    return this.repos.saved.listSavedPage(actor.id, this.decodeCursorOr400(cursor), limit);
  }

  async removePost(actor: User, postId: string): Promise<void> {
    if (!isUuid(postId)) throw new NotFoundError('POST_NOT_FOUND');
    const post = await this.repos.posts.findVisibleMetaById(postId);
    if (!post) throw new NotFoundError('POST_NOT_FOUND');
    if (actor.role !== 'moderator') throw new ForbiddenError('NOT_MODERATOR');
    await this.repos.posts.softDelete(postId);
  }

  // ── private ───────────────────────────────────────────────────────────────

  /** 404 before 403: a missing/removed/malformed-id post "doesn't exist" regardless of enrollment. */
  private async requireVisiblePost(actor: User, postId: string): Promise<PostMeta> {
    if (!isUuid(postId)) throw new NotFoundError('POST_NOT_FOUND');
    const post = await this.repos.posts.findVisibleMetaById(postId);
    if (!post) throw new NotFoundError('POST_NOT_FOUND');
    await this.assertCanAccessCourse(actor, post.courseId);
    return post;
  }

  private async assertCanAccessCourse(actor: User, courseId: string): Promise<void> {
    if (actor.role === 'moderator') return; // doc: moderators see any post across courses
    if (!(await this.repos.enrollments.isEnrolled(actor.id, courseId))) {
      throw new ForbiddenError('NOT_ENROLLED');
    }
  }

  private decodeCursorOr400(cursor: string | undefined): Cursor | null {
    if (cursor === undefined) return null;
    const decoded = decodeCursor(cursor);
    if (!decoded) throw new BadRequestError('INVALID_CURSOR');
    return decoded;
  }
}
