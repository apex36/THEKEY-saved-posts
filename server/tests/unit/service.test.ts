import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRepos } from '../../src/repos/memory';
import { ForumService } from '../../src/services/forum-service';
import { ALICE, BILAL, MONA, COURSE_DB, COURSE_TS, POSTS } from '../../src/db/seed-data';

const tsPost = POSTS.find((p) => p.courseId === COURSE_TS)!; // post in Alice's course
const dbPost = POSTS.find((p) => p.courseId === COURSE_DB)!; // post NOT in Alice's course

let repos: MemoryRepos;
let svc: ForumService;
beforeEach(() => {
  repos = new MemoryRepos();
  svc = new ForumService(repos);
});

describe('savePost', () => {
  it('save increments count and sets hasSaved', async () => {
    const before = await repos.saved.getPostSaveState(ALICE.id, tsPost.id);
    const after = await svc.savePost(ALICE, tsPost.id);
    expect(after).toEqual({ hasSaved: true, savesCount: before.savesCount + 1 });
  });

  it('double-save is a strict no-op: count AND savedAt unchanged', async () => {
    await svc.savePost(ALICE, tsPost.id);
    const first = repos.getRawSave(ALICE.id, tsPost.id)!;
    const firstSavedAt = first.savedAt.getTime();
    const second = await svc.savePost(ALICE, tsPost.id);
    expect(second).toEqual(await repos.saved.getPostSaveState(ALICE.id, tsPost.id));
    expect(repos.getRawSave(ALICE.id, tsPost.id)!.savedAt.getTime()).toBe(firstSavedAt);
  });

  it('re-save after un-save REACTIVATES the same row (no duplicate) and bumps savedAt', async () => {
    await svc.savePost(ALICE, tsPost.id);
    const originalRowId = repos.getRawSave(ALICE.id, tsPost.id)!.id;
    const originalSavedAt = repos.getRawSave(ALICE.id, tsPost.id)!.savedAt.getTime();
    await svc.unsavePost(ALICE, tsPost.id);
    await new Promise((r) => setTimeout(r, 5));
    await svc.savePost(ALICE, tsPost.id);
    const row = repos.getRawSave(ALICE.id, tsPost.id)!;
    expect(row.id).toBe(originalRowId);
    expect(row.deletedAt).toBeNull();
    expect(row.savedAt.getTime()).toBeGreaterThan(originalSavedAt);
    expect(repos.countRawSaves(ALICE.id, tsPost.id)).toBe(1); // never a duplicate row
  });

  it('concurrent first-save race: DuplicateSaveError is swallowed as a no-op', async () => {
    repos.failNextCreateWithDuplicate();
    const state = await svc.savePost(ALICE, tsPost.id);
    expect(state.hasSaved).toBe(true);
  });

  it('404 for a nonexistent post', async () => {
    await expect(svc.savePost(ALICE, '99999999-9999-4999-8999-999999999999'))
      .rejects.toMatchObject({ status: 404, code: 'POST_NOT_FOUND' });
  });

  it('403 for a post in a course the student is not enrolled in', async () => {
    await expect(svc.savePost(ALICE, dbPost.id))
      .rejects.toMatchObject({ status: 403, code: 'NOT_ENROLLED' });
  });

  it('moderator may save any post', async () => {
    const state = await svc.savePost(MONA, dbPost.id);
    expect(state.hasSaved).toBe(true);
  });
});

describe('unsavePost', () => {
  it('unsave soft-deletes (record preserved) and decrements count', async () => {
    await svc.savePost(ALICE, tsPost.id);
    const before = await repos.saved.getPostSaveState(ALICE.id, tsPost.id);
    const after = await svc.unsavePost(ALICE, tsPost.id);
    expect(after).toEqual({ hasSaved: false, savesCount: before.savesCount - 1 });
    expect(repos.getRawSave(ALICE.id, tsPost.id)).not.toBeNull(); // history preserved
    expect(repos.getRawSave(ALICE.id, tsPost.id)!.deletedAt).not.toBeNull();
  });

  it('unsave when never saved is a no-op, not an error', async () => {
    const state = await svc.unsavePost(ALICE, tsPost.id);
    expect(state.hasSaved).toBe(false);
  });
});

