// node renderseg.js w h fps outdir name:f0:f1 ...
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const fs = require('fs');
(async () => {
  const [w, h, fps, outdir, ...segs] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  await p.goto(`http://127.0.0.1:8125/index.html?w=${w}&h=${h}`);
  await p.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
  for (const sg of segs) {
    const [name, f0, f1] = sg.split(':'); const tmp = `${outdir}/${name}.part.mp4`, fin = `${outdir}/${name}.mp4`;
    if (fs.existsSync(fin)) { console.log('skip', name); continue; }
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', fps, '-c:v', 'mjpeg', '-i', '-', '-vf', 'scale=1080:1920:flags=lanczos,unsharp=5:5:0.35,format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-r', fps, '-movflags', '+faststart', '-f', 'mp4', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let f = +f0; f <= +f1; f++) {
      const d = await p.evaluate((tt) => window.renderFrame(tt), f / +fps);
      const buf = Buffer.from(d.split(',')[1], 'base64');
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 30 === 0) console.log(name, f, ((Date.now() - t0) / (f - +f0 + 1) / 1000).toFixed(2) + 's/f');
    }
    ff.stdin.end(); const code = await new Promise(r => ff.on('close', r));
    if (code === 0) fs.renameSync(tmp, fin); console.log('done', name, code);
  }
  await b.close();
})();
