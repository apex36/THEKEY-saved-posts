/**
 * HTTP boundary: auth, validation, exact status codes, JSON I/O — nothing else.
 * All behaviour lives in ForumService; all rules live in the domain layer.
 */
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { ApiError, UnauthorizedError } from './errors';
import { pageQuery } from '../contracts/schemas';
import type { ForumService } from '../services/forum-service';

export function createApp(service: ForumService) {
  return new Elysia({ prefix: '/api' })
    .use(cors({ origin: /^http:\/\/localhost:\d+$/ }))
    .onError(({ error, status, code }) => {
      if (error instanceof ApiError) return status(error.status, { code: error.code });
      if (code === 'VALIDATION') return status(400, { code: 'VALIDATION' });
      if (code === 'NOT_FOUND') return status(404, { code: 'ROUTE_NOT_FOUND' });
      return status(500, { code: 'INTERNAL' });
    })
    // Auth: identity from the x-user-id header, role from the user record — never from a header.
    .resolve(async ({ headers }) => ({ actor: await service.requireUser(headers['x-user-id']) }))
    .get('/me', ({ actor }) => actor)
    .get('/users', () => service.listUsers()) // demo-only: powers the reviewer's user switcher
    .get('/courses', ({ actor }) => service.listCourses(actor))
    .get('/courses/:courseId/posts', ({ actor, params, query }) =>
      service.getFeed(actor, params.courseId, query.cursor, query.limit), { query: pageQuery })
    .post('/posts/:postId/save', ({ actor, params }) => service.savePost(actor, params.postId))
    .delete('/posts/:postId/save', ({ actor, params }) => service.unsavePost(actor, params.postId))
    .get('/me/saved', ({ actor, query }) =>
      service.getSavedList(actor, query.cursor, query.limit), { query: pageQuery })
    // Explicit Response: Node's undici rejects a 204 constructed with a body,
    // which Elysia's web-standard adapter otherwise produces (Bun is lenient).
    .delete('/posts/:postId', async ({ actor, params }) => {
      await service.removePost(actor, params.postId);
      return new Response(null, { status: 204 });
    });
}

export type App = ReturnType<typeof createApp>;

// Re-exported so the auth error type is reachable from the app module in tests.
export { UnauthorizedError };
