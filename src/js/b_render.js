/* ================= renderer, quality, post ================= */
const canvas = $('#c');
let renderer = null;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false }); } catch (e) { renderer = null; }
if (!renderer || !renderer.capabilities.isWebGL2) { $('#nogl').hidden = false; $('#loading').hidden = true; throw new Error('no webgl2'); }
const TIERS = {
  high: { name: 'High', dprMax: 2, msaa: 4, bloom: 1, refl: 512, rain: 9000, shadow: 2048, grain: 0.02, fringe: 1, far: 1 },
  medium: { name: 'Medium', dprMax: 1.5, msaa: 0, bloom: 0.5, refl: 256, rain: 5000, shadow: 1024, grain: 0.02, fringe: 0, far: 0.75 },
  low: { name: 'Low', dprMax: 1, msaa: 0, bloom: 0, refl: 0, rain: 3000, shadow: 0, grain: 0, fringe: 0, far: 0.5 },
};
function autoTier() { return COARSE ? 'medium' : 'high'; }
let tierName = SET.quality === 'auto' ? autoTier() : SET.quality;
if (window.__szTier) tierName = window.__szTier;
let Q = TIERS[tierName];
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25; renderer.info.autoReset = false;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x05070f, 1);
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x2c2a36, 0.016); // dark blue-grey street haze; the skyline uses its own thinner purple haze (SKY_HAZE)
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 420);
camera.rotation.order = 'YXZ'; scene.add(camera);
// hands / viewmodel scene
const hudScene = new THREE.Scene();
const hudCam = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.01, 10);
const hudHemi = new THREE.HemisphereLight(0xffe2c0, 0x30283a, 1.4); hudScene.add(hudHemi);
const hudKey = new THREE.DirectionalLight(0xffd2a0, 1.6); hudKey.position.set(0.6, 1, 0.4); hudScene.add(hudKey);
const hudRim = new THREE.DirectionalLight(0x6ad8ff, 0.9); hudRim.position.set(-1, 0.3, -0.6); hudScene.add(hudRim);
hudScene.add(hudCam);

