import { expect, test } from '@playwright/test';
test('shows the logo and supports keyboard navigation while a request is pending', async ({
  page,
}) => {
  let releaseResponse!: () => void;
  const responseReady = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  await page.route('**/api/v1/demo-records/**', async (route) => {
    await responseReady;
    await route.fulfill({ status: 503, json: { code: 'databaseUnavailable' } });
  });
  try {
    await page.goto('/');
    const logo = page.getByRole('img', { name: 'S-Clair', exact: true });
    await expect(logo).toBeVisible();
    await expect
      .poll(() => logo.evaluate((image: HTMLImageElement) => image.naturalWidth))
      .toBeGreaterThan(0);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Aller au contenu' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
    await page.keyboard.press('Tab');
    const read = page.getByRole('button', { name: 'Lire la donnée', exact: true });
    await expect(read).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(read).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Tester une donnée absente' })).toBeDisabled();
    await expect(page.getByText('Chargement…', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'English', exact: true }).click();
    await expect(page.getByText('Loading…', { exact: true })).toBeVisible();
    releaseResponse();
    await expect(page.getByRole('alert')).toHaveText('The database is temporarily unavailable.');
    await expect(page.getByRole('button', { name: 'Read the record', exact: true })).toBeEnabled();
  } finally {
    releaseResponse();
    await page.unrouteAll({ behavior: 'wait' });
  }
});
test('reads PostgreSQL and translates the same API error without reloading', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Vérifier la connexion' })).toBeVisible();
  await page.getByRole('button', { name: 'Lire la donnée' }).click();
  await expect(page.getByText('s-clair demo', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tester une donnée absente' }).click();
  await expect(page.getByRole('alert')).toHaveText('Donnée de démonstration introuvable.');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Demo record not found.');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Check the connection' })).toBeVisible();
});
test('uses translated fallback for a response without a usable error key', async ({ page }) => {
  await page.route('**/api/v1/demo-records/**', (route) =>
    route.fulfill({ status: 502, contentType: 'text/html', body: '<html>upstream failed</html>' }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Lire la donnée' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Une erreur est survenue. Réessaie dans un instant.',
  );
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Something went wrong. Please try again shortly.',
  );
});
test('remains usable at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Lire la donnée' }).click();
  await expect(page.getByText('s-clair demo', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
