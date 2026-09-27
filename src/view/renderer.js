import { THREE } from './three.js';
import { SHAPES, buildLook, humanDims, mountDims, mountLegs, primMatrix } from './looks.js';
import { PROJ_LOOKS } from './projlooks.js';

export const TEAM_COLORS = [
  [new THREE.Color('#2f6fe4'), new THREE.Color('#1d4596')],
  [new THREE.Color('#e0403a'), new THREE.Color('#962522')],
];

const CAP = { box: 9000, sphere: 9000, cyl: 4000, cone: 3000, torus: 1500 };

function makeGeometries() {
  const g = {
    box: new THREE.BoxGeometry(1, 1, 1),
    sphere: new THREE.IcosahedronGeometry(0.5, 1),
    cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
    cone: new THREE.ConeGeometry(0.5, 1, 10),
    torus: new THREE.TorusGeometry(0.4, 0.1, 6, 14),
  };
  return g;
}

const _m = new THREE.Matrix4();
const _m2 = new THREE.Matrix4();
const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _one = new THREE.Vector3(1, 1, 1);
const _c = new THREE.Color();
const _white = new THREE.Color('#ffffff');
const _dark = new THREE.Color('#3a3a44');
const _zAxis = new THREE.Vector3(0, 0, 1);
const _xAxis = new THREE.Vector3(1, 0, 0);

export class Renderer {
  constructor(canvas, { mobile }) {
    this.mobile = mobile;
    const r = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = mobile ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;

    this.r = r;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.2, 600);
    this.camera.position.set(0, 26, 48);
    this.camera.lookAt(0, 0, 0);

