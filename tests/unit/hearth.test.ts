import { ShaderLib } from 'three';
import { describe, expect, it } from 'vitest';
import { look, proposedLook } from '../../src/data/tuning.ts';
import {
  hearthUniforms,
  patchHearthShader,
  replaceOnce,
  syncHearthUniforms,
} from '../../src/view/render/materials/hearth.ts';

const lambert = () => ({
  vertexShader: ShaderLib.lambert.vertexShader,
  fragmentShader: ShaderLib.lambert.fragmentShader,
});

describe('HearthMaterial (Plan Part 5.9)', () => {
  it('patches three’s Lambert shaders at every anchor', () => {
    const shader = lambert();
    patchHearthShader(shader, { surface: 'snow', heightGradient: true, dither: true });
    const fs = shader.fragmentShader;
    expect(shader.vertexShader).toContain('vHearthWorld = hearthWorld.xyz;');
    expect(shader.vertexShader).toContain('#define HEARTH_HEIGHT');
    expect(fs).toContain('#define HEARTH_WRAP uHearthWrapSnow');
    expect(fs).toContain(
      '( dot( geometryNormal, directLight.direction ) + HEARTH_WRAP ) / ( 1.0 + HEARTH_WRAP )',
    );
    expect(fs).toContain('float hearthShadow = 1.0;');
    expect(fs).toContain('hearthShadow = min( hearthShadow, hearthLit );');
    expect(fs).toContain('uHearthShadowTintStrength');
    expect(fs).toContain('hearthBayer( gl_FragCoord.xy ) < uHearthFade');
    for (const include of ['lights_lambert_pars_fragment', 'lights_fragment_begin', 'fog_fragment']) {
      expect(fs).not.toContain(`#include <${include}>`);
    }
  });

  it('leaves out what an object doesn’t use', () => {
    const shader = lambert();
    patchHearthShader(shader, { surface: 'objects', heightGradient: false, dither: false });
    expect(shader.fragmentShader).toContain('#define HEARTH_WRAP uHearthWrapObjects');
    expect(shader.fragmentShader).not.toContain('#define HEARTH_HEIGHT');
    expect(shader.fragmentShader).not.toContain('#define HEARTH_DITHER');
  });

  it('fails loudly when an anchor is missing or repeated', () => {
    expect(() => replaceOnce('abc', 'x', 'y', 'test')).toThrow(/exactly one/);
    expect(() => replaceOnce('xx', 'x', 'y', 'test')).toThrow(/exactly one/);
    expect(replaceOnce('axc', 'x', 'y', 'test')).toBe('ayc');
  });

  it('syncs a look into the shared uniforms; the game’s look is neutral', () => {
    syncHearthUniforms(proposedLook);
    expect(hearthUniforms.uHearthWrapSnow.value).toBe(proposedLook.wrapSnow);
    expect(hearthUniforms.uHearthShadowTint.value.z).toBeCloseTo(proposedLook.shadowTint[2], 9);
    syncHearthUniforms(look);
    expect(hearthUniforms.uHearthWrapObjects.value).toBe(0);
    expect(hearthUniforms.uHearthShadowTintStrength.value).toBe(0);
    expect(hearthUniforms.uHearthHeightDarken.value).toBe(0);
    expect(hearthUniforms.uHearthFogHeightMix.value).toBe(0);
    expect(look.grain).toBe(0);
    expect(look.contrast).toBe(1);
    expect([look.sunStrength, look.skyStrength]).toEqual([1, 1]);
  });
});
