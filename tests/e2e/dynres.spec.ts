import { expect, test } from '@playwright/test';
import { decodePng } from '../../tools/png.ts';

// Dynamic resolution must be invisible (Plan Part 5.10). A step resizes the canvas, which clears
// it; if that happens after the frame is drawn, the compositor shows the cleared canvas, and the
// page's night blue behind it flashes for a frame. This forces a real step every frame and checks
// that no screenshot catches the page instead of the valley.

/** The page behind the canvas (index.html's background, #0b1330). */
const PAGE = [0x0b, 0x13, 0x30] as const;

interface StageHandle {
  quality: { dynamic: boolean };
  dynres: { scale: number; sample(): boolean };
}
interface Win {
  __hearthwood?: { app?: { fsm: { current: string }; stage: StageHandle | null } };
}

test('dynamic resolution steps never flash a blank frame', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/');
  await page.mouse.click(640, 360); // past the splash
  await page.waitForFunction(
    () => (window as unknown as Win).__hearthwood?.app?.fsm.current === 'playing',
    null,
    {
      timeout: 150_000,
      polling: 250,
    },
  );
  await page.evaluate(() => {
    const stage = (window as unknown as Win).__hearthwood?.app?.stage;
    if (!stage) throw new Error('no stage');
    stage.quality.dynamic = true;
    // A step down and back up, every frame.
    stage.dynres.sample = function (this: StageHandle['dynres']) {
      this.scale = this.scale > 0.97 ? 0.95 : 1;
      return true;
    };
  });
  const frames = 10;
  let blank = 0;
  for (let i = 0; i < frames; i++) {
    const { width, height, rgb } = decodePng(await page.screenshot());
    let behind = 0;
    let n = 0;
    for (let y = Math.round(height * 0.6); y < height; y += 9) {
      for (let x = 0; x < width; x += 9) {
        const k = (y * width + x) * 3;
        const d = Math.max(
          Math.abs((rgb[k] as number) - PAGE[0]),
          Math.abs((rgb[k + 1] as number) - PAGE[1]),
          Math.abs((rgb[k + 2] as number) - PAGE[2]),
        );
        if (d <= 3) behind++;
        n++;
      }
    }
    if (behind / n > 0.5) blank++;
    await page.waitForTimeout(60);
  }
  expect(blank).toBe(0);
});
