// The Grade (Plan Part 5.10): white balance, lift/gamma/gain, saturation, contrast and split
// toning after tone mapping, plus animated film grain that also hides sky banding. It grades in
// display space (gamma 2.2) and hands linear light back to the output pass. Neutral values leave
// the image as it was; the time-of-day key frames will drive it (M1.7).

import { BlendFunction, Effect } from 'postprocessing';
import { Uniform, Vector3 } from 'three';
import type { LookTuning } from '../../../data/tuning.ts';

const FRAGMENT = /* glsl */ `
uniform vec3 uBalance;
uniform vec3 uLift;
uniform vec3 uGamma;
uniform vec3 uGain;
uniform float uSaturation;
uniform float uContrast;
uniform vec3 uShadowTone;
uniform vec3 uHighlightTone;
uniform float uSplitBalance;
uniform float uSplitAmount;
uniform float uGrain;

float gradeHash( vec2 p ) {
  vec3 q = fract( vec3( p.xyx ) * 0.1031 );
  q += dot( q, q.yzx + 33.33 );
  return fract( ( q.x + q.y ) * q.z );
}

void mainImage( const in vec4 inputColor, const in vec2 uv, out vec4 outputColor ) {
  vec3 c = max( inputColor.rgb * uBalance, 0.0 );
  c = pow( c, vec3( 1.0 / 2.2 ) );
  c = uGain * ( c + uLift * ( 1.0 - c ) );
  c = pow( max( c, 0.0 ), 1.0 / max( uGamma, vec3( 1e-3 ) ) );
  float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
  c = mix( vec3( l ), c, uSaturation );
  c = ( c - 0.5 ) * uContrast + 0.5;
  // Split toning: shadows lean toward one tone and highlights toward another (0.5 grey = none).
  float w = smoothstep( 0.0, 1.0, clamp( l + uSplitBalance, 0.0, 1.0 ) );
  c += ( mix( uShadowTone, uHighlightTone, w ) - 0.5 ) * uSplitAmount;
  // Grain: per pixel, a new pattern every frame.
  c += ( gradeHash( uv * resolution + fract( time * 7.13 ) * 173.0 ) - 0.5 ) * uGrain;
  outputColor = vec4( pow( max( c, 0.0 ), vec3( 2.2 ) ), inputColor.a );
}
`;

export class GradeEffect extends Effect {
  constructor() {
    const v3 = (x: number, y: number, z: number) => new Uniform(new Vector3(x, y, z));
    super('GradeEffect', FRAGMENT, {
      blendFunction: BlendFunction.SRC,
      uniforms: new Map<string, Uniform>([
        ['uBalance', v3(1, 1, 1)],
        ['uLift', v3(0, 0, 0)],
        ['uGamma', v3(1, 1, 1)],
        ['uGain', v3(1, 1, 1)],
        ['uSaturation', new Uniform(1)],
        ['uContrast', new Uniform(1)],
        ['uShadowTone', v3(0.5, 0.5, 0.5)],
        ['uHighlightTone', v3(0.5, 0.5, 0.5)],
        ['uSplitBalance', new Uniform(0)],
        ['uSplitAmount', new Uniform(0)],
        ['uGrain', new Uniform(0)],
      ]),
    });
  }

  /** Copies a look's grade into the uniforms (cheap; the Stage does it every frame). */
  sync(look: LookTuning): void {
    const u = this.uniforms;
    const vec = (name: string, v: readonly [number, number, number]) =>
      (u.get(name)?.value as Vector3 | undefined)?.set(v[0], v[1], v[2]);
    const num = (name: string, v: number) => {
      const uniform = u.get(name);
      if (uniform) uniform.value = v;
    };
    vec('uBalance', look.balance);
    vec('uLift', look.lift);
    vec('uGamma', look.gamma);
    vec('uGain', look.gain);
    num('uSaturation', look.saturation);
    num('uContrast', look.contrast);
    vec('uShadowTone', look.shadowTone);
    vec('uHighlightTone', look.highlightTone);
    num('uSplitBalance', look.splitBalance);
    num('uSplitAmount', look.splitAmount);
    num('uGrain', look.grain);
  }
}
