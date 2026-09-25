// The forest (Plan Part 7.4): one InstancedMesh per species × LOD (three LOD0 models per species so
// near trees don't repeat), filled a few times a second with the trees the camera can see — CPU
// frustum culling plus distance LODs with hysteresis. About a dozen draw calls for ~3,200 trees.
// Pines and birches sway in the shared wind; saplings borrow the LOD1 models, stumps have their own.

import {
  type Camera,
  Color,
  DynamicDrawUsage,
  Euler,
  Frustum,
  Group,
  InstancedMesh,
  Matrix4,
  MeshLambertMaterial,
  Quaternion,
  Sphere,
  Vector3,
} from 'three';
import { Rng } from '../../core/rng.ts';
import type { ForestViewTuning } from '../../data/tuning.ts';
import { type TreeSpecies, wrenhollowForests } from '../../data/world/forests.ts';
import type { TreeSite } from '../../sim/world/Sites.ts';
import { shared } from '../render/sharedUniforms.ts';
import type { Part } from './Joinery.ts';
import { birch, birchLod, pine, pineLod, stumpPart } from './trees.ts';

/** Trunk radius of the model-height trees (m); shared with the sim's colliders. */
const TRUNK_RADIUS = wrenhollowForests.trunkRadius;
/** Where the crown's bounding sphere sits (fraction of height) and its radius (fraction of height). */
const SPHERE_CENTRE = 0.55;
const SPHERE_RADIUS = 0.6;

type BucketKey = `${TreeSpecies}:${number}:${number}` | 'stump';

interface Bucket {
  mesh: InstancedMesh;
  count: number;
}

interface ForestTree {
  site: TreeSite;
  /** Bucket keys by LOD (LOD0 carries the tree's variant); stumps use one bucket at every LOD. */
  keys: BucketKey[];
  matrix: Float32Array;
  color: [number, number, number];
  centreY: number;
  radius: number;
  /** Current LOD, or −1 when culled. */
  lod: number;
}

/** The LOD for a distance, keeping the current one within `hysteresis` of a threshold. */
export function forestLod(
  distance: number,
  current: number,
  distances: readonly number[],
  hysteresis: number,
): number {
  let lod = 0;
  distances.forEach((d, l) => {
    if (distance >= d + (current >= 0 && l < current ? -hysteresis : hysteresis)) lod = l + 1;
  });
  return lod;
}

export class Forest {
  readonly group = new Group();
  readonly trees: ForestTree[] = [];
  private readonly buckets = new Map<BucketKey, Bucket>();
  private readonly t: ForestViewTuning;
  private readonly frustum = new Frustum();
  private readonly viewProj = new Matrix4();
  private readonly sphere = new Sphere();
  private sinceUpdate = Infinity;

