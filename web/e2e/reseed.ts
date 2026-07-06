import { execSync } from 'node:child_process';
import { join } from 'node:path';

/**
 * Reset the database to the seed fixture. Used by globalSetup and by each spec
 * file's beforeAll so files are hermetic — no test depends on the mutations (or
 * absence of them) left behind by another file's scenarios.
 */
export function reseed(): void {
  execSync('bun run db:seed', {
    cwd: join(__dirname, '../../server'),
    stdio: 'inherit',
    env: process.env,
  });
}
