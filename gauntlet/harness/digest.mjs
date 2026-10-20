// Digest a round's critic reports: node digest.mjs --round N
// Each critic writes gauntlet/captures/round_N/critique/<id>.json (see the critic briefs in LOG.md).
// Prints average scores per critic kind and angle, then every listed gap, grouped so that gaps several critics raise rise to the top.
import { readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.mjs';

const round = process.argv[process.argv.indexOf('--round') + 1];
const dir = path.join(ROOT, 'gauntlet/captures', 'round_' + round, 'critique');
if (!existsSync(dir)) { console.log('no critique dir', dir); process.exit(1); }
const reps = readdirSync(dir).filter(f => f.endsWith('.json')).map(f => { try { return { f, ...JSON.parse(readFileSync(path.join(dir, f), 'utf8')) }; } catch (e) { return { f, bad: e.message }; } });
const lines = [];
const avg = a => a.length ? (a.reduce((x, y) => x + y, 0) / a.length) : NaN;
// scores
const groups = {};
for (const r of reps) { if (!r.scores) continue; const k = `${r.kind}${r.angle ? ':' + r.angle : ''}`; (groups[k] = groups[k] || []).push(r); }
lines.push('## Scores (mean over critics)');
for (const [k, rs] of Object.entries(groups).sort()) {
  const cats = Object.keys(rs[0].scores);
  lines.push(`- ${k} (${rs.length}): ` + cats.map(c => `${c} ${avg(rs.map(r => +r.scores[c] || 0)).toFixed(1)}`).join(', ') + ` | overall ${avg(rs.map(r => avg(Object.values(r.scores).map(Number)))).toFixed(2)}`);
}
// progression placements
const prog = reps.filter(r => r.placements);
if (prog.length) {
  lines.push('', '## Progression placements (0 = BEFORE, 100 = AFTER)');
  for (const r of prog) lines.push(`- ${r.f}: ` + r.placements.map(p => `${p.stage}:${p.score}`).join(' '));
}
// gaps
lines.push('', '## Gaps');
for (const r of reps) {
  const items = r.differences || r.issues || r.flags || [];
  if (r.bad) { lines.push(`- ${r.f}: UNREADABLE (${r.bad})`); continue; }
  if (!items.length) continue;
  lines.push(`### ${r.f}${r.verdict ? ' — ' + r.verdict : ''}`);
  for (const d of items) lines.push(`- ${d.stage !== undefined ? '[stage ' + d.stage + '] ' : ''}${d.what || d.issue}${d.where ? ' (' + d.where + ')' : ''}${d.fix ? ' → ' + d.fix : ''}`);
}
const out = lines.join('\n');
writeFileSync(path.join(dir, '..', 'DIGEST.md'), out);
console.log(out);
