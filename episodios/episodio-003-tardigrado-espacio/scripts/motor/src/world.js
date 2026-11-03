import * as THREE from 'three';
import { canvasTex, rng, noiseFill, clamp, lerp, smooth } from './lib.js';
import { softSprite } from './tardigrade.js';

// ------------------------------------------------------------------ helpers
function fbmCanvas(w, h, seed, octaves = 5) {
  // returns Float32Array of fractal value noise in [0,1]
  const r = rng(seed); const out = new Float32Array(w * h);
  let amp = 1, tot = 0;
  for (let o = 0; o < octaves; o++) {
    const sc = Math.pow(2, o + 2); const gw = sc * 2 + 2, gh = sc + 2; const grid = new Float32Array(gw * gh).map(() => r());
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const fx = x / w * sc * 2, fy = y / h * sc, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const i0 = iy * gw + (ix % (gw - 2)), i1 = iy * gw + ((ix + 1) % (gw - 2));
      const a = grid[i0], b = grid[i1], c = grid[i0 + gw], d = grid[i1 + gw];
      out[y * w + x] += ((a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy) * amp;
    }
    tot += amp; amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}

// ------------------------------------------------------------------ SPACE
export function buildSpace() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#010205');
  const r = rng(3);
  // stars
  const nS = 3000; const pos = new Float32Array(nS * 3), col = new Float32Array(nS * 3);
  for (let i = 0; i < nS; i++) { const v = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(900); pos.set([v.x, v.y, v.z], i * 3); const t = r(); const c = new THREE.Color().setHSL(0.6 - t * 0.5, 0.4, 0.7 + r() * 0.3); col.set([c.r, c.g, c.b], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, map: softSprite('rgba(255,255,255,1)', 'rgba(255,255,255,0)'), transparent: true, depthWrite: false, fog: false })));
  // milky band
  const band = canvasTex(1024, 256, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); const d = fbmCanvas(256, 64, 9, 5); const img = g.createImageData(256, 64); for (let i = 0; i < d.length; i++) { const y = Math.floor(i / 256) / 64; const m = Math.exp(-Math.pow((y - 0.5) * 4, 2)); const v = Math.pow(d[i], 2.2) * m * 180; img.data[i * 4] = v * 0.8; img.data[i * 4 + 1] = v * 0.75; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; } const c2 = document.createElement('canvas'); c2.width = 256; c2.height = 64; c2.getContext('2d').putImageData(img, 0, 0); g.drawImage(c2, 0, 0, w, h); });
  const bandM = new THREE.Mesh(new THREE.SphereGeometry(950, 48, 24), new THREE.MeshBasicMaterial({ map: band, side: THREE.BackSide, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  bandM.rotation.set(0.6, 0, 0.9); scene.add(bandM);

  // Earth
  const W = 1024, H = 512; const land = fbmCanvas(W, H, 4, 6), cl = fbmCanvas(W, H, 11, 6);
  const earthTex = canvasTex(W, H, (g) => {
    const img = g.createImageData(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; const lat = Math.abs(y / H - 0.5) * 2; const v = land[i];
      let c;
      if (lat > 0.93) c = [235, 240, 245];
      else if (v > 0.53) { const k = (v - 0.53) * 6; const dry = clamp(1 - lat * 1.6 + (v - 0.6) * 2); c = [lerp(60, 125, dry * k * 0.6 + 0.1), lerp(110, 125, dry), lerp(50, 70, dry)]; }
      else { const d = clamp((0.53 - v) * 5); c = [lerp(30, 8, d), lerp(90, 30, d), lerp(150, 90, d)]; }
      img.data.set([c[0], c[1], c[2], 255], i * 4);
    }
    g.putImageData(img, 0, 0);
  });
  const cloudTex = canvasTex(W, H, (g) => { const img = g.createImageData(W, H); for (let i = 0; i < W * H; i++) { const a = clamp((cl[i] - 0.56) * 3.0) * 230; img.data.set([255, 255, 255, a], i * 4); } g.putImageData(img, 0, 0); });
  const earth = new THREE.Group(); scene.add(earth);
  const ER = 60;
  const ground = new THREE.Mesh(new THREE.SphereGeometry(ER, 128, 96), new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.85, metalness: 0 }));
  earth.add(ground);
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.008, 128, 96), new THREE.MeshStandardMaterial({ map: cloudTex, transparent: true, depthWrite: false, roughness: 1 }));
  earth.add(clouds);
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.06, 96, 64), new THREE.ShaderMaterial({
    uniforms: { uSun: { value: new THREE.Vector3(1, 0.3, 0.4).normalize() } },
    vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix)*normal); vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 uSun; varying vec3 vN; varying vec3 vW; void main(){ vec3 V = normalize(cameraPosition - vW); float f = pow(1.0 - abs(dot(vN, V)), 3.0); float lit = clamp(dot(vN, uSun)*0.8+0.35, 0.0, 1.0); gl_FragColor = vec4(vec3(0.35,0.6,1.0)*f*1.6*lit, f*lit); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide,
  }));
  earth.add(atmo);
  earth.position.set(-40, -80, -230); earth.rotation.set(-0.25, 1.2, 0.15);

  const sun = new THREE.DirectionalLight('#fff3e0', 3.4); sun.position.set(80, 25, 40); scene.add(sun);
  atmo.material.uniforms.uSun.value.copy(sun.position).normalize();
  const earthshine = new THREE.DirectionalLight('#6fa8ff', 0.7); earthshine.position.set(-30, -60, -100); scene.add(earthshine);
  scene.add(new THREE.AmbientLight('#20283a', 0.35));
  // sun glare sprite
  const glare = new THREE.Sprite(new THREE.SpriteMaterial({ map: softSprite('rgba(255,250,235,1)', 'rgba(255,200,140,0)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
  glare.position.copy(sun.position).normalize().multiplyScalar(800); glare.scale.setScalar(140); scene.add(glare);

  // floating micro debris (dust grains lit by the sun)
  const nD = 260; const dp = new Float32Array(nD * 3); for (let i = 0; i < nD; i++) { dp[i * 3] = (r() - 0.5) * 8; dp[i * 3 + 1] = (r() - 0.5) * 8; dp[i * 3 + 2] = (r() - 0.5) * 8; }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3)); const dbase = dp.slice();
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.03, map: softSprite('rgba(255,245,220,1)', 'rgba(255,220,160,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 }));
  scene.add(dust);

  // sample cassette (orbital exposure experiment): small open tray with wells
  const cassette = new THREE.Group(); cassette.visible = false; scene.add(cassette);
  const metal = new THREE.MeshStandardMaterial({ color: '#b9bec6', metalness: 0.9, roughness: 0.32 });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.35, 2.6), metal); cassette.add(plate);
  const wellM = new THREE.MeshStandardMaterial({ color: '#2b3138', metalness: 0.6, roughness: 0.5 });
  const wells = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 40), wellM); w.position.set(-1.3 + i * 1.3, 0.18, -0.6 + j * 1.2); cassette.add(w); wells.push(w.position.clone()); }
  const goldM = new THREE.MeshStandardMaterial({ color: '#d4a64a', metalness: 1, roughness: 0.3 });
  const foil = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.1, 2.8), goldM); foil.position.y = -0.24; cassette.add(foil);

  function update(t) {
    earth.rotation.y = 1.2 + t * 0.01; clouds.rotation.y = t * 0.004;
    for (let i = 0; i < nD; i++) { dp[i * 3] = dbase[i * 3] + Math.sin(t * 0.2 + i) * 0.15; dp[i * 3 + 1] = dbase[i * 3 + 1] + t * 0.02 * ((i % 3) - 1); }
    dg.attributes.position.needsUpdate = true;
  }
  return { scene, earth, sun, cassette, wells, update, glare };
}