    this.hemi = new THREE.HemisphereLight('#dff1ff', '#6b5a3a', 0.6);
    this.scene.add(this.hemi);
    const sun = new THREE.DirectionalLight('#fff1d6', 0.95);
    sun.position.set(-30, 60, 25);
    sun.castShadow = true;
    const ss = mobile ? 1024 : 2048;
    sun.shadow.mapSize.set(ss, ss);
    const sc = sun.shadow.camera;
    sc.left = -48;
    sc.right = 48;
    sc.top = 42;
    sc.bottom = -42;
    sc.near = 10;
    sc.far = 160;
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun);
    this.scene.add(sun.target);
    this.sun = sun;

    // Shared instanced meshes for every unit primitive in the game.
    this.geos = makeGeometries();
    this.meshes = {};
    this.counts = {};
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0.02, flatShading: true });
    this.unitMat = mat;
    for (const s of SHAPES) {
      const m = new THREE.InstancedMesh(this.geos[s], mat, CAP[s]);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CAP[s] * 3), 3);
      m.instanceColor.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      m.castShadow = true;
      m.receiveShadow = true;
      m.count = 0;
      this.scene.add(m);
      this.meshes[s] = m;
      this.counts[s] = 0;
    }
    this.mapGroup = new THREE.Group();
    this.scene.add(this.mapGroup);
    this.lodDist = mobile ? 30 : 45;
    this.time = 0;
    this.projLooks = {};
    for (const k in PROJ_LOOKS) this.projLooks[k] = compileProj(PROJ_LOOKS[k]);
  }

  resize(w, h) {
    this.r.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------- map
  loadMap(map, ground) {
    const g = this.mapGroup;
    while (g.children.length) {
      const c = g.children.pop();
      c.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose?.();
      });
    }
    const th = map.theme;
    this.theme = th;
    this.scene.fog = new THREE.Fog(th.fog, 70, 230);
    this.sun.color.set(th.sun);
    this.hemi.color.set(th.skyBottom);
    this.hemi.groundColor.set(th.grassB);
    this.r.setClearColor(th.fog);

    // Sky dome
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(400, 24, 12),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: new THREE.Color(th.skyTop) }, bottom: { value: new THREE.Color(th.skyBottom) } },
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader:
          'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float t = smoothstep(-0.05, 0.55, vP.y); vec3 c = mix(bottom, top, t); float sun = pow(max(0.0, dot(vP, normalize(vec3(-0.45,0.7,0.4)))), 64.0); c += vec3(1.0,0.9,0.7)*sun*0.6; gl_FragColor = vec4(c,1.0); }',
      }),
    );
    sky.renderOrder = -1;
    g.add(sky);

    // Terrain
    const { nx, nz, es, halfW, halfD, heights, flat } = ground;
    const geo = new THREE.PlaneGeometry(halfW * 2, halfD * 2, nx - 1, nz - 1);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    const cA = new THREE.Color(th.grassA);
    const cB = new THREE.Color(th.grassB);
    const cD = new THREE.Color(th.dirt);
    const cR = new THREE.Color(th.rock || th.dirt);
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k);
      const z = pos.getZ(k);
      const i = Math.round((x + halfW) / es);
      const j = Math.round((z + halfD) / es);
      const y = flat ? 0 : heights[i * nz + j];
      pos.setY(k, y);
      const n = noise2(x * 0.08, z * 0.08) * 0.6 + noise2(x * 0.31, z * 0.29) * 0.4;
      _c.copy(cA).lerp(cB, Math.max(0, Math.min(1, n * 0.5 + 0.5)));
      // slope/depth based dirt & rock
      if (!flat) {
        const hx = heights[Math.min(nx - 1, i + 1) * nz + j] - heights[Math.max(0, i - 1) * nz + j];
        const hz = heights[i * nz + Math.min(nz - 1, j + 1)] - heights[i * nz + Math.max(0, j - 1)];
        const slope = Math.hypot(hx, hz) / (2 * es);
        if (slope > 0.45) _c.lerp(cR, Math.min(1, (slope - 0.45) * 1.5));
        if (y < -1) _c.lerp(cR, Math.min(1, -y / 4));
      }
      // mowed stripes / field centre line
      if (Math.abs(x) < 36 && Math.abs(z) < 30) {
        const stripe = Math.floor((x + 100) / 6) % 2 === 0 ? 0.04 : -0.02;
        _c.offsetHSL(0, 0, stripe);
      } else _c.lerp(cD, 0.15);
      if (Math.abs(z) < 0.35 && Math.abs(x) < 36) _c.lerp(_white, 0.22);
      cols[k * 3] = _c.r;
      cols[k * 3 + 1] = _c.g;
      cols[k * 3 + 2] = _c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: !!th.ice === false && !flat }));
    terrain.receiveShadow = true;
    g.add(terrain);
    this.terrain = terrain;

    // Outer skirt so the world does not end abruptly.
    const skirt = new THREE.Mesh(new THREE.CircleGeometry(420, 32), new THREE.MeshLambertMaterial({ color: new THREE.Color(th.grassB).multiplyScalar(0.92) }));
    skirt.rotation.x = -Math.PI / 2;
    skirt.position.y = flat ? -0.05 : 5.5;
    g.add(skirt);

    if (th.ice) {
      const ice = new THREE.Mesh(
        new THREE.CircleGeometry(44, 48),
        new THREE.MeshStandardMaterial({ color: '#bfe3f2', roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.55 }),
      );
      ice.scale.set(1, 0.8, 1);
      ice.rotation.x = -Math.PI / 2;
      ice.position.y = 0.02;
      ice.receiveShadow = true;
      g.add(ice);
    }

    // Water in the gorge
    if (map.water) {
      const w = new THREE.Mesh(
        new THREE.PlaneGeometry(halfW * 2, 14, 1, 1),
        new THREE.MeshStandardMaterial({ color: map.water.color, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.85 }),
      );
      w.rotation.x = -Math.PI / 2;
      w.position.y = map.water.y;
      g.add(w);
      this.water = w;
    } else this.water = null;

    // Props (bridges, rails)
    for (const p of map.props || []) {
      if (p.shape !== 'box') continue;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(p.size[0], p.size[1], p.size[2]), new THREE.MeshStandardMaterial({ color: p.color || '#8a6a4a', roughness: 0.9 }));
      mesh.position.set(p.pos[0], p.pos[1], p.pos[2]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
      if (p.kind === 'bridge') {
        // plank lines
        const n = Math.floor(p.size[2] / 0.6);
        const plankGeo = new THREE.BoxGeometry(p.size[0] * 1.02, 0.06, 0.08);
        const pm = new THREE.MeshLambertMaterial({ color: '#6e4a28' });
        const planks = new THREE.InstancedMesh(plankGeo, pm, n);
        for (let i = 0; i < n; i++) {
          _m.makeTranslation(p.pos[0], p.pos[1] + p.size[1] / 2 + 0.01, p.pos[2] - p.size[2] / 2 + (i + 0.5) * 0.6);
          planks.setMatrixAt(i, _m);
        }
        g.add(planks);
        // rope posts
        for (const sx of [-1, 1])
          for (const sz of [-1, 1]) {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 2.2, 8), new THREE.MeshLambertMaterial({ color: '#5a3a1f' }));
            post.position.set(p.pos[0] + (sx * p.size[0]) / 2, 0.6, p.pos[2] + (sz * p.size[2]) / 2);
            post.castShadow = true;
            g.add(post);
          }
      }
    }

    // Hazards
    this.lavaMats = [];
    for (const h of map.hazards || []) {
      if (h.type === 'lava') {
        const mat = new THREE.ShaderMaterial({
          uniforms: { t: { value: 0 } },
          vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
          fragmentShader:
            'uniform float t; varying vec2 vU; void main(){ vec2 p = vU-0.5; float r = length(p)*2.0; float w = sin(p.x*18.0+t*1.7)*sin(p.y*16.0-t*1.3)*0.5+0.5; vec3 c = mix(vec3(1.0,0.35,0.05), vec3(1.0,0.85,0.25), w*(1.0-r)); c = mix(c, vec3(0.35,0.08,0.03), smoothstep(0.82,1.0,r)); gl_FragColor = vec4(c,1.0); }',
        });
        this.lavaMats.push(mat);
        const disc = new THREE.Mesh(new THREE.CircleGeometry(h.r + 0.5, 28), mat);
        disc.rotation.x = -Math.PI / 2;
        disc.position.set(h.x, ground.heightAt(h.x, h.z) + 0.12, h.z);
        g.add(disc);
        const glow = new THREE.PointLight('#ff7a2a', 1.2, h.r * 4);
        glow.position.set(h.x, 1.5, h.z);
        if (!this.mobile) g.add(glow);
      } else if (h.type === 'geyser') {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(h.r * 0.7, 0.35, 6, 12), new THREE.MeshStandardMaterial({ color: '#3b302e', roughness: 1, flatShading: true }));
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(h.x, ground.heightAt(h.x, h.z) + 0.1, h.z);
        ring.castShadow = true;
        g.add(ring);
        const hole = new THREE.Mesh(new THREE.CircleGeometry(h.r * 0.55, 16), new THREE.MeshBasicMaterial({ color: '#a8d8e8' }));
        hole.rotation.x = -Math.PI / 2;
        hole.position.set(h.x, ground.heightAt(h.x, h.z) + 0.08, h.z);
        g.add(hole);
      }
    }

    // Deployment zones overlay (visible in build phase)
    const zoneMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { a: { value: 1 }, redA: { value: 0.35 }, t: { value: 0 } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
      fragmentShader:
        'uniform float a; uniform float redA; uniform float t; varying vec3 vW; void main(){ float inX = step(abs(vW.x), 34.0); float blue = step(4.0, vW.z)*step(vW.z, 26.0)*inX; float red = step(vW.z, -4.0)*step(-26.0, vW.z)*inX; float edge = 0.0; float bx = min(abs(abs(vW.x)-34.0), min(abs(vW.z-4.0), abs(vW.z-26.0))); float rx = min(abs(abs(vW.x)-34.0), min(abs(vW.z+4.0), abs(vW.z+26.0))); float stripes = step(0.5, fract((vW.x+vW.z)*0.25 + t*0.2)); vec3 c = vec3(0.0); float al = 0.0; if (blue > 0.0) { c = vec3(0.2,0.45,1.0); al = 0.13 + 0.05*stripes + 0.5*(1.0-smoothstep(0.0,0.18,bx)); } if (red > 0.0) { c = vec3(1.0,0.25,0.2); al = (0.13 + 0.05*stripes)*redA/0.35 + 0.5*(1.0-smoothstep(0.0,0.18,rx))*redA/0.35; } gl_FragColor = vec4(c, al*a); }',
    });
    const zone = new THREE.Mesh(geo, zoneMat);
    zone.position.y = 0.04;
    zone.renderOrder = 2;
    g.add(zone);
    this.zone = zone;
    this.zoneMat = zoneMat;

    this.buildDecor(map, ground);
  }

  setZones(visible, redAlpha = 0.35) {
    if (!this.zone) return;
    this.zone.visible = visible;
    this.zoneMat.uniforms.redA.value = redAlpha;
  }

  buildDecor(map, ground) {
    const th = map.theme;
    const kind = th.decor;
    const rng = mulberry(1234);
    const items = { trunk: [], leaf: [], rock: [], flower: [], tuft: [] };
    const inField = (x, z) => Math.abs(x) < 39 && Math.abs(z) < 33;
    for (let i = 0; i < 420; i++) {
      const x = (rng() - 0.5) * 150;
      const z = (rng() - 0.5) * 130;
      if (inField(x, z)) continue;
      const y = ground.heightAt(x, z);
      const t = rng();
      if (kind === 'cinder') {
        if (t < 0.7) items.rock.push([x, y, z, 1 + rng() * 2.4, rng()]);
        else items.trunk.push([x, y, z, 0.8 + rng(), rng()]); // dead trees
      } else if (t < 0.55) {
        items.trunk.push([x, y, z, 0.9 + rng() * 0.9, rng()]);
        items.leaf.push([x, y, z, 0.9 + rng() * 0.9, rng()]);
      } else if (t < 0.8) items.rock.push([x, y, z, 0.6 + rng() * 1.6, rng()]);
    }
    // small in-field details
    for (let i = 0; i < (this.mobile ? 150 : 400); i++) {
      const x = (rng() - 0.5) * 76;
      const z = (rng() - 0.5) * 64;
      if (map.noDeploy && map.noDeploy(x, z)) continue;
      const y = ground.surfaceAt(x, z);
      if (y < -1) continue;
      if (kind === 'meadow' || kind === 'hills') {
        if (rng() < 0.5) items.flower.push([x, y, z, 1, rng()]);
        else items.tuft.push([x, y, z, 1, rng()]);
      } else if (kind === 'cinder' && rng() < 0.3) items.rock.push([x, y, z, 0.25 + rng() * 0.3, rng()]);
      else if (kind === 'ice' && rng() < 0.3) items.tuft.push([x, y, z, 1, rng()]);
      else if (kind === 'gorge') items.tuft.push([x, y, z, 1, rng()]);
    }
    const pine = kind === 'gorge' || kind === 'ice' || kind === 'hills';
    const leafCol = kind === 'ice' ? '#e9f4f7' : pine ? '#3f7a45' : '#4f9a3e';
    const defs = {
      trunk: [new THREE.CylinderGeometry(0.18, 0.28, 2.2, 6), kind === 'cinder' ? '#2d2422' : '#6b4a2e', (it, m) => m.compose(_v.set(it[0], it[1] + 1.1 * it[3], it[2]), _q.setFromAxisAngle(_zAxis, (it[4] - 0.5) * 0.1), new THREE.Vector3(it[3], it[3], it[3]))],
      leaf: [pine ? new THREE.ConeGeometry(1.4, 3.6, 7) : new THREE.IcosahedronGeometry(1.5, 0), leafCol, (it, m) => m.compose(_v.set(it[0], it[1] + (pine ? 3.4 : 3.0) * it[3], it[2]), _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), it[4] * 6), new THREE.Vector3(it[3], it[3] * (pine ? 1 : 0.9), it[3]))],
      rock: [new THREE.DodecahedronGeometry(0.6, 0), kind === 'cinder' ? '#3a2f2c' : kind === 'ice' ? '#aebfcc' : '#8f8a80', (it, m) => m.compose(_v.set(it[0], it[1] + 0.15 * it[3], it[2]), _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), it[4] * 6), new THREE.Vector3(it[3], it[3] * 0.6, it[3] * 0.9))],
      flower: [new THREE.IcosahedronGeometry(0.09, 0), null, (it, m) => m.compose(_v.set(it[0], it[1] + 0.12, it[2]), _q.identity(), _one)],
      tuft: [new THREE.ConeGeometry(0.12, 0.35, 4), kind === 'ice' ? '#ffffff' : kind === 'gorge' ? '#8a9a4a' : '#5e9a3a', (it, m) => m.compose(_v.set(it[0], it[1] + 0.12, it[2]), _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), it[4] * 6), _one)],
    };
    const flowerCols = ['#fff27a', '#ffffff', '#ff9ec7', '#c9a4ff'];
    for (const k in items) {
      const list = items[k];
      if (!list.length) continue;
      const [geo, col, fn] = defs[k];
      const mat = new THREE.MeshStandardMaterial({ color: col || '#ffffff', roughness: 0.9, flatShading: true });
      const im = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((it, i) => {
        fn(it, _m);
        im.setMatrixAt(i, _m);
        if (k === 'flower') im.setColorAt(i, _c.set(flowerCols[i % 4]));
      });
      im.castShadow = k !== 'flower' && k !== 'tuft';
      im.receiveShadow = true;
      this.mapGroup.add(im);
    }
  }

  // ---------------------------------------------------------------- units
  beginFrame() {
    for (const s of SHAPES) this.counts[s] = 0;
  }

  endFrame() {
    for (const s of SHAPES) {
      const m = this.meshes[s];
      m.count = this.counts[s];
      m.instanceMatrix.needsUpdate = true;
      m.instanceColor.needsUpdate = true;
    }
  }

  push(shape, matrix, color) {
    const i = this.counts[shape];
    const mesh = this.meshes[shape];
    if (i >= CAP[shape]) return;
    matrix.toArray(mesh.instanceMatrix.array, i * 16);
    const a = mesh.instanceColor.array;
    a[i * 3] = color.r;
    a[i * 3 + 1] = color.g;
    a[i * 3 + 2] = color.b;
    this.counts[shape] = i + 1;
  }

  unitColors(u) {
    const look = buildLook(u.def);
    const tc = TEAM_COLORS[u.team];
    return look.map((p) => {
      if (p.color === 'team') return tc[0].clone();
      if (p.color === 'teamDark') return tc[1].clone();
      if (p.color === 'skin') return new THREE.Color(p.skin);
      const c = new THREE.Color(p.color);
      if (p.glow) c.multiplyScalar(1.6);
      return c;
    });
  }

  drawUnit(u, camPos, bonesOut) {
    const look = buildLook(u.def);
    if (!u.view) u.view = { colors: this.unitColors(u), bones: {} };
    const V = u.view;
    const B = V.bones;
    const P = u.p;
    const bm = (k, body) => {
      const m = B[k] || (B[k] = new THREE.Matrix4());
      const q = body.quaternion;
      _q2.set(q.x, q.y, q.z, q.w);
      m.compose(body.position, _q2, _one);
      return m;
    };
    B.torso = bm('torso', P.torso);
    bm('head', P.head);
    bm('armL', P.armL);
    bm('armR', P.armR);
    bm('legL', P.legL);
    bm('legR', P.legR);
    const al = u.D.armLen / 2;
    (B.handL || (B.handL = new THREE.Matrix4())).multiplyMatrices(B.armL, _m2.makeTranslation(0, -al, 0));
    (B.handR || (B.handR = new THREE.Matrix4())).multiplyMatrices(B.armR, _m2.makeTranslation(0, -al, 0));
    if (P.mount) {
      bm('mount', P.mount);
      if (P.mountHead) bm('mountHead', P.mountHead);
      const M = u.M;
      if (!V.legs) V.legs = mountLegs(M);
      if (M.wheels) (B.wheel || (B.wheel = new THREE.Matrix4())).copy(B.mount);
      if (V.legs.length) {
        const amp = u.alive ? Math.min(0.75, Math.hypot(u.base.velocity.x, u.base.velocity.z) * 0.12) : 0.9;
        for (const L of V.legs) {
          const ang = u.alive ? Math.sin(u.gait * 1.0 + L.ph) * amp : (L.z >= 0 ? 1 : -1) * amp;
          const m = B[L.bone] || (B[L.bone] = new THREE.Matrix4());
          _m2.makeTranslation(L.x, L.y, L.z);
          m.multiplyMatrices(B.mount, _m2);
          _m2.makeRotationX(ang);
          m.multiply(_m2);
        }
      }
    }
    const tp = P.torso.position;
    const far = camPos ? Math.hypot(tp.x - camPos.x, tp.y - camPos.y, tp.z - camPos.z) > this.lodDist : false;
    const fl = u.flash;
    const dead = !u.alive;
    for (let i = 0; i < look.length; i++) {
      const p = look[i];
      if (far && p.detail) continue;
      const bone = B[p.bone];
      if (!bone) continue;
      if (p.bone === 'wheel') {
        // spin each wheel about its own axle (cylinder: local y, torus: local z)
        _m.multiplyMatrices(bone, p.local);
        if (p.shape === 'torus') _m2.makeRotationZ(u.gait * 2);
        else _m2.makeRotationY(u.gait * 2);
        _m.multiply(_m2);
      } else _m.multiplyMatrices(bone, p.local);
      let c = V.colors[i];
      if (fl > 0 || dead) {
        _c.copy(c);
        if (dead) _c.lerp(_dark, 0.3);
        if (fl > 0) _c.lerp(_white, fl * 0.85);
        c = _c;
      }
      this.push(p.shape, _m, c);
    }
  }

  drawProjectile(p) {
    const look = this.projLooks[p.look] || (PROJ_LOOKS[p.look] && (this.projLooks[p.look] = compileProj(PROJ_LOOKS[p.look]))) || this.projLooks.arrow;
    _v.set(p.vx, p.vy, p.vz);
    const sp = _v.length();
    if (sp > 0.001) _v.multiplyScalar(1 / sp);
    else _v.set(0, 0, 1);
    _q.setFromUnitVectors(_zAxis, _v);
    if (p.spin) {
      _q2.setFromAxisAngle(_xAxis, p.age * p.spin);
      _q.multiply(_q2);
    }
    _m2.compose(_v.set(p.x, p.y, p.z), _q, _one);
    for (const pr of look) {
      _m.multiplyMatrices(_m2, pr.local);
      this.push(pr.shape, _m, pr.color);
    }
  }

  drawStatic(shape, matrix, color) {
    this.push(shape, matrix, color);
  }

  render() {
    this.r.render(this.scene, this.camera);
  }

  update(dt) {
    this.time += dt;
    for (const m of this.lavaMats || []) m.uniforms.t.value = this.time;
    if (this.zoneMat) this.zoneMat.uniforms.t.value = this.time;
    if (this.water) this.water.position.y += Math.sin(this.time * 1.3) * 0.002;
  }
}

