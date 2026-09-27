import { buildStaticModel, makeGeometries } from './renderer.js';
import { THREE } from './three.js';

// Renders a little portrait of every unit once at startup (data URLs for the unit cards).
export function makeThumbs(defs, size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  let r;
  try {
    r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  } catch {
    return {};
  }
  r.setPixelRatio(1);
  r.setSize(size, size, false);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#445', 0.9));
  const d = new THREE.DirectionalLight('#fff4e0', 0.9);
  d.position.set(2, 4, 5);
  scene.add(d);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const geos = makeGeometries();
  const out = {};
  const box = new THREE.Box3();
  const ctr = new THREE.Vector3();
  const sz = new THREE.Vector3();
  for (const def of defs) {
    const g = buildStaticModel(def, 0, { geos });
    g.rotation.y = -0.55;
    g.updateMatrixWorld(true);
    box.setFromObject(g);
    box.getCenter(ctr);
    box.getSize(sz);
    const h = Math.max(sz.y, sz.x * 0.9, sz.z * 0.7);
    const dist = (h * 0.62) / Math.tan((cam.fov * Math.PI) / 360);
    cam.position.set(ctr.x + dist * 0.18, ctr.y + h * 0.12, ctr.z + dist);
    cam.lookAt(ctr.x, ctr.y, ctr.z);
    scene.add(g);
    r.setClearColor(0x000000, 0);
    r.render(scene, cam);
    out[def.id] = canvas.toDataURL('image/png');
    scene.remove(g);
    g.traverse((o) => {
      if (o.material) o.material.dispose();
    });
  }
  for (const k in geos) geos[k].dispose();
  r.dispose();
  r.forceContextLoss?.();
  return out;
}
