// HearthMaterial (Plan Part 5.9): one patch over MeshLambertMaterial that every lit object
// shares, so three's lights and shadows keep working. It adds:
// - wrap diffuse (softer terminators: objects and snow have their own amounts);
// - a snow-blue tint on shadowed ambient light instead of plain grey;
// - darkening toward an object's base (not on the terrain, which is the ground);
// - fog by distance through the air and thicker low in the valley, in the horizon colour;
// - a Bayer 4×4 dither fade for cutaways and camera occluders.
// Everything runs off shared uniforms synced from a live `LookTuning`, and neutral values
// reproduce plain Lambert with FogExp2 exactly. The patch composes with other patches (the
// forest's wind sway) and throws if three's shader chunks no longer contain what it edits.

import {
  type Material,
  type MeshLambertMaterial,
  ShaderChunk,
  Vector3,
  type WebGLProgramParametersWithUniforms,
} from 'three';
import type { LookTuning } from '../../../data/tuning.ts';

export interface HearthOptions {
  /** Which wrap amount applies. */
  surface: 'objects' | 'snow';
  /** Darken toward the model's base. */
  heightGradient: boolean;
  /** Compile the dither fade (cutaways, occluders). */
  dither: boolean;
}

/** Shared uniforms: one object per value, referenced by every HearthMaterial program. */
export const hearthUniforms = {
  uHearthWrapObjects: { value: 0 },
  uHearthWrapSnow: { value: 0 },
  uHearthShadowTint: { value: new Vector3(1, 1, 1) },
  uHearthShadowTintStrength: { value: 0 },
  uHearthHeightDarken: { value: 0 },
  uHearthHeightRange: { value: 1 },
  uHearthFogRadial: { value: 0 },
  uHearthFogBase: { value: 0 },
  uHearthFogFalloff: { value: 60 },
  uHearthFogHeightMix: { value: 0 },
};

/** Copies a look's material values into the shared uniforms (cheap; the Stage does it per frame). */
export function syncHearthUniforms(look: LookTuning): void {
  const u = hearthUniforms;
  u.uHearthWrapObjects.value = look.wrapObjects;
  u.uHearthWrapSnow.value = look.wrapSnow;
  u.uHearthShadowTint.value.set(...look.shadowTint);
  u.uHearthShadowTintStrength.value = look.shadowTintStrength;
  u.uHearthHeightDarken.value = look.heightDarken;
  u.uHearthHeightRange.value = Math.max(1e-3, look.heightRange);
  u.uHearthFogRadial.value = look.fogRadial;
  u.uHearthFogBase.value = look.fogBase;
  u.uHearthFogFalloff.value = Math.max(1e-3, look.fogFalloff);
  u.uHearthFogHeightMix.value = look.fogHeightMix;
}

/** Replaces `anchor` exactly once, or fails loudly (three's chunks changed under us). */
export function replaceOnce(source: string, anchor: string, replacement: string, where: string): string {
  const at = source.indexOf(anchor);
  if (at < 0 || source.indexOf(anchor, at + anchor.length) >= 0) {
    throw new Error(`HearthMaterial: expected exactly one "${anchor.slice(0, 60)}…" in ${where}`);
  }
  return source.slice(0, at) + replacement + source.slice(at + anchor.length);
}

const SHARED_DECLARATIONS = `
varying vec3 vHearthWorld;
#ifdef HEARTH_HEIGHT
varying float vHearthHeight;
#endif
`;

const FRAGMENT_DECLARATIONS = `${SHARED_DECLARATIONS}
uniform float uHearthWrapObjects;
uniform float uHearthWrapSnow;
uniform vec3 uHearthShadowTint;
uniform float uHearthShadowTintStrength;
uniform float uHearthHeightDarken;
uniform float uHearthHeightRange;
uniform float uHearthFogRadial;
uniform float uHearthFogBase;
uniform float uHearthFogFalloff;
uniform float uHearthFogHeightMix;
#ifdef HEARTH_DITHER
uniform float uHearthFade;
float hearthBayer( vec2 p ) {
  ivec2 c = ivec2( mod( p, 4.0 ) );
  int m[ 16 ] = int[ 16 ]( 0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5 );
  return ( float( m[ c.x + c.y * 4 ] ) + 0.5 ) / 16.0;
}
#endif
`;

const WORLD_POSITION = `#include <project_vertex>
{
  vec4 hearthWorld = vec4( transformed, 1.0 );
  vec4 hearthBase = vec4( 0.0, 0.0, 0.0, 1.0 );
  #ifdef USE_BATCHING
    hearthWorld = batchingMatrix * hearthWorld;
    hearthBase = batchingMatrix * hearthBase;
  #endif
  #ifdef USE_INSTANCING
    hearthWorld = instanceMatrix * hearthWorld;
    hearthBase = instanceMatrix * hearthBase;
  #endif
  hearthWorld = modelMatrix * hearthWorld;
  vHearthWorld = hearthWorld.xyz;
  #ifdef HEARTH_HEIGHT
    vHearthHeight = hearthWorld.y - ( modelMatrix * hearthBase ).y;
  #endif
}`;

const SUN_SHADOW =
  'directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;';