// ---- render targets / composer
let vw = innerWidth, vh = innerHeight, DPR = 1;
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: Q.msaa }));
const scenePass = new RenderPass(scene, camera);
composer.addPass(scenePass);
const hudPass = new RenderPass(hudScene, hudCam); hudPass.clear = false; hudPass.clearDepth = true;
composer.addPass(hudPass);
const sanitizePass = new ShaderPass({
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c=texture2D(tDiffuse,vUv); if(any(isnan(c.rgb))||any(isinf(c.rgb))||c.r!=c.r) c=vec4(0.0,0.0,0.0,1.0); gl_FragColor=vec4(min(c.rgb,vec3(40.0)),1.0); }',
});
composer.addPass(sanitizePass);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.62, 0.55, 0.92);
composer.addPass(bloomPass);
const gradePass = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: 0.02 }, uFringe: { value: 1 }, uVig: { value: 0.32 }, uLens: { value: 0 }, uFlash: { value: 0 }, uWarm: { value: 0.5 }, uIn: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uFade: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime,uGrain,uFringe,uVig,uLens,uFlash,uWarm,uFade,uIn; uniform vec2 uRes; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
  float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
  void main(){
    vec2 uv=vUv; vec2 cc=uv-0.5;
    // lens rain: a few beads that refract
    if(uLens>0.01){ vec2 g=uv*vec2(uRes.x/uRes.y,1.0)*7.0; vec2 id=floor(g); vec2 f=fract(g)-0.5; float r=h(id); float t=fract(uTime*0.05+r);
      vec2 o=vec2((h(id+3.1)-0.5)*0.5,(0.5-t)*0.9-0.2); float d=length((f-o)*vec2(1.0,0.75)); float m=smoothstep(0.16,0.05,d)*step(0.55,r)*uLens;
      uv+= (f-o)*m*0.06; }
    float k=dot(cc,cc)*uFringe*0.006;
    vec3 col; col.r=texture2D(tDiffuse,uv+cc*k).r; col.g=texture2D(tDiffuse,uv).g; col.b=texture2D(tDiffuse,uv-cc*k).b;
    // grade outdoors: cool blue-grey shadows crushed toward black, warm saturated pools around the lights
    float l=dot(col,vec3(0.2126,0.7152,0.0722));
    // indoors (uIn): teal-brown shadows, amber highlights, a touch more contrast in the darks
    vec3 sh=mix(vec3(0.9,0.97,1.1),vec3(0.9,0.98,1.0),uIn), hi=mix(vec3(1.0),mix(vec3(1.12,1.0,0.82),vec3(1.1,0.99,0.84),uIn),uWarm);
    col*=mix(sh,hi,smoothstep(0.02,0.6,l));
    col*=mix(mix(0.62,1.0,smoothstep(0.0,0.04,l)),mix(0.8,1.0,smoothstep(0.0,0.08,l)),uIn);
    { float lo=dot(col,vec3(0.2126,0.7152,0.0722)); col=max(mix(vec3(lo),col,1.0+0.3*smoothstep(0.04,0.5,lo)*(1.0-uIn)),0.0); }
    col+=mix(vec3(0.0004,0.0006,0.0012),vec3(0.006,0.0045,0.004),uIn);
    col+=uFlash*vec3(0.55,0.62,0.85);
    float v=1.0-dot(cc*vec2(1.1,1.25),cc*vec2(1.1,1.25))*uVig*(2.2+uIn*0.9); col*=clamp(v,0.0,1.0);
    col+=(h(uv*uRes+fract(uTime*7.3))-0.5)*uGrain*(0.4+l);
    col*=1.0-uFade;
    gl_FragColor=vec4(max(col,0.0),1.0);
  }`,
});
composer.addPass(gradePass);
composer.addPass(new OutputPass());

function applyTier(name) {
  tierName = name; Q = TIERS[name];
  for (const rt of [composer.renderTarget1, composer.renderTarget2]) if (rt.samples !== Q.msaa) { rt.samples = Q.msaa; rt.dispose(); } // a changed MSAA count needs fresh framebuffers
  bloomPass.enabled = Q.bloom > 0;
  gradePass.uniforms.uGrain.value = SET.reduce ? 0 : Q.grain; gradePass.uniforms.uFringe.value = Q.fringe;
  renderer.shadowMap.enabled = Q.shadow > 0;
  if (window.keyLight) { keyLight.castShadow = Q.shadow > 0; if (Q.shadow) { keyLight.shadow.mapSize.set(Q.shadow, Q.shadow); if (keyLight.shadow.map) { keyLight.shadow.map.dispose(); keyLight.shadow.map = null; } } }
  scene.traverse(o => { if (o.material && o.material.isMaterial) o.material.needsUpdate = true; });
  resize();
}
function resize() {
  vw = innerWidth; vh = innerHeight; DPR = Math.min(devicePixelRatio || 1, Q.dprMax);
  renderer.setPixelRatio(DPR); renderer.setSize(vw, vh, false);
  composer.setPixelRatio(DPR); composer.setSize(vw, vh);
  const b = Q.bloom || 0.5; bloomPass.setSize(Math.round(vw * DPR * b * 0.5), Math.round(vh * DPR * b * 0.5));
  camera.aspect = vw / vh; hudCam.aspect = vw / vh;
  camera.fov = baseFov(); camera.updateProjectionMatrix(); { const hf = 62 * Math.PI / 180; let vf = 2 * Math.atan(Math.tan(hf / 2) / hudCam.aspect) * 180 / Math.PI; vf = clamp(vf, 46, 100); hudCam.fov = vf; window.HAND_YK = Math.tan(vf * Math.PI / 360) / Math.tan(26 * Math.PI / 180); } hudCam.updateProjectionMatrix();
  gradePass.uniforms.uRes.value.set(vw * DPR, vh * DPR);
  if (typeof onResizeUI === 'function') onResizeUI();
}
function baseFov() { const a = vw / vh; const b = a < 0.8 ? 86 : a < 1.3 ? 78 : 70; return clamp(b + SET.fov, 55, 100); }

/* ================= lights ================= */
const hemi = new THREE.HemisphereLight(0x5466a8, 0x1a1420, 0.55); scene.add(hemi);
const moon = new THREE.DirectionalLight(0x8fa6e8, 0.25); moon.position.set(-12, 30, 18); scene.add(moon);
// one shadow-casting key light, follows the room you are in
const keyLight = new THREE.SpotLight(0xffb36a, 0, 0, 0.95, 0.65, 2); keyLight.position.set(0, 3.2, -2.5); keyLight.target.position.set(0, 0, -2.6);
keyLight.castShadow = Q.shadow > 0; keyLight.shadow.mapSize.set(Q.shadow || 512, Q.shadow || 512); keyLight.shadow.bias = -0.0005; keyLight.shadow.normalBias = 0.02; keyLight.shadow.radius = 2; keyLight.shadow.camera.near = 0.2; keyLight.shadow.camera.far = 9;
scene.add(keyLight, keyLight.target); window.keyLight = keyLight;
// a small pool of dynamic point lights (light manager assigns them)
const DYN = []; for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(0xffffff, 0, 6, 2); scene.add(l); DYN.push(l); }
// ground-floor pendant lamps: unshadowed down-facing spots, so each green enamel shade throws its own tight warm pool (set in buildG0)
const PEND = []; for (let i = 0; i < 3; i++) { const l = new THREE.SpotLight(0xff9a48, 0, 4.6, 0.82, 0.6, 2); l.castShadow = false; scene.add(l, l.target); PEND.push(l); }
// how 'inside the shop' the camera is (0..1, damped); dims the cool sky fill and warms the grade indoors
const INDOOR = { k: 0 };

/* ================= baked lighting ================= */
// light anchors: {p:[x,y,z], c:THREE.Color, i:intensity, r:radius, z:zones[], wrap}
const ANCHORS = [];
function anchor(x, y, z, hex, i, r, zones, wrap) { const a = { p: [x, y, z], c: new THREE.Color(hex), i, r, z: Array.isArray(zones) ? zones : [zones], wrap: wrap == null ? 0.25 : wrap }; ANCHORS.push(a); return a; }
const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b);
const ZONES = {
  street: { amb: lin(0.068, 0.074, 0.13), floors: [0] },
  facade: { amb: lin(0.072, 0.078, 0.14), floors: [0, 3.6, 6.8, 10] },
  g0: { amb: lin(0.04, 0.026, 0.019), floors: [0] },
  f2: { amb: lin(0.07, 0.052, 0.045), floors: [3.6] },
  f3: { amb: lin(0.075, 0.055, 0.085), floors: [6.8] },
  roof: { amb: lin(0.055, 0.06, 0.12), floors: [10] },
  alley: { amb: lin(0.055, 0.061, 0.112), floors: [0] },
  far: { amb: lin(0.062, 0.068, 0.122), floors: [0] },
};
function floorY(zone, y) { const fl = (ZONES[zone] || ZONES.street).floors; let f = fl[0]; for (const v of fl) if (v <= y + 0.02) f = v; return f; }
const _bc = new THREE.Color();
function bakeArrays(zone, pos, nor, out, aoOn) {
  const zd = ZONES[zone] || ZONES.street, amb = zd.amb, an = ANCHORS.filter(a => a.z.includes(zone));
  // bounding box of chunk to cull anchors
  let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
  for (let i = 0; i < pos.length; i += 3) { const x = pos[i], y = pos[i + 1], z = pos[i + 2]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z; }
  const use = an.filter(a => a.p[0] > x0 - a.r && a.p[0] < x1 + a.r && a.p[1] > y0 - a.r && a.p[1] < y1 + a.r && a.p[2] > z0 - a.r && a.p[2] < z1 + a.r);
  const n = pos.length / 3;
  for (let v = 0; v < n; v++) {
    const o = v * 3, px = pos[o], py = pos[o + 1], pz = pos[o + 2], nx = nor[o], ny = nor[o + 1], nz = nor[o + 2];
    let r = amb.r, g = amb.g, b = amb.b;
    // sky term: upward faces outdoors get a little more
    if (zone === 'street' || zone === 'facade' || zone === 'roof' || zone === 'alley' || zone === 'far') { const s = 0.5 + 0.5 * ny; r += 0.045 * s; g += 0.048 * s; b += 0.088 * s; }
    for (let k = 0; k < use.length; k++) {
      const a = use[k]; const dx = a.p[0] - px, dy = a.p[1] - py, dz = a.p[2] - pz; const d2 = dx * dx + dy * dy + dz * dz; if (d2 > a.r * a.r) continue;
      const d = Math.sqrt(d2) + 1e-4; let ndl = (dx * nx + dy * ny + dz * nz) / d; ndl = a.wrap ? (ndl * (1 - a.wrap) + a.wrap) : ndl; if (ndl <= 0) continue;
      const q = 1 - d / a.r; const att = q * q * a.i * ndl / (1 + d2 * 0.08);
      r += a.c.r * att; g += a.c.g * att; b += a.c.b * att;
    }
    let ao = 1;
    if (aoOn) { const fy = floorY(zone, py); const hgt = py - fy; if (ny < 0.6) ao = 0.5 + 0.5 * smoothstep(0, 0.85, hgt); if (ny < -0.6) ao *= 0.78; if (ny > 0.6 && hgt < 0.05) ao = 0.92; }
    out[o] = r * ao; out[o + 1] = g * ao; out[o + 2] = b * ao;
  }
}

/* ================= materials ================= */
const _bakeChunk = (shader) => {
  shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 bake;\nvarying vec3 vBake;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBake = bake;');
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vBake;\nuniform float uBakeK;')
    .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vBake * uBakeK;');
};
const BAKE_K = { value: 1 };
function worldMat(extra) {
  const m = new THREE.MeshLambertMaterial(Object.assign({ vertexColors: true }, extra || {}));
  m.onBeforeCompile = sh => { sh.uniforms.uBakeK = BAKE_K; _bakeChunk(sh); };
  m.customProgramCacheKey = () => 'bakeV1' + (extra && extra.side ? 's' : '');
  return m;
}
const WORLD_MAT = worldMat();
const WORLD_MAT_DS = worldMat({ side: THREE.DoubleSide });
// wet ground: adds the mirrored neon layer, streaked and rippled
const REFL = { rt: null, cam: new THREE.PerspectiveCamera(), mat: new THREE.Matrix4(), on: false };
const WET_U = { tRefl: { value: null }, uTexM: { value: REFL.mat }, uWet: { value: 0.8 }, uTime: { value: 0 }, uReflOn: { value: 0 } };
const WET_MAT = new THREE.MeshLambertMaterial({ vertexColors: true });
WET_MAT.onBeforeCompile = sh => {
  sh.uniforms.uBakeK = BAKE_K; Object.assign(sh.uniforms, WET_U); _bakeChunk(sh);
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float wet;\nvarying float vWet;\nvarying vec3 vWP;\nuniform mat4 uTexM;\nvarying vec4 vRC;')
    .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvec4 wpp = modelMatrix * vec4(transformed,1.0); vWP = wpp.xyz; vWet = wet; vRC = uTexM * wpp;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vWet; varying vec3 vWP; varying vec4 vRC; uniform sampler2D tRefl; uniform float uWet,uTime,uReflOn;')
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      // fine per-column grain: breaks the mirror into thin vertical streaks running toward the viewer
      float wcol = fract(sin(floor(vWP.x*42.0+floor(vWP.z*3.0)*0.37)*91.7)*4375.85);
      vec3 rc = vec3(0.0);
      if(uReflOn>0.5){
        vec2 rip = vec2(sin(vWP.x*9.0+uTime*2.1+sin(vWP.z*7.0)), cos(vWP.z*8.0-uTime*1.7+sin(vWP.x*6.0)))*0.004;
        vec2 ruv = vRC.xy/vRC.w + rip + vec2((wcol-0.5)*0.003, 0.0);
        rc = texture2D(tRefl,ruv).rgb*0.2
          + (texture2D(tRefl,ruv+vec2(0.0,0.02)).rgb + texture2D(tRefl,ruv-vec2(0.0,0.02)).rgb)*0.15
          + (texture2D(tRefl,ruv+vec2(0.0,0.06)).rgb + texture2D(tRefl,ruv-vec2(0.0,0.06)).rgb)*0.11
          + (texture2D(tRefl,ruv+vec2(0.0,0.13)).rgb + texture2D(tRefl,ruv-vec2(0.0,0.13)).rgb)*0.08
          + (texture2D(tRefl,ruv+vec2(0.0,0.24)).rgb + texture2D(tRefl,ruv-vec2(0.0,0.24)).rgb)*0.055;
        // fade out where the mirror runs off its texture (no clamped smears at the frame edges)
        rc *= smoothstep(0.0,0.06,ruv.x)*smoothstep(1.0,0.94,ruv.x)*smoothstep(0.0,0.05,ruv.y)*smoothstep(1.0,0.95,ruv.y);
        rc *= 0.55 + 0.9*wcol;
        totalEmissiveRadiance += rc * vWet * uWet * 1.05;
      }
      // sparkle: tiny wet glints that pick up the nearby light
      { vec2 sc = floor(vWP.xz*vec2(70.0,60.0)); float h = fract(sin(dot(sc, vec2(12.9898,78.233)))*43758.5453);
        float tw = 0.55 + 0.45*sin(uTime*2.3 + h*60.0);
        totalEmissiveRadiance += step(0.982, h) * tw * vWet * uWet * (vec3(0.025,0.024,0.035) + rc*2.4 + vBake*0.7); }
      totalEmissiveRadiance += vec3(0.02, 0.019, 0.042) * smoothstep(0.85, 1.0, vWet);`);
};
WET_MAT.customProgramCacheKey = () => 'wetV2';
// glossy finishes (per-vertex kind 'gk'): 1 varnished wood, 2 vinyl, 3 chrome, 4 varnished floor (+ planar reflection).
// Lamp highlights come from up to 8 point positions (0-3 pendants/ring, 4-6 brewing station) in GLOSS_U (set by the room builder); reflections of the room are faked from the reflected direction.
const GLOSS_U = { uLP: { value: [0, 1, 2, 3, 4, 5, 6, 7].map(() => new THREE.Vector3(0, -50, 0)) }, uLC: { value: [0, 1, 2, 3, 4, 5, 6, 7].map(() => new THREE.Vector3()) } };
const GLOSS_MAT = new THREE.MeshLambertMaterial({ vertexColors: true });
GLOSS_MAT.onBeforeCompile = sh => {
  sh.uniforms.uBakeK = BAKE_K; Object.assign(sh.uniforms, GLOSS_U, { tRefl: WET_U.tRefl, uTexM: WET_U.uTexM, uReflOn: WET_U.uReflOn, uTime: WET_U.uTime }); _bakeChunk(sh);
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float gk;\nvarying float vGK;\nvarying vec3 vGP;\nvarying vec3 vGN;\nuniform mat4 uTexM;\nvarying vec4 vGRC;')
    .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvec4 gwp = modelMatrix * vec4(transformed,1.0); vGP = gwp.xyz; vGK = gk; vGN = normalize(mat3(modelMatrix) * objectNormal); vGRC = uTexM * gwp;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vGK; varying vec3 vGP; varying vec3 vGN; varying vec4 vGRC; uniform vec3 uLP[8]; uniform vec3 uLC[8]; uniform sampler2D tRefl; uniform float uReflOn, uTime;')
    .replace('#include <color_fragment>', `#include <color_fragment>
      float gk = vGK; float isWood = (gk > 0.5 && gk < 1.5) || gk > 3.5 ? 1.0 : 0.0; float gr = 0.5;
      if (isWood > 0.5) {
        float u = vGP.x, v = vGP.z + vGP.y * 0.7;
        gr = sin(v * 150.0 + sin(u * 0.7 + v * 5.0) * 8.0 + sin(u * 3.1 + v * 11.0) * 2.0) * 0.5 + 0.5; gr *= gr;
        float fig = sin(v * 37.0 + sin(u * 0.8) * 3.0) * 0.5 + 0.5;
        gr = mix(gr, fig, 0.4);
        diffuseColor.rgb *= 0.8 + 0.32 * gr;
      }`)
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      {
        vec3 N = normalize(vGN); vec3 V = normalize(cameraPosition - vGP); vec3 R = reflect(-V, N);
        float NV = clamp(dot(N, V), 0.0, 1.0); float Fr = 0.04 + 0.96 * pow(1.0 - NV, 5.0);
        float shin = gk < 1.5 ? 70.0 : (gk < 2.5 ? 140.0 : (gk < 3.5 ? 36.0 : 55.0));
        vec3 spec = vec3(0.0);
        for (int i = 0; i < 8; i++) {
          vec3 L = uLP[i] - vGP; float d2 = dot(L, L); vec3 Ld = L * inversesqrt(d2); float rl = max(dot(R, Ld), 0.0);
          spec += uLC[i] * (pow(rl, shin) * 2.2 + pow(rl, shin * 0.12) * 0.22) / (1.0 + d2 * 0.22);
        }
        float up = R.y * 0.5 + 0.5;
        vec3 env = mix(vec3(0.02, 0.014, 0.01), vec3(0.24, 0.13, 0.055), smoothstep(0.5, 0.95, up));
        env += vec3(0.04, 0.035, 0.09) * smoothstep(0.3, 0.9, R.z) * smoothstep(0.35, 0.7, up);
        env += vec3(0.07, 0.015, 0.05) * smoothstep(0.5, 1.0, -R.x) * smoothstep(0.45, 0.75, up);
        if (gk > 2.5 && gk < 3.5) {
          float band = smoothstep(0.48, 0.56, up) * (0.35 + 0.65 * smoothstep(0.75, 0.95, up));
          totalEmissiveRadiance += diffuseColor.rgb * (env * 1.3 * band + spec * 1.8) + spec * 0.5;
        } else {
          float streak = isWood > 0.5 ? (0.6 + 0.8 * gr) : 1.0;
          float ks = gk < 1.5 ? 1.0 : (gk < 2.5 ? 1.1 : 0.7);
          float ke = gk < 1.5 ? 0.85 : (gk < 2.5 ? 0.9 : 0.8);
          totalEmissiveRadiance += spec * ks * streak + env * Fr * ke * streak;
          if (gk > 3.5 && uReflOn > 0.5) {
            vec2 rip = vec2(sin(vGP.x * 9.0 + sin(vGP.z * 7.0)), cos(vGP.z * 8.0 + sin(vGP.x * 6.0))) * 0.003;
            vec2 ruv = vGRC.xy / vGRC.w + rip;
            // soft vertical streaks (wet varnish smears reflections along the view direction), slightly widened sideways
            vec3 rc = texture2D(tRefl, ruv).rgb * 0.2 + (texture2D(tRefl, ruv + vec2(0.004, 0.018)).rgb + texture2D(tRefl, ruv - vec2(0.004, 0.018)).rgb) * 0.16
              + (texture2D(tRefl, ruv + vec2(-0.003, 0.04)).rgb + texture2D(tRefl, ruv - vec2(-0.003, 0.04)).rgb) * 0.12 + (texture2D(tRefl, ruv + vec2(0.0, 0.07)).rgb + texture2D(tRefl, ruv - vec2(0.0, 0.07)).rgb) * 0.12;
            totalEmissiveRadiance += rc * (0.12 + 0.3 * Fr) * (0.6 + 0.6 * gr);
          }
        }
      }`);
};
GLOSS_MAT.customProgramCacheKey = () => 'glossV2';
function emisMat() { return new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }); }
const EMIS_MAT = emisMat();
const HIT = new THREE.MeshBasicMaterial({ visible: false });

/* ================= geometry building ================= */
const GC = {};
function gBox() { if (!GC.box) { GC.box = new THREE.BoxGeometry(1, 1, 1).toNonIndexed(); GC.box.userData.quad = true; } return GC.box; }
// subdivided unit box for big faces, so the per-vertex light bake stays local instead of smearing a lamp across a whole wall
function gBoxS(nx, ny, nz) { const k = 'bs' + nx + '_' + ny + '_' + nz; if (!GC[k]) { GC[k] = new THREE.BoxGeometry(1, 1, 1, nx, ny, nz).toNonIndexed(); GC[k].userData.quad = true; } return GC[k]; }
const BOX_CELL = 2.2; const segOf = v => v > 3.0 ? Math.min(10, Math.ceil(v / BOX_CELL)) : 1;
function gCyl(seg, top) { const k = 'c' + seg + '_' + (top == null ? 1 : top); return GC[k] || (GC[k] = new THREE.CylinderGeometry(top == null ? 0.5 : 0.5 * top, 0.5, 1, seg, 1).toNonIndexed()); }
function gCone(seg) { const k = 'k' + seg; return GC[k] || (GC[k] = new THREE.ConeGeometry(0.5, 1, seg, 1).toNonIndexed()); }
function gSphere(d) { const k = 's' + d; return GC[k] || (GC[k] = new THREE.IcosahedronGeometry(0.5, d).toNonIndexed()); }
function gTorus(seg, tube) { const k = 't' + seg + '_' + tube; return GC[k] || (GC[k] = new THREE.TorusGeometry(0.5, tube, 5, seg).toNonIndexed()); }
function gPlane() { if (!GC.pl) { GC.pl = new THREE.PlaneGeometry(1, 1).toNonIndexed(); GC.pl.userData.quad = true; } return GC.pl; }
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _s = new THREE.Vector3();
function M(x, y, z, rx, ry, rz, sx, sy, sz) { _e.set(rx || 0, ry || 0, rz || 0, 'YXZ'); _q.setFromEuler(_e); _v1.set(x || 0, y || 0, z || 0); _s.set(sx == null ? 1 : sx, sy == null ? (sx == null ? 1 : sx) : sy, sz == null ? (sx == null ? 1 : sx) : sz); return new THREE.Matrix4().compose(_v1, _q, _s); }
const _col = new THREE.Color();
class Chunk {
  constructor(name, zone, o) { o = o || {}; this.name = name; this.zone = zone; this.p = []; this.c = []; this.w = []; this.emis = !!o.emis; this.wet = !!o.wet; this.gloss = !!o.gloss; this.gk = 0; this.ds = !!o.ds; this.jit = o.jit == null ? 0.035 : o.jit; this.parent = null; this.shadow = o.shadow !== false; this.xf = null; }
  // push a geometry (non-indexed) transformed by matrix with color
  geo(g, col, m, wet, jit) {
    if (this.xf) m = m ? new THREE.Matrix4().multiplyMatrices(this.xf, m) : this.xf;
    const pa = g.attributes.position.array, n = pa.length / 3; _col.set(col); const jj = jit == null ? this.jit : jit;
    const step = g.userData.quad ? 6 : 3; // one colour per quad: no diagonal seam across box faces
    for (let i = 0; i < n; i += step) {
      const j = 1 + (srand() - 0.5) * 2 * jj;
      for (let k = 0; k < step && i + k < n; k++) { _v1.fromArray(pa, (i + k) * 3); if (m) _v1.applyMatrix4(m); this.p.push(_v1.x, _v1.y, _v1.z); this.c.push(_col.r * j, _col.g * j, _col.b * j); this.w.push(wet || this.gk || 0); }
    }
    return this;
  }
  box(w, h, d, col, x, y, z, rx, ry, rz, wet) { const sx = segOf(w), sy = segOf(h), sz = segOf(d); const big = sx > 1 || sy > 1 || sz > 1; return this.geo(big ? gBoxS(sx, sy, sz) : gBox(), col, M(x, y, z, rx, ry, rz, w, h, d), wet, big ? this.jit * 0.45 : undefined); }
  // box anchored at bottom
  boxB(w, h, d, col, x, y, z, ry, wet) { return this.box(w, h, d, col, x, y + h / 2, z, 0, ry || 0, 0, wet); }
  cyl(rTop, rBot, h, seg, col, x, y, z, rx, ry, rz) { const g = gCyl(seg, rBot > 0 ? rTop / rBot : 1); const s = rBot > 0 ? rBot * 2 : rTop * 2; return this.geo(g, col, M(x, y, z, rx, ry, rz, s, h, s)); }
  cone(r, h, seg, col, x, y, z, rx, ry, rz) { return this.geo(gCone(seg), col, M(x, y, z, rx, ry, rz, r * 2, h, r * 2)); }
  ball(r, col, x, y, z, det, sx, sy, sz) { return this.geo(gSphere(det || 0), col, M(x, y, z, 0, 0, 0, r * 2 * (sx || 1), r * 2 * (sy || 1), r * 2 * (sz || 1))); }
  torus(r, tube, seg, col, x, y, z, rx, ry, rz) { return this.geo(gTorus(seg, tube / r * 0.5), col, M(x, y, z, rx, ry, rz, r * 2, r * 2, r * 2)); }
  // a line-like bar between two points (cables, pipes)
  bar(a, b, th, col, seg) {
    _v2.set(a[0], a[1], a[2]); _v3.set(b[0], b[1], b[2]); const len = _v2.distanceTo(_v3); if (len < 1e-4) return this;
    const mid = _v2.clone().add(_v3).multiplyScalar(0.5); const dir = _v3.clone().sub(_v2).normalize(); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const m = new THREE.Matrix4().compose(mid, q, new THREE.Vector3(th, len, th)); return this.geo(seg ? gCyl(seg) : gBox(), col, m, 0, 0);
  }
  // sagging cable as segments
  cable(a, b, sag, th, col, n) { n = n || 8; let prev = a; for (let i = 1; i <= n; i++) { const t = i / n; const p = [lerp(a[0], b[0], t), lerp(a[1], b[1], t) - Math.sin(t * Math.PI) * sag, lerp(a[2], b[2], t)]; this.bar(prev, p, th, col); prev = p; } return this; }
  // flat quad (double-sided if chunk ds)
  quad(w, h, col, x, y, z, rx, ry, rz) { return this.geo(gPlane(), col, M(x, y, z, rx, ry, rz, w, h, 1)); }
  build() {
    if (!this.p.length) return null;
    const pos = new Float32Array(this.p), col = new Float32Array(this.c), n = pos.length / 3, nor = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 3) {
      const o = i * 3; const ax = pos[o], ay = pos[o + 1], az = pos[o + 2]; const ux = pos[o + 3] - ax, uy = pos[o + 4] - ay, uz = pos[o + 5] - az, wx = pos[o + 6] - ax, wy = pos[o + 7] - ay, wz = pos[o + 8] - az;
      let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx; const l = Math.hypot(nx, ny, nz); if (l > 1e-12) { nx /= l; ny /= l; nz /= l; } else { nx = 0; ny = 1; nz = 0; }
      for (let k = 0; k < 3; k++) { nor[o + k * 3] = nx; nor[o + k * 3 + 1] = ny; nor[o + k * 3 + 2] = nz; }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    let mat;
    if (this.emis) { mat = EMIS_MAT; }
    else {
      const bake = new Float32Array(n * 3); bakeArrays(this.zone, pos, nor, bake, true); g.setAttribute('bake', new THREE.BufferAttribute(bake, 3));
      if (this.gloss) { g.setAttribute('gk', new THREE.BufferAttribute(new Float32Array(this.w), 1)); mat = GLOSS_MAT; }
      else if (this.wet) { g.setAttribute('wet', new THREE.BufferAttribute(new Float32Array(this.w), 1)); mat = WET_MAT; } else mat = this.ds ? WORLD_MAT_DS : WORLD_MAT;
    }
    g.computeBoundingSphere(); g.computeBoundingBox();
    const mesh = new THREE.Mesh(g, mat); mesh.name = this.name; mesh.matrixAutoUpdate = false;
    if (this.emis) { mesh.layers.enable(1); } else { mesh.castShadow = this.shadow; mesh.receiveShadow = true; }
    return mesh;
  }
}
// rebake a built mesh (when anchors change, e.g. a sign is installed)
function rebake(mesh, zone) { const g = mesh.geometry; if (!g.attributes.bake) return; bakeArrays(zone, g.attributes.position.array, g.attributes.normal.array, g.attributes.bake.array, true); g.attributes.bake.needsUpdate = true; }

/* ================= textures ================= */
function canvasTex(w, h, draw, o) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (o && o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } t.userData.canvas = c; t.userData.ctx = x; return t; }
const GLOW_TEX = canvasTex(64, 64, (x, w) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
const DOT_TEX = canvasTex(16, 16, x => { const g = x.createRadialGradient(8, 8, 0, 8, 8, 8); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 16, 16); });
const SOFT_TEX = canvasTex(64, 64, x => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,.75)'); g.addColorStop(0.6, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
const FONT_SIGN = '"Dela Gothic One","Zen Kaku Gothic New","Hiragino Sans","Noto Sans JP",sans-serif';
const FONT_DOT = '"DotGothic16","Zen Kaku Gothic New",monospace';
const FONT_CHALK = '"Yusei Magic","Zen Kaku Gothic New",sans-serif';
const FONT_UI = '"Zen Kaku Gothic New","Hiragino Sans","Noto Sans JP",sans-serif';
// neon tube text: dark bg, glow halo, bright core. returns texture
function neonTex(text, o) {
  o = Object.assign({ font: FONT_SIGN, px: 96, col: '#33e4ff', vertical: false, pad: 26, core: '#ffffff', w: 0, h: 0, sub: null, subPx: 0, border: false }, o);
  const chars = [...text];
  const meas = document.createElement('canvas').getContext('2d'); meas.font = `${o.px}px ${o.font}`;
  let W, H;
  if (o.vertical) { W = Math.ceil(o.px * 1.15 + o.pad * 2); H = Math.ceil(chars.length * o.px * 1.08 + o.pad * 2); }
  else { W = Math.ceil(meas.measureText(text).width + o.pad * 2); H = Math.ceil(o.px * 1.25 + o.pad * 2 + (o.sub ? o.subPx * 1.4 : 0)); }
  W = o.w || W; H = o.h || H;
  const tex = canvasTex(W, H, (x) => {
    x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `${o.px}px ${o.font}`;
    const drawText = (fill, blur, alpha, sw) => {
      x.save(); x.globalAlpha = alpha; x.shadowColor = o.col; x.shadowBlur = blur; x.fillStyle = fill; x.strokeStyle = fill; x.lineWidth = sw || 0;
      if (o.vertical) chars.forEach((ch, i) => { const y = o.pad + o.px * 0.54 + i * o.px * 1.08; if (sw) x.strokeText(ch, W / 2, y); else x.fillText(ch, W / 2, y); });
      else { const y = o.sub ? o.pad + o.px * 0.62 : H / 2; if (sw) x.strokeText(text, W / 2, y); else x.fillText(text, W / 2, y); }
      x.restore();
    };
    if (o.border) { x.save(); x.strokeStyle = o.col; x.shadowColor = o.col; x.shadowBlur = 18; x.lineWidth = 5; x.strokeRect(8, 8, W - 16, H - 16); x.shadowBlur = 0; x.strokeStyle = '#fff'; x.lineWidth = 1.5; x.strokeRect(8, 8, W - 16, H - 16); x.restore(); }
    drawText(o.col, 34, 0.9); drawText(o.col, 14, 1); drawText(o.col, 0, 1, Math.max(3, o.px * 0.07)); drawText(o.core, 6, 0.95, Math.max(1, o.px * 0.025));
    if (o.sub) { x.font = `${o.subPx}px ${o.subFont || FONT_UI}`; x.shadowColor = o.col; x.shadowBlur = 10; x.fillStyle = o.subCol || o.col; x.fillText(o.sub, W / 2, H - o.pad - o.subPx * 0.6); }
  });
  tex.userData.aspect = W / H; return tex;
}
// painted / printed panels (posters, menus, labels) - drawn with a callback
function panelTex(w, h, draw) { return canvasTex(w, h, draw); }
// a glowing sign mesh (additive, bloom-friendly) of given height in meters
function signMesh(tex, hMeters, k, opts) {
  const a = tex.userData.aspect || 1; const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(k || 2.2, k || 2.2, k || 2.2), fog: true, side: (opts && opts.ds) ? THREE.DoubleSide : THREE.FrontSide });
  const mesh = new THREE.Mesh(gPlaneIdx(), m); mesh.scale.set(hMeters * a, hMeters, 1); mesh.layers.enable(1); mesh.renderOrder = 2; m.userData.base = k || 2.2;
  // two-sided signs: a second face turned around, so the text reads correctly from behind instead of mirrored
  if (opts && opts.ds) { m.side = THREE.FrontSide; const back = new THREE.Mesh(gPlaneIdx(), m); back.rotation.y = Math.PI; back.position.z = -(opts.thick || 0); back.layers.enable(1); back.renderOrder = 2; mesh.add(back); }
  return mesh;
}
function gPlaneIdx() { return GC.pli || (GC.pli = new THREE.PlaneGeometry(1, 1)); }
function printedMesh(tex, wM, hM, lit, o) { const m = lit ? new THREE.MeshLambertMaterial({ map: tex, transparent: !!(o && o.alpha) }) : new THREE.MeshBasicMaterial({ map: tex, transparent: !!(o && o.alpha), color: new THREE.Color((o && o.k) || 1, (o && o.k) || 1, (o && o.k) || 1) }); if (o && o.ds) m.side = THREE.DoubleSide; const mesh = new THREE.Mesh(gPlaneIdx(), m); mesh.scale.set(wM, hM, 1); return mesh; }

/* ================= sky ================= */
const skyGeo = new THREE.SphereGeometry(300, 32, 16);
{ const pa = skyGeo.attributes.position, col = new Float32Array(pa.count * 3); const top = new THREE.Color(0x262238), mid = new THREE.Color(0x2c263d), hor = new THREE.Color(0x3c304a), c = new THREE.Color();
  // dark desaturated indigo overhead (#14122a on screen after grade + tone map), a slightly lighter purple city glow toward the horizon
  for (let i = 0; i < pa.count; i++) { const y = pa.getY(i) / 300; if (y > 0.3) c.copy(mid).lerp(top, smoothstep(0.3, 0.95, y)); else if (y > -0.02) c.copy(hor).lerp(mid, smoothstep(-0.02, 0.3, y)); else c.copy(hor).lerp(new THREE.Color(0x0c0c14), smoothstep(-0.02, -0.12, y)); col.set([c.r, c.g, c.b], i * 3); }
  skyGeo.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
sky.renderOrder = -10; scene.add(sky);
// low cloud deck lit from below by the city
const cloudTex = canvasTex(512, 512, (x, w, h) => {
  x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) { const cx = Math.random() * w, cy = Math.random() * h, r = rand(30, 110); const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); const a = rand(0.04, 0.12); g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { x.save(); x.translate(ox, oy); x.fillRect(cx - r, cy - r, r * 2, r * 2); x.restore(); } }
}, { repeat: true });
cloudTex.repeat.set(3, 3);
const clouds = new THREE.Mesh(new THREE.PlaneGeometry(640, 640), new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, depthWrite: false, color: new THREE.Color(0.1, 0.07, 0.16), blending: THREE.AdditiveBlending, fog: false }));
// high above the tallest towers, so it never slices through them; only a faint city-lit texture in the sky
clouds.rotation.x = Math.PI / 2; clouds.position.y = 265; clouds.renderOrder = -9; scene.add(clouds);

