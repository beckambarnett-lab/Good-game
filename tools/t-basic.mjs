import { Sim } from '../src/sim/world.js';
const meadow = { id: 'meadow', extent: [120, 100] };
const grunt = { id: 'grunt', name: 'Grunt', role: 'melee', cost: 100, hp: 120, mass: 70, speed: 3.5, scale: 1,
  weapon: { kind: 'swing', damage: 20, range: 1.3, cooldown: 1, knockback: 250 } };
const archer = { id: 'archer', name: 'Archer', role: 'ranged', cost: 150, hp: 70, mass: 60, speed: 3.2, scale: 1,
  weapon: { kind: 'projectile', anim: 'bow', damage: 18, range: 18, cooldown: 1.6, knockback: 60, proj: { speed: 26 } }, ai: { kite: true, range: 15 } };
const rider = { id: 'rider', name: 'Rider', role: 'cavalry', cost: 300, hp: 250, mass: 300, speed: 7, scale: 1, mount: { kind: 'beast', scale: 1 },
  weapon: { kind: 'thrust', damage: 30, range: 2.2, cooldown: 1.2, knockback: 900 }, charge: { damage: 40, knockback: 1400, cooldown: 3 } };
const sim = new Sim({ map: meadow, seed: 3 });
const u = sim.addUnit(grunt, 0, 0, 10);
const r = sim.addUnit(rider, 0, 5, 10);
for (let i = 0; i < 180; i++) sim.step();
const p = u.p, t = p.torso.position;
console.log('idle torso', t.y.toFixed(3), 'target', u.D.torsoY.toFixed(3), 'head', p.head.position.y.toFixed(2), 'footL', p.legL.position.y.toFixed(2), 'mount', r.base.position.y.toFixed(2), r.hoverH.toFixed(2), 'rider', r.p.torso.position.y.toFixed(2));
// battle
for (let i = 0; i < 4; i++) sim.addUnit(grunt, 1, -6 + i * 3, -10);
sim.addUnit(archer, 1, 0, -20);
sim.addUnit(archer, 0, 0, 20);
sim.start();
let t0 = performance.now();
let n = 0;
while (sim.phase === 'battle' && n < 60 * 150) { sim.step(); n++;
  if (n % 120 === 0) console.log((n/60).toFixed(0)+'s', sim.units.map(x => `${x.def.id}${x.team}:${x.hp.toFixed(0)}@${x.x.toFixed(1)},${x.y.toFixed(1)},${x.z.toFixed(1)}${x.launched?'L':''}`).join(' ')); 
}
console.log('over', sim.phase, 'winner', sim.winner, 't', sim.time.toFixed(1), 'ms/step', ((performance.now() - t0) / n).toFixed(3), 'nan', sim.nanCount||0);
