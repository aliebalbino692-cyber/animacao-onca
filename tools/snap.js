// gera quadros de teste: EP=ep02 node tools/snap.js 0.5 3 7.2 ... (tempos em segundos)
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const { serve } = require('./serve');
const EP = process.env.EP || 'ep01';
(async () => {
  const srv = await serve(8124);
  const scale = process.env.SCALE || '0.5';
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage();
  p.on('console', (m) => console.log('[page]', m.text())); p.on('pageerror', (e) => console.log('[erro]', e.message));
  await p.goto(`http://localhost:8124/src/index.html?headless&ep=${EP}&scale=${scale}${process.env.VIEW ? '&view=' + process.env.VIEW : ''}`);
  await p.waitForFunction('window.READY === true', null, { timeout: 120000 });
  const out = process.env.OUT || path.join(__dirname, `../build/${EP}/snaps`); fs.mkdirSync(out, { recursive: true });
  for (const t of process.argv.slice(2).map(Number)) {
    const t0 = Date.now();
    const name = await p.evaluate((t) => window.renderFrame(t), t);
    const data = await p.evaluate(() => window.grab(0.85));
    fs.writeFileSync(path.join(out, `t${t.toFixed(2)}.jpg`), Buffer.from(data.split(',')[1], 'base64'));
    console.log(t, name, Date.now() - t0, 'ms');
  }
  await b.close(); srv.close();
})();
