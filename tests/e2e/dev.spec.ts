import { expect, test } from '@playwright/test';

interface AppHandle {
  playerState(): { x: number; z: number } | null;
  cheats: { addHours(h: number): void } | null;
}
type Win = { __hearthwood?: { app?: AppHandle } };

test('?dev=1 shows the budgets, and the cheats skip time and teleport', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon\.ico/.test(m.location().url)) errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?dev=1');
  await page.mouse.click(640, 360); // past the splash
  const overlay = page.locator('.dev-overlay');
  await expect(overlay).toBeVisible({ timeout: 150_000 });
  await expect(overlay).toContainText('Main pass');
  await expect(overlay).toContainText('Shadow pass');
  await expect(overlay).toContainText('Sim step');

  // +1 h moves the clock on by an hour (the overlay shows the time).
  const before = (await overlay.locator('.info').textContent()) ?? '';
  await overlay.getByRole('button', { name: '+1 h' }).click();
  await expect(overlay.locator('.info')).not.toHaveText(before);

  // Teleport to the lake.
  await overlay.getByRole('button', { name: 'Lake' }).click();
  await page.waitForFunction(
    () => {
      const s = (window as unknown as Win).__hearthwood?.app?.playerState();
      return !!s && Math.hypot(s.x - 232, s.z - 40) < 1;
    },
    null,
    { timeout: 20_000 },
  );
  await expect(overlay.locator('.info')).toContainText('lakeIce');
  await page.screenshot({ path: 'artifacts/shots/dev-overlay.png' });

  // F3 hides it again.
  await page.keyboard.press('F3');
  await expect(overlay).toBeHidden();
  expect(errors).toEqual([]);
});
