import { Sim } from '../src/sim/world.js';
const meadow = { id: 'meadow', extent: [120, 100] };
const grunt = { id: 'grunt', role: 'melee', cost: 100, hp: 120, mass: 70, speed: 3.5, scale: 1, weapon: { kind: 'swing', damage: 20, range: 1.3, cooldown: 1, knockback: 250 } };
const mode = process.argv[2];
const sim = new Sim({ map: meadow, seed: 3 });
const u = sim.addUnit(grunt, 0, 0, 10);
if (mode === 'nocontrol') u.control = () => {};
for (let i = 0; i < 120; i++) { sim.step(); if (i % 10 === 0) console.log(i, Object.entries(u.p).filter(([k,b])=>b&&b.position).map(([k,b]) => k + ':' + b.position.y.toFixed(2)).join(' ')); }
