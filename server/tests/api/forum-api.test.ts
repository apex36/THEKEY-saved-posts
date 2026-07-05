/**
 * API-boundary tests: the real Elysia app (auth, validation, status codes,
 * serialization) over in-memory repos. Covers every acceptance rule in the
 * assignment: 401, 403, 404, OWN, plus the happy path end to end.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/http/app';
import { ForumService } from '../../src/services/forum-service';
import { MemoryRepos } from '../../src/repos/memory';
import { ALICE, BILAL, MONA, COURSE_DB, COURSE_TS, POSTS } from '../../src/db/seed-data';

const tsPost = POSTS.find((p) => p.courseId === COURSE_TS)!;
const dbPost = POSTS.find((p) => p.courseId === COURSE_DB)!;

let app: ReturnType<typeof createApp>;
beforeEach(() => {
  app = createApp(new ForumService(new MemoryRepos()));
});

const req = (path: string, userId?: string, init?: RequestInit) =>
  app.handle(new Request(`http://localhost/api${path}`, {
    ...init,
    headers: { ...(userId ? { 'x-user-id': userId } : {}), ...(init?.headers ?? {}) },
  }));

describe('local dev CORS', () => {
  it('allows localhost and 127.0.0.1 preview origins', async () => {
    for (const origin of ['http://localhost:3000', 'http://127.0.0.1:3000']) {
      const res = await req('/me', ALICE.id, { headers: { origin } });
      expect(res.status).toBe(200);
      expect(res.headers.get('access-control-allow-origin')).toBe(origin);
    }
  });
});

describe('401 — unauthenticated request to any endpoint (doc rule 1)', () => {
  it('missing x-user-id header — every route', async () => {
    for (const path of ['/me', '/users', '/courses', `/courses/${COURSE_TS}/posts`, '/me/saved']) {
      expect((await req(path)).status).toBe(401);
    }
    expect((await req(`/posts/${tsPost.id}/save`, undefined, { method: 'POST' })).status).toBe(401);
    expect((await req(`/posts/${tsPost.id}/save`, undefined, { method: 'DELETE' })).status).toBe(401);
    expect((await req(`/posts/${tsPost.id}`, undefined, { method: 'DELETE' })).status).toBe(401);
  });

  it('unknown user id', async () => {
    const res = await req('/me', '00000000-0000-4000-8000-00000000dead');
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ code: 'UNAUTHENTICATED' });
  });

  it('malformed user id through the HTTP layer', async () => {
    expect((await req('/me', 'not-a-uuid')).status).toBe(401);
  });
});

describe('403 — enrollment/role boundary (doc rule 2)', () => {
  it('student reading a feed of an un-enrolled course', async () => {
    const res = await req(`/courses/${COURSE_DB}/posts`, ALICE.id);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ code: 'NOT_ENROLLED' });
  });

  it('student saving a post in an un-enrolled course', async () => {
    expect((await req(`/posts/${dbPost.id}/save`, ALICE.id, { method: 'POST' })).status).toBe(403);
  });

  it('student attempting a moderator remove', async () => {
    const res = await req(`/posts/${tsPost.id}`, ALICE.id, { method: 'DELETE' });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ code: 'NOT_MODERATOR' });
  });
});

describe('404 — post that does not exist (doc rule 3)', () => {
  it('well-formed unknown id', async () => {
    expect((await req('/posts/99999999-9999-4999-8999-999999999999/save', ALICE.id, { method: 'POST' })).status).toBe(404);
  });

  it('malformed id also "does not exist" — 404, not 400/500', async () => {
    expect((await req('/posts/not-a-uuid/save', ALICE.id, { method: 'POST' })).status).toBe(404);
  });

  it('unknown course feed', async () => {
    expect((await req('/courses/88888888-8888-4888-8888-888888888888/posts', ALICE.id)).status).toBe(404);
  });

  it('404 beats 403: a student removing a NONEXISTENT post gets 404, not NOT_MODERATOR', async () => {
    // Existence is checked before the role gate — the response must not leak
    // "you're not a moderator" for a resource that doesn't exist.
    const res = await req('/posts/99999999-9999-4999-8999-999999999999', ALICE.id, { method: 'DELETE' });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ code: 'POST_NOT_FOUND' });
  });

  it('404 beats 403: a malformed id on moderator remove is 404, not 403', async () => {
    expect((await req('/posts/not-a-uuid', ALICE.id, { method: 'DELETE' })).status).toBe(404);
  });
});

describe('OWN — saved list isolation (doc rule 4)', () => {
  it("Bilal's saves never appear in Alice's list; the route carries no user parameter", async () => {
    await req(`/posts/${dbPost.id}/save`, BILAL.id, { method: 'POST' });
    const alice = await (await req('/me/saved', ALICE.id)).json() as { items: { id: string }[] };
    expect(alice.items.find((i) => i.id === dbPost.id)).toBeUndefined();
    const bilal = await (await req('/me/saved', BILAL.id)).json() as { items: { id: string }[] };
    expect(bilal.items.find((i) => i.id === dbPost.id)).toBeDefined();
  });
});

describe('happy path (doc reqs 3, 4, 5)', () => {
  it('save → hydrated flags → first in saved list → idempotent repeat → un-save', async () => {
    const save = await req(`/posts/${tsPost.id}/save`, ALICE.id, { method: 'POST' });
    expect(save.status).toBe(200);
    const state = await save.json() as { hasSaved: boolean; savesCount: number };
    expect(state.hasSaved).toBe(true);
    expect(state.savesCount).toBeGreaterThanOrEqual(1);

    const again = await (await req(`/posts/${tsPost.id}/save`, ALICE.id, { method: 'POST' })).json();
    expect(again).toEqual(state); // idempotent: no error, no double-count

    const feed = await (await req(`/courses/${COURSE_TS}/posts`, ALICE.id)).json() as {
      items: { id: string; hasSaved: boolean; savesCount: number }[];
    };
    const inFeed = feed.items.find((i) => i.id === tsPost.id)!;
    expect(inFeed.hasSaved).toBe(true);
    expect(inFeed.savesCount).toBe(state.savesCount);

    const saved = await (await req('/me/saved', ALICE.id)).json() as { items: { id: string }[] };
    expect(saved.items[0]!.id).toBe(tsPost.id); // most-recently-saved first

    const unsave = await req(`/posts/${tsPost.id}/save`, ALICE.id, { method: 'DELETE' });
    expect(unsave.status).toBe(200);
    expect(((await unsave.json()) as { hasSaved: boolean }).hasSaved).toBe(false);
  });

  it('moderator reads any course and removes a post (204; saving it then 404s)', async () => {
    expect((await req(`/courses/${COURSE_DB}/posts`, MONA.id)).status).toBe(200);
    expect((await req(`/posts/${tsPost.id}`, MONA.id, { method: 'DELETE' })).status).toBe(204);
    expect((await req(`/posts/${tsPost.id}/save`, ALICE.id, { method: 'POST' })).status).toBe(404);
  });

  it('feed pagination: newest-first, limit respected, cursor walks without overlap, invalid inputs 400', async () => {
    const p1 = await (await req(`/courses/${COURSE_TS}/posts?limit=2`, ALICE.id)).json() as {
      items: { id: string; createdAt: string }[]; nextCursor: string | null;
    };
    expect(p1.items.length).toBe(2);
    expect(Date.parse(p1.items[0]!.createdAt)).toBeGreaterThanOrEqual(Date.parse(p1.items[1]!.createdAt));
    expect(p1.nextCursor).toBeTruthy();
    const p2 = await (await req(`/courses/${COURSE_TS}/posts?limit=50&cursor=${encodeURIComponent(p1.nextCursor!)}`, ALICE.id)).json() as {
      items: { id: string }[];
    };
    expect(p2.items.length).toBeGreaterThan(0);
    const seen = new Set(p1.items.map((i) => i.id));
    expect(p2.items.every((i) => !seen.has(i.id))).toBe(true);

    expect((await req(`/courses/${COURSE_TS}/posts?cursor=%21%21bad`, ALICE.id)).status).toBe(400);
    expect((await req(`/courses/${COURSE_TS}/posts?limit=999`, ALICE.id)).status).toBe(400);
  });

  it('saved list pagination: cursor walks most-recently-saved first without overlap', async () => {
    const tsPosts = POSTS.filter((p) => p.courseId === COURSE_TS);
    for (const post of tsPosts.slice(0, 3)) {
      await req(`/posts/${post.id}/save`, ALICE.id, { method: 'POST' });
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    const p1 = await (await req('/me/saved?limit=2', ALICE.id)).json() as {
      items: { id: string; savedAt: string }[]; nextCursor: string | null;
    };
    expect(p1.items.length).toBe(2);
    expect(Date.parse(p1.items[0]!.savedAt)).toBeGreaterThanOrEqual(Date.parse(p1.items[1]!.savedAt));
    expect(p1.nextCursor).toBeTruthy();
    const p2 = await (await req(`/me/saved?limit=50&cursor=${encodeURIComponent(p1.nextCursor!)}`, ALICE.id)).json() as {
      items: { id: string }[];
    };
    expect(p2.items.length).toBeGreaterThan(0);
    const seen = new Set(p1.items.map((i) => i.id));
    expect(p2.items.every((i) => !seen.has(i.id))).toBe(true);
  });

  it('GET /me returns the acting identity with its server-side role', async () => {
    const me = await (await req('/me', MONA.id)).json();
    expect(me).toEqual(MONA);
  });
});