  constructor(sites: readonly TreeSite[], t: ForestViewTuning, seed: number) {
    this.t = t;
    const material = new MeshLambertMaterial({ vertexColors: true });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = shared.uTime;
      shader.uniforms.uWind = shared.uWind;
      shader.uniforms.uSway = { value: [t.swayAmplitude, t.swaySpeed, wrenhollowForests.modelHeight] };
      shader.vertexShader = `uniform float uTime;\nuniform vec2 uWind;\nuniform vec3 uSway;\n${shader.vertexShader.replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec2 swayRoot = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
        #else
          vec2 swayRoot = vec2(0.0);
        #endif
        float swayH = max(transformed.y, 0.0) / uSway.z;
        float swayPhase = dot(swayRoot, vec2(0.071, 0.113));
        float swayWave = sin(uTime * uSway.y + swayPhase) + 0.4 * sin(uTime * uSway.y * 2.3 + swayPhase * 1.7);
        transformed.xz += uWind * (uSway.x * swayH * swayH * swayWave);`,
      )}`;
    };
    material.customProgramCacheKey = () => 'forest-sway';

    const count = (predicate: (s: TreeSite) => boolean) => sites.filter(predicate).length;
    const rng = new Rng(seed).fork('forest-models');
    const h = wrenhollowForests.modelHeight;
    const models: Record<TreeSpecies, { lod0: Part[]; lod1: Part; lod2: Part }> = {
      pine: {
        lod0: Array.from({ length: t.lod0Variants }, () => {
          const p = pine(h, TRUNK_RADIUS.pine, rng);
          return p.stump.add(p.crown.at(0, p.hingeY, 0));
        }),
        lod1: pineLod(h, TRUNK_RADIUS.pine, 4, 6),
        lod2: pineLod(h, TRUNK_RADIUS.pine, 2, 5),
      },
      birch: {
        lod0: Array.from({ length: t.lod0Variants }, () => {
          const b = birch(h, TRUNK_RADIUS.birch, rng);
          return b.stump.add(b.crown.at(0, b.hingeY, 0));
        }),
        lod1: birchLod(h, TRUNK_RADIUS.birch, 5, 5, true),
        lod2: birchLod(h, TRUNK_RADIUS.birch, 0, 4, true),
      },
    };
    const addBucket = (key: BucketKey, part: Part, capacity: number, castShadow: boolean) => {
      const mesh = new InstancedMesh(part.toGeometry(), material, Math.max(1, capacity));
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      // The first setColorAt allocates the per-instance colour attribute for the whole capacity.
      mesh.setColorAt(0, new Color(1, 1, 1));
      mesh.instanceColor?.setUsage(DynamicDrawUsage);
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      mesh.name = `forest ${key}`;
      this.buckets.set(key, { mesh, count: 0 });
      this.group.add(mesh);
    };
    for (const species of ['pine', 'birch'] as const) {
      const all = count((s) => s.species === species && s.state !== 'stump');
      models[species].lod0.forEach((part, v) => {
        addBucket(
          `${species}:0:${v}`,
          part,
          count((s) => s.species === species && s.state === 'mature' && s.id % t.lod0Variants === v),
          true,
        );
      });
      addBucket(`${species}:1:0`, models[species].lod1, all, true);
      addBucket(`${species}:2:0`, models[species].lod2, all, false);
    }
    addBucket(
      'stump',
      stumpPart(TRUNK_RADIUS.pine),
      count((s) => s.state === 'stump'),
      false,
    );

    const m = new Matrix4();
    const q = new Quaternion();
    const e = new Euler();
    const pos = new Vector3();
    const scl = new Vector3();
    for (const site of sites) {
      const grownScale = site.height / h;
      const scale = site.state === 'sapling' ? t.saplingHeight / h : grownScale;
      e.set(site.state === 'mature' ? site.lean : 0, site.yaw, 0, 'YXZ');
      q.setFromEuler(e);
      m.compose(pos.set(site.x, site.y - 0.1, site.z), q, scl.setScalar(scale));
      const b = 1 + site.tint * t.tintAmount;
      const variant = site.id % t.lod0Variants;
      const keys: BucketKey[] =
        site.state === 'stump'
          ? ['stump', 'stump', 'stump']
          : site.state === 'sapling'
            ? [`${site.species}:1:0`, `${site.species}:1:0`, `${site.species}:1:0`]
            : [`${site.species}:0:${variant}`, `${site.species}:1:0`, `${site.species}:2:0`];
      const height = site.state === 'mature' ? site.height : site.state === 'sapling' ? t.saplingHeight : 0.5;
      this.trees.push({
        site,
        keys,
        matrix: new Float32Array(m.elements),
        color: [b, b, b],
        centreY: site.y + height * SPHERE_CENTRE,
        radius: Math.max(1, height * SPHERE_RADIUS),
        lod: -1,
      });
    }
  }

  /** Re-culls and re-LODs at most `updateHz` times a second. */
  update(camera: Camera, dt: number): void {
    this.sinceUpdate += dt;
    if (this.sinceUpdate < 1 / this.t.updateHz) return;
    this.sinceUpdate = 0;
    this.refresh(camera);
  }

  /** Fills every bucket with the trees in view, at their LODs, now. */
  refresh(camera: Camera): void {
    camera.updateMatrixWorld();
    this.viewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.viewProj);
    for (const b of this.buckets.values()) b.count = 0;
    const cam = camera.position;
    for (const tree of this.trees) {
      const s = tree.site;
      this.sphere.center.set(s.x, tree.centreY, s.z);
      this.sphere.radius = tree.radius;
      if (!this.frustum.intersectsSphere(this.sphere)) {
        tree.lod = -1;
        continue;
      }
      const d = Math.hypot(s.x - cam.x, s.y - cam.y, s.z - cam.z);
      if (s.state === 'stump' && d > this.t.stumpDistance) {
        tree.lod = -1;
        continue;
      }
      tree.lod = forestLod(d, tree.lod, this.t.lodDistances, this.t.lodHysteresis);
      const bucket = this.buckets.get(tree.keys[tree.lod] as BucketKey);
      if (!bucket) continue;
      bucket.mesh.instanceMatrix.array.set(tree.matrix, bucket.count * 16);
      bucket.mesh.instanceColor?.array.set(tree.color, bucket.count * 3);
      bucket.count++;
    }
    for (const b of this.buckets.values()) {
      b.mesh.count = b.count;
      b.mesh.instanceMatrix.needsUpdate = true;
      if (b.mesh.instanceColor) b.mesh.instanceColor.needsUpdate = true;
    }
  }

  /** Instances drawn per bucket at the last refresh. */
  counts(): Record<string, number> {
    return Object.fromEntries([...this.buckets].map(([k, b]) => [k, b.count]));
  }

  visible(): number {
    let n = 0;
    for (const b of this.buckets.values()) n += b.count;
    return n;
  }
}
