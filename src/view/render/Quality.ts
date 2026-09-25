// Resolves the player's graphics settings into what the renderer and systems use (Plan Part 5.10):
// a preset's row or the Custom choices, the render scale mode, and the draw distance. Pure, so the
// mapping is tested without a GPU.

import {
  customForest,
  customSnow,
  drawDistanceScale,
  type PresetId,
  presets,
  type QualityPreset,
  type ShadowSpec,
  shadowSpecs,
} from '../../data/quality.ts';
import { type SettingsValues, settingsSchema } from '../../data/settings.ts';

export type GraphicsSettings = SettingsValues['graphics'];

export interface ResolvedQuality extends Omit<QualityPreset, 'cascades' | 'shadows'> {
  /** The sun's shadow map, or null with shadows off. */
  shadow: ShadowSpec | null;
  /** Dynamic resolution between `autoScaleFloor` and `renderScale`; else fixed at `renderScale`. */
  dynamic: boolean;
  /** Multiplier on LOD and fog distances. */
  drawDistance: number;
}

/** Custom starts from the Medium target's scale and pixel budget. */
const CUSTOM_BASE: PresetId = 'medium';

export function resolveQuality(g: GraphicsSettings): ResolvedQuality {
  const custom = g.preset === 'custom';
  const base = presets[custom ? CUSTOM_BASE : (g.preset as PresetId)];
  const level = custom ? g.shadows : base.shadows;
  const spec = level === 'off' ? null : shadowSpecs[level];
  const shadow = spec && !custom && base.cascades ? { ...spec, cascades: base.cascades } : spec;
  const fixed = g.renderScaleMode === 'fixed';
  return {
    renderScale: fixed ? g.renderScalePercent / 100 : base.renderScale,
    autoScaleFloor: fixed ? g.renderScalePercent / 100 : base.autoScaleFloor,
    maxMegapixels: base.maxMegapixels,
    antiAliasing: custom ? g.antiAliasing : base.antiAliasing,
    shadow,
    ambientOcclusion: custom ? (g.ambientOcclusion ? 'half' : 'off') : base.ambientOcclusion,
    bloom: custom ? (g.bloom ? 'on' : 'off') : base.bloom,
    snowParticles: custom ? customSnow[g.snowDensity] : base.snowParticles,
    forest: custom ? customForest[g.forestDensity] : base.forest,
    deformationTarget: base.deformationTarget,
    pointLights: base.pointLights,
    npcAnimationLod: base.npcAnimationLod,
    dynamic: !fixed,
    drawDistance: drawDistanceScale[g.drawDistance],
  };
}

/** The quality of default settings (Medium), for pages without player settings (the Labs). */
export function defaultQuality(): ResolvedQuality {
  const g = Object.fromEntries(
    Object.entries(settingsSchema.graphics).map(([k, def]) => [k, def.default]),
  ) as GraphicsSettings;
  return resolveQuality(g);
}

/**
 * The renderer's pixel ratio: the screen's own, capped so render scale 1 draws at most
 * `maxMegapixels` (a 1080p-class budget on Medium, ADR 0003), times the render scale.
 */
export function pixelRatioFor(
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
  maxMegapixels: number,
  scale: number,
): number {
  const area = Math.max(1, cssWidth * cssHeight);
  const budget = Math.sqrt((maxMegapixels * 1e6) / area);
  return Math.min(devicePixelRatio, budget) * scale;
}
