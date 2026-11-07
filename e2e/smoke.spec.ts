/**
 * Smoke test of the whole site against a throwaway API (see
 * playwright.config.ts): the admin signs in, opens every screen and answers
 * a full practice check, invites a student; the student signs in; an
 * uninvited address is refused. Screenshots land in test-results/.
 */
import { expect, test, type Page } from '@playwright/test';

async function devSignIn(page: Page, email: string) {
  await page.goto('./#/login');
  await page.getByLabel('Invited email').fill(email);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

test('the whole site, as admin then student', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const shot = (name: string) => page.screenshot({ path: `test-results/${name}.png`, fullPage: true });

  await page.goto('./');
  await shot('01-front');

  // Not invited: refused with a clear message.
  await devSignIn(page, 'stranger@calvinseminary.edu');
  await expect(page.getByText("hasn't been invited")).toBeVisible();
  await shot('02-login-refused');

  // Admin: always allowed.
  await devSignIn(page, 'admin@calvinseminary.edu');
  await expect(page.getByRole('heading', { name: 'Course map' })).toBeVisible();
  await shot('03-dashboard');

  // Open units 4 and 6 (this adds their words and tables to review).
  await page.goto('./#/unit/u04');
  await expect(page.locator('.step.current')).toBeVisible();
  await shot('04-unit');
  await page.goto('./#/unit/u06');
  // Steps in order: reading is "Now"; confirming it moves "Now" to the video.
  await expect(page.locator('.step.current')).toContainText('Read the first half of Mounce ch. 7');
  await page.getByLabel('Notes for Unit 6').click();
  await page.keyboard.type('Genitive = of. ');
  // Type Greek on: logos with an acute on the omicron ("lo/gos" -> λόγος, final sigma).
  await page.getByRole('switch', { name: 'Type Greek with my keyboard' }).click();
  await page.keyboard.type('lo/gos ');
  await expect(page.getByLabel('Notes for Unit 6')).toHaveValue(/## 1 · Read the first half of Mounce ch\. 7\nGenitive = of\. λόγος $/);
  await page.getByRole('switch', { name: 'Type Greek with my keyboard' }).click();
  await page.getByRole('button', { name: "I've read it" }).click();
  await expect(page.locator('.step.current')).toContainText('Watch the chapter overview');
  await expect(page.locator('#step-read')).toContainText('Read today');
  // Any step can be opened, even out of order.
  await page.locator('#step-paradigms .step-head').click();
  await expect(page.locator('table.paradigm').first()).toBeVisible();
  await shot('04b-unit-steps');

  // Practice check: answer everything with the first option / first chips.
  await page.goto('./#/check/u06');
  for (let i = 0; i < 12; i++) {
    const chips = page.locator('.chips');
    await page.locator('.qcard').waitFor();
    if (await chips.count()) {
      for (let r = 0; r < 3; r++) await chips.nth(r).locator('button.chip').first().click();
      await page.getByRole('button', { name: 'Check' }).click();
    } else {
      await page.locator('button.opt').first().click();
    }
    await page.getByRole('button', { name: 'Next' }).click({ timeout: 3000 }).catch(() => { /* auto-advanced */ });
    if (await page.getByRole('button', { name: 'Take it again' }).isVisible()) break;
  }
  await expect(page.getByRole('button', { name: 'Take it again' })).toBeVisible();
  await shot('05-check-result');

  // Review: reveal a word and rate it.
  await page.goto('./#/review');
  await expect(page.getByText('Daily review')).toBeVisible();
  await shot('06-review');

  // Reader: tap a word.
  await page.goto('./#/read/u06');
  await page.locator('.verse button.w').first().click();
  await expect(page.locator('aside').getByText(/^from /)).toBeVisible();
  await shot('07-reader');

  await page.goto('./#/paradigms');
  await page.getByRole('button', { name: 'Hide forms' }).click();
  await shot('08-paradigms');

  await page.goto('./#/notes');
  await expect(page.getByRole('heading', { name: 'My notes' })).toBeVisible();
  // Accent-insensitive search finds the Greek typed above.
  await page.getByLabel('Search notes').fill('λογος');
  await expect(page.locator('mark')).toHaveText('λόγος');
  await shot('08b-notes-search');

  // Admin: invite a student.
  await page.goto('./#/admin');
  await page.getByLabel('Addresses to invite').fill('student@calvinseminary.edu');
  await page.getByRole('button', { name: 'Invite' }).click();
  await expect(page.getByRole('cell', { name: 'student@calvinseminary.edu' })).toBeVisible();
  await shot('09-admin');

  // Alphabet drills still work inside the new frame.
  await page.goto('./#/alphabet');
  await expect(page.getByRole('heading', { name: 'The alphabet' })).toBeVisible();
  await shot('10-alphabet');

  // Sign out; the student signs in and sees no admin link.
  await page.getByRole('button', { name: 'Sign out' }).click();
  await devSignIn(page, 'student@calvinseminary.edu');
  await expect(page.getByRole('heading', { name: 'Course map' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);
  await shot('11-student-dashboard');

  expect(errors).toEqual([]);
});
