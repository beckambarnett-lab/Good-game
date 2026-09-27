// Shared Playwright harness: serves dist/ locally and routes the CDN scripts to node_modules.
import { readFileSync } from 'node:fs';
import http from 'node:http';
import { extname, join } from 'node:path';
import { chromium } from 'playwright';

const ROOT = new URL('..', import.meta.url).pathname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png' };

export function serve(port = 0) {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const p = join(ROOT, process.env.OUT || 'dist', decodeURIComponent(req.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
      try {
        const body = readFileSync(p);
        rsp.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' });
        rsp.end(body);
      } catch {
        rsp.writeHead(404);
        rsp.end();
      }
    });
    srv.listen(port, '127.0.0.1', () => res({ srv, url: `http://127.0.0.1:${srv.address().port}/` }));
  });
}

export async function launch(opts = {}) {
  return chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
    ...opts,
  });
}

export async function preparePage(page) {
  const three = readFileSync(join(ROOT, 'node_modules/three/build/three.min.js'));
  const cannon = readFileSync(join(ROOT, 'node_modules/cannon-es/dist/cannon-es.js'));
  await page.route('https://cdnjs.cloudflare.com/**', (r) => r.fulfill({ body: three, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' } }));
  await page.route('https://cdn.jsdelivr.net/**', (r) => r.fulfill({ body: cannon, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' } }));
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.stack || e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}
