// Enforces the sim/view boundary (CLAUDE.md hard rule): pure modules must run in Node,
// never touch the DOM/WebGL/WebAudio, never import view code, and never use Math.random.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = join(import.meta.dirname, '..');
const pureDirs = ['src/sim', 'src/music', 'src/dsp', 'src/core', 'src/data'];

const forbidden: { pattern: RegExp; why: string }[] = [
  { pattern: /from\s+['"][^'"]*\/view\//, why: 'imports view code' },
  { pattern: /from\s+['"]three\/examples/, why: 'imports three.js rendering addons' },
  { pattern: /\bMath\.random\s*\(/, why: 'uses Math.random (use seeded RNG forks)' },
  { pattern: /\b(document|window|navigator|localStorage|indexedDB)\s*\./, why: 'touches browser globals' },
  {
    pattern: /\b(AudioContext|OfflineAudioContext|WebGLRenderer|WebGL2RenderingContext)\b/,
    why: 'touches WebAudio/WebGL',
  },
];

function walk(dir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.ts')) out.push(p);
  }
}

const files: string[] = [];
for (const d of pureDirs) walk(join(root, d), files);

const problems: string[] = [];
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (line.trimStart().startsWith('//')) return;
    for (const { pattern, why } of forbidden) {
      if (pattern.test(line)) problems.push(`${relative(root, file)}:${i + 1} ${why}\n    ${line.trim()}`);
    }
  });
}

if (problems.length > 0) {
  console.error(`Boundary check failed (${problems.length}):\n${problems.join('\n')}`);
  process.exit(1);
}
console.log(`Boundary check passed (${files.length} pure files).`);
