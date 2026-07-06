import { expect, test } from '@playwright/test';
import { reseed } from './reseed';

// Hermetic: asserts on pristine seed data (e.g. the Jun 15 post, empty saved
// list), so reseed first rather than depend on running before the mutating specs.
test.beforeAll(() => reseed());

test('course ledger visual system frames the feed as a study workspace', async ({ page }) => {
  await page.goto('/en');

  await expect(page.locator('[data-visual-system="course-ledger"]')).toBeVisible();
  await expect(page.getByText('Course ledger')).toBeVisible();
  await expect(page.getByText('Enrolled track')).toBeVisible();
  await expect(page.locator('article').first()).toHaveAttribute('data-card-style', 'ledger-entry');
  await expect(page.locator('article').first().locator('time')).toHaveText('Jun 15');

  const bodyBackground = await page.locator('body').evaluate((el) =>
    window.getComputedStyle(el).backgroundColor,
  );
  expect(bodyBackground).toBe('rgb(234, 240, 230)');
});

test('course ledger visual system gives the saved empty state a collection surface', async ({ page }) => {
  await page.goto('/en/saved');

  await expect(page.locator('[data-visual-system="course-ledger"]')).toBeVisible();
  await expect(page.getByText('Saved stack')).toBeVisible();
  await expect(page.getByText('Reading queue').first()).toBeVisible();
  await expect(page.getByText('Nothing saved yet')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Browse the feed' })).toBeVisible();
});
