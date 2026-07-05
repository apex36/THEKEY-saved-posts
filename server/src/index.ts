/**
 * Composition root — the only file that knows about Drizzle + Postgres.
 * Everything else sees interfaces.
 */
import { createDb } from './db/client';
import { createDrizzleRepos } from './repos/drizzle';
import { ForumService } from './services/forum-service';
import { createApp } from './http/app';

export type { App } from './http/app';

if (import.meta.main) {
  const db = createDb();
  const service = new ForumService(createDrizzleRepos(db));
  const app = createApp(service).listen(Number(process.env['PORT'] ?? 3001));
  console.log(`API on http://localhost:${app.server?.port}`);
}