describe('getFeed / getSavedList', () => {
  it('feed is newest-first and paginates with a cursor without overlap', async () => {
    const page1 = await svc.getFeed(ALICE, COURSE_TS, undefined, 2);
    expect(page1.items.length).toBe(2);
    expect(Date.parse(page1.items[0]!.createdAt))
      .toBeGreaterThanOrEqual(Date.parse(page1.items[1]!.createdAt));
    expect(page1.nextCursor).not.toBeNull();
    const page2 = await svc.getFeed(ALICE, COURSE_TS, page1.nextCursor!, 50);
    const ids = new Set(page1.items.map((i) => i.id));
    expect(page2.items.length).toBeGreaterThan(0);
    expect(page2.items.every((i) => !ids.has(i.id))).toBe(true);
  });

  it('feed 403 for un-enrolled course, ok for moderator', async () => {
    await expect(svc.getFeed(ALICE, COURSE_DB, undefined, 10)).rejects.toMatchObject({ status: 403 });
    const modFeed = await svc.getFeed(MONA, COURSE_DB, undefined, 10);
    expect(modFeed.items.length).toBeGreaterThan(0);
  });

  it('unknown course → 404 COURSE_NOT_FOUND', async () => {
    await expect(svc.getFeed(ALICE, '88888888-8888-4888-8888-888888888888', undefined, 10))
      .rejects.toMatchObject({ status: 404, code: 'COURSE_NOT_FOUND' });
  });

  it('invalid cursor → 400 INVALID_CURSOR', async () => {
    await expect(svc.getFeed(ALICE, COURSE_TS, '!!garbage!!', 10))
      .rejects.toMatchObject({ status: 400, code: 'INVALID_CURSOR' });
  });

  it('saved list is most-recently-saved first and re-save moves post to top', async () => {
    const tsPosts = POSTS.filter((p) => p.courseId === COURSE_TS);
    const [a, b] = [tsPosts[0]!, tsPosts[1]!];
    await svc.savePost(ALICE, a.id);
    await new Promise((r) => setTimeout(r, 5));
    await svc.savePost(ALICE, b.id);
    let list = await svc.getSavedList(ALICE, undefined, 10);
    expect(list.items[0]!.id).toBe(b.id);
    await svc.unsavePost(ALICE, a.id);
    await new Promise((r) => setTimeout(r, 5));
    await svc.savePost(ALICE, a.id); // reactivation ⇒ newest save event
    list = await svc.getSavedList(ALICE, undefined, 10);
    expect(list.items[0]!.id).toBe(a.id);
  });

  it('saved list excludes soft-deleted saves and moderator-removed posts', async () => {
    await svc.savePost(ALICE, tsPost.id);
    await svc.removePost(MONA, tsPost.id);
    const list = await svc.getSavedList(ALICE, undefined, 10);
    expect(list.items.find((i) => i.id === tsPost.id)).toBeUndefined();
  });
});

describe('removePost authorization', () => {
  it('student cannot remove: 403 NOT_MODERATOR', async () => {
    await expect(svc.removePost(ALICE, tsPost.id))
      .rejects.toMatchObject({ status: 403, code: 'NOT_MODERATOR' });
  });

  it('save on a removed post → 404', async () => {
    await svc.removePost(MONA, tsPost.id);
    await expect(svc.savePost(ALICE, tsPost.id)).rejects.toMatchObject({ status: 404 });
  });
});

describe('requireUser (auth boundary)', () => {
  it('401 for missing, malformed, and unknown user ids', async () => {
    await expect(svc.requireUser(undefined)).rejects.toMatchObject({ status: 401 });
    await expect(svc.requireUser('not-a-uuid')).rejects.toMatchObject({ status: 401 });
    await expect(svc.requireUser('77777777-7777-4777-8777-777777777777')).rejects.toMatchObject({ status: 401 });
  });

  it('resolves a seeded user with role from the record', async () => {
    const user = await svc.requireUser(BILAL.id);
    expect(user).toEqual(BILAL);
  });
});
