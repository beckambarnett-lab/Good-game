import { expect, test } from '@playwright/test';
import { decodePng } from '../../tools/png.ts';

// Dynamic resolution must be invisible (Plan Part 5.10). A step resizes the canvas, which clears
// it; if that happens after the frame is drawn, the compositor shows the cleared canvas, and the
// page's night blue behind it flashes for a frame. This forces a real step every frame and checks
// that no screenshot catches the page instead of the valley. A resize every frame is slow under
// software rendering, so the test runs small, on the Low preset (no MSAA buffers to reallocate).

/** The page behind the canvas (index.html's background, #0b1330). */
const PAGE = [0x0b, 0x13, 0x30] as const;

interface StageHandle {
  quality: { dynamic: boolean };
  dynres: { scale: number; sample(): boolean };
}
interface Win {
  __hearthwood?: {
    app?: {
      fsm: { current: string };
      stage: StageHandle | null;
      settings: { set(group: 'graphics', key: 'preset', value: 'low'): void };
    };
  };
}

/** Screenshots to take; before the fix, nine in ten caught a blank frame. */
const FRAMES = 6;

test.use({ viewport: { width: 640, height: 360 } });

test('dynamic resolution steps never flash a blank frame', async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto('/');
  await page.mouse.click(320, 180); // past the splash
  await page.waitForFunction(
    () => (window as unknown as Win).__hearthwood?.app?.fsm.current === 'playing',
    null,
    {
      timeout: 150_000,
      polling: 250,
    },
  );
  await page.evaluate(() => {
    const app = (window as unknown as Win).__hearthwood?.app;
    const stage = app?.stage;
    if (!app || !stage) throw new Error('no stage');
    app.settings.set('graphics', 'preset', 'low');
    stage.quality.dynamic = true;
    // A step down and back up, every frame.
    stage.dynres.sample = function (this: StageHandle['dynres']) {
      this.scale = this.scale > 0.97 ? 0.95 : 1;
      return true;
    };
  });
  let blank = 0;
  for (let i = 0; i < FRAMES; i++) {
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
