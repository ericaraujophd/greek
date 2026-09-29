/**
 * Smoke test: every screen renders, each drill accepts an answer, and
 * progress is saved to localStorage. Screenshots land in test-results/
 * for a quick visual check.
 */
import { expect, test } from '@playwright/test';

test('home, alphabet hub and learn screen render', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Suggested session' })).toBeVisible();
  await page.screenshot({ path: 'test-results/home.png', fullPage: true });
  await page.goto('./#/alphabet');
  await expect(page.getByRole('heading', { name: 'The alphabet' })).toBeVisible();
  await page.screenshot({ path: 'test-results/hub.png', fullPage: true });
  await page.goto('./#/alphabet/learn');
  await page.getByRole('button', { name: 'lambda' }).click();
  await expect(page.getByText('l as in law')).toBeVisible();
  await page.screenshot({ path: 'test-results/learn.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('flashcards: reveal and rate saves a card', async ({ page }) => {
  await page.goto('./#/alphabet/cards');
  await page.getByRole('button', { name: /Show answer/ }).click();
  await page.screenshot({ path: 'test-results/cards-back.png', fullPage: true });
  await page.keyboard.press('3');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('greek.progress.v1') || '{}'));
  expect(Object.keys(saved.cards)).toContain('alpha:alpha:read');
});

test('speed drill: answering records stats', async ({ page }) => {
  await page.goto('./#/alphabet/speed');
  await page.screenshot({ path: 'test-results/speed.png', fullPage: true });
  await page.keyboard.press('1');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('greek.progress.v1') || '{}'));
  expect(Object.keys(saved.stats).length).toBe(1);
});

test('look-alikes and sound-out render', async ({ page }) => {
  await page.goto('./#/alphabet/lookalikes');
  await page.keyboard.press('2');
  await page.screenshot({ path: 'test-results/lookalikes.png', fullPage: true });
  await page.goto('./#/alphabet/sound');
  await page.getByLabel('Transliteration').fill('xyz');
  await page.keyboard.press('Enter');
  await expect(page.locator('.feedback.bad')).toBeVisible();
  await page.screenshot({ path: 'test-results/sound.png', fullPage: true });
});

test('typing: Latin key becomes Greek', async ({ page }) => {
  await page.goto('./#/alphabet/typing');
  await page.getByLabel('Type the letter').press('u');
  await expect(page.getByLabel('Type the letter')).toHaveValue('θ');
  await page.screenshot({ path: 'test-results/typing.png', fullPage: true });
  await page.getByRole('button', { name: 'Words from John 1' }).click();
  await page.getByLabel('Type the Greek word').pressSequentially('logos');
  await expect(page.getByLabel('Type the Greek word')).toHaveValue('λογοσ');
  await page.keyboard.press('Enter');
  await page.screenshot({ path: 'test-results/typing-words.png', fullPage: true });
});

test('stats and settings render', async ({ page }) => {
  await page.goto('./#/stats');
  await expect(page.getByRole('heading', { name: 'Letter accuracy' })).toBeVisible();
  await page.goto('./#/settings');
  await expect(page.getByLabel('Access token')).toBeVisible();
  await page.screenshot({ path: 'test-results/settings.png', fullPage: true });
});