// ------------------------------------------------------------------ LEAF (moss leaflet macro) + fingertip
export function buildLeaf() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#2f4a2a');
  scene.fog = new THREE.FogExp2('#3f5a33', 0.035);
  const r = rng(8);
  // leaf texture: elongated plant cells with chloroplast dots
  const leafTex = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#4f8a3a'; g.fillRect(0, 0, w, h);
    const cw = 64, ch = 26;
    for (let row = 0; row < h / ch + 1; row++) {
      const off = (row % 2) * cw * 0.5;
      for (let c = -1; c < w / cw + 1; c++) {
        const x = c * cw + off + (r() - 0.5) * 6, y = row * ch + (r() - 0.5) * 3;
        const gg = 120 + r() * 50 | 0; g.fillStyle = `rgb(${60 + r() * 30 | 0},${gg},${40 + r() * 20 | 0})`;
        g.beginPath(); g.roundRect(x + 2, y + 2, cw - 4, ch - 4, 9); g.fill();
        for (let k = 0; k < 7; k++) { g.fillStyle = 'rgba(40,110,30,0.6)'; g.beginPath(); g.ellipse(x + 8 + r() * (cw - 16), y + 6 + r() * (ch - 12), 3.5, 2.5, 0, 0, 7); g.fill(); }
      }
    }
  }, { repeat: [8, 8] });
  const leafBump = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#909090'; g.fillRect(0, 0, w, h); const cw = 32, ch = 13; g.strokeStyle = '#3a3a3a'; g.lineWidth = 2.5; for (let row = 0; row < h / ch + 1; row++) { const off = (row % 2) * cw * 0.5; for (let c = -1; c < w / cw + 1; c++) { g.beginPath(); g.roundRect(c * cw + off + 1, row * ch + 1, cw - 2, ch - 2, 5); g.stroke(); } } }, { srgb: false, repeat: [16, 16] });
  const leafM = new THREE.MeshPhysicalMaterial({ map: leafTex, bumpMap: leafBump, bumpScale: 3, roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.3, sheen: 0.3, sheenColor: new THREE.Color('#b8ff9a') });
  const leafG = new THREE.PlaneGeometry(80, 80, 120, 120);
  { const p = leafG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, -0.004 * x * x * 0.3 + Math.sin(y * 0.15) * 0.3 + Math.sin(x * 0.7 + y * 0.3) * 0.04); } leafG.computeVertexNormals(); }
  const leaf = new THREE.Mesh(leafG, leafM); leaf.rotation.x = -Math.PI / 2; leaf.receiveShadow = true; scene.add(leaf);
  // midrib
  const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 80, 24, 1, true), new THREE.MeshPhysicalMaterial({ color: '#6aa34a', roughness: 0.4, clearcoat: 0.5 })); rib.rotation.x = Math.PI / 2; rib.position.set(-3.2, -0.15, 0); scene.add(rib);
  // water droplets
  const waterM = new THREE.MeshPhysicalMaterial({ color: '#e8fff4', roughness: 0.02, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.45, envMapIntensity: 1.5 });
  const drops = [];
  for (let i = 0; i < 9; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2), waterM); const s = 0.25 + r() * 0.6; d.scale.set(s, s * 0.55, s); d.position.set(1.5 + r() * 6 - 3, 0, -2 - r() * 8); scene.add(d); drops.push(d); }
  // moss strands in the background (out of focus)
  const strandM = new THREE.MeshStandardMaterial({ color: '#5f9a3d', roughness: 0.6 });
  for (let i = 0; i < 40; i++) {
    const pts = []; const x0 = (r() - 0.5) * 30, z0 = -6 - r() * 20; const hgt = 3 + r() * 6;
    for (let k = 0; k <= 6; k++) pts.push(new THREE.Vector3(x0 + Math.sin(k * 0.6 + i) * 0.6, k / 6 * hgt, z0 + Math.cos(k * 0.5) * 0.4));
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.18 + r() * 0.12, 8), strandM); scene.add(m);
    for (let k = 0; k < 8; k++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), strandM); lf.scale.set(0.15, 0.6, 0.05); const p = pts[1 + (k % 5)]; lf.position.set(p.x + (r() - 0.5) * 0.4, p.y, p.z); lf.rotation.set(r() * 0.6, r() * 6, r() * 0.8 - 0.4); scene.add(lf); }
  }
  // lights: warm sunlight through moss + green bounce
  scene.add(new THREE.HemisphereLight('#d9ffd0', '#2a4020', 0.8));
  const sun = new THREE.DirectionalLight('#fff0c8', 2.6); sun.position.set(-6, 10, -8); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 40 }); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.02; scene.add(sun);
  const fill = new THREE.DirectionalLight('#cfe8ff', 0.9); fill.position.set(5, 4, 8); scene.add(fill);
  // floating spores
  const nP = 200; const pp = new Float32Array(nP * 3); for (let i = 0; i < nP; i++) { pp[i * 3] = (r() - 0.5) * 12; pp[i * 3 + 1] = r() * 5; pp[i * 3 + 2] = (r() - 0.5) * 12 - 3; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); const pbase = pp.slice();
  scene.add(new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.05, map: softSprite('rgba(255,255,220,1)', 'rgba(220,255,180,0)'), transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending })));

  // fingertip (for the size comparison): huge rounded tip with fingerprint ridges and a nail
  const finger = new THREE.Group(); finger.visible = false; scene.add(finger);
  const printTex = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#e2a68a'; g.fillRect(0, 0, w, h);
    g.lineWidth = 5; for (let k = 0; k < 70; k++) { g.strokeStyle = k % 2 ? 'rgba(170,100,80,0.55)' : 'rgba(250,200,180,0.4)'; g.beginPath(); g.ellipse(w * 0.5, h * 0.55, 8 + k * 9, 5 + k * 6.5, 0.2, 0, Math.PI * 2); g.stroke(); }
    noiseFill(g, w, h, 0, 0.08, 20, 3);
  });
  const printBump = canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); g.lineWidth = 6; for (let k = 0; k < 70; k++) { g.strokeStyle = k % 2 ? '#202020' : '#e0e0e0'; g.beginPath(); g.ellipse(w * 0.5, h * 0.55, 8 + k * 9, 5 + k * 6.5, 0.2, 0, Math.PI * 2); g.stroke(); } }, { srgb: false });
  const skinM = new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: printTex, bumpMap: printBump, bumpScale: 4, roughness: 0.55, sheen: 0.6, sheenColor: new THREE.Color('#ffc8b0') });
  const tipG = new THREE.CapsuleGeometry(9, 30, 24, 64); tipG.rotateX(Math.PI / 2);
  const tip = new THREE.Mesh(tipG, skinM); tip.scale.set(1, 0.75, 1); finger.add(tip);
  const nail = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2.4), new THREE.MeshPhysicalMaterial({ color: '#f6d2c4', roughness: 0.2, clearcoat: 1 }));
  nail.scale.set(6.5, 2.2, 8); nail.position.set(0, 5.4, 9); finger.add(nail);
  finger.rotation.order = 'YXZ'; finger.rotation.set(0.3, -Math.PI / 2, 0);

  function update(t) {
    for (let i = 0; i < nP; i++) { pp[i * 3 + 1] = pbase[i * 3 + 1] + Math.sin(t * 0.3 + i) * 0.2; pp[i * 3] = pbase[i * 3] + Math.sin(t * 0.2 + i * 2.1) * 0.15; }
    pg.attributes.position.needsUpdate = true;
  }
  return { scene, sun, finger, drops, update, leafM };
}

