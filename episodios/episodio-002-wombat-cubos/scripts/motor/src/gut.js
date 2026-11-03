import * as THREE from 'three';
import { canvasTex, rng, noiseFill, clamp, lerp, smooth } from './lib.js';
import { softSprite } from './forest.js';

// ---------------------------------------------------------------------------------
// Superquadric helper: e1 (along length/x), e2 (cross-section). e=1 ellipsoid, e->0.2 rounded box.
const sgn = (x) => (x < 0 ? -1 : 1);
const spow = (b, e) => sgn(b) * Math.pow(Math.abs(b), e);
export function superquadric(nu = 28, nv = 40) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array((nu + 1) * (nv + 1) * 3), uv = new Float32Array((nu + 1) * (nv + 1) * 2);
  const idx = [];
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b = a + nv + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { uv[(i * (nv + 1) + j) * 2] = j / nv; uv[(i * (nv + 1) + j) * 2 + 1] = i / nu; }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
  g.userData = { nu, nv };
  return g;
}
// fill: half-lengths a (x), b (y), c (z); exponents e1 (latitude, along x), e2 (around)
export function setSuperquadric(g, a, b, c, e1, e2, rot = 0) {
  const { nu, nv } = g.userData; const p = g.attributes.position.array; let k = 0;
  for (let i = 0; i <= nu; i++) {
    const eta = -Math.PI / 2 + Math.PI * i / nu; const ce = Math.cos(eta), se = Math.sin(eta);
    for (let j = 0; j <= nv; j++) {
      const w = -Math.PI + 2 * Math.PI * j / nv + rot; const cw = Math.cos(w), sw = Math.sin(w);
      p[k++] = a * spow(se, e1);
      p[k++] = b * spow(ce, e1) * spow(cw, e2);
      p[k++] = c * spow(ce, e1) * spow(sw, e2);
    }
  }
  g.attributes.position.needsUpdate = true; g.computeVertexNormals();
}

// stiffness pattern around the circumference: 2 stiff (top/bottom) + 2 flexible (front/back) regions
// theta measured in the y-z plane: theta=0 -> +y (top), theta=pi/2 -> +z (front)
export function stiffness(theta) { const c = Math.cos(theta); return smooth(0.42, 0.78, Math.abs(c)); } // 1 = stiff, 0 = flexible
// superellipse radius (unit faces), corners at 45 deg (stiff/flexible junctions)
export function sqR(theta, n) { const c = Math.abs(Math.cos(theta)), s = Math.abs(Math.sin(theta)); return Math.pow(Math.pow(c, n) + Math.pow(s, n), -1 / n); }

const STIFF = new THREE.Color('#6f9fd8'), FLEX = new THREE.Color('#f08f72'), FLESH = new THREE.Color('#e7a191');

