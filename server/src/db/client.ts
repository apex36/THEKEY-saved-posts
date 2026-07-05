import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export const DEFAULT_DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/app';

export function createDb(databaseUrl = process.env['DATABASE_URL'] ?? DEFAULT_DATABASE_URL) {
  const client = postgres(databaseUrl);
  return drizzle({ client, schema });
}

export type Db = ReturnType<typeof createDb>;
