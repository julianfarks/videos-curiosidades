import * as THREE from 'three';
import { canvasTex, noiseFill, clamp, lerp, ik2 } from './lib.js';

// Stylized human (animated-film proportions). Faces +z, feet at y=0, ~1.78 tall.
// Arms are IK-driven (wrist targets in character space), face is parametric.
// opts.style: 'percy' (1940s engineer: white shirt, tie, suspenders, grey slacks) or 'modern' (t-shirt person)

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

function capsule(r, len, mat, seg = 16) {
  const g = new THREE.CapsuleGeometry(r, len, 8, seg); g.translate(0, len / 2 + r * 0.0, 0);
  const m = new THREE.Mesh(g, mat); m.castShadow = true; return m;
}

export function buildHuman(opts = {}) {
  const style = opts.style || 'percy';
  const P = style === 'percy';
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);

  // ---------------- materials
  const skinTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = P ? '#e7b493' : '#c98b68'; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 0, 0.05, 18, 3); noiseFill(g, w, h, 0, 0.03, 4, 5); });
  const skin = new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: skinTex, roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color('#ffb59a'), clearcoat: 0.08 });
  const clothTex = (base, lines) => canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 0, 0.05, 6, 9);
    if (lines) { g.strokeStyle = lines; g.lineWidth = 1; for (let i = 0; i < w; i += 4) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); } }
  }, { repeat: [2, 2] });
  const shirtM = new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: clothTex(P ? '#d6d0c2' : '#2f7fbf', P ? 'rgba(0,0,0,0.04)' : null), roughness: 0.92, sheen: 0.15, sheenColor: new THREE.Color('#ffffff') });
  const pantsM = new THREE.MeshStandardMaterial({ color: '#ffffff', map: clothTex(P ? '#5d5a55' : '#3a4150', 'rgba(0,0,0,0.06)'), roughness: 0.9 });
  const tieM = new THREE.MeshPhysicalMaterial({ color: '#7a2320', roughness: 0.5, sheen: 0.6, sheenColor: new THREE.Color('#ff9c80') });
  const strapM = new THREE.MeshStandardMaterial({ color: '#3b2a1e', roughness: 0.6 });
  const shoeM = new THREE.MeshPhysicalMaterial({ color: '#2a1a12', roughness: 0.35, clearcoat: 0.6 });
  const hairTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = P ? '#5b4a3c' : '#221a15'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { const x = Math.random() * w, y = Math.random() * h; g.strokeStyle = P ? (Math.random() < 0.25 ? 'rgba(190,180,168,0.55)' : 'rgba(40,30,22,0.5)') : 'rgba(0,0,0,0.5)'; g.lineWidth = 1 + Math.random() * 1.5; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10, y + 30, x + 4 + Math.random() * 10, y + 60); g.stroke(); } });
  const hairM = new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: hairTex, bumpMap: hairTex, bumpScale: 1.5, roughness: 0.6, sheen: 0.6, sheenColor: new THREE.Color(P ? '#c9b8a6' : '#6a5040') });
  const greyM = new THREE.MeshPhysicalMaterial({ color: '#a9a39a', roughness: 0.55, sheen: 0.8 });
  const white = new THREE.MeshPhysicalMaterial({ color: '#fbf8f2', roughness: 0.15, clearcoat: 1 });
  const irisM = new THREE.MeshPhysicalMaterial({ color: P ? '#4b6f8a' : '#5a3a20', roughness: 0.2, clearcoat: 1 });
  const dark = new THREE.MeshBasicMaterial({ color: '#0b0706' });
  const mouthM = new THREE.MeshStandardMaterial({ color: '#4a1512', roughness: 0.6 });
  const lipM = new THREE.MeshPhysicalMaterial({ color: P ? '#c07a6a' : '#9a5a4a', roughness: 0.45, clearcoat: 0.3 });
  const browM = new THREE.MeshStandardMaterial({ color: P ? '#3d2f24' : '#1a120e', roughness: 0.8 });
  const teethM = new THREE.MeshStandardMaterial({ color: '#f2eee6', roughness: 0.3 });

  // ---------------- legs + hips
  const hips = new THREE.Group(); hips.position.y = 0.95; body.add(hips);
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), pantsM); pelvis.scale.set(0.175, 0.13, 0.12); pelvis.castShadow = true; hips.add(pelvis);
  if (P) { const belt = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 8, 40), strapM); belt.scale.set(0.172, 0.118, 1); belt.rotation.x = Math.PI / 2; belt.position.y = 0.07; hips.add(belt); }
  for (const s of [1, -1]) {
    const thigh = capsule(0.072, 0.4, pantsM); thigh.rotation.z = Math.PI; thigh.position.set(s * 0.09, -0.02, 0); hips.add(thigh);
    const shin = capsule(0.058, 0.4, pantsM); shin.rotation.z = Math.PI; shin.position.set(s * 0.095, -0.5, 0); hips.add(shin);
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), shoeM); shoe.scale.set(0.055, 0.045, 0.13); shoe.position.set(s * 0.095, -0.915, 0.05); shoe.castShadow = true; hips.add(shoe);
  }

  // ---------------- torso (spine group bends)
  const spine = new THREE.Group(); spine.position.y = 0.05; hips.add(spine);
  const torsoG = new THREE.LatheGeometry([
    [0.0, 0], [0.16, 0.0], [0.165, 0.08], [0.17, 0.2], [0.19, 0.32], [0.2, 0.4], [0.185, 0.46], [0.12, 0.5], [0.06, 0.52], [0.0, 0.52],
  ].map(p => new THREE.Vector2(p[0], p[1])), 40);
  const torso = new THREE.Mesh(torsoG, shirtM); torso.scale.set(1, 1, 0.7); torso.castShadow = true; spine.add(torso);
  // surface-following ribbons (tie, suspenders) so they hug the torso
  const LP = [[0.0, 0], [0.16, 0.0], [0.165, 0.08], [0.17, 0.2], [0.19, 0.32], [0.2, 0.4], [0.185, 0.46], [0.12, 0.5], [0.06, 0.52]];
  const rAt = (y) => { for (let i = 1; i < LP.length; i++) if (y <= LP[i][1]) { const [r0, y0] = LP[i - 1], [r1, y1] = LP[i]; return r0 + (r1 - r0) * (y - y0) / Math.max(1e-6, y1 - y0); } return 0.06; };
  const surfPt = (x, y, side = 1, off = 0.004) => { const r = rAt(y); const zz = Math.sqrt(Math.max(0, r * r - x * x)) * 0.7; return new THREE.Vector3(x, y, side * (zz + off)); };
  function ribbon(pts, width, mat, side = 1) {
    const n = pts.length, pos = [], idx = [];
    for (let i = 0; i < n; i++) { const p = pts[i]; const w = typeof width === 'function' ? width(i / (n - 1)) : width; pos.push(p.x - w / 2, p.y, p.z, p.x + w / 2, p.y, p.z); if (i < n - 1) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(side > 0 ? idx : idx.map((v, i) => idx[i - (i % 3) + (2 - (i % 3))])); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.castShadow = true; return m;
  }
  if (P) {
    const tiePts = []; for (let k = 0; k <= 16; k++) { const y = 0.47 - k * 0.022; tiePts.push(surfPt(0, y, 1, 0.006)); }
    const tie = ribbon(tiePts, (u) => u < 0.06 ? 0.03 : (u > 0.93 ? 0.055 * (1 - (u - 0.93) / 0.07) + 0.01 : 0.03 + u * 0.03), new THREE.MeshPhysicalMaterial({ color: '#7a2320', roughness: 0.5, sheen: 0.6, sheenColor: new THREE.Color('#ff9c80'), side: THREE.DoubleSide })); spine.add(tie);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), tieM); knot.scale.set(0.02, 0.018, 0.012); knot.position.copy(surfPt(0, 0.47, 1, 0.006)); spine.add(knot);
    const collarM = new THREE.MeshPhysicalMaterial({ color: '#dcd6c8', roughness: 0.9, side: THREE.DoubleSide });
    for (const s of [1, -1]) {
      const cp = [surfPt(s * 0.012, 0.495, 1, 0.012), surfPt(s * 0.04, 0.475, 1, 0.01), surfPt(s * 0.055, 0.455, 1, 0.008)];
      const col = ribbon(cp, 0.03, collarM); spine.add(col);
      const fr = []; for (let k = 0; k <= 14; k++) { const y = 0.47 - k * 0.034; fr.push(surfPt(s * (0.1 - k * 0.002), y, 1, 0.005)); }
      const bk = []; for (let k = 0; k <= 14; k++) { const y = 0.47 - k * 0.034; bk.push(surfPt(s * (0.1 - k * 0.002), y, -1, 0.005)); }
      const sm = new THREE.MeshStandardMaterial({ color: '#3b2a1e', roughness: 0.6, side: THREE.DoubleSide });
      spine.add(ribbon(fr, 0.028, sm)); spine.add(ribbon(bk, 0.028, sm));
      const clip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.008), new THREE.MeshStandardMaterial({ color: '#c8c2b0', metalness: 0.9, roughness: 0.3 })); clip.position.copy(surfPt(s * 0.072, 0.0, 1, 0.009)); spine.add(clip);
    }
  }
  // chest pocket (left chest = +x)
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.09, 0.008), shirtM); pocket.position.copy(surfPt(0.085, 0.34, 1, 0.003)); pocket.rotation.x = -0.12; pocket.rotation.y = 0.35; spine.add(pocket);
  const stain = new THREE.Mesh(new THREE.CircleGeometry(0.035, 24), new THREE.MeshStandardMaterial({ color: '#5a3416', roughness: 0.6, transparent: true, opacity: 0 }));
  stain.position.copy(surfPt(0.085, 0.335, 1, 0.009)); stain.rotation.x = -0.12; stain.rotation.y = 0.35; stain.scale.set(1, 1.25, 1); spine.add(stain);
  // neck + head
  const neck = new THREE.Group(); neck.position.set(0, 0.5, 0); spine.add(neck);
  const neckM = capsule(0.05, 0.07, skin); neck.add(neckM);
  const head = new THREE.Group(); head.position.set(0, 0.14, 0.01); neck.add(head);
  // single smooth head surface: sphere deformed into cranium + cheeks + jaw (no seams)
  const skullG = new THREE.SphereGeometry(1, 72, 54);
  { const p = skullG.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) {
      const x = p[i], y = p[i + 1], z = p[i + 2];
      const low = Math.max(0, -y);
      let X = x * 0.102 * (1 - 0.13 * Math.pow(low, 1.4)) * (1 + 0.05 * Math.max(0, y));
      let Y = y * 0.123 + 0.05 - 0.004 * Math.pow(low, 2);
      let Z = z * 0.107;
      if (z > 0) Z += 0.014 * z * (1 - y * y) * (y < 0 ? 1.1 : 0.7);
      p[i] = X; p[i + 1] = Y; p[i + 2] = Z;
    }
    skullG.computeVertexNormals(); }
  const skull = new THREE.Mesh(skullG, skin); skull.castShadow = true; head.add(skull);
  const jaw = new THREE.Group(); head.add(jaw);
  skull.updateMatrixWorld(true);
  const _rc = new THREE.Raycaster();
  const surf = (x, y) => { _rc.set(new THREE.Vector3(x, y, 0.5), new THREE.Vector3(0, 0, -1)); const h = _rc.intersectObject(skull, false); return h.length ? h[0].point.z : 0.1; };
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), skin); nose.scale.set(0.02, 0.024, 0.026); nose.position.set(0, 0.032, surf(0, 0.032) + 0.008); head.add(nose);
  const noseBr = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.035, 4, 10), skin); noseBr.position.set(0, 0.062, surf(0, 0.062) - 0.003); noseBr.rotation.x = 0.3; head.add(noseBr);
  for (const s of [1, -1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), skin); ear.scale.set(0.013, 0.03, 0.022); ear.position.set(s * 0.1, 0.05, 0.0); head.add(ear); }
  // hair: cap + side part tuft; Percy: greying temples
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 28, 0, Math.PI * 2, 0, Math.PI * 0.56), hairM); hairCap.scale.set(0.108, 0.13, 0.118); hairCap.position.set(0, 0.058, -0.012); hairCap.rotation.x = -0.42; head.add(hairCap);
  const hairBack = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), hairM); hairBack.scale.set(0.1, 0.1, 0.09); hairBack.position.set(0, 0.03, -0.03); head.add(hairBack);
  const tuft = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), hairM); tuft.scale.set(0.085, 0.03, 0.06); tuft.position.set(-0.025, 0.165, 0.045); tuft.rotation.z = 0.25; head.add(tuft);
  // eyes
  const eyes = [];
  for (const s of [1, -1]) {
    const eg = new THREE.Group(); eg.position.set(s * 0.04, 0.078, surf(s * 0.04, 0.078) - 0.016); head.add(eg);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.021, 24, 18), white); eg.add(ball);
    const iris = new THREE.Group(); eg.add(iris);
    const ir = new THREE.Mesh(new THREE.CircleGeometry(0.0105, 24), irisM); ir.position.z = 0.0208; iris.add(ir);
    const pu = new THREE.Mesh(new THREE.CircleGeometry(0.0052, 20), dark); pu.position.z = 0.0211; iris.add(pu);
    const hl = new THREE.Mesh(new THREE.CircleGeometry(0.0028, 12), new THREE.MeshBasicMaterial({ color: '#ffffff' })); hl.position.set(-0.0035, 0.004, 0.0215); iris.add(hl);
    const lidU = new THREE.Mesh(new THREE.SphereGeometry(0.0228, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), skin); eg.add(lidU);
    const lidL = new THREE.Mesh(new THREE.SphereGeometry(0.0226, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), skin); eg.add(lidL);
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.0055, 0.034, 4, 10), browM); brow.rotation.z = Math.PI / 2; const browZ = surf(s * 0.042, 0.106) + 0.002; brow.position.set(s * 0.042, 0.106, browZ); brow.userData.z = browZ; head.add(brow);
    eyes.push({ s, eg, iris, lidU, lidL, brow });
  }
  // mouth: dark opening (scales with open), upper/lower lip tori, teeth
  const mouth = new THREE.Group(); mouth.position.set(0, -0.022, surf(0, -0.022) + 0.001); head.add(mouth);
  const cavity = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), mouthM); cavity.scale.set(0.028, 0.006, 0.01); mouth.add(cavity);
  const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.008, 0.006), teethM); teeth.position.set(0, 0.004, 0.004); mouth.add(teeth);
  const lineM = new THREE.MeshStandardMaterial({ color: '#5a2a22', roughness: 0.6 });
  const halves = [];
  for (const s of [1, -1]) { const hg = new THREE.Group(); mouth.add(hg); const seg = new THREE.Mesh(new THREE.CapsuleGeometry(0.0032, 0.016, 4, 8), lineM); seg.rotation.z = Math.PI / 2; seg.position.x = s * 0.0085; hg.add(seg); halves.push({ s, hg, seg }); }
  const lipU = new THREE.Mesh(new THREE.CapsuleGeometry(0.004, 0.026, 4, 10), lipM); lipU.rotation.z = Math.PI / 2; mouth.add(lipU);
  const lipL = new THREE.Mesh(new THREE.CapsuleGeometry(0.0055, 0.022, 4, 10), lipM); lipL.rotation.z = Math.PI / 2; mouth.add(lipL);
  const cheeks = [];

  // ---------------- arms (IK)
  const arms = {};
  for (const s of [1, -1]) {
    const side = s > 0 ? 'L' : 'R';
    const sh = new THREE.Group(); sh.position.set(s * 0.2, 0.43, 0); spine.add(sh);
    const shBall = new THREE.Mesh(new THREE.SphereGeometry(0.068, 20, 14), shirtM); shBall.scale.set(1, 0.85, 0.9); sh.add(shBall);
    const upper = new THREE.Group(); spine.add(upper);
    const upperM = capsule(0.056, 0.27, shirtM); upper.add(upperM);
    const fore = new THREE.Group(); spine.add(fore);
    // rolled sleeve (percy) / short sleeve (modern)
    const foreSkin = capsule(0.042, 0.23, skin); fore.add(foreSkin);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 20), shirtM); cuff.position.y = P ? 0.04 : -0.24; cuff.castShadow = true;
    if (P) fore.add(cuff); else { upperM.material = skin; const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.066, 0.14, 20), shirtM); sl.position.y = 0.06; upper.add(sl); }
    // hand: palm + 4 fingers (2 phalanges each) + thumb, curl param
    const hand = new THREE.Group(); spine.add(hand);
    const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), skin); palm.scale.set(0.042, 0.05, 0.02); palm.position.y = 0.05; palm.castShadow = true; hand.add(palm);
    const fingers = [];
    for (let i = 0; i < 4; i++) {
      const fx = (i - 1.5) * 0.019 * s;
      const f1 = new THREE.Group(); f1.position.set(fx, 0.095, 0); hand.add(f1);
      const len1 = [0.034, 0.038, 0.036, 0.03][i];
      f1.add(capsule(0.0095, len1, skin, 10));
      const f2 = new THREE.Group(); f2.position.y = len1 + 0.004; f1.add(f2);
      f2.add(capsule(0.0088, len1 * 0.8, skin, 10));
      fingers.push({ f1, f2 });
    }
    const th = new THREE.Group(); th.position.set(s * 0.034, 0.03, 0.012); hand.add(th);
    th.add(capsule(0.011, 0.04, skin, 10));
    const th2 = new THREE.Group(); th2.position.y = 0.046; th.add(th2); th2.add(capsule(0.0098, 0.028, skin, 10));
    arms[side] = { s, sh, upper, fore, hand, fingers, th, th2 };
  }

  // ---------------- props: chocolate bar (deformable, melts)
  const choc = buildChocolate(); spine.add(choc.root);

  // ---------------- update
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
  function placeSeg(g, a, b) { g.position.copy(a); _b.subVectors(b, a).normalize(); g.quaternion.setFromUnitVectors(UP, _b); }
  const REST = { L: V(0.25, -0.12, 0.05), R: V(-0.25, -0.12, 0.05) };
  function update(o = {}) {
    const t = o.time || 0;
    const breathe = Math.sin(t * 1.6) * 0.5 + 0.5;
    root.position.copy(o.pos || V(0, 0, 0)); root.rotation.y = o.yaw || 0;
    hips.position.y = 0.95 - (o.crouch || 0) * 0.08; hips.rotation.y = o.hipYaw || 0;
    spine.rotation.x = (o.lean || 0) + 0.015 * breathe; spine.rotation.y = o.twist || 0; spine.rotation.z = o.sway || 0;
    torso.scale.set(1 + 0.012 * breathe, 1, 0.7 + 0.015 * breathe);
    // head
    neck.rotation.set((o.headPitch || 0) * 0.4, (o.headYaw || 0) * 0.4, (o.headTilt || 0) * 0.4);
    head.rotation.set((o.headPitch || 0) * 0.6, (o.headYaw || 0) * 0.6, (o.headTilt || 0) * 0.6);
    // face
    const wide = o.wide || 0, blink = clamp(o.blink || 0), squint = o.squint || 0;
    const open = clamp(1 - blink) * (1 - squint * 0.45);
    for (const e of eyes) {
      const sc = 1 + wide * 0.22; e.eg.scale.setScalar(sc);
      e.iris.rotation.set(-(o.lookY || 0) * 0.5, (o.lookX || 0) * 0.55, 0);
      e.iris.scale.set(1 - wide * 0.15, 1 - wide * 0.15, 1);
      e.lidU.rotation.x = lerp(-0.35, -1.95, 1 - open) - wide * 0.45 + (o.frown || 0) * 0.25;
      e.lidL.rotation.x = 0.55 - (1 - open) * 0.35 + wide * 0.25;
      const browUp = (o.brow || 0) + wide * 0.8 + (e.s > 0 ? (o.browL || 0) : (o.browR || 0));
      e.brow.position.y = 0.106 + browUp * 0.014 - (o.frown || 0) * 0.006;
      e.brow.rotation.z = Math.PI / 2 + e.s * ((o.frown || 0) * 0.35 - browUp * 0.12 + (o.puzzle || 0) * (e.s > 0 ? 0.35 : -0.1));
    }
    const mOpen = clamp(o.mouthOpen || 0), smile = o.smile || 0, talk = o.talk || 0;
    const mo = clamp(mOpen + talk * (0.35 + 0.35 * Math.sin(t * 17) * Math.sin(t * 7.3)));
    cavity.visible = mo > 0.04; cavity.scale.set(0.024 * (1 - mo * 0.25), 0.002 + mo * 0.026, 0.012);
    cavity.position.y = -mo * 0.008;
    teeth.visible = mo > 0.15; teeth.position.y = 0.001 - mo * 0.002; teeth.scale.set(1 - mo * 0.2, 1, 1);
    halves.forEach(h => { h.hg.rotation.z = h.s * (smile * 0.8 - (o.frown || 0) * 0.25); h.hg.scale.x = 1 + smile * 0.35; h.hg.visible = mo < 0.12; h.hg.position.y = smile * 0.002; });
    lipU.position.y = 0.006 + mo * 0.01; lipU.scale.set(1 - mo * 0.3, 1, 1);
    lipL.position.set(0, -0.008 - mo * 0.024, 0.002); lipL.scale.set(1 - mo * 0.3 + smile * 0.1, 1, 1);
    mouth.rotation.z = (o.smirk || 0) * 0.2;
    for (const c of cheeks) c.position.y = 0.012 + smile * 0.008;
    // arms
    spine.updateMatrixWorld(true);
    for (const side of ['L', 'R']) {
      const A = arms[side]; const s = A.s;
      const sp = A.sh.position.clone();
      const tgt = (o[`hand${side}`] || REST[side]).clone();
      const pole = (o[`pole${side}`] || V(s * 0.6, 0.2, -0.5)).clone();
      const elbow = ik2(sp, tgt, 0.3, 0.28, pole);
      placeSeg(A.upper, sp, elbow); placeSeg(A.fore, elbow, tgt);
      A.upper.position.copy(sp); A.fore.position.copy(elbow);
      // hand orientation: continue forearm direction, then local twist/bend
      A.hand.position.copy(tgt);
      A.hand.quaternion.copy(A.fore.quaternion);
      const r = o[`rot${side}`] || [0, 0, 0];
      _e.set(r[0], r[1], r[2]); _q.setFromEuler(_e); A.hand.quaternion.multiply(_q);
      const curl = o[`curl${side}`] ?? 0.25;
      A.fingers.forEach((f, i) => { const c = curl * (1 + (i - 1.5) * 0.08); f.f1.rotation.x = c * 1.3; f.f2.rotation.x = c * 1.5; f.f1.rotation.z = -s * (i - 1.5) * 0.06 * (1 - curl); });
      const tc = o[`thumb${side}`] ?? 0.3;
      A.th.rotation.set(0.4 + tc * 0.6, 0, s * (0.7 - tc * 0.35)); A.th2.rotation.x = tc * 0.8;
      // point: index extended
      if (o[`point${side}`]) { const f = A.fingers[s > 0 ? 0 : 0]; f.f1.rotation.x = 0.05; f.f2.rotation.x = 0.05; }
    }
    // chocolate
    stain.material.opacity = clamp(o.stain || 0) * 0.85;
    choc.update(o.choc || {}, { spine, arms });
  }
  return { root, update, spine, head, arms, choc, pocketLocal: V(0.085, 0.36, 0.135) };
}

