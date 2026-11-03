import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTex, rng, noiseFill, clamp } from './lib.js';

export function softSprite(inner = 'rgba(255,240,200,1)', outer = 'rgba(255,220,150,0)') {
  return canvasTex(64, 64, (g, w, h) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, inner); r.addColorStop(1, outer); g.fillStyle = r; g.fillRect(0, 0, w, h); });
}

function leafShape(g, x, y, L, Wd, a, col) {
  g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = col; g.beginPath();
  g.moveTo(-L / 2, 0); g.quadraticCurveTo(0, -Wd, L / 2, 0); g.quadraticCurveTo(0, Wd, -L / 2, 0); g.fill();
  g.strokeStyle = 'rgba(40,25,10,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-L / 2, 0); g.lineTo(L / 2, 0); g.stroke(); g.restore();
}

// fecal cube material: matte, fibrous plant-matter, dark earthy brown (stylized, non-graphic)
let CUBEMAT = null;
export function cubeMaterial() {
  if (CUBEMAT) return CUBEMAT;
  const r = rng(77);
  const map = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#5a3f2a'; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 0, 0.18, 18, 5);
    for (let i = 0; i < 700; i++) { const c = r(); g.strokeStyle = c < 0.5 ? 'rgba(120,92,58,0.55)' : 'rgba(40,28,18,0.5)'; g.lineWidth = 0.8 + r(); const x = r() * w, y = r() * h, a = r() * 6.28, L = 3 + r() * 10; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); }
  });
  const bump = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 0, 0.5, 9, 9); for (let i = 0; i < 900; i++) { const v = 60 + r() * 140 | 0; g.strokeStyle = `rgb(${v},${v},${v})`; const x = r() * w, y = r() * h, a = r() * 6.28; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7); g.stroke(); } }, { srgb: false });
  CUBEMAT = new THREE.MeshStandardMaterial({ color: '#ffffff', map, bumpMap: bump, bumpScale: 2.5, roughness: 0.95, metalness: 0 });
  return CUBEMAT;
}
export const CUBE = 0.034; // stylized (~2 cm real, slightly exaggerated for legibility)
export function makeCube(seed = 1) {
  const r = rng(seed);
  const g = new RoundedBoxGeometry(CUBE, CUBE * (0.92 + r() * 0.1), CUBE * (1 + r() * 0.15), 3, CUBE * 0.16);
  const p = g.attributes.position; const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = Math.sin(v.x * 300 + seed) * Math.cos(v.z * 260 + seed * 2) * 0.0007; p.setXYZ(i, v.x + n, v.y + n, v.z - n); }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, cubeMaterial()); m.castShadow = true; m.receiveShadow = true; return m;
}

