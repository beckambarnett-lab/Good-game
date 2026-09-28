// The sim must stay headless: src/sim and src/data may not import view/ui/audio code or touch the DOM.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
let bad = 0;
for (const dir of ['src/sim', 'src/data', 'src/data/factions']) {
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.js')) continue;
    const src = readFileSync(join(dir, f), 'utf8');
    for (const m of src.matchAll(/from\s+'([^']+)'/g)) {
      if (/\/(view|ui|audio)\//.test(m[1]) || m[1] === 'three') {
        console.log(`${dir}/${f} imports ${m[1]}`);
        bad++;
      }
    }
    if (/\b(document|window|THREE)\./.test(src)) {
      console.log(`${dir}/${f} touches the DOM or THREE`);
      bad++;
    }
    if (/Math\.random\(/.test(src)) {
      console.log(`${dir}/${f} uses Math.random (use the seeded rng)`);
      bad++;
    }
  }
}
for (const f of readdirSync('src/data/factions')) await import(`../src/data/factions/${f}`);
console.log(bad ? `${bad} boundary violation(s)` : 'boundaries ok');
process.exit(bad ? 1 : 0);
