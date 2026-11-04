// usage: node shot.js w h out_prefix t1 t2 ...
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [w, h, prefix, ...ts] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('PAGE', m.type(), m.text().slice(0, 300)); });
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  await p.goto(`http://127.0.0.1:8126/index.html?w=${w}&h=${h}`);
  await p.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
  for (const t of ts) {
    const t0 = Date.now();
    const d = await p.evaluate((tt) => window.renderFrame(tt), +t);
    fs.writeFileSync(`${prefix}_${(+t).toFixed(2)}.jpg`, Buffer.from(d.split(',')[1], 'base64'));
    console.log('t', t, 'ms', Date.now() - t0);
  }
  await b.close();
})();
