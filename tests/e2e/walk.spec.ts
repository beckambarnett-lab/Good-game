import { expect, test } from '@playwright/test';

interface AppHandle {
  playerState(): { x: number; y: number; z: number; speed: number } | null;
}

test('the walker crosses the snow when W is held', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon\.ico/.test(m.location().url)) errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.mouse.click(640, 360); // past the splash
  const start = await page.waitForFunction(
    () =>
      (window as unknown as { __hearthwood?: { app?: AppHandle } }).__hearthwood?.app?.playerState() ?? null,
    null,
    { timeout: 150_000, polling: 250 },
  );
  const from = (await start.jsonValue()) as { x: number; z: number };
  // Headless rendering is slow and the loop caps catch-up steps, so wait on distance, not the clock.
  await page.keyboard.down('KeyW');
  const moved = await page.waitForFunction(
    ([x, z]) => {
      const s = (window as unknown as { __hearthwood: { app: AppHandle } }).__hearthwood.app.playerState();
      return s && Math.hypot(s.x - (x as number), s.z - (z as number)) > 3 ? s : null;
    },
    [from.x, from.z],
    { timeout: 120_000, polling: 250 },
  );
  const moving = (await moved.jsonValue()) as { speed: number };
  await page.keyboard.up('KeyW');
  await page.screenshot({ path: 'artifacts/shots/walk.png' });
  expect(moving.speed).toBeGreaterThan(1);
  expect(errors).toEqual([]);
});
