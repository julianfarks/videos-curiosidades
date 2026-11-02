import * as THREE from 'three';
import { canvasTex, rng, clamp, smooth, lerp, placeSegment, ik2 } from './lib.js';

// ---------- profile (gecko faces +x, stands on plane y=0) ----------
const PX = [-0.170, -0.165, -0.150, -0.120, -0.085, -0.050, -0.030, -0.010, 0.020, 0.050, 0.072, 0.086, 0.098, 0.110, 0.122, 0.131, 0.1375, 0.1415, 0.1438, 0.1446];
const PW = [0.0000, 0.0018, 0.0034, 0.0062, 0.0095, 0.0140, 0.0200, 0.0245, 0.0265, 0.0235, 0.0185, 0.0185, 0.0228, 0.0250, 0.0228, 0.0185, 0.0135, 0.0085, 0.0042, 0.0000];
const PH = [0.0000, 0.0016, 0.0030, 0.0050, 0.0075, 0.0105, 0.0140, 0.0170, 0.0180, 0.0165, 0.0140, 0.0138, 0.0152, 0.0160, 0.0146, 0.0124, 0.0096, 0.0064, 0.0032, 0.0000];
const XMIN = PX[0], XMAX = PX[PX.length - 1], LEN = XMAX - XMIN;

function interp(arr, x) {
  if (x <= PX[0]) return arr[0];
  for (let i = 0; i < PX.length - 1; i++) {
    if (x <= PX[i + 1]) {
      const t = (x - PX[i]) / (PX[i + 1] - PX[i]);
      const p0 = arr[Math.max(0, i - 1)], p1 = arr[i], p2 = arr[i + 1], p3 = arr[Math.min(arr.length - 1, i + 2)];
      const t2 = t * t, t3 = t2 * t;
      return Math.max(0, 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3));
    }
  }
  return arr[arr.length - 1];
}

