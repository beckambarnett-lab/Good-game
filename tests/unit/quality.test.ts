import { describe, expect, it } from 'vitest';
import { presets } from '../../src/data/quality.ts';
import { settingsSchema } from '../../src/data/settings.ts';
import { dynamicResolution as t } from '../../src/data/tuning.ts';
import { DynamicResolution } from '../../src/view/render/DynamicResolution.ts';
import {
  defaultQuality,
  type GraphicsSettings,
  pixelRatioFor,
  resolveQuality,
} from '../../src/view/render/Quality.ts';

const graphics = (over: Partial<GraphicsSettings> = {}): GraphicsSettings => ({
  ...(Object.fromEntries(
    Object.entries(settingsSchema.graphics).map(([k, d]) => [k, d.default]),
  ) as GraphicsSettings),
  ...over,
});

describe('quality presets (Plan Part 5.10)', () => {
  it('match the plan’s table', () => {
    expect(presets.low).toMatchObject({
      renderScale: 0.75,
      antiAliasing: 'smaa',
      shadows: 'low',
      snowParticles: 4000,
    });
    expect(presets.medium).toMatchObject({
      renderScale: 1,
      autoScaleFloor: 0.8,
      antiAliasing: 'msaa4',
      pointLights: 6,
    });
    expect(presets.high).toMatchObject({ ambientOcclusion: 'half', forest: 'dense20', npcAnimationLod: 1.3 });
    expect(presets.ultra).toMatchObject({
      ambientOcclusion: 'full',
      snowParticles: 20000,
      pointLights: 8,
      cascades: 3,
    });
    expect(presets.low.autoScaleFloor).toBe(0.7);
  });

  it('resolve a preset and ignore the Custom-only options while on it', () => {
    const q = resolveQuality(graphics({ preset: 'low', shadows: 'high', bloom: false }));
    expect(q.shadow).toEqual({ mapSize: 1024, distance: 40, soft: false, cascades: 1 });
    expect(q.bloom).toBe('cheap');
    expect(q.antiAliasing).toBe('smaa');
    expect(resolveQuality(graphics({ preset: 'ultra' })).shadow?.cascades).toBe(3);
    expect(defaultQuality()).toEqual(resolveQuality(graphics()));
    expect(defaultQuality().shadow).toEqual({ mapSize: 2048, distance: 60, soft: true, cascades: 1 });
  });

  it('take each option from the player on Custom', () => {
    const q = resolveQuality(
      graphics({
        preset: 'custom',
        shadows: 'off',
        bloom: false,
        antiAliasing: 'smaa',
        ambientOcclusion: true,
        snowDensity: 'high',
        forestDensity: 'low',
        drawDistance: 'far',
      }),
    );
    expect(q).toMatchObject({
      shadow: null,
      bloom: 'off',
      antiAliasing: 'smaa',
      ambientOcclusion: 'half',
      snowParticles: 16000,
      forest: 'cards150',
      drawDistance: 1.3,
    });
  });

  it('fix the render scale when the player chooses a fixed scale', () => {
    const q = resolveQuality(graphics({ renderScaleMode: 'fixed', renderScalePercent: 65 }));
    expect(q.dynamic).toBe(false);
    expect(q.renderScale).toBeCloseTo(0.65, 9);
    expect(q.autoScaleFloor).toBeCloseTo(0.65, 9);
  });

  it('draw high-density screens at the preset’s pixel budget, never above native', () => {
    // A 1440×900 laptop window at DPR 2 on Medium: about 2.1 MP instead of 5.2 MP.
    const ratio = pixelRatioFor(1440, 900, 2, presets.medium.maxMegapixels, 1);
    expect(1440 * ratio * 900 * ratio).toBeCloseTo(2.1e6, -4);
    // A small window never renders above the screen's own density.
    expect(pixelRatioFor(800, 600, 1, presets.ultra.maxMegapixels, 1)).toBe(1);
    // Render scale multiplies the result.
    expect(pixelRatioFor(1920, 1080, 1, presets.medium.maxMegapixels, 0.8)).toBeCloseTo(0.8, 9);
  });
});

describe('dynamic resolution', () => {
  const frames = (dr: DynamicResolution, seconds: number, ms: number, source: 'gpu' | 'interval' = 'gpu') => {
    const dt = 1 / 60;
    let changes = 0;
    for (let s = 0; s < seconds; s += dt) if (dr.sample(dt, ms, source, 1000 / 60)) changes++;
    return changes;
  };

  it('waits out the settle time, then steps down 0.05 per second of slow frames to the floor', () => {
    const dr = new DynamicResolution(t, 0.8, 1);
    frames(dr, t.settleSeconds, 30);
    expect(dr.scale).toBe(1);
    frames(dr, 1.05, 16.5);
    expect(dr.scale).toBe(0.95);
    frames(dr, 10, 20);
    expect(dr.scale).toBe(0.8);
  });

  it('holds between the thresholds and recovers one step after 3 s under 13 ms', () => {
    const dr = new DynamicResolution(t, 0.8, 1);
    frames(dr, t.settleSeconds, 10);
    frames(dr, 3.05, 18);
    expect(dr.scale).toBe(0.85);
    frames(dr, 10, 14);
    expect(dr.scale).toBe(0.85);
    frames(dr, 2.9, 10);
    expect(dr.scale).toBe(0.85);
    frames(dr, 0.2, 10);
    expect(dr.scale).toBe(0.9);
  });

  it('waits twice as long after a step up that had to be undone', () => {
    const dr = new DynamicResolution(t, 0.8, 1);
    frames(dr, t.settleSeconds, 10);
    frames(dr, 1.05, 18); // 0.95
    frames(dr, 3.05, 10); // back to 1
    expect(dr.scale).toBe(1);
    frames(dr, 1.05, 18); // too much: 0.95, and the next recovery waits 6 s
    expect(dr.scale).toBe(0.95);
    frames(dr, 5.5, 10);
    expect(dr.scale).toBe(0.95);
    frames(dr, 0.6, 10);
    expect(dr.scale).toBe(1);
  });

  it('judges by the frame interval against the target when there is no GPU timer', () => {
    const dr = new DynamicResolution(t, 0.8, 1);
    frames(dr, t.settleSeconds, 16.7, 'interval');
    frames(dr, 5, 16.7, 'interval'); // frames on time at 60 fps: nothing to fix
    expect(dr.scale).toBe(1);
    frames(dr, 1.05, 20, 'interval'); // missing frames
    expect(dr.scale).toBe(0.95);
  });

  it('restarts at the ceiling of a new range', () => {
    const dr = new DynamicResolution(t, 0.8, 1);
    frames(dr, t.settleSeconds + 3, 20);
    expect(dr.scale).toBeLessThan(1);
    dr.setRange(0.7, 0.75);
    expect(dr.scale).toBe(0.75);
  });
});
