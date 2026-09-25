import { expect, test } from '@playwright/test';

interface SelfTest {
  saveRoundTrip(): Promise<{ ok: boolean; detail: string }>;
}

test('a world save round-trips through IndexedDB with gzip, CRC and A/B autosaves', async ({ page }) => {
  await page.goto('/?selftest');
  await page.waitForFunction(
    () => (window as unknown as { __hearthwood?: SelfTest }).__hearthwood !== undefined,
  );
  const result = await page.evaluate(() =>
    (window as unknown as { __hearthwood: SelfTest }).__hearthwood.saveRoundTrip(),
  );
  expect(result.detail).toBe('autoA,autoB → autoB, identical=true');
  expect(result.ok).toBe(true);
});
