import { defineConfig } from '@playwright/test';

/**
 * E2E suite against a RUNNING stack (API :3001 + web :3000 + seeded DB).
 * Tests mutate data; globalSetup reseeds so every run starts deterministic.
 * Serial on purpose — the suite walks stateful scenarios in order.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: process.env['E2E_BASE_URL'] ?? 'http://localhost:3000',
  },
  reporter: [['list']],
});