export function buildLab(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0B1D24');
  scene.fog = new THREE.FogExp2('#0B1D24', 0.11);
  const r = rng(9);
  scene.add(new THREE.HemisphereLight('#7fb6c8', '#2a1a14', 0.7));
  const key = new THREE.DirectionalLight('#FFD89A', 2.4); key.position.set(-2, 3, -3); scene.add(key);
  const front = new THREE.DirectionalLight('#ffe9d6', 1.3); front.position.set(1.5, 1.2, 4); scene.add(front);
  const cyan = new THREE.PointLight('#8FF0FF', 3, 6, 2); cyan.position.set(0, 0.2, 1.4); scene.add(cyan);

  // particles
  const nP = 500; const pp = new Float32Array(nP * 3); for (let i = 0; i < nP; i++) { pp[i * 3] = (r() - 0.5) * 10; pp[i * 3 + 1] = (r() - 0.5) * 5; pp[i * 3 + 2] = (r() - 0.5) * 6 - 1; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); const pbase = pp.slice();
  const parts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.03, map: softSprite('rgba(170,245,255,1)', 'rgba(120,230,255,0)'), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(parts);

  // ---------------- 3D intestine cutaway (along x) ----------------
  const tube = new THREE.Group(); tube.rotation.z = -Math.PI / 2; scene.add(tube); // vertical: proximal at top, distal (towards the exit) at the bottom
  const R0 = 0.5, X0 = -4.2, X1 = 4.2, NX = 170, NT = 90;
  const OPEN = 1.25; // half-angle of the front opening
  const thStart = Math.PI / 2 + OPEN, thLen = 2 * Math.PI - 2 * OPEN;
  const striTex = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 0, 0.12, 16, 41); for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(150,90,90,${0.08 + r() * 0.1})`; g.lineWidth = 1 + r() * 2; const y = r() * h; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w / 3, y + 6, 2 * w / 3, y - 6, w, y); g.stroke(); } for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 2, 0, 7); g.fill(); } }, { repeat: [3, 1] });
  function wallGeo(sign) {
    const g = new THREE.BufferGeometry(); const n = (NX + 1) * (NT + 1);
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const uv = new Float32Array(n * 2); const idx = [];
    for (let i = 0; i <= NX; i++) for (let j = 0; j <= NT; j++) { uv[(i * (NT + 1) + j) * 2] = i / NX; uv[(i * (NT + 1) + j) * 2 + 1] = j / NT; }
    for (let i = 0; i < NX; i++) for (let j = 0; j < NT; j++) { const a = i * (NT + 1) + j, b = a + NT + 1; if (sign > 0) idx.push(a, a + 1, b, b, a + 1, b + 1); else idx.push(a, b, a + 1, b, b + 1, a + 1); }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); return g;
  }
  const innerG = wallGeo(1), outerG = wallGeo(-1);
  const innerM = new THREE.MeshPhysicalMaterial({ vertexColors: true, map: striTex, roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.25, side: THREE.DoubleSide, sheen: 0.4, sheenColor: new THREE.Color('#ffd0c0') });
  const outerM = new THREE.MeshPhysicalMaterial({ vertexColors: true, map: striTex, roughness: 0.55, clearcoat: 0.3, side: THREE.DoubleSide });
  const inner = new THREE.Mesh(innerG, innerM), outer = new THREE.Mesh(outerG, outerM);
  tube.add(inner, outer);
  // cut-edge strips (show the wall thickness; thicker in stiff regions)
  const edgeG = new THREE.BufferGeometry(); const NE = (NX + 1) * 2 * 2;
  edgeG.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NE * 3), 3)); edgeG.setAttribute('color', new THREE.BufferAttribute(new Float32Array(NE * 3), 3));
  { const idx = []; for (let s = 0; s < 2; s++) for (let i = 0; i < NX; i++) { const a = s * (NX + 1) * 2 + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } edgeG.setIndex(idx); }
  const edge = new THREE.Mesh(edgeG, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide })); tube.add(edge);

  // band overlay colour strength (0 = natural flesh, 1 = stiff/flexible colour coding)
  const tubeState = { code: 0, wave: 0, square: 0, t: 0, waveSpeed: 0.9, amp: 0.14 };
  // square-ness along x: proximal (left) round -> distal (right) square
  const sqAt = (x) => tubeState.square * smooth(-2.2, 1.2, x);
  const thick = (th) => 0.06 + 0.06 * stiffness(th); // stiff regions ~2x thicker
  function wallR(x, th) {
    const st = stiffness(th);
    const n = 2 + 6 * sqAt(x);
    let rr = R0 * 0.8 * sqR(th, n) * (1 / (1 + 0.12 * sqAt(x))) + R0 * 0.2;
    // peristaltic contraction rings travelling distally (+x); stiff regions contract faster (lead)
    let c = 0;
    for (let k = -3; k <= 3; k++) {
      const xc = ((tubeState.t * tubeState.waveSpeed) % 1.4) + k * 1.4 - 0.2;
      const lead = st * 0.12;
      const d = x - (xc + lead);
      c = Math.max(c, Math.exp(-d * d / 0.03));
    }
    rr *= 1 - tubeState.amp * tubeState.wave * c * (0.55 + 0.45 * st);
    return rr;
  }
  const tmpC = new THREE.Color();
  function updateTube() {
    const pi = innerG.attributes.position.array, po = outerG.attributes.position.array, ci = innerG.attributes.color.array, co = outerG.attributes.color.array;
    const pe = edgeG.attributes.position.array, ce = edgeG.attributes.color.array;
    let k = 0;
    for (let i = 0; i <= NX; i++) {
      const x = lerp(X0, X1, i / NX);
      for (let j = 0; j <= NT; j++) {
        const th = thStart + thLen * j / NT; const ri = wallR(x, th), ro = ri + thick(th);
        const cy = Math.cos(th), sz = Math.sin(th);
        pi[k] = x; pi[k + 1] = ri * cy; pi[k + 2] = ri * sz;
        po[k] = x; po[k + 1] = ro * cy; po[k + 2] = ro * sz;
        const st = stiffness(th);
        tmpC.copy(FLESH).lerp(tmpC.clone().copy(FLEX).lerp(STIFF, st), tubeState.code * 0.85);
        ci[k] = tmpC.r; ci[k + 1] = tmpC.g; ci[k + 2] = tmpC.b;
        co[k] = tmpC.r * 0.85; co[k + 1] = tmpC.g * 0.8; co[k + 2] = tmpC.b * 0.8;
        k += 3;
      }
      for (let s = 0; s < 2; s++) {
        const th = s === 0 ? thStart : thStart + thLen; const ri = wallR(x, th), ro = ri + thick(th);
        const b = (s * (NX + 1) * 2 + i * 2) * 3; const cy = Math.cos(th), sz = Math.sin(th);
        pe[b] = x; pe[b + 1] = ri * cy; pe[b + 2] = ri * sz; pe[b + 3] = x; pe[b + 4] = ro * cy; pe[b + 5] = ro * sz;
        const st = stiffness(th); tmpC.copy(FLESH).multiplyScalar(0.8).lerp(tmpC.clone().copy(FLEX).lerp(STIFF, st), tubeState.code * 0.85);
        for (const o of [b, b + 3]) { ce[o] = tmpC.r; ce[o + 1] = tmpC.g; ce[o + 2] = tmpC.b; }
      }
    }
    for (const g of [innerG, outerG, edgeG]) { g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; g.computeVertexNormals(); }
  }

  // contents: segments travelling distally
  const NSEG = 11;
  const fecesTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 0, 0.25, 14, 61); for (let i = 0; i < 500; i++) { g.strokeStyle = r() < 0.5 ? 'rgba(255,240,200,0.4)' : 'rgba(40,30,20,0.35)'; const x = r() * w, y = r() * h, a = r() * 6.28; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8); g.stroke(); } });
  const segs = [];
  for (let i = 0; i < NSEG; i++) {
    const g = superquadric(22, 36);
    const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: '#6a4a30', map: fecesTex, roughness: 0.7, clearcoat: 0.3 }));
    tube.add(m); segs.push(m);
  }
  const WET = new THREE.Color('#7d6a3a'), DRY = new THREE.Color('#5a3d28');
  function updateSegs() {
    const t = tubeState.t;
    for (let i = 0; i < NSEG; i++) {
      const m = segs[i];
      const x = -4.6 + i * 0.82 + t * 0.12;
      const q = sqAt(x); const dist = smooth(-3.2, 1.0, x); // 0 proximal slurry, 1 distal formed
      const half = lerp(0.34, 0.30, dist);
      const len = lerp(0.62, 0.30, dist); // proximal pieces overlap into a continuous mass
      const e2 = lerp(1.0, 0.18, q), e1 = lerp(0.9, 0.2, q * dist);
      // gentle squeeze with passing waves
      setSuperquadric(m.geometry, len, half, half, e1, e2, Math.PI / 4 * 0);
      m.position.set(x, 0, 0);
      m.material.color.copy(WET).lerp(DRY, dist); m.material.roughness = lerp(0.35, 0.92, dist); m.material.clearcoat = lerp(0.8, 0.0, dist);
    }
  }

  // ---------------- cross-section ring (2D-ish, in its own group) ----------------
  const section = new THREE.Group(); section.visible = false; scene.add(section);
  const NR = 240;
  const ringG = new THREE.BufferGeometry();
  { const n = (NR + 1) * 4; ringG.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); ringG.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const idx = []; for (let j = 0; j < NR; j++) { const a = j * 4, b = (j + 1) * 4; // 0 inner-front 1 outer-front 2 inner-back 3 outer-back
      idx.push(a, b, a + 1, a + 1, b, b + 1); idx.push(a + 2, a + 3, b + 2, a + 3, b + 3, b + 2); idx.push(a + 1, b + 1, a + 3, a + 3, b + 1, b + 3); idx.push(a, a + 2, b, a + 2, b + 2, b); }
    ringG.setIndex(idx); }
  const ring = new THREE.Mesh(ringG, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.45, clearcoat: 0.6, side: THREE.DoubleSide })); section.add(ring);
  const discG = new THREE.BufferGeometry();
  { const n = (NR + 1) * 2 + 2; discG.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); const idx = []; const cF = (NR + 1) * 2, cB = cF + 1; for (let j = 0; j < NR; j++) { const a = j * 2, b = (j + 1) * 2; idx.push(cF, a, b, cB, b + 1, a + 1, a, a + 1, b, a + 1, b + 1, b); } discG.setIndex(idx); }
  const disc = new THREE.Mesh(discG, new THREE.MeshPhysicalMaterial({ color: '#5e4029', map: fecesTex, roughness: 0.85 })); section.add(disc);
  // arrows
  const arrowMatS = new THREE.MeshBasicMaterial({ color: '#9fd0ff', transparent: true, toneMapped: false }), arrowMatF = new THREE.MeshBasicMaterial({ color: '#ffb089', transparent: true, toneMapped: false });
  const arrows = [];
  for (let k = 0; k < 8; k++) {
    const th = k * Math.PI / 4; const stiffA = k % 4 === 0; const flexA = k % 4 === 2;
    if (!stiffA && !flexA) continue;
    const a = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 12), stiffA ? arrowMatS : arrowMatF); shaft.position.y = 0.11;
    const headM = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 16), stiffA ? arrowMatS : arrowMatF); headM.rotation.x = Math.PI; headM.position.y = -0.03;
    a.add(shaft, headM); section.add(a); arrows.push({ g: a, th, stiff: stiffA });
  }
  const secState = { c: 0, n: 2, t: 0 };
  function updateSection() {
    const p = ringG.attributes.position.array, col = ringG.attributes.color.array, d = discG.attributes.position.array;
    const D = 0.12;
    for (let j = 0; j <= NR; j++) {
      const th = j / NR * Math.PI * 2; const st = stiffness(th);
      // contraction: stiff regions move faster/further inward (phase lead); flexible lag behind
      const cs = secState.c, cf = Math.pow(secState.c, 1.8);
      const squeeze = lerp(cf, Math.pow(cs, 0.6), st);
      const base = 0.62 * sqR(th, secState.n) / (1 + 0.1 * (secState.n - 2) / 5);
      const ri = base * (1 - 0.06 * squeeze) + 0.006; const ro = ri + 0.13 + 0.13 * st; // stiff = 2x thicker wall
      const cy = Math.cos(th), sx = Math.sin(th);
      const b = j * 12;
      p[b] = sx * ri; p[b + 1] = cy * ri; p[b + 2] = D; p[b + 3] = sx * ro; p[b + 4] = cy * ro; p[b + 5] = D;
      p[b + 6] = sx * ri; p[b + 7] = cy * ri; p[b + 8] = -D; p[b + 9] = sx * ro; p[b + 10] = cy * ro; p[b + 11] = -D;
      tmpC.copy(FLEX).lerp(STIFF, st);
      for (let q = 0; q < 4; q++) { col[b + q * 3] = tmpC.r; col[b + q * 3 + 1] = tmpC.g; col[b + q * 3 + 2] = tmpC.b; }
      const rc = base * (1 - 0.06 * squeeze);
      d[j * 6] = sx * rc; d[j * 6 + 1] = cy * rc; d[j * 6 + 2] = D * 0.9; d[j * 6 + 3] = sx * rc; d[j * 6 + 4] = cy * rc; d[j * 6 + 5] = -D * 0.9;
    }
    const cF = (NR + 1) * 2; d[cF * 3] = 0; d[cF * 3 + 1] = 0; d[cF * 3 + 2] = D * 0.9; d[cF * 3 + 3] = 0; d[cF * 3 + 4] = 0; d[cF * 3 + 5] = -D * 0.9;
    ringG.attributes.position.needsUpdate = true; ringG.attributes.color.needsUpdate = true; ringG.computeVertexNormals();
    discG.attributes.position.needsUpdate = true; discG.computeVertexNormals();
    for (const a of arrows) {
      const cs = a.stiff ? Math.pow(secState.c, 0.6) : Math.pow(secState.c, 1.8);
      const rr = 0.62 + 0.26 + 0.14 + 0.06 * (1 - cs);
      a.g.position.set(Math.sin(a.th) * rr, Math.cos(a.th) * rr, D + 0.02);
      a.g.rotation.z = -a.th;
      const s = (a.stiff ? 1.25 : 0.8) * (0.6 + 0.5 * cs); a.g.scale.setScalar(s);
      (a.stiff ? arrowMatS : arrowMatF).opacity = 0.35 + 0.65 * cs;
    }
  }

  // ---------------- comparison pedestals ----------------
  const compare = new THREE.Group(); compare.visible = false; scene.add(compare);
  const pedM = new THREE.MeshPhysicalMaterial({ color: '#1d3a44', roughness: 0.3, clearcoat: 1 });
  const ringGlow = new THREE.MeshBasicMaterial({ color: '#8FF0FF', toneMapped: false });
  const mkPed = (x) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.37, 0.16, 64), pedM); p.position.set(x, -0.6, 0); const rg = new THREE.Mesh(new THREE.TorusGeometry(0.345, 0.007, 8, 96), ringGlow); rg.rotation.x = Math.PI / 2; rg.position.set(x, -0.52, 0); compare.add(p, rg); };
  mkPed(-0.48); mkPed(0.48);
  const pelletG = superquadric(28, 40); setSuperquadric(pelletG, 0.28, 0.12, 0.12, 0.75, 1.0);
  const pellet = new THREE.Mesh(pelletG, new THREE.MeshStandardMaterial({ color: '#6a4a30', map: fecesTex, roughness: 0.85 })); pellet.position.set(-0.48, -0.4, 0); compare.add(pellet);
  const cubeG = superquadric(28, 40); setSuperquadric(cubeG, 0.16, 0.16, 0.16, 0.2, 0.2);
  const bigCube = new THREE.Mesh(cubeG, new THREE.MeshStandardMaterial({ color: '#5a3d28', map: fecesTex, roughness: 0.92 })); bigCube.position.set(0.48, -0.355, 0); compare.add(bigCube);
  // dimension bracket above the cube
  const dimM = new THREE.MeshBasicMaterial({ color: '#FFD72B', toneMapped: false, transparent: true });
  const dim = new THREE.Group(); const bar = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.008, 0.008), dimM); dim.add(bar);
  for (const s of [-1, 1]) { const tk = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.06, 0.008), dimM); tk.position.x = s * 0.16; dim.add(tk); }
  dim.position.set(0.48, -0.12, 0.2); compare.add(dim);

  function update(t, mode) {
    tubeState.t = t;
    for (let i = 0; i < nP; i++) { pp[i * 3 + 1] = pbase[i * 3 + 1] + Math.sin(t * 0.25 + i) * 0.08; pp[i * 3] = pbase[i * 3] + Math.sin(t * 0.15 + i * 2.1) * 0.06; }
    pg.attributes.position.needsUpdate = true;
    tube.visible = mode === 'tube'; section.visible = mode === 'section'; compare.visible = mode === 'compare';
    if (tube.visible) { updateTube(); updateSegs(); }
    if (section.visible) updateSection();
  }
  return { scene, tube, tubeState, section, secState, compare, pellet, bigCube, dim, dimM, update, cyan, key };
}

// ---------------------------------------------------------------------------------
// Digestive tract inside the (ghost) wombat, in wombat-local coordinates.
export function buildTract() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#f29a8c', emissive: '#7a2a24', emissiveIntensity: 0.55, roughness: 0.45, transparent: true, opacity: 0.95 });
  const matC = new THREE.MeshStandardMaterial({ color: '#e98a7c', emissive: '#6a241e', emissiveIntensity: 0.5, roughness: 0.45, transparent: true, opacity: 0.95 });
  const hot = new THREE.MeshStandardMaterial({ color: '#ffb35a', emissive: '#ff8a1a', emissiveIntensity: 1.2, roughness: 0.4 });
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // oesophagus + stomach
  const eso = new THREE.CatmullRomCurve3([V(0, 0.255, 0.39), V(0, 0.25, 0.3), V(0.01, 0.235, 0.21), V(0.03, 0.215, 0.14)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(eso, 40, 0.008, 10), mat));
  const stomach = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), mat); stomach.scale.set(0.07, 0.05, 0.06); stomach.position.set(0.04, 0.2, 0.1); stomach.rotation.z = 0.4; g.add(stomach);
  // small intestine: compact coils in the mid-belly
  const si = []; for (let k = 0; k <= 90; k++) { const u = k / 90; const a = u * Math.PI * 14; si.push(V(0.075 * Math.sin(a) * (0.6 + 0.4 * Math.sin(u * 9)), 0.155 + 0.03 * Math.cos(a * 0.5) + 0.02 * Math.sin(u * 5), 0.06 - u * 0.15 + 0.02 * Math.cos(a))); }
  si.unshift(V(0.06, 0.18, 0.08));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(si), 500, 0.0055, 8), mat));
  // caecum
  const cae = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), matC); cae.scale.set(0.022, 0.022, 0.04); cae.position.set(-0.07, 0.15, -0.11); g.add(cae);
  // large intestine (colon): long loops around the abdomen, ending in the straight distal colon at the rear
  const co = [V(-0.07, 0.15, -0.1)];
  for (let k = 0; k <= 60; k++) { const u = k / 60; const a = Math.PI * 1.2 + u * Math.PI * 4.2; co.push(V(0.11 * Math.cos(a) * (1 - 0.25 * u), 0.2 + 0.04 * Math.sin(u * 7) - 0.02 * u, 0.0 + 0.17 * Math.sin(a) * (1 - 0.2 * u) - 0.04 * u)); }
  co.push(V(0.05, 0.215, -0.2), V(0.0, 0.22, -0.27), V(0.0, 0.215, -0.335), V(0.0, 0.205, -0.37));
  const colon = new THREE.CatmullRomCurve3(co);
  const L = colon.getLength();
  // split at 83% of the length: the last 17% is where the cubes are formed
  const pts = colon.getSpacedPoints(400); const cut = Math.floor(400 * 0.83);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.slice(0, cut + 1)), 300, 0.011, 12), matC));
  const distalCurve = new THREE.CatmullRomCurve3(pts.slice(cut));
  const distal = new THREE.Mesh(new THREE.TubeGeometry(distalCurve, 120, 0.0125, 14), hot); g.add(distal);
  // little cubes inside the distal colon (glowing)
  const dcubes = [];
  for (let k = 0; k < 6; k++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.014, 0.014), new THREE.MeshBasicMaterial({ color: '#ffe2a8', toneMapped: false })); c.position.copy(distalCurve.getPointAt(0.25 + k * 0.13)); g.add(c); dcubes.push(c); }
  return { group: g, hot, distal, distalCurve, dcubes, colonLength: L, mat, matC };
}
