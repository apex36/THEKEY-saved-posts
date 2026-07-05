import { execSync } from 'node:child_process';
import { join } from 'node:path';

/** Reseed so every e2e run starts from the same data. */
export default function globalSetup(): void {
  execSync('bun run db:seed', {
    cwd: join(__dirname, '../../server'),
    stdio: 'inherit',
    env: process.env,
  });
}