// chocolate bar in a paper wrapper; melt 0..1 droops and turns glossy, drips appear
export function buildChocolate() {
  const root = new THREE.Group();
  const bar = new THREE.Group(); root.add(bar);
  const W = 0.06, Hh = 0.13, D = 0.014;
  const cg = new THREE.BoxGeometry(W, Hh, D, 12, 24, 3); const base = cg.attributes.position.array.slice();
  // segmented top (grooves) baked via a canvas bump texture
  const bump = canvasTex(128, 256, (g, w, h) => { g.fillStyle = '#c0c0c0'; g.fillRect(0, 0, w, h); g.strokeStyle = '#303030'; g.lineWidth = 6; for (let i = 1; i < 2; i++) { g.beginPath(); g.moveTo(i * w / 2, 0); g.lineTo(i * w / 2, h); g.stroke(); } for (let j = 1; j < 4; j++) { g.beginPath(); g.moveTo(0, j * h / 4); g.lineTo(w, j * h / 4); g.stroke(); } }, { srgb: false });
  const chocM = new THREE.MeshPhysicalMaterial({ color: '#4a2412', roughness: 0.45, bumpMap: bump, bumpScale: 2, clearcoat: 0.2, clearcoatRoughness: 0.4, sheen: 0.3, sheenColor: new THREE.Color('#a0603a') });
  const choc = new THREE.Mesh(cg, chocM); choc.castShadow = true; bar.add(choc);
  // wrapper: lower half (paper, opened at top)
  const wrapTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#b8241f'; g.fillRect(0, 0, w, h); g.fillStyle = '#f3e6c4'; g.fillRect(0, h * 0.35, w, h * 0.3);
    g.fillStyle = '#5a1410'; g.font = '800 46px Inter, sans-serif'; g.textAlign = 'center'; g.fillText('CHOCO', w / 2, h * 0.56);
    g.strokeStyle = 'rgba(255,240,200,0.6)'; g.lineWidth = 4; g.strokeRect(10, 10, w - 20, h - 20); noiseFill(g, w, h, 0, 0.06, 8, 4);
  });
  const wrapM = new THREE.MeshPhysicalMaterial({ map: wrapTex, roughness: 0.6, sheen: 0.3 });
  const wrap = new THREE.Mesh(new THREE.BoxGeometry(W + 0.006, Hh * 0.48, D + 0.006, 1, 1, 1), wrapM); wrap.position.y = -Hh * 0.27; bar.add(wrap);
  const foil = new THREE.Mesh(new THREE.BoxGeometry(W + 0.003, 0.012, D + 0.003), new THREE.MeshPhysicalMaterial({ color: '#d8d8d8', metalness: 1, roughness: 0.3 })); foil.position.y = -Hh * 0.02; bar.add(foil);
  // drips
  const dripM = new THREE.MeshPhysicalMaterial({ color: '#3f1d0e', roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.1 });
  const drips = [];
  for (let i = 0; i < 5; i++) { const d = new THREE.Mesh(new THREE.CapsuleGeometry(0.0026, 0.02, 4, 10), dripM); d.position.set((i - 2) * 0.012, Hh * 0.1, D * 0.55); bar.add(d); drips.push(d); }
  const puddle = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10), dripM); puddle.scale.set(0.04, 0.008, 0.02); puddle.visible = false; bar.add(puddle);
  function update(c, ctx) {
    const melt = clamp(c.melt || 0);
    const p = cg.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) {
      const x = base[i], y = base[i + 1], z = base[i + 2];
      const u = (y / Hh + 0.5); // 0 bottom .. 1 top
      const sag = melt * Math.pow(u, 1.6) * 0.035;
      const bulge = 1 + melt * 0.25 * Math.sin(u * Math.PI);
      p[i] = x * bulge * (1 + melt * 0.15 * u); p[i + 1] = y - sag * 0.6; p[i + 2] = z * (1 + melt * 0.6) + sag * (x * 6) * 0.2 + melt * 0.012 * Math.sin(x * 120 + y * 60) * u;
    }
    cg.attributes.position.needsUpdate = true; cg.computeVertexNormals();
    chocM.emissive.set('#ff5a14'); chocM.emissiveIntensity = (c.glow || 0) * 0.8; chocM.roughness = lerp(0.45, 0.08, melt); chocM.clearcoat = lerp(0.2, 1, melt); chocM.bumpScale = lerp(2, 0.2, melt); chocM.color.set(melt > 0.5 ? '#3f1d0e' : '#4a2412');
    drips.forEach((d, i) => { const k = clamp(melt * 1.6 - i * 0.12); d.visible = k > 0.02; d.scale.set(1, 0.2 + k * (0.9 + 0.6 * Math.abs(Math.sin(i * 2.1))), 1); d.position.y = Hh * 0.06 - 0.016 * k - (i % 2) * 0.008; d.position.z = D * 0.5 * (1 + melt * 0.6) + 0.003; });
    // placement: in pocket (spine space) or in hand
    if (c.inHand && ctx) {
      const A = ctx.arms[c.inHand]; ctx.spine.attach ? null : null;
      root.position.copy(A.hand.position); root.quaternion.copy(A.hand.quaternion);
      const off = c.handOffset || [0, 0.07, 0.03]; root.translateX(off[0]); root.translateY(off[1]); root.translateZ(off[2]);
      const r = c.handRot || [0, 0, 0]; root.rotateX(r[0]); root.rotateY(r[1]); root.rotateZ(r[2]);
    } else if (c.pos) {
      root.position.copy(c.pos); root.rotation.set(...(c.rot || [0, 0, 0]));
    } else {
      root.position.set(0.085, 0.385 + (c.lift || 0), 0.128); root.rotation.set(-0.12, 0, 0.05);
    }
    root.visible = c.visible !== false;
    root.scale.setScalar(c.scale || 1);
  }
  return { root, update };
}
