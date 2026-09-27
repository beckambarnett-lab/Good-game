// Projectile looks: [shape, [x,y,z], [sx,sy,sz], color, [rx,ry,rz]?]; +z is the flight direction.
// Faction files can add more with registerProjLooks().
export const PROJ_LOOKS = {
  arrow: [
    ['cyl', [0, 0, 0], [0.04, 0.8, 0.04], '#8a6a3a', [Math.PI / 2, 0, 0]],
    ['cone', [0, 0, 0.44], [0.08, 0.14, 0.08], '#cfd6dc', [Math.PI / 2, 0, 0]],
    ['box', [0, 0, -0.36], [0.02, 0.12, 0.14], '#f4f0e6'],
  ],
  bolt: [
    ['cyl', [0, 0, 0], [0.06, 0.6, 0.06], '#5a4a3a', [Math.PI / 2, 0, 0]],
    ['cone', [0, 0, 0.34], [0.12, 0.16, 0.12], '#9aa5ad', [Math.PI / 2, 0, 0]],
  ],
  rock: [['sphere', [0, 0, 0], [0.5, 0.42, 0.46], '#8b8680']],
  boulder: [['sphere', [0, 0, 0], [1.1, 0.95, 1.0], '#7d776f']],
  bomb: [
    ['sphere', [0, 0, 0], [0.5, 0.5, 0.5], '#2b2b33'],
    ['cyl', [0, 0.3, 0], [0.08, 0.16, 0.08], '#c9a24a'],
  ],
  fireball: [
    ['sphere', [0, 0, 0], [0.55, 0.55, 0.55], '#ffb347'],
    ['sphere', [0, 0, -0.25], [0.4, 0.4, 0.5], '#ff6a1a'],
  ],
  snowball: [['sphere', [0, 0, 0], [0.34, 0.34, 0.34], '#f4fbff']],
  orb: [['sphere', [0, 0, 0], [0.32, 0.32, 0.32], '#bff5ff']],
  spear: [
    ['cyl', [0, 0, 0], [0.06, 1.6, 0.06], '#7a5a34', [Math.PI / 2, 0, 0]],
    ['cone', [0, 0, 0.88], [0.12, 0.24, 0.12], '#d0d4d8', [Math.PI / 2, 0, 0]],
  ],
};

export function registerProjLooks(looks) {
  Object.assign(PROJ_LOOKS, looks);
}