// ---------- textures ----------
function skinTextures() {
  const W = 2048, H = 512;
  const r = rng(11);
  const color = canvasTex(W, H, (g) => {
    // around-body gradient: v=0.25 top (dorsal), v=0.75 belly
    for (let y = 0; y < H; y++) {
      const th = (y / H) * Math.PI * 2; const s = Math.sin(th); // 1 dorsal, -1 belly
      const dors = clamp(s * 0.5 + 0.5);
      const bel = smooth(0.15, -0.8, s);
      const R = lerp(lerp(120, 46, dors), 205, bel), G = lerp(lerp(200, 160, dors), 222, bel), B = lerp(lerp(58, 34, dors), 118, bel);
      g.fillStyle = `rgb(${R | 0},${G | 0},${B | 0})`; g.fillRect(0, y, W, 1);
    }
    // darker dorsal vertebral line + soft mottling
    for (let i = 0; i < 2600; i++) {
      const x = r() * W, y = H * (0.08 + r() * 0.36); const rad = 2 + r() * 7;
      g.fillStyle = `rgba(${40 + r() * 30},${110 + r() * 40},${30 + r() * 20},${0.10 + r() * 0.18})`; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
    }
    // fine pale speckles on the back
    for (let i = 0; i < 1600; i++) {
      const x = r() * W, y = H * (0.05 + r() * 0.42);
      g.fillStyle = `rgba(230,245,150,${0.18 + r() * 0.25})`; g.beginPath(); g.arc(x, y, 1 + r() * 2.2, 0, 7); g.fill();
    }
    // snout-to-eye soft dark stripe & mouth line on both sides (head region u>0.83)
    const uS = (0.1420 - XMIN) / LEN * W, uE = (0.110 - XMIN) / LEN * W, uM = (0.097 - XMIN) / LEN * W;
    for (const side of [0, 1]) {
      const vMouth = side === 0 ? H * (1 - 0.045) : H * (0.5 + 0.045);
      g.strokeStyle = 'rgba(40,52,30,0.85)'; g.lineWidth = 5; g.beginPath();
      g.moveTo(uS - 6, vMouth); g.quadraticCurveTo((uS + uM) / 2, vMouth + (side === 0 ? 10 : -10), uM, vMouth + (side === 0 ? -6 : 6)); g.stroke();
      g.strokeStyle = 'rgba(255,240,200,0.35)'; g.lineWidth = 3; g.beginPath();
      g.moveTo(uS - 6, vMouth + (side === 0 ? -6 : 6)); g.quadraticCurveTo((uS + uM) / 2, vMouth + (side === 0 ? 3 : -3), uM, vMouth + (side === 0 ? -12 : 12)); g.stroke();
      // nostril
      const vN = side === 0 ? H * 0.06 : H * 0.44;
      g.fillStyle = 'rgba(25,30,20,0.9)'; g.beginPath(); g.ellipse(uS - 14, vN, 4, 3, 0, 0, 7); g.fill();
    }
    // subtle belly sheen lines
    for (let x = 0; x < W; x += 6) { g.fillStyle = 'rgba(255,255,230,0.05)'; g.fillRect(x, H * 0.62, 2, H * 0.26); }
  }, { srgb: true });
  color.wrapS = THREE.ClampToEdgeWrapping; color.wrapT = THREE.RepeatWrapping;

  const bump = canvasTex(W, H, (g) => {
    g.fillStyle = '#404040'; g.fillRect(0, 0, W, H);
    const r2 = rng(5);
    for (let i = 0; i < 52000; i++) {
      const x = r2() * W, y = r2() * H;
      const u = x / W; const headK = u > 0.8 ? 0.65 : 1.0; const tailK = u < 0.35 ? 0.75 : 1.0;
      const rad = (2.0 + r2() * 2.4) * headK * tailK;
      const gr = g.createRadialGradient(x - rad * 0.3, y - rad * 0.3, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.7, 'rgba(170,170,170,0.6)'); gr.addColorStop(1, 'rgba(60,60,60,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
    }
  }, { srgb: false });
  bump.wrapT = THREE.RepeatWrapping;
  return { color, bump };
}

function irisTexture() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#0c0f0a'; g.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    // turquoise eye ring
    let gr = g.createRadialGradient(cx, cy, 150, cx, cy, 256);
    gr.addColorStop(0, '#3fae9c'); gr.addColorStop(0.5, '#2f8f86'); gr.addColorStop(1, '#16302a');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 256, 0, 7); g.fill();
    // golden iris
    gr = g.createRadialGradient(cx, cy, 30, cx, cy, 175);
    gr.addColorStop(0, '#5a3a08'); gr.addColorStop(0.35, '#d99a1e'); gr.addColorStop(0.75, '#f4c84a'); gr.addColorStop(0.95, '#8a5a12'); gr.addColorStop(1, '#2a1a05');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 175, 0, 7); g.fill();
    const r = rng(9);
    for (let i = 0; i < 260; i++) {
      const a = r() * Math.PI * 2, r0 = 60 + r() * 30, r1 = 140 + r() * 34;
      g.strokeStyle = `rgba(${90 + r() * 80},${50 + r() * 50},10,${0.25 + r() * 0.35})`; g.lineWidth = 1 + r() * 2.5;
      g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a + 0.05) * r1, cy + Math.sin(a + 0.05) * r1); g.stroke();
    }
    // round pupil (day gecko)
    gr = g.createRadialGradient(cx, cy, 40, cx, cy, 70);
    gr.addColorStop(0, '#000'); gr.addColorStop(0.85, '#000'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 72, 0, 7); g.fill();
  });
}

function padTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#b9c79a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) {
      const y = 20 + i * 25;
      const gr = g.createLinearGradient(0, y - 10, 0, y + 10);
      gr.addColorStop(0, 'rgba(90,100,70,0.0)'); gr.addColorStop(0.5, 'rgba(70,80,55,0.85)'); gr.addColorStop(1, 'rgba(240,245,220,0.6)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(w / 2, y, w * 0.48, 9, 0, 0, Math.PI); g.fill();
    }
  });
}

// eye geometry with planar front UVs (pupil on +z)
function eyeGeometry(r) {
  const geo = new THREE.SphereGeometry(r, 40, 28);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (z > 0) uv.setXY(i, 0.5 + x / r * 0.5, 0.5 + y / r * 0.5); else uv.setXY(i, 0.5 + Math.sign(x || 1) * 0.499, 0.5);
  }
  return geo;
}

