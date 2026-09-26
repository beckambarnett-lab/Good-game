// Builds one Review Lab as a self-contained folder (dist-lab/<name>/) and writes an
// artifact-ready page (page.html: no doctype/html/head/body wrapper) plus files.json listing
// the supporting files to publish alongside it.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const name = process.argv[2];
if (!name) {
  console.error('Usage: npm run lab:build <lab-name>');
  process.exit(1);
}
const root = join(import.meta.dirname, '..');
const outDir = join(root, 'dist-lab', name);
rmSync(outDir, { recursive: true, force: true });

execFileSync('npx', ['vite', 'build', '--config', 'vite.lab.config.ts'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, LAB: name },
});

const html = readFileSync(join(outDir, 'index.html'), 'utf8');
const head = /<head>([\s\S]*?)<\/head>/i.exec(html)?.[1] ?? '';
const body = /<body>([\s\S]*?)<\/body>/i.exec(html)?.[1] ?? '';
const keptHead = head
  .split('\n')
  .filter((l) => !/<meta charset|<meta name="viewport"/i.test(l))
  .join('\n');
writeFileSync(join(outDir, 'page.html'), `${keptHead.trim()}\n${body.trim()}\n`);

const files: Record<string, string> = {};
const walk = (dir: string) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (!/index\.html$|page\.html$|files\.json$|\.map$/.test(p))
      files[relative(outDir, p)] = relative(root, p);
  }
};
walk(outDir);
writeFileSync(join(outDir, 'files.json'), JSON.stringify(files, null, 2));
console.log(
  `Lab "${name}" built: ${relative(root, join(outDir, 'page.html'))} + ${Object.keys(files).length} files`,
);
