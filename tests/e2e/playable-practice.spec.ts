import { expect, test, type Page } from '@playwright/test';

async function listen(page: Page) {
  await page.getByRole('button', { name: 'Écouter le modèle', exact: true }).click();
  await expect(page.locator('main')).toHaveAttribute('data-phase', 'listening');
  await expect(page.getByRole('button', { name: 'Commencer', exact: true })).toBeVisible({
    timeout: 12000,
  });
}
async function beat(page: Page, number: number) {
  await page.waitForFunction(
    (n) => {
      const current = document.querySelector('main[data-phase="playing"] li[aria-current="step"]');
      return current?.querySelector('small')?.textContent?.trim() === `Temps ${n}`;
    },
    number,
    { timeout: 7000 },
  );
}

test('plays the model, counts in, evaluates Space hits and offers a clean replay', async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('link', { name: 'Jouer le premier exercice' }).click();
  await expect(page).toHaveURL(/\?practice=1$/);
  await expect(page.getByText(/Simulation visuelle/)).toHaveCount(0);
  await listen(page);
  await page.getByRole('button', { name: 'Commencer', exact: true }).click();
  await expect(page.locator('.countdown strong')).toHaveText('4');
  await expect(page.locator('.countdown strong')).toHaveText('3');
  await beat(page, 1);
  await page.keyboard.down('Space');
  await page.keyboard.down('Space'); // Held key must not count twice.
  await page.keyboard.up('Space');
  await expect(page.locator('.feedback')).toContainText(/Parfait|Bon/);
  await expect(page.locator('.beat').nth(0)).toHaveClass(/perfect|good/);
  await expect(page.locator('.beat').nth(0).locator('.outcome')).toContainText(/Parfait|Bon/);
  for (const number of [2, 3, 4, 5, 7]) {
    await beat(page, number);
    await page.keyboard.press('Space'); // Beat 3 deliberately adds a hit during a rest.
    await expect(page.locator('.beat').nth(number - 1)).toHaveClass(
      number === 3 ? /failed/ : /perfect|good/,
    );
  }
  await expect(page.getByRole('heading', { name: 'Ton bilan' })).toBeFocused({ timeout: 10000 });
  const counts = await page.locator('sc-practice-result dd').allTextContents();
  expect(Number(counts[0]) + Number(counts[1])).toBe(5);
  expect(counts.slice(2)).toEqual(['0', '1']);
  await expect(page.locator('.beat.perfect, .beat.good')).toHaveCount(5);
  await expect(page.locator('.beat.failed')).toHaveCount(1);
  await expect(page.locator('.beat').nth(2).locator('.outcome')).toContainText('En trop');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your results' })).toBeVisible();
  await expect(page.locator('sc-practice-result dd')).toHaveText(counts);
  await page.getByRole('button', { name: 'Play again', exact: true }).click();
  await expect(page.locator('main')).toHaveAttribute('data-phase', 'ready');
  await expect(page.locator('sc-practice-result')).toHaveCount(0);
  await expect(page.locator('.beat.perfect, .beat.good, .beat.failed')).toHaveCount(0);
  await page.getByRole('button', { name: 'Start', exact: true }).focus();
  await page.keyboard.press('Space'); // Starting via Space must not hit the first note.
  await expect(page.getByRole('heading', { name: 'Your results' })).toBeVisible({ timeout: 15000 });
  await expect(page.locator('sc-practice-result dd')).toHaveText(['0', '0', '5', '0']);
  await expect(page.locator('.beat.failed')).toHaveCount(5);
  await expect(page.locator('.beat.failed').first().locator('.outcome')).toContainText('Missed');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.beat.failed').first()).toHaveCSS('animation-name', 'none');
  expect(errors).toEqual([]);
});

test('pauses, resumes at the frozen position, guards reload and discards abandoned hits', async ({
  page,
}) => {
  test.setTimeout(60000);
  // Old bookmarks must now open the functional exercise too.
  await page.goto('/?preview=practice');
  await listen(page);
  await page.getByRole('button', { name: 'Commencer', exact: true }).click();
  await page.getByRole('button', { name: 'Quitter', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.countdown strong')).toHaveText('4');
  await beat(page, 1);
  await page.keyboard.press('Space');
  await beat(page, 2);
  await page.getByRole('button', { name: 'Quitter', exact: true }).click();
  const frozen = await page.locator('li[aria-current="step"]').textContent();
  await page.waitForTimeout(1200); // A real pause must outlast a musical beat.
  expect(await page.locator('li[aria-current="step"]').textContent()).toBe(frozen);
  await expect(page.getByRole('button', { name: 'Continuer', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Quitter la séance', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await beat(page, 2);
  // Reload is full-document navigation, protected by the native beforeunload dialog.
  const nativeDialog = page.waitForEvent('dialog');
  const reload = page.evaluate(() => {
    location.reload();
  });
  const dialog = await nativeDialog;
  expect(dialog.type()).toBe('beforeunload');
  await dialog.dismiss();
  await reload;
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Quitter la séance', exact: true }).click();
  await expect(page.locator('main')).toHaveAttribute('data-phase', 'ready');
  await expect(page.locator('sc-practice-result')).toHaveCount(0);
  await page.reload(); // No guard and no saved attempt after abandoning.
  await expect(page.getByRole('button', { name: 'Écouter le modèle', exact: true })).toBeVisible();
});

test('shows a recoverable audio error when activation fails', async ({ page }) => {
  await page.addInitScript(() => {
    let fail = true;
    class TestAudioContext extends AudioContext {
      override resume(): Promise<void> {
        if (fail) {
          fail = false;
          return Promise.reject(new Error('Test audio failure'));
        }
        return super.resume();
      }
    }
    globalThis.AudioContext = TestAudioContext;
  });
  await page.goto('/?practice=1');
  await page.getByRole('button', { name: 'Écouter le modèle' }).click();
  await expect(page.getByRole('alert')).toContainText('Le son est indisponible');
  await expect(page.getByRole('button', { name: 'Commencer', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Réessayer l’écoute' }).click();
  await expect(page.locator('main')).toHaveAttribute('data-phase', 'listening');
  await page.getByRole('button', { name: 'Quitter', exact: true }).click();
  await expect(page.locator('main')).toHaveAttribute('data-phase', 'ready');
});
