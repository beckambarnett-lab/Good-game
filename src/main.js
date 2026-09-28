import { Game } from './game.js';

// Entry point. Test hooks (?test) are only used by the local Playwright gauntlet.
const params = new URLSearchParams(location.search);
const mobile = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 560;
const msg = document.getElementById('loadmsg');

function fail(text) {
  msg.textContent = text;
  document.querySelector('.loadbar').hidden = true;
}

if (!globalThis.THREE) fail('Could not load the 3D engine. Check your connection and reload.');
else {
  try {
    const game = new Game(document.getElementById('view'), {
      mobile,
      test: { noThumbs: params.has('nothumbs'), map: params.get('map') },
    });
    window.__game = game;
    game.boot((t) => (msg.textContent = t)).catch((e) => fail(`Something broke while loading: ${e.message}`));
  } catch (e) {
    fail(`This browser could not start WebGL: ${e.message}`);
    console.error(e);
  }
}