// ------------------------------------------------------------------ LAB (scientific scenes: needle, cryptobiosis, rehydration)
export function buildLab() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#0B1D24'); scene.fog = new THREE.FogExp2('#0B1D24', 0.05);
  const r = rng(12);
  scene.add(new THREE.HemisphereLight('#8fc9d6', '#1a120c', 0.8));
  const key = new THREE.DirectionalLight('#FFD89A', 2.6); key.position.set(-4, 6, -5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 30 }); key.shadow.bias = -0.0008; key.shadow.normalBias = 0.02; scene.add(key);
  const front = new THREE.DirectionalLight('#e8f4ff', 1.2); front.position.set(3, 3, 6); scene.add(front);
  const heat = new THREE.PointLight('#ff7a2a', 0, 12, 2); heat.position.set(2, 3, 2); scene.add(heat);
  // particles
  const nP = 400; const pp = new Float32Array(nP * 3); for (let i = 0; i < nP; i++) { pp[i * 3] = (r() - 0.5) * 14; pp[i * 3 + 1] = (r() - 0.3) * 8; pp[i * 3 + 2] = (r() - 0.5) * 10 - 2; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); const pbase = pp.slice();
  const parts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.05, map: softSprite('rgba(170,245,255,1)', 'rgba(120,230,255,0)'), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(parts);

  // needle (stainless steel, tip pointing up)
  const needle = new THREE.Group(); needle.visible = false; scene.add(needle);
  const steel = new THREE.MeshPhysicalMaterial({ color: '#e3e8ee', metalness: 1, roughness: 0.1, clearcoat: 0.6, envMapIntensity: 3.5 });
  const shaftG = new THREE.LatheGeometry([new THREE.Vector2(0.0, 0), new THREE.Vector2(0.45, -0.5), new THREE.Vector2(1.6, -6), new THREE.Vector2(3.2, -18), new THREE.Vector2(3.4, -60)], 64);
  const shaft = new THREE.Mesh(shaftG, steel); shaft.castShadow = true; shaft.receiveShadow = true; needle.add(shaft);
  // a tiny flattened tip where the tardigrade sits
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.6, 0.08, 48), steel); cap.position.y = -0.48; needle.add(cap);

  // substrate for cryptobiosis: moss leaflet fragment + water film
  const sub = new THREE.Group(); sub.visible = false; scene.add(sub);
  const subTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#5c8f3e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${50 + r() * 40 | 0},${110 + r() * 50 | 0},${40 + r() * 20 | 0},0.7)`; g.beginPath(); g.roundRect(r() * w, r() * h, 30, 12, 5); g.fill(); } });
  const subM = new THREE.MeshPhysicalMaterial({ map: subTex, roughness: 0.5, clearcoat: 0.4 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.25, 64), subM); disc.position.y = -0.125; disc.receiveShadow = true; sub.add(disc);
  const water = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#6fb4c8', roughness: 0.12, clearcoat: 0.2, specularIntensity: 0.25, transparent: true, opacity: 0.12, depthWrite: false }));
  water.scale.set(2.3, 0.42, 2.3); sub.add(water);
  const dropM = new THREE.MeshPhysicalMaterial({ color: '#d8f4ff', roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.5, depthWrite: false });
  const fallDrop = new THREE.Mesh(new THREE.SphereGeometry(0.35, 32, 24), dropM); fallDrop.visible = false; scene.add(fallDrop);
  // heat shimmer sprites (rising)
  const shimmer = [];
  for (let i = 0; i < 18; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softSprite('rgba(255,170,90,0.6)', 'rgba(255,120,40,0)'), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); s.position.set((r() - 0.5) * 4, r() * 2, (r() - 0.5) * 3); s.scale.setScalar(0.6 + r()); scene.add(s); shimmer.push(s); }

  function update(t, o = {}) {
    for (let i = 0; i < nP; i++) { pp[i * 3 + 1] = pbase[i * 3 + 1] + Math.sin(t * 0.25 + i) * 0.1; pp[i * 3] = pbase[i * 3] + Math.sin(t * 0.15 + i * 2.1) * 0.08; }
    pg.attributes.position.needsUpdate = true;
    const dry = o.dry || 0;
    water.scale.set(2.3 * (1 - dry * 0.97), 0.42 * (1 - dry) + 0.001, 2.3 * (1 - dry * 0.97)); water.visible = dry < 0.99;
    subM.color.set('#ffffff').lerp(new THREE.Color('#b08a50'), dry);
    heat.intensity = (o.heat || 0) * 6;
    shimmer.forEach((s, i) => { s.material.opacity = (o.heat || 0) * 0.15 * (0.5 + 0.5 * Math.sin(t * 2 + i)); s.position.y = ((t * 0.5 + i * 0.37) % 3); });
  }
  return { scene, needle, sub, water, fallDrop, key, heat, update };
}
