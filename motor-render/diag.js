const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 270, height: 480 } });
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  await p.goto('http://127.0.0.1:8123/index.html?w=270&h=480');
  await p.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
  console.log(JSON.stringify(await p.evaluate(() => window.diagWalk(400))));
  await b.close();
})();
