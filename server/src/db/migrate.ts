import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DEFAULT_DATABASE_URL } from './client';

export async function runMigrations(
  databaseUrl = process.env['DATABASE_URL'] ?? DEFAULT_DATABASE_URL,
): Promise<void> {
  const client = postgres(databaseUrl, { max: 1 });
  const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), '../../drizzle');
  await migrate(drizzle({ client }), { migrationsFolder });
  await client.end();
}

if (import.meta.main) {
  await runMigrations();
  console.log('migrations applied');
}