function compileProj(prims) {
  return prims.map(([shape, pos, size, color, rot]) => ({ shape, local: primMatrix(pos, size, rot, 1), color: new THREE.Color(color) }));
}

// Static rest-pose model of a unit (for thumbnails and the placement ghost).
export function restBones(def) {
  const s = def.scale || 1;
  const D = humanDims(s, def.bulk || 1);
  const M = def.mount ? mountDims(def.mount) : null;
  const rb = M ? M.saddleY - D.hipY + 0.05 * s : 0;
  const rz = M ? M.riderZ : 0;
  const T = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
  const B = {
    torso: T(0, rb + D.torsoY, rz),
    head: T(0, rb + D.headY, rz),
    armL: T(-D.shoulderX, rb + D.shoulderY - D.armLen / 2, rz),
    armR: T(D.shoulderX, rb + D.shoulderY - D.armLen / 2, rz),
    legL: T(-D.hipX, rb + D.hipY - D.legLen / 2, rz),
    legR: T(D.hipX, rb + D.hipY - D.legLen / 2, rz),
  };
  B.handL = T(-D.shoulderX, rb + D.shoulderY - D.armLen, rz);
  B.handR = T(D.shoulderX, rb + D.shoulderY - D.armLen, rz);
  if (M) {
    B.mount = T(0, M.bodyY, 0);
    const hy = M.bodyH * 0.5 + M.neck * M.ms;
    B.mountHead = T(0, M.bodyY + hy, M.bodyLen / 2 + M.headR * 0.6);
    B.wheel = B.mount.clone();
    for (const L of mountLegs(M)) B[L.bone] = T(L.x, M.bodyY + L.y, L.z);
  }
  if (M && M.rider === 'straddle') {
    // rider legs straddle
    B.legL = new THREE.Matrix4().compose(new THREE.Vector3(-D.hipX - 0.15 * s, rb + D.hipY - D.legLen / 2 + 0.1 * s, rz), new THREE.Quaternion().setFromAxisAngle(_zAxis, -0.5), _one);
    B.legR = new THREE.Matrix4().compose(new THREE.Vector3(D.hipX + 0.15 * s, rb + D.hipY - D.legLen / 2 + 0.1 * s, rz), new THREE.Quaternion().setFromAxisAngle(_zAxis, 0.5), _one);
  }
  return B;
}

export function buildStaticModel(def, team, opts = {}) {
  const look = buildLook(def);
  const B = restBones(def);
  const group = new THREE.Group();
  const geos = opts.geos || makeGeometries();
  const tc = TEAM_COLORS[team];
  const mats = new Map();
  for (const p of look) {
    const bone = B[p.bone];
    if (!bone) continue;
    let col = p.color === 'team' ? tc[0] : p.color === 'teamDark' ? tc[1] : p.color === 'skin' ? p.skin : p.color;
    const key = typeof col === 'string' ? col : col.getHexString();
    let mat = mats.get(key);
    if (!mat) {
      mat = opts.ghost
        ? new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55, depthWrite: false })
        : new THREE.MeshStandardMaterial({ color: col, roughness: 0.75, flatShading: true });
      mats.set(key, mat);
    }
    const mesh = new THREE.Mesh(geos[p.shape], mat);
    mesh.matrixAutoUpdate = false;
    mesh.matrix.multiplyMatrices(bone, p.local);
    group.add(mesh);
  }
  return group;
}

export { makeGeometries };

// Small value-noise helper for terrain colouring.
function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise2(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy - 0.5;
}
function mulberry(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
