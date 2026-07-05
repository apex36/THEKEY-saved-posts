import { join } from 'node:path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const config: NextConfig = {
  // Bun-workspace monorepo has multiple lockfile candidates; pin the root so
  // Turbopack resolves from the workspace root deterministically.
  turbopack: { root: join(__dirname, '..') },
};

export default withNextIntl(config);
