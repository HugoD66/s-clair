import { expect, test } from '@playwright/test';

test('opens microphone settings from the bilingual home without loading an exercise', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Trouve ton rythme. À toi de jouer.' }),
  ).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Aller au contenu' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Paramètres' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Paramètres', exact: true })).toBeFocused();
  await expect(page.locator('sc-practice-sequence')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Écouter le modèle' })).toHaveCount(0);
  await expect(page.locator('sc-microphone-diagnostic .status')).toHaveText('Micro désactivé');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close test', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Find your rhythm. Make it yours.' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Demo', exact: false }).click();
  await expect(
    page.getByRole('button', { name: 'Listen to the model', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Back to home', exact: true }).click();
  await expect(page.locator('sc-home-page')).toBeVisible();
});

test('keeps the home and settings readable across reference viewports and enlarged text', async ({
  page,
}) => {
  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
    [834, 1194],
    [1194, 834],
    [390, 844],
  ]) {
    await page.setViewportSize({ width: width!, height: height! });
    for (const path of ['/', '/?page=settings']) {
      await page.goto(path);
      for (const language of ['Français', 'English']) {
        await page.getByRole('button', { name: language, exact: true }).click();
        await page.evaluate(() => {
          document.documentElement.style.fontSize = '200%';
        });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await page.evaluate(() => {
          document.documentElement.style.fontSize = '';
        });
      }
    }
  }
  await page.goto('/');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.rhythm i').first()).toHaveCSS('animation-name', 'none');
});