export function buildGecko() {
  const root = new THREE.Group();
  const inner = new THREE.Group(); root.add(inner);
  const { color, bump } = skinTextures();
  const skin = new THREE.MeshPhysicalMaterial({ map: color, bumpMap: bump, bumpScale: 1.2, roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.35, sheen: 0.4, sheenColor: new THREE.Color('#d8ff9a'), sheenRoughness: 0.5 });
  const limbMat = new THREE.MeshPhysicalMaterial({ color: '#86bf4a', bumpMap: bump, bumpScale: 0.6, roughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.4, sheen: 0.3, sheenColor: new THREE.Color('#d8ff9a') });
  const padMat = new THREE.MeshPhysicalMaterial({ map: padTexture(), roughness: 0.6, sheen: 0.4, sheenColor: new THREE.Color('#ffffff') });

  // ----- body mesh (dynamic) -----
  const NS = 150, NR = 40;
  const bodyGeo = new THREE.BufferGeometry();
  const vcount = NS * (NR + 1);
  const posArr = new Float32Array(vcount * 3), uvArr = new Float32Array(vcount * 2);
  const idx = [];
  for (let i = 0; i < NS; i++) for (let j = 0; j <= NR; j++) {
    const k = i * (NR + 1) + j; uvArr[k * 2] = i / (NS - 1); uvArr[k * 2 + 1] = j / NR;
    if (i < NS - 1 && j < NR) { const a = k, b = k + NR + 1, c = k + 1, d = k + NR + 2; idx.push(a, b, c, c, b, d); }
  }
  bodyGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  bodyGeo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
  bodyGeo.setIndex(idx);
  const body = new THREE.Mesh(bodyGeo, skin); body.castShadow = true; body.receiveShadow = true; inner.add(body);

  // ----- eyes -----
  const eyeGeo = eyeGeometry(0.0098);
  const irisMat = new THREE.MeshPhysicalMaterial({ map: irisTexture(), roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.03 });
  const corneaMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.08, roughness: 0.0, clearcoat: 1, clearcoatRoughness: 0, metalness: 0, depthWrite: false });
  const rimGeo = new THREE.TorusGeometry(0.0097, 0.0011, 10, 40);
  const eyes = [];
  for (const side of [1, -1]) {
    const g = new THREE.Group();
    const ball = new THREE.Mesh(eyeGeo, irisMat); ball.castShadow = true; g.add(ball);
    const cornea = new THREE.Mesh(new THREE.SphereGeometry(0.0103, 32, 20), corneaMat); g.add(cornea);
    const rim = new THREE.Mesh(rimGeo, skin); rim.position.z = 0.0022; g.add(rim);
    inner.add(g); eyes.push({ g, ball, rim, side });
  }

  // ----- tongue -----
  const tongueMat = new THREE.MeshPhysicalMaterial({ color: '#e0707a', roughness: 0.3, clearcoat: 0.8, sheen: 0.5, sheenColor: new THREE.Color('#ffb0b0') });
  let tongue = null;

  // ----- legs -----
  const cyl = new THREE.CylinderGeometry(0.78, 1, 1, 14, 1);
  const sph = new THREE.SphereGeometry(1, 16, 12);
  const toeSegGeo = new THREE.CylinderGeometry(0.00095, 0.00135, 1, 8, 1);
  const padGeo = new THREE.SphereGeometry(1, 18, 12);
  const legs = [];
  const legDefs = [
    { name: 'FL', ax: 0.055, side: 1, off: 0.0, front: true },
    { name: 'FR', ax: 0.055, side: -1, off: 0.5, front: true },
    { name: 'BL', ax: -0.028, side: 1, off: 0.5, front: false },
    { name: 'BR', ax: -0.028, side: -1, off: 0.0, front: false },
  ];
  for (const d of legDefs) {
    const up = new THREE.Mesh(cyl, limbMat), lo = new THREE.Mesh(cyl, limbMat);
    const j0 = new THREE.Mesh(sph, limbMat), j1 = new THREE.Mesh(sph, limbMat), palm = new THREE.Mesh(sph, limbMat);
    for (const m of [up, lo, j0, j1, palm]) { m.castShadow = true; inner.add(m); }
    j0.scale.setScalar(0.0062); j1.scale.setScalar(0.0045); palm.scale.set(0.0058, 0.0026, 0.0052);
    const foot = new THREE.Group(); inner.add(foot);
    const toes = [];
    const spread = d.front ? [-1.05, -0.5, 0.0, 0.48, 0.98] : [-1.2, -0.62, -0.05, 0.5, 1.05];
    for (let t = 0; t < 5; t++) {
      const base = new THREE.Group(); base.rotation.y = spread[t]; foot.add(base);
      const L = (t === 0 ? 0.0062 : t === 4 ? 0.0075 : 0.0088) * (d.front ? 1 : 1.12);
      const prox = new THREE.Group(); base.add(prox);
      const seg = new THREE.Mesh(toeSegGeo, limbMat); seg.rotation.z = -Math.PI / 2; seg.scale.y = L; seg.position.x = L / 2; seg.castShadow = true; prox.add(seg);
      const dist = new THREE.Group(); dist.position.x = L; prox.add(dist);
      const pad = new THREE.Mesh(padGeo, padMat); pad.scale.set(0.0044, 0.0010, 0.0030); pad.position.set(0.0036, -0.0002, 0); pad.castShadow = true; dist.add(pad);
      const padTop = new THREE.Mesh(padGeo, limbMat); padTop.scale.set(0.0042, 0.0009, 0.0028); padTop.position.set(0.0035, 0.0004, 0); dist.add(padTop);
      toes.push({ base, prox, dist, L });
    }
    legs.push({ ...d, up, lo, j0, j1, palm, foot, toes, last: null });
  }

  const state = {
    walk: 0, sway: 1, duty: 0.66, S: 0.052, lift: 0.014,
    headYaw: 0, headPitch: 0, tailCurl: 0, look: null, tongue: 0,
    detached: 0, flail: 0, time: 0, gripSpread: 0, peelBoost: 0, peelLeg: -1, peelAmt: 0,
  };

  const center = (x, st, bodyX) => {
    // returns [yc, zc] at body-local x (relative to body origin)
    const w = interp(PW, x), h = interp(PH, x);
    let yc = h * 0.72 + 0.0085;
    yc -= smooth(-0.06, -0.15, x) * 0.0055; // tail rests close to surface
    yc += smooth(0.08, 0.13, x) * 0.004;
    const k = x - 0.085;
    if (k > 0) yc += st.headPitch * k;
    const swayEnv = 0.35 + smooth(0.0, -0.17, x) * 1.6;
    let zc = st.sway * 0.0065 * Math.sin(2 * Math.PI * (x / 0.24) - st.walk * 2 * Math.PI) * swayEnv;
    zc += st.tailCurl * Math.pow(smooth(-0.04, -0.17, x), 1.6) * 0.06;
    if (k > 0) zc += st.headYaw * k;
    yc += st.detached * 0.004 * Math.sin(st.time * 9 + x * 40) * smooth(0, -0.17, x);
    return [yc, zc, w, h];
  };

  const tmpV = new THREE.Vector3();

  function update(st) {
    Object.assign(state, st);
    const s = state;
    root.updateMatrixWorld(true);
    const bodyX = s.S * s.walk; // body travels forward along +x
    inner.position.x = 0;
    // body rings
    for (let i = 0; i < NS; i++) {
      const u = i / (NS - 1); const x = XMIN + u * LEN;
      const [yc, zc, w, h] = center(x, s, bodyX);
      for (let j = 0; j <= NR; j++) {
        const th = (j / NR) * Math.PI * 2; const sn = Math.sin(th), cs = Math.cos(th);
        const yy = sn < 0 ? sn * 0.72 : sn; // flatter belly
        const k = (i * (NR + 1) + j) * 3;
        posArr[k] = x + bodyX; posArr[k + 1] = yc + h * yy; posArr[k + 2] = zc + w * cs;
      }
    }
    bodyGeo.attributes.position.needsUpdate = true; bodyGeo.computeVertexNormals(); bodyGeo.computeBoundingSphere();

    // eyes
    const ex = 0.1105; const [eyc, ezc, ew, eh] = center(ex, s, bodyX);
    for (const e of eyes) {
      e.g.position.set(ex + bodyX, eyc + eh * 0.42, ezc + e.side * ew * 0.70);
      const out = new THREE.Vector3(0.35, 0.42, e.side * 1).normalize();
      out.applyAxisAngle(new THREE.Vector3(0, 1, 0), s.headYaw * 0.9);
      e.g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), out);
      // gaze (ball only)
      if (s.look) {
        const lp = inner.worldToLocal(s.look.clone());
        const dir = lp.sub(e.g.position).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(out, dir);
        const ang = 2 * Math.acos(clamp(q.w, -1, 1));
        const lim = 0.55; const f = ang > lim ? lim / ang : 1;
        const qq = new THREE.Quaternion().slerp(q, f);
        e.ball.quaternion.copy(qq.premultiply(e.g.quaternion.clone().invert()).multiply(e.g.quaternion));
      } else e.ball.quaternion.identity();
    }

    // tongue (eye lick)
    if (tongue) { tongue.geometry.dispose(); inner.remove(tongue); tongue = null; }
    if (s.tongue > 0.01) {
      const [tyc, tzc, tw, th] = center(0.141, s, bodyX);
      const eye = eyes[0].g.position;
      const p0 = new THREE.Vector3(0.141 + bodyX, tyc - th * 0.25, tzc + 0.002);
      const p2 = new THREE.Vector3(eye.x + 0.004, eye.y + 0.006, eye.z + 0.009);
      const p1 = new THREE.Vector3(0.153 + bodyX, tyc + 0.012, tzc + 0.022);
      const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
      const t = clamp(s.tongue); const pts = curve.getPoints(24).slice(0, Math.max(2, Math.round(24 * t) + 1));
      tongue = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.0019, 8, false), tongueMat);
      inner.add(tongue);
    }

    // legs
    for (let li = 0; li < legs.length; li++) {
      const L = legs[li];
      const [ayc, azc, aw, ah] = center(L.ax, s, bodyX);
      const shoulder = new THREE.Vector3(L.ax + bodyX, ayc - ah * 0.15, azc + L.side * aw * 0.78);
      const c = s.walk + L.off; const k = Math.floor(c); const f = c - k;
      const baseX = L.front ? 0.020 : -0.030;
      const lateral = L.side * (L.front ? 0.050 : 0.054);
      let rel, y = 0, peel = 0;
      if (f < s.duty) { rel = baseX + s.S * s.duty / 2 - s.S * f; peel = smooth(s.duty - 0.10, s.duty, f); }
      else { const g = (f - s.duty) / (1 - s.duty); rel = baseX - s.S * s.duty / 2 + s.S * s.duty * (g * g * (3 - 2 * g)); y = s.lift * Math.sin(Math.PI * g); peel = 1 - smooth(0.2, 0.7, g); }
      if (s.peelLeg === li) { peel = Math.max(peel, s.peelAmt); y = Math.max(y, s.peelAmt * 0.012); }
      let foot = new THREE.Vector3(bodyX + rel, y + 0.002, lateral + (center(L.ax + rel, s, bodyX)[1]) * 0.4);
      if (s.detached > 0) {
        const fl = new THREE.Vector3(shoulder.x + (L.front ? 0.03 : -0.03) + Math.sin(s.time * 13 + li) * 0.012, shoulder.y - 0.006 + Math.cos(s.time * 11 + li * 2) * 0.012, shoulder.z + L.side * 0.045);
        foot.lerp(fl, s.detached); peel = Math.max(peel, s.detached * (0.5 + 0.5 * Math.sin(s.time * 15 + li)));
      }
      const pole = shoulder.clone().add(new THREE.Vector3(L.front ? -0.03 : 0.03, 0.035, L.side * 0.02));
      const elbow = ik2(shoulder, foot.clone().add(new THREE.Vector3(0, 0.004, 0)), 0.026, 0.024, pole);
      const wrist = foot.clone().add(new THREE.Vector3(0, 0.004, 0));
      placeSegment(L.up, shoulder, elbow, 0.0058); placeSegment(L.lo, elbow, wrist, 0.0044);
      L.j0.position.copy(shoulder); L.j1.position.copy(elbow); L.palm.position.copy(foot).add(new THREE.Vector3(0, 0.002, 0));
      L.foot.position.copy(foot);
      const yaw = L.front ? L.side * 0.55 : L.side * 1.45;
      L.foot.rotation.set(0, -yaw + (L.front ? 0 : 0), 0);
      if (!L.front) L.foot.rotation.y = -L.side * 0.0 + (L.side > 0 ? 2.2 : -2.2) * -1 + Math.PI * (L.side > 0 ? 1 : -1) * 0;
      L.foot.rotation.y = L.front ? (L.side > 0 ? 0.55 : -0.55) : (L.side > 0 ? 2.15 : -2.15);
      // toes: peel distal first (digital hyperextension)
      for (let t = 0; t < 5; t++) {
        const toe = L.toes[t];
        const pe = clamp(peel * 1.25 - t * 0.04);
        toe.prox.rotation.z = smooth(0.35, 1.0, pe) * 0.7;
        toe.dist.rotation.z = smooth(0.0, 0.6, pe) * 0.95;
        toe.base.rotation.x = 0;
      }
    }
  }

  // world position helpers
  function headWorld(out = new THREE.Vector3()) {
    const s = state; const bodyX = s.S * s.walk; const [yc, zc] = center(0.115, s, bodyX);
    return inner.localToWorld(out.set(0.115 + bodyX, yc + 0.01, zc));
  }
  function eyeWorld(i = 0, out = new THREE.Vector3()) { return eyes[i].g.getWorldPosition(out); }
  function footWorld(li, out = new THREE.Vector3()) { return legs[li].foot.getWorldPosition(out); }
  function bodyWorld(x = 0.02, out = new THREE.Vector3()) {
    const s = state; const bodyX = s.S * s.walk; const [yc, zc] = center(x, s, bodyX);
    return inner.localToWorld(out.set(x + bodyX, yc, zc));
  }

  update({});
  return { root, inner, update, state, headWorld, eyeWorld, footWorld, bodyWorld, legs, eyes };
}
