import { expect, test } from '@playwright/test';
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
