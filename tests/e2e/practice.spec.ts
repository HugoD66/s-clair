import { expect, test } from '@playwright/test';

test('opens the visual practice preview and preserves its state when translating', async ({
  page,
}) => {
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/demo-records/')) apiRequests.push(request.url());
  });
  await page.goto('/');
  await page.getByRole('link', { name: 'Voir l’aperçu de l’entraînement' }).click();
  await expect(page).toHaveURL(/\?preview=practice$/);
  await expect(page.getByRole('heading', { name: 'Trouver la pulsation' })).toBeVisible();
  await expect(page.getByText(/Simulation visuelle : aucun son/)).toBeVisible();
  const sequence = page.getByRole('list', { name: 'Séquence de huit temps' });
  await expect(sequence.getByRole('listitem')).toHaveCount(8);
  await expect(sequence.getByText('Coup', { exact: true })).toHaveCount(5);
  await expect(sequence.getByText('Silence', { exact: true })).toHaveCount(3);
  await page.getByRole('button', { name: 'Écouter le modèle', exact: true }).click();
  await expect(page.getByLabel('État à examiner')).toHaveValue('listening');
  await expect(sequence.locator('[aria-current="step"]')).toContainText('Temps 2');
  await page.getByRole('button', { name: 'Commencer', exact: true }).click();
  await expect(page.getByLabel('État à examiner')).toHaveValue('countdown');
  await page.getByLabel('État à examiner').selectOption('playing');
  await expect(sequence.locator('[aria-current="step"]')).toContainText('Temps 4');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByLabel('State to inspect')).toHaveValue('playing');
  await expect(page.getByRole('status')).toContainText('Correct hit');
  await expect(page.getByText('Now', { exact: true })).toBeVisible();
  await page.getByLabel('State to inspect').selectOption('audio-error');
  await expect(page.getByRole('alert')).toContainText('Sound is unavailable');
  await page.getByRole('button', { name: 'Try listening again' }).click();
  await expect(page.getByLabel('State to inspect')).toHaveValue('listening');
  expect(apiRequests).toEqual([]);
});

test('confines modal focus and restores the preview after cancel or confirmed exit', async ({
  page,
}) => {
  await page.goto('/?preview=practice');
  const state = page.getByLabel('État à examiner');
  for (const value of ['countdown', 'playing']) {
    await state.selectOption(value);
    await page.getByRole('button', { name: 'Quitter', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuer', exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(
      page.getByRole('button', { name: 'Quitter la séance', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Continuer', exact: true })).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(state).toHaveValue('countdown');
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  }
  await page.getByRole('button', { name: 'Quitter', exact: true }).click();
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await expect(state).toHaveValue('countdown');
  await page.getByRole('button', { name: 'Quitter', exact: true }).click();
  await page.getByRole('button', { name: 'Quitter la séance', exact: true }).click();
  await expect(state).toHaveValue('ready');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await page.getByRole('button', { name: 'Écouter le modèle' }).click();
  await page.getByRole('button', { name: 'Quitter', exact: true }).click();
  await expect(state).toHaveValue('ready');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('keeps the eight beats readable across reference viewports and languages', async ({
  page,
}) => {
  await page.goto('/?preview=practice');
  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
    [834, 1194],
    [1194, 834],
  ]) {
    await page.setViewportSize({ width: width!, height: height! });
    for (const language of ['English', 'Français']) {
      await page.getByRole('button', { name: language, exact: true }).click();
      for (const value of ['ready', 'listening', 'countdown', 'playing', 'audio-error', 'exit']) {
        await page.locator('#practice-state').selectOption(value);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        const beats = page.locator('sc-practice-sequence li');
        expect(
          await beats.evaluateAll(
            (items) => new Set(items.map((item) => item.getBoundingClientRect().top)).size,
          ),
        ).toBe(1);
        expect(
          await beats.evaluateAll((items) =>
            items.every((item) => item.scrollWidth <= item.clientWidth),
          ),
        ).toBe(true);
        if (value === 'exit') await page.keyboard.press('Escape');
      }
    }
  }
});