/** Rewrites one Lambert shader pair in place. Exported for the chunk-anchor test. */
export function patchHearthShader(
  shader: { vertexShader: string; fragmentShader: string },
  o: HearthOptions,
): void {
  const defines = [
    `#define HEARTH_WRAP ${o.surface === 'snow' ? 'uHearthWrapSnow' : 'uHearthWrapObjects'}`,
    o.heightGradient ? '#define HEARTH_HEIGHT' : '',
    o.dither ? '#define HEARTH_DITHER' : '',
  ].join('\n');

  let vs = `${defines}\n${SHARED_DECLARATIONS}\n${shader.vertexShader}`;
  vs = replaceOnce(vs, '#include <project_vertex>', WORLD_POSITION, 'the Lambert vertex shader');
  shader.vertexShader = vs;

  const lambert = replaceOnce(
    ShaderChunk.lights_lambert_pars_fragment,
    'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );',
    'float dotNL = saturate( ( dot( geometryNormal, directLight.direction ) + HEARTH_WRAP ) / ( 1.0 + HEARTH_WRAP ) );',
    'lights_lambert_pars_fragment',
  );
  let lights = replaceOnce(
    ShaderChunk.lights_fragment_begin,
    'IncidentLight directLight;',
    'IncidentLight directLight;\nfloat hearthShadow = 1.0;',
    'lights_fragment_begin',
  );
  // Braces keep the declaration local: three unrolls this loop body once per light.
  lights = replaceOnce(
    lights,
    SUN_SHADOW,
    `{ ${SUN_SHADOW.replace('directLight.color *= ', 'float hearthLit = ')} directLight.color *= hearthLit; hearthShadow = min( hearthShadow, hearthLit ); }`,
    'lights_fragment_begin',
  );
  const fogOriginal = ShaderChunk.fog_fragment;
  const fog = `#ifdef USE_FOG
  #ifdef FOG_EXP2
    float hearthDist = mix( vFogDepth, length( vHearthWorld - cameraPosition ), uHearthFogRadial );
    float hearthFog = 1.0 - exp( - fogDensity * fogDensity * hearthDist * hearthDist );
    float hearthLow = exp( - max( 0.0, vHearthWorld.y - uHearthFogBase ) / uHearthFogFalloff );
    hearthFog *= mix( 1.0, hearthLow, uHearthFogHeightMix );
    gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, hearthFog );
  #else
    ${fogOriginal}
  #endif
#endif`;

  let fs = `${defines}\n${FRAGMENT_DECLARATIONS}\n${shader.fragmentShader}`;
  fs = replaceOnce(fs, '#include <lights_lambert_pars_fragment>', lambert, 'the Lambert fragment shader');
  fs = replaceOnce(fs, '#include <lights_fragment_begin>', lights, 'the Lambert fragment shader');
  fs = replaceOnce(
    fs,
    '#include <clipping_planes_fragment>',
    `#include <clipping_planes_fragment>
#ifdef HEARTH_DITHER
  if ( uHearthFade > 0.0 && hearthBayer( gl_FragCoord.xy ) < uHearthFade ) discard;
#endif`,
    'the Lambert fragment shader',
  );
  fs = replaceOnce(
    fs,
    '#include <color_fragment>',
    `#include <color_fragment>
#ifdef HEARTH_HEIGHT
  diffuseColor.rgb *= 1.0 - uHearthHeightDarken * ( 1.0 - smoothstep( 0.0, uHearthHeightRange, vHearthHeight ) );
#endif`,
    'the Lambert fragment shader',
  );
  fs = replaceOnce(
    fs,
    '#include <lights_fragment_end>',
    `#include <lights_fragment_end>
{
  #if NUM_DIR_LIGHTS > 0
    float hearthSun = saturate( ( dot( geometryNormal, directionalLights[ 0 ].direction ) + HEARTH_WRAP ) / ( 1.0 + HEARTH_WRAP ) ) * hearthShadow;
  #else
    float hearthSun = 1.0;
  #endif
  reflectedLight.indirectDiffuse *= mix( vec3( 1.0 ), uHearthShadowTint, uHearthShadowTintStrength * ( 1.0 - hearthSun ) );
}`,
    'the Lambert fragment shader',
  );
  fs = replaceOnce(fs, '#include <fog_fragment>', fog, 'the Lambert fragment shader');
  shader.fragmentShader = fs;
}

/** Per-material handle: the dither fade of this material's objects (0 = solid, 1 = gone). */
export interface HearthHandle {
  fade: { value: number };
}

/**
 * Turns a MeshLambertMaterial into a HearthMaterial, keeping any patch it already has (the
 * forest's sway runs first). Returns the material's own dither-fade uniform.
 */
export function applyHearth(material: MeshLambertMaterial, o: HearthOptions): HearthHandle {
  const fade = { value: 0 };
  const previous = material.onBeforeCompile.bind(material);
  const previousKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms, renderer) => {
    previous(shader, renderer);
    Object.assign(shader.uniforms, hearthUniforms, { uHearthFade: fade });
    patchHearthShader(shader, o);
  };
  const key = `hearth:${o.surface}:${o.heightGradient ? 1 : 0}:${o.dither ? 1 : 0}`;
  material.customProgramCacheKey = () => `${previousKey()}|${key}`;
  (material as Material).needsUpdate = true;
  return { fade };
}
