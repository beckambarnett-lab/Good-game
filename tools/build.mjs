// Bundles src/ into one self-contained HTML page (the artifact) plus a test wrapper.
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

export const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
export const CANNON_URL = 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';

const cdnPlugin = {
  name: 'cdn',
  setup(b) {
    b.onResolve({ filter: /^cannon-es$/ }, () => ({ path: CANNON_URL, external: true }));
  },
};

const minify = !process.argv.includes('--dev');
const res = await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'esm',
  write: false,
  minify,
  target: 'es2020',
  plugins: [cdnPlugin],
  legalComments: 'none',
});
let js = res.outputFiles[0].text;
if (js.includes('</script')) js = js.replaceAll('</script', '<\\/script');
const css = readFileSync('src/ui/style.css', 'utf8');
const body = readFileSync('src/ui/body.html', 'utf8');
const page = `<title>Clobberfield</title>
<meta name="description" content="Wobbly ragdoll army battles: place your troops, press Start, watch the chaos.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bowlby+One&family=Nunito:wght@600;800;900&display=swap">
<style>
${css}
</style>
${body}
<script src="${THREE_URL}"></script>
<script type="module">
${js}
</script>
`;
mkdirSync('dist', { recursive: true });
writeFileSync('dist/clobberfield.html', page);
// The artifact host wraps the page in a skeleton; mirror it for local tests.
writeFileSync(
  'dist/index.html',
  `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>\n${page}</body></html>`,
);
console.log(`built dist/clobberfield.html (${(page.length / 1024).toFixed(0)} KB)`);
