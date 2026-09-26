import { expect, test } from '@playwright/test';
import { decodePng } from '../../tools/png.ts';

interface AppHandle {
  playerState(): { x: number; z: number } | null;
  cheats: { addHours(h: number): void } | null;
}
type Win = { __hearthwood?: { app?: AppHandle } };

/** How much brighter (mean luma, 0–255) the lantern must make the ground around the walker. */
const LANTERN_MIN_LUMA = 2;

/** Mean luma and warmth (red minus blue) of the ground below the middle of the view. */
async function warmthNearWalker(page: import('@playwright/test').Page) {
  const { width, height, rgb } = decodePng(await page.screenshot());
  let luma = 0;
  let warmth = 0;
  let n = 0;
  for (let y = Math.round(height * 0.62); y < Math.round(height * 0.92); y += 3) {
    for (let x = Math.round(width * 0.35); x < Math.round(width * 0.65); x += 3) {
      const k = (y * width + x) * 3;
      const [r, g, b] = [rgb[k] as number, rgb[k + 1] as number, rgb[k + 2] as number];
      luma += 0.2126 * r + 0.7152 * g + 0.0722 * b;
      warmth += r - b;
      n++;
    }
  }
  return { luma: luma / n, warmth: warmth / n };
}

test('?dev=1 shows the budgets, and the cheats skip time and teleport', async ({ page }) => {
  test.setTimeout(300_000); // CI renders in software, several times slower than a desktop
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

  // The lantern takes one of the pooled point lights and warms the ground around the walker.
  await expect(overlay.locator('.info')).toContainText(/Point lights 0 of \d+ in use/);
  const unlit = await warmthNearWalker(page);
  await overlay.getByRole('button', { name: 'Lantern' }).click();
  await expect(overlay.locator('.info')).toContainText(/Point lights 1 of \d+ in use/);
  await page.waitForTimeout(1000); // past the fade-in
  const lit = await warmthNearWalker(page);
  await page.screenshot({ path: 'artifacts/shots/dev-lantern.png' });
  expect(lit.luma - unlit.luma).toBeGreaterThan(LANTERN_MIN_LUMA);
  expect(lit.warmth - unlit.warmth).toBeGreaterThan(0);

  // F3 hides it again.
  await page.keyboard.press('F3');
  await expect(overlay).toBeHidden();
  expect(errors).toEqual([]);
});