export function buildForest(scene) {
  const r = rng(5);
  scene.background = new THREE.Color('#cdb28c');
  scene.fog = new THREE.Fog('#c9b18e', 3.0, 15);

  // ---- lights (golden hour: warm back/side sun = rim, cool sky fill)
  const hemi = new THREE.HemisphereLight('#a9c6d6', '#5c4630', 0.75); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffc27a', 3.2); sun.position.set(-3.2, 2.6, -4.2); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -2.2, right: 2.2, top: 2.2, bottom: -2.2, near: 0.5, far: 14 }); sun.shadow.bias = -0.0015; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
  scene.add(sun); scene.add(sun.target);
  const fill = new THREE.DirectionalLight('#bcd3e6', 0.9); fill.position.set(2.5, 1.6, 3.5); scene.add(fill);
  const bounce = new THREE.PointLight('#ffb070', 0.6, 4, 2); bounce.position.set(0.4, 0.35, 0.9); scene.add(bounce);

  // ---- ground: leaf litter
  const groundMap = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#7a5a3a'; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 0, 0.22, 60, 3); noiseFill(g, w, h, 0, 0.12, 12, 4);
    const cols = ['#8c6a44', '#a07a4a', '#6d4f33', '#b08a58', '#5c4430', '#9a8058', '#7d6a48'];
    for (let i = 0; i < 2600; i++) leafShape(g, r() * w, r() * h, 18 + r() * 30, 4 + r() * 6, r() * 6.28, cols[(r() * cols.length) | 0]);
    for (let i = 0; i < 400; i++) { g.strokeStyle = 'rgba(60,40,22,0.6)'; g.lineWidth = 1 + r() * 2; const x = r() * w, y = r() * h, a = r() * 6.28, L = 20 + r() * 50; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); }
  }, { repeat: [7, 7] });
  const groundBump = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 0, 0.6, 14, 8); }, { srgb: false, repeat: [14, 14] });
  const gGeo = new THREE.PlaneGeometry(30, 30, 80, 80);
  { const p = gGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); const d = Math.hypot(x, y); p.setZ(i, (Math.sin(x * 0.7) * Math.cos(y * 0.6) * 0.05 + Math.sin(x * 2.3 + y * 1.7) * 0.012) * clamp((d - 0.8) / 2)); } gGeo.computeVertexNormals(); }
  const ground = new THREE.Mesh(gGeo, new THREE.MeshStandardMaterial({ map: groundMap, bumpMap: groundBump, bumpScale: 3, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  // ---- loose leaves (3D) near the action
  const leafTex = canvasTex(128, 64, (g, w, h) => { g.clearRect(0, 0, w, h); leafShape(g, 64, 32, 118, 22, 0, '#ffffff'); }, {});
  const leafMat = new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85 });
  const nL = 520; const leaves = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.09, 0.045), leafMat, nL);
  const lc = ['#a07a4a', '#8c6a44', '#b58d5a', '#6f5a3a', '#9b6b3b', '#c19a63'];
  const dm = new THREE.Object3D();
  for (let i = 0; i < nL; i++) {
    const a = r() * 6.28, d = 0.15 + Math.pow(r(), 0.7) * 3.2;
    dm.position.set(Math.cos(a) * d, 0.004 + r() * 0.006, Math.sin(a) * d - 0.4);
    dm.rotation.set(-Math.PI / 2 + (r() - 0.5) * 0.5, 0, r() * 6.28); dm.scale.setScalar(0.6 + r() * 0.9); dm.updateMatrix();
    leaves.setMatrixAt(i, dm.matrix); leaves.setColorAt(i, new THREE.Color(lc[(r() * lc.length) | 0]));
  }
  leaves.receiveShadow = true; scene.add(leaves);

  // ---- rocks (sandstone)
  const rockMap = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#9c8a74'; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 0, 0.3, 30, 13); noiseFill(g, w, h, 0, 0.15, 6, 14); for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${90 + r() * 40 | 0},${110 + r() * 40 | 0},${70 + r() * 30 | 0},0.35)`; g.beginPath(); g.arc(r() * w, r() * h, 3 + r() * 10, 0, 7); g.fill(); } });
  const rockMat = new THREE.MeshStandardMaterial({ map: rockMap, bumpMap: groundBump, bumpScale: 4, roughness: 0.92 });
  function rock(x, z, sx, sy, sz, seed, flatTop = false) {
    const geo = new THREE.IcosahedronGeometry(1, 4); const p = geo.attributes.position; const v = new THREE.Vector3(); const rr = rng(seed);
    const ph = [rr() * 6, rr() * 6, rr() * 6];
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = 1 + 0.16 * Math.sin(v.x * 3 + ph[0]) * Math.sin(v.y * 3.4 + ph[1]) * Math.sin(v.z * 2.8 + ph[2]) + 0.05 * Math.sin(v.x * 9 + v.z * 7); v.multiplyScalar(n); if (flatTop && v.y > 0.35) v.y = 0.35 + (v.y - 0.35) * 0.08; p.setXYZ(i, v.x, v.y, v.z); }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, rockMat); m.scale.set(sx, sy, sz); m.position.set(x, sy * (flatTop ? -0.05 : 0.15), z); m.castShadow = m.receiveShadow = true; scene.add(m); return m;
  }
  const altar = rock(0.1, 0.16, 0.2, 0.1, 0.17, 3, true); // flat-topped rock where the cubes sit (wombats scent-mark on rocks/logs)
  const ALTAR_Y = altar.position.y + 0.35 * 0.1 * 1.0 + 0.002;
  rock(1.0, -0.95, 0.3, 0.18, 0.26, 4); rock(1.1, -1.6, 0.5, 0.3, 0.45, 5); rock(-1.6, 0.4, 0.3, 0.18, 0.28, 6); rock(0.75, 0.9, 0.12, 0.07, 0.1, 7);

  // ---- fallen log
  const barkMap = canvasTex(256, 512, (g, w, h) => { g.fillStyle = '#6b5a48'; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 0, 0.25, 20, 21); for (let i = 0; i < 120; i++) { g.strokeStyle = 'rgba(40,30,22,0.5)'; g.lineWidth = 1 + r() * 2; const x = r() * w; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 8, h / 3, x - 8, 2 * h / 3, x + 3, h); g.stroke(); } }, { repeat: [2, 1] });
  const log = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.4, 28, 1), new THREE.MeshStandardMaterial({ map: barkMap, roughness: 0.9 }));
  log.rotation.z = Math.PI / 2; log.rotation.y = 0.5; log.position.set(-1.2, 0.11, -1.9); log.castShadow = log.receiveShadow = true; scene.add(log);

  // ---- eucalyptus trunks (smooth pale bark with ochre/grey patches)
  const euMap = canvasTex(256, 1024, (g, w, h) => {
    g.fillStyle = '#d8d0c0'; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 0, 0.12, 40, 31);
    for (let i = 0; i < 70; i++) { g.fillStyle = ['rgba(186,150,98,0.55)', 'rgba(150,150,140,0.45)', 'rgba(200,170,120,0.5)', 'rgba(120,115,105,0.4)'][(r() * 4) | 0]; g.beginPath(); g.ellipse(r() * w, r() * h, 10 + r() * 40, 30 + r() * 120, 0, 0, 7); g.fill(); }
  });
  const euMat = new THREE.MeshStandardMaterial({ map: euMap, roughness: 0.75 });
  const trunks = [[-1.3, -2.6, 0.13], [1.5, -3.2, 0.17], [-2.8, -4.5, 0.2], [2.9, -5.5, 0.22], [0.2, -6.5, 0.2], [-4.6, -7.2, 0.25], [4.8, -7.8, 0.25], [-1.9, 1.6, 0.11], [2.2, 0.6, 0.12], [-0.9, -9.5, 0.3], [3.4, -10, 0.3], [-3.8, -2.2, 0.15]];
  for (const [x, z, rad] of trunks) {
    const hgt = 7 + r() * 3; const geo = new THREE.CylinderGeometry(rad * 0.55, rad, hgt, 20, 8);
    const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + Math.sin(y * 0.6 + x) * 0.08); p.setZ(i, p.getZ(i) + Math.cos(y * 0.5 + z) * 0.06); } geo.computeVertexNormals();
    const t = new THREE.Mesh(geo, euMat); t.position.set(x, hgt / 2 - 0.05, z); t.castShadow = true; t.receiveShadow = true; scene.add(t);
  }

  // ---- background: painted distant forest on a big cylinder
  const bgTex = canvasTex(2048, 512, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#f4e2bc'); sky.addColorStop(0.55, '#e3c493'); sky.addColorStop(1, '#b9a07a'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    for (let layer = 0; layer < 3; layer++) {
      const col = ['rgba(170,165,130,0.55)', 'rgba(128,132,100,0.65)', 'rgba(96,104,78,0.75)'][layer];
      for (let i = 0; i < 40; i++) { const x = r() * w, tw = 3 + r() * 6 + layer * 3; g.fillStyle = col; g.fillRect(x, h * (0.05 + r() * 0.2), tw, h); }
      g.fillStyle = col; for (let i = 0; i < 160; i++) { g.beginPath(); g.ellipse(r() * w, h * (0.1 + r() * 0.35) + layer * 18, 40 + r() * 90, 20 + r() * 40, 0, 0, 7); g.fill(); }
    }
    const mist = g.createLinearGradient(0, h * 0.5, 0, h); mist.addColorStop(0, 'rgba(230,190,130,0)'); mist.addColorStop(1, 'rgba(220,180,125,0.8)'); g.fillStyle = mist; g.fillRect(0, 0, w, h);
  });
  const bg = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 9, 64, 1, true), new THREE.MeshBasicMaterial({ map: bgTex, side: THREE.BackSide, fog: false, toneMapped: true, color: '#d8c0a0' }));
  bg.position.y = 3.6; scene.add(bg);

  // ---- canopy leaf clusters (eucalyptus: lanceolate, blue-green)
  const euLeafTex = canvasTex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); const rr = rng(3); for (let i = 0; i < 60; i++) leafShape(g, 30 + rr() * 196, 30 + rr() * 196, 50 + rr() * 30, 7 + rr() * 4, rr() * 6.28, ['#5d7a62', '#6f8c6d', '#4e6b57', '#86a07c'][(rr() * 4) | 0]); });
  const canopyMat = new THREE.MeshStandardMaterial({ map: euLeafTex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8 });
  const nC = 90; const canopy = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.4, 1.4), canopyMat, nC);
  for (let i = 0; i < nC; i++) { dm.position.set((r() - 0.5) * 16, 2.6 + r() * 4, -1 - r() * 10); dm.rotation.set(r() * 6, r() * 6, r() * 6); dm.scale.setScalar(0.8 + r() * 1.4); dm.updateMatrix(); canopy.setMatrixAt(i, dm.matrix); }
  canopy.castShadow = true; scene.add(canopy);

  // ---- ferns and grass tufts
  const fernTex = canvasTex(256, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#4f6a3a'; g.lineWidth = 5; g.beginPath(); g.moveTo(128, 510); g.quadraticCurveTo(120, 250, 135, 10); g.stroke(); for (let i = 0; i < 26; i++) { const y = 480 - i * 18, L = 110 * Math.sin((i + 2) / 30 * Math.PI); for (const s of [-1, 1]) leafShape(g, 128 + s * L * 0.5, y, L, 7, s * 0.25, i % 2 ? '#6b8a48' : '#5a7a3e'); } });
  const fernMat = new THREE.MeshStandardMaterial({ map: fernTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 });
  const fernGeo = new THREE.PlaneGeometry(0.35, 0.7); fernGeo.translate(0, 0.35, 0);
  { const p = fernGeo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, y * y * 0.6); } fernGeo.computeVertexNormals(); }
  const nF = 70; const ferns = new THREE.InstancedMesh(fernGeo, fernMat, nF);
  const spots = [];
  for (let i = 0; i < nF;) {
    let x, z; do { x = (r() - 0.5) * 7; z = -r() * 6 + 1.6; } while (Math.hypot(x, z + 0.3) < 1.0 || (Math.abs(x) < 0.7 && z > -2.6 && z < 1.4));
    for (let k = 0; k < 5 && i < nF; k++, i++) { dm.position.set(x + (r() - 0.5) * 0.1, 0, z + (r() - 0.5) * 0.1); dm.rotation.set(0, k / 5 * 6.28 + r(), 0); dm.rotateX(-0.6 - r() * 0.3); dm.scale.setScalar(0.7 + r() * 0.6); dm.updateMatrix(); ferns.setMatrixAt(i, dm.matrix); }
    spots.push([x, z]);
  }
  ferns.castShadow = true; ferns.receiveShadow = true; scene.add(ferns);
  const grassTex = canvasTex(128, 256, (g, w, h) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 40; i++) { const x = 20 + r() * 88; g.strokeStyle = ['#8a8a50', '#6f7a3e', '#9a9058', '#5f6a34'][(r() * 4) | 0]; g.lineWidth = 1 + r() * 1.2; g.beginPath(); g.moveTo(64 + (x - 64) * 0.3, 256); g.quadraticCurveTo(x, 150, x + (r() - 0.5) * 40, 20 + r() * 90); g.stroke(); } });
  const grassMat = new THREE.MeshStandardMaterial({ map: grassTex, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 });
  const grassGeo = new THREE.PlaneGeometry(0.22, 0.32); grassGeo.translate(0, 0.16, 0);
  const nG = 160; const grass = new THREE.InstancedMesh(grassGeo, grassMat, nG);
  for (let i = 0; i < nG; i++) { let x, z; do { x = (r() - 0.5) * 8; z = -r() * 7 + 2.2; } while ((x > -1.5 && x < 1.6 && z > -2.9 && z < 2.0)); dm.position.set(x, 0, z); dm.rotation.set(0, r() * 3.14, 0); dm.scale.setScalar(0.6 + r() * 0.8); dm.updateMatrix(); grass.setMatrixAt(i, dm.matrix); }
  grass.receiveShadow = true; scene.add(grass);

  // ---- sun shafts
  const shaftTex = canvasTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,220,160,0)'); gr.addColorStop(0.5, 'rgba(255,220,160,1)'); gr.addColorStop(1, 'rgba(255,220,160,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.3, 'rgba(0,0,0,1)'); v.addColorStop(1, 'rgba(0,0,0,0)'); g.globalCompositeOperation = 'destination-in'; g.fillStyle = v; g.fillRect(0, 0, w, h); });
  const shafts = [];
  for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.8 + r() * 0.8, 9), new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); m.position.set(-2.4 + i * 1.3, 3.2, -3.5 - i * 0.8); m.rotation.z = -0.55; m.rotation.y = 0.2; scene.add(m); shafts.push(m); }

  // ---- floating dust motes
  const nD = 320; const dpos = new Float32Array(nD * 3); for (let i = 0; i < nD; i++) { dpos[i * 3] = (r() - 0.5) * 4; dpos[i * 3 + 1] = r() * 1.8; dpos[i * 3 + 2] = (r() - 0.5) * 4 - 0.5; }
  const dgeo = new THREE.BufferGeometry(); dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dust = new THREE.Points(dgeo, new THREE.PointsMaterial({ size: 0.012, map: softSprite(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8, color: '#ffe0a8' }));
  scene.add(dust); const dbase = dpos.slice();

  // ---- the cubes on the flat rock (wombats deposit them on raised spots)
  const cubes = [];
  const layout = [[0.045, 0.12, 0.3], [0.1, 0.17, -0.4], [0.155, 0.11, 0.9], [0.075, 0.22, 1.4], [0.14, 0.2, 2.1]];
  layout.forEach(([x, z, ry], i) => { const c = makeCube(i + 3); c.position.set(x, ALTAR_Y + CUBE * 0.46, z); c.rotation.y = ry; scene.add(c); cubes.push(c); });

  function update(t) {
    for (let i = 0; i < nD; i++) { dpos[i * 3] = dbase[i * 3] + Math.sin(t * 0.3 + i) * 0.05; dpos[i * 3 + 1] = dbase[i * 3 + 1] + Math.sin(t * 0.2 + i * 1.7) * 0.04; }
    dgeo.attributes.position.needsUpdate = true;
    shafts.forEach((s, i) => s.material.opacity = 0.09 + 0.04 * Math.sin(t * 0.5 + i * 2));
  }
  return { sun, hemi, fill, cubes, update, ALTAR_Y, altar };
}
