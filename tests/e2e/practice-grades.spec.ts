import { expect, test, type Page } from '@playwright/test';

// Control only the output clock to exercise every grade without wall-clock races.
// Real audio and real keyboard timing remain covered by playable-practice.spec.ts.
async function setAudioTime(page: Page, ms: number) {
  await page.evaluate((value) => {
    (window as unknown as { testAudioTime: number }).testAudioTime = value;
  }, ms);
}

test('shows all timing grades consistently in the sequence and responsive bilingual result', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const clock = window as unknown as { testAudioTime: number };
    clock.testAudioTime = 10000;
    class TestAudioContext extends AudioContext {
      override getOutputTimestamp(): AudioTimestamp {
        return { contextTime: clock.testAudioTime / 1000, performanceTime: performance.now() };
      }
    }
    globalThis.AudioContext = TestAudioContext;
  });
  await page.goto('/?practice=1');
  await page.getByRole('button', { name: 'Écouter le modèle', exact: true }).click();
  await expect(page.locator('main')).toHaveAttribute('data-phase', 'listening');
  await setAudioTime(page, 18400);
  await page.getByRole('button', { name: 'Commencer', exact: true }).click();
  await setAudioTime(page, 22620);
  await expect(page.locator('main')).toHaveAttribute('data-phase', 'playing');
  await page.keyboard.press('Space');
  await expect(page.locator('.feedback')).toContainText('Parfait !');
  await expect(page.locator('.beat').nth(0)).toHaveClass(/perfect/);
  await setAudioTime(page, 23700);
  await page.keyboard.press('Space');
  await expect(page.locator('.feedback')).toContainText('Bon !');
  await expect(page.locator('.beat').nth(1)).toHaveClass(/good/);
  await expect(page.locator('.beat').nth(1)).toHaveAttribute('aria-current', 'step');
  await expect(page.locator('.beat').nth(1)).toHaveCSS('outline-style', 'solid');
  await setAudioTime(page, 24620);
  await page.keyboard.press('Space'); // A struck rest is an extra, not a graded note.
  await setAudioTime(page, 26620);
  await page.keyboard.press('Space');
  await page.keyboard.press('Space'); // Preserve the perfect note alongside its extra.
  await expect(page.locator('.beat').nth(4)).toHaveClass(/failed/);
  await expect(page.locator('.beat').nth(4).locator('.outcome')).toContainText(/Parfait.*En trop/);
  await setAudioTime(page, 30800);
  await expect(page.getByRole('heading', { name: 'Ton bilan' })).toBeFocused();
  await expect(page.locator('sc-practice-result dd')).toHaveText(['2', '1', '2', '2']);
  await expect(page.locator('.beat').nth(3).locator('.outcome')).toContainText('Raté');
  await expect(page.locator('.beat').nth(7).locator('.outcome')).toBeEmpty();

  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
    [834, 1194],
    [1194, 834],
    [375, 812],
  ]) {
    await page.setViewportSize({ width: width!, height: height! });
    for (const language of ['English', 'Français']) {
      await page.getByRole('button', { name: language, exact: true }).click();
      await expect(page.locator('sc-practice-result dt')).toHaveText(
        language === 'English'
          ? ['Perfect', 'Good', 'Missed', 'Extra hits']
          : ['Parfaits', 'Bons', 'Ratés', 'Frappes en trop'],
      );
      await expect(page.locator('sc-practice-result dd')).toHaveText(['2', '1', '2', '2']);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(
        await page
          .locator('.beat, sc-practice-result .sc-panel')
          .evaluateAll((items) => items.every((item) => item.scrollWidth <= item.clientWidth)),
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 834, height: 1194 });
  await page.addStyleTag({ content: 'html { font-size: 200%; }' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const grade of ['perfect', 'good', 'failed']) {
    await expect(page.locator(`.beat.${grade}`).first()).toHaveCSS('animation-name', 'none');
  }
  await page.getByRole('button', { name: 'Réécouter', exact: true }).click();
  await expect(page.locator('main')).toHaveAttribute('data-phase', 'listening');
  await expect(page.locator('.beat.perfect, .beat.good, .beat.failed')).toHaveCount(0);
  await expect(page.locator('sc-practice-result')).toHaveCount(0);
});
