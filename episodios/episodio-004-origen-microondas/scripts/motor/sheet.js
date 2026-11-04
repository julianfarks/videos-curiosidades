// render many frames quickly at low res into one page session
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [w, h, prefix, t0, t1, step] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  await p.goto(`http://127.0.0.1:8126/index.html?w=${w}&h=${h}`);
  await p.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
  for (let t = +t0; t <= +t1 + 1e-6; t += +step) { const d = await p.evaluate((tt) => window.renderFrame(tt), t); fs.writeFileSync(`${prefix}_${t.toFixed(2)}.jpg`, Buffer.from(d.split(',')[1], 'base64')); }
  await b.close();
})();
