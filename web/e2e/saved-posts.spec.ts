/**
 * Live UI/UX verification, mapped requirement-by-requirement to the take-home
 * doc. Runs serially against the seeded stack; each test names the doc rows it
 * proves. Identities come from the header switcher (stubbed auth).
 */
import { expect, test, type Page } from '@playwright/test';
import { DEMO_USERS } from '../src/lib/demo-users';

const [ALICE, BILAL, CHEN, MONA] = DEMO_USERS as [
  (typeof DEMO_USERS)[number], (typeof DEMO_USERS)[number],
  (typeof DEMO_USERS)[number], (typeof DEMO_USERS)[number],
];

const userSwitcher = (page: Page) => page.getByLabel(/Viewing as|تتصفح بهوية/);

const switchTo = async (page: Page, userId: string) => {
  await userSwitcher(page).selectOption(userId);
};

test('req 2 + 4: feed shows only the enrolled course, newest first, with hydrated saves counts', async ({ page }) => {
  await page.goto('/en');

  // Alice is enrolled in TypeScript 101 only — no Databases 201 tab exists.
  await expect(page.getByRole('tab', { name: 'TypeScript 101' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Databases 201' })).toHaveCount(0);

  // Newest first: p15 (2026-06-15) leads the TypeScript course.
  await expect(page.locator('article h3').first()).toHaveText('The case for readonly everywhere');

  // One page = 5 cards, each carrying a pluralized saves count (hydrated flags).
  await expect(page.locator('article')).toHaveCount(5);
  await expect(page.locator('article').first().getByRole('button', { name: 'Save post' }))
    .toContainText('0 saves');

  // Students never see the moderator affordance.
  await expect(page.getByRole('button', { name: 'Remove post' })).toHaveCount(0);
});

test('req 2 + 5: Load more walks the cursor without duplicating posts', async ({ page }) => {
  await page.goto('/en');
  await expect(page.locator('article')).toHaveCount(5);

  await page.getByRole('button', { name: 'Load more' }).click();
  await expect(page.locator('article')).toHaveCount(8); // all 8 TypeScript posts

  const titles = await page.locator('article h3').allTextContents();
  expect(new Set(titles).size).toBe(titles.length); // keyset cursor: no overlap

  await expect(page.getByRole('button', { name: 'Load more' })).toHaveCount(0);
});

test('req 3 + 5 + 7: empty state → optimistic save → first in Saved → un-save → empty again', async ({ page }) => {
  const intlFallbacks: string[] = [];
  page.on('console', (message) => {
    const text = message.text();
    if (text.includes('ENVIRONMENT_FALLBACK')) intlFallbacks.push(text);
  });

  // Alice starts with no ACTIVE saves (her seeded save is soft-deleted) — empty state.
  await page.goto('/en/saved');
  await expect(page.getByText('Nothing saved yet')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Browse the feed' })).toBeVisible();

  // Save the newest post from the feed; the toggle flips instantly (optimistic).
  await page.goto('/en');
  const card = page.locator('article').filter({ hasText: 'The case for readonly everywhere' });
  await card.getByRole('button', { name: 'Save post' }).click();
  const toggled = card.getByRole('button', { name: 'Remove from saved' });
  await expect(toggled).toHaveAttribute('aria-pressed', 'true');
  await expect(toggled).toContainText('1 save');

  // Most-recently-saved first in the Saved view, with the saved-at caption.
  await page.getByRole('link', { name: 'Saved' }).click();
  await expect(page.locator('article h3').first()).toHaveText('The case for readonly everywhere');
  await expect(page.getByText(/^Saved /).first()).toBeVisible();
  expect(intlFallbacks).toEqual([]);

  // Un-save from the Saved view: card leaves the list, empty state returns.
  await page.getByRole('button', { name: 'Remove from saved' }).click();
  await expect(page.getByText('Nothing saved yet')).toBeVisible();
});

test('OWN rule + role scoping: saved lists never leak across identities', async ({ page }) => {
  // Alice saves a post…
  await page.goto('/en');
  await page.getByRole('button', { name: 'Load more' }).click();
  const aliceCard = page.locator('article').filter({ hasText: 'Errors as values vs exceptions' });
  await aliceCard.getByRole('button', { name: 'Save post' }).click();
  await expect(aliceCard.getByRole('button', { name: 'Remove from saved' })).toBeVisible();

  // …Chen's saved list must not contain it, but does contain Chen's own seeded saves.
  await switchTo(page, CHEN.id);
  await page.getByRole('link', { name: 'Saved' }).click();
  await expect(page.getByText('Narrowing unions without pain')).toBeVisible();
  await expect(page.getByText('Errors as values vs exceptions')).toHaveCount(0);

  // Bilal sees only his course — the TypeScript tab is gone entirely.
  await switchTo(page, BILAL.id);
  await expect(page.getByRole('tab', { name: 'Databases 201' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'TypeScript 101' })).toHaveCount(0);
});

test('roles: moderator reads every course and removes a post everywhere', async ({ page }) => {
  await page.goto('/en');
  await switchTo(page, MONA.id);

  // Cross-course read: both tabs for the moderator.
  await expect(page.getByRole('tab', { name: 'TypeScript 101' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Databases 201' })).toBeVisible();

  // Remove the newest TypeScript post — it disappears from the feed (soft delete).
  const target = page.locator('article').filter({ hasText: 'The case for readonly everywhere' });
  await target.getByRole('button', { name: 'Remove post' }).click();
  await expect(page.getByText('The case for readonly everywhere')).toHaveCount(0);

  // Back as Alice the post stays gone — removal is global, not per-viewer.
  await switchTo(page, ALICE.id);
  await expect(page.locator('article h3').first()).toHaveText('Errors as values vs exceptions');
});

test('req 8: Arabic locale renders RTL with catalog strings and correct plural categories', async ({ page }) => {
  await page.goto('/ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.getByRole('heading', { name: 'منتدى المقررات' })).toBeVisible();

  // Alice's TypeScript feed, second page, holds the 1-save and 0-save fixtures:
  await page.getByRole('button', { name: 'عرض المزيد' }).click();
  await expect(page.getByText('عملية حفظ واحدة')).toBeVisible(); // one  (p01: 1 save)
  await expect(page.getByText('لا عمليات حفظ').first()).toBeVisible(); // zero (p03: 0 saves)

  // Chen can open Databases 201, where p02 carries exactly two saves — the dual form.
  await switchTo(page, CHEN.id);
  await page.getByRole('tab', { name: 'Databases 201' }).click();
  await expect(page.getByText('عمليتا حفظ')).toBeVisible(); // two (dual)

  // Locale switcher returns to English and the document flips to LTR.
  await page.getByLabel('العربية').selectOption('en');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
});
