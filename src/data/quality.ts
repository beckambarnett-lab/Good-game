// Quality presets (Plan Part 5.10). A preset fills every graphics option; Custom uses the
// player's own choices. Systems read the resolved values as they land: snow particles with GPU
// snowfall, the deformation target with footprints, the light pool with lamps, NPC animation LOD
// with the townsfolk, AO and shadow cascades with the render core's later passes.

export type PresetId = 'low' | 'medium' | 'high' | 'ultra';
export type ShadowLevel = 'off' | 'low' | 'medium' | 'high';
export type ForestDetail = 'cards150' | 'lod2to300' | 'dense20' | 'dense40';

export interface ShadowSpec {
  /** Shadow map resolution (texels per side). */
  mapSize: number;
  /** Width (m) of the sun's shadow box, centred on the player. */
  distance: number;
  /** PCF soft filtering (else plain PCF, "hard-ish"). */
  soft: boolean;
  /** Cascades (CSM); one means a single map. */
  cascades: number;
}

export const shadowSpecs: Readonly<Record<Exclude<ShadowLevel, 'off'>, ShadowSpec>> = {
  low: { mapSize: 1024, distance: 40, soft: false, cascades: 1 },
  medium: { mapSize: 2048, distance: 60, soft: true, cascades: 1 },
  high: { mapSize: 2048, distance: 60, soft: true, cascades: 2 },
};

export interface QualityPreset {
  /** Render scale at full quality, and the floor dynamic resolution may drop to. */
  renderScale: number;
  autoScaleFloor: number;
  /**
   * Most pixels (millions) drawn at render scale 1: high-density screens render at a
   * 1080p-class budget on Medium instead of their full native resolution (ADR 0003).
   */
  maxMegapixels: number;
  antiAliasing: 'smaa' | 'msaa4';
  shadows: ShadowLevel;
  /** Cascades override for presets beyond the shadow level's own (Ultra: 3). */
  cascades?: number;
  ambientOcclusion: 'off' | 'half' | 'full';
  bloom: 'off' | 'cheap' | 'on';
  snowParticles: number;
  forest: ForestDetail;
  /** Near snow-deformation render target (texels per side). */
  deformationTarget: number;
  pointLights: number;
  /** Multiplier on NPC animation LOD distances. */
  npcAnimationLod: number;
}

export const presets: Readonly<Record<PresetId, QualityPreset>> = {
  low: {
    renderScale: 0.75,
    autoScaleFloor: 0.7,
    maxMegapixels: 1.25,
    antiAliasing: 'smaa',
    shadows: 'low',
    ambientOcclusion: 'off',
    bloom: 'cheap',
    snowParticles: 4000,
    forest: 'cards150',
    deformationTarget: 1024,
    pointLights: 3,
    npcAnimationLod: 0.7,
  },
  medium: {
    renderScale: 1,
    autoScaleFloor: 0.8,
    maxMegapixels: 2.1,
    antiAliasing: 'msaa4',
    shadows: 'medium',
    ambientOcclusion: 'off',
    bloom: 'on',
    snowParticles: 10000,
    forest: 'lod2to300',
    deformationTarget: 2048,
    pointLights: 6,
    npcAnimationLod: 1,
  },
  high: {
    renderScale: 1,
    autoScaleFloor: 0.8,
    maxMegapixels: 3.7,
    antiAliasing: 'msaa4',
    shadows: 'high',
    ambientOcclusion: 'half',
    bloom: 'on',
    snowParticles: 16000,
    forest: 'dense20',
    deformationTarget: 2048,
    pointLights: 6,
    npcAnimationLod: 1.3,
  },
  ultra: {
    renderScale: 1,
    autoScaleFloor: 0.8,
    maxMegapixels: 8.3,
    antiAliasing: 'msaa4',
    shadows: 'high',
    cascades: 3,
    ambientOcclusion: 'full',
    bloom: 'on',
    snowParticles: 20000,
    forest: 'dense40',
    deformationTarget: 2048,
    pointLights: 8,
    npcAnimationLod: 1.6,
  },
};

/** Custom settings map onto preset rows like this. */
export const customSnow: Readonly<Record<'low' | 'medium' | 'high', number>> = {
  low: 4000,
  medium: 10000,
  high: 16000,
};
export const customForest: Readonly<Record<'low' | 'medium' | 'high', ForestDetail>> = {
  low: 'cards150',
  medium: 'lod2to300',
  high: 'dense20',
};
/** Draw distance scales LOD and fog distances. */
export const drawDistanceScale: Readonly<Record<'near' | 'standard' | 'far', number>> = {
  near: 0.75,
  standard: 1,
  far: 1.3,
};
