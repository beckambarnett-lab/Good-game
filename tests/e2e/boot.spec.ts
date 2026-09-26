import { expect, test } from '@playwright/test';

// Fonts and favicons can fail behind sandbox proxies; they are not page bugs.
const ignorable = (url: string) => /fonts\.(googleapis|gstatic)\.com|favicon\.ico/.test(url);

test('the app boots without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !ignorable(m.location().url)) errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('#app')).toContainText('Hearthwood');
  expect(errors).toEqual([]);
});
