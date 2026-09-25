import { expect, test } from '@playwright/test';

interface ShotStatus {
  ready: boolean;
  error?: string;
  passes?: { mainCalls: number; mainTriangles: number };
}

test('the valley test scene loads, renders and stays within budget', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon\.ico/.test(m.location().url)) errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?shot=S04');
  const handle = await page.waitForFunction(
    () => {
      const s = (window as unknown as { __hearthwood?: { app?: { shot?: ShotStatus } } }).__hearthwood?.app
        ?.shot;
      return s && (s.ready || s.error) ? s : null;
    },
    null,
    { timeout: 150_000, polling: 250 },
  );
  const status = (await handle.jsonValue()) as ShotStatus;
  expect(status.error).toBeUndefined();
  expect(status.passes?.mainCalls).toBeGreaterThan(0);
  expect(status.passes?.mainCalls).toBeLessThanOrEqual(250);
  expect(status.passes?.mainTriangles).toBeLessThanOrEqual(1_200_000);
  expect(errors).toEqual([]);
});
