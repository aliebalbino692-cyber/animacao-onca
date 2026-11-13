// Renderiza todos os quadros: EP=ep02 node tools/render.js [fps] [workers] [scale]
// Saída: build/<ep>/frames/f00000.jpg ... (depois use tools/encode.sh)
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const { serve } = require('./serve');
const EP = process.env.EP || 'ep01';
const FPS = +(process.argv[2] || 30), WORKERS = +(process.argv[3] || 3), SCALE = process.argv[4] || '1';
const OUT = path.join(__dirname, `../build/${EP}/frames`);
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const tl = JSON.parse(fs.readFileSync(path.join(__dirname, `../src/${EP}/timeline.json`)));
  const total = Math.ceil(tl.duration * FPS);
  const srv = await serve(8125);
  const todo = [];
  for (let i = 0; i < total; i++) if (!fs.existsSync(path.join(OUT, `f${String(i).padStart(5, '0')}.jpg`))) todo.push(i);
  console.log(`quadros: ${total}, faltando: ${todo.length}`);
  let next = 0, done = 0; const t0 = Date.now();
  const worker = async (id) => {
    const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    const p = await b.newPage();
    p.on('pageerror', (e) => console.log('[erro]', e.message));
    await p.goto(`http://localhost:8125/src/index.html?headless&ep=${EP}&scale=${SCALE}`);
    await p.waitForFunction('window.READY === true', null, { timeout: 120000 });
    while (next < todo.length) {
      const i = todo[next++];
      await p.evaluate((t) => window.renderFrame(t), i / FPS);
      const data = await p.evaluate(() => window.grab(0.93));
      fs.writeFileSync(path.join(OUT, `f${String(i).padStart(5, '0')}.jpg`), Buffer.from(data.split(',')[1], 'base64'));
      if (++done % 60 === 0) { const el = (Date.now() - t0) / 1000; console.log(`${done}/${todo.length}  ${(el / done).toFixed(2)} s/quadro  restam ~${Math.round(((todo.length - done) * el) / done / 60)} min`); }
    }
    await b.close();
  };
  await Promise.all(Array.from({ length: WORKERS }, (_, i) => worker(i)));
  srv.close(); console.log('fim', ((Date.now() - t0) / 60000).toFixed(1), 'min');
})();
