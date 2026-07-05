import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { DEFAULT_DATABASE_URL } from './client';

const isMain = import.meta.main || (
  typeof process.argv[1] === 'string' &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
);

export async function runMigrations(
  databaseUrl = process.env['DATABASE_URL'] ?? DEFAULT_DATABASE_URL,
): Promise<void> {
  const client = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), '../../drizzle');
  try {
    await migrate(drizzle({ client }), { migrationsFolder });
  } finally {
    await client.end();
  }
}

if (isMain) {
  await runMigrations();
  console.log('migrations applied');
}
