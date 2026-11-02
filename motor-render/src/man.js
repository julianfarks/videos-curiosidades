import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTex, noiseFill, grain, rng, clamp, lerp, smooth } from './lib.js';

function fabricTex(base, amp, seed, twill = false) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    grain(g, w, h, amp * 0.5, seed + 1);
    for (let y = 0; y < h; y += 4) { g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect(0, y, w, 1); }
    if (twill) { g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 2; for (let i = -h; i < w; i += 7) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); } }
  }, { repeat: [6, 6] });
}

function irisTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#f7f3ee'; g.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    let gr = g.createRadialGradient(cx, cy, 10, cx, cy, 62);
    gr.addColorStop(0, '#2a160a'); gr.addColorStop(0.4, '#6b3f1d'); gr.addColorStop(0.85, '#4a2a12'); gr.addColorStop(1, '#1d0f06');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 62, 0, 7); g.fill();
    const r = rng(4);
    for (let i = 0; i < 90; i++) { const a = r() * 7; g.strokeStyle = `rgba(160,110,60,${0.2 + r() * 0.3})`; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26); g.lineTo(cx + Math.cos(a) * 58, cy + Math.sin(a) * 58); g.stroke(); }
    g.fillStyle = '#050302'; g.beginPath(); g.arc(cx, cy, 25, 0, 7); g.fill();
    // soft sclera veins/edge shading
    gr = g.createRadialGradient(cx, cy, 70, cx, cy, 128); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(180,140,130,0.45)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}

function eyeGeo(r) {
  const geo = new THREE.SphereGeometry(r, 32, 24);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); uv.setXY(i, 0.5 + x / r * 0.5, 0.5 + y / r * 0.5); if (z < 0) uv.setXY(i, 0.02, 0.02); }
  return geo;
}

export function buildMan() {
  const root = new THREE.Group();
  const skin = new THREE.MeshPhysicalMaterial({ color: '#dda07a', roughness: 0.52, sheen: 0.7, sheenColor: new THREE.Color('#ffc9a8'), sheenRoughness: 0.6, emissive: new THREE.Color('#2a0c04'), emissiveIntensity: 0.35, clearcoat: 0.08 });
  const tee = new THREE.MeshPhysicalMaterial({ map: fabricTex('#8a8f96', 0.22, 21), roughness: 0.92, sheen: 0.8, sheenColor: new THREE.Color('#c9ced6'), sheenRoughness: 0.8 });
  const denim = new THREE.MeshPhysicalMaterial({ map: fabricTex('#2c3e63', 0.25, 33, true), roughness: 0.85, sheen: 0.4, sheenColor: new THREE.Color('#6f86b8') });
  const hairMat = new THREE.MeshStandardMaterial({ color: '#2a1a12', roughness: 0.75, bumpMap: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#777'; g.fillRect(0, 0, w, h); const r = rng(8); for (let i = 0; i < 3000; i++) { g.strokeStyle = r() > 0.5 ? '#bbb' : '#333'; g.lineWidth = 1; const x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 4 + r() * 6, y + 14 + r() * 10); g.stroke(); } }, { srgb: false }), bumpScale: 2 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: '#e9e6df', roughness: 0.6 });
  const soleMat = new THREE.MeshStandardMaterial({ color: '#7a6a5a', roughness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2b0d0e', roughness: 0.9 });
  const browMat = new THREE.MeshStandardMaterial({ color: '#24150d', roughness: 0.8 });
  const eyeMat = new THREE.MeshPhysicalMaterial({ map: irisTex(), roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.02 });
  const sph = new THREE.SphereGeometry(1, 32, 22);
  const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 8, 18);
  const mk = (geo, mat, parent, cast = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m; };

  const pelvis = new THREE.Group(); root.add(pelvis);
  const hips = mk(new RoundedBoxGeometry(0.36, 0.17, 0.26, 4, 0.08), denim, pelvis); hips.position.set(0, 0.04, 0);
  // legs
  const legs = [];
  for (const sx of [1, -1]) {
    const hip = new THREE.Group(); hip.position.set(sx * 0.095, 0.02, 0.02); pelvis.add(hip);
    const thigh = mk(cap(0.075, 0.34), denim, hip); thigh.position.y = -0.21;
    const knee = new THREE.Group(); knee.position.y = -0.42; hip.add(knee);
    mk(sph, denim, knee).scale.setScalar(0.072);
    const shin = mk(cap(0.06, 0.34), denim, knee); shin.position.y = -0.21;
    const ankle = new THREE.Group(); ankle.position.y = -0.43; knee.add(ankle);
    const shoe = mk(new RoundedBoxGeometry(0.11, 0.075, 0.26, 3, 0.035), shoeMat, ankle); shoe.position.set(0, -0.015, 0.06);
    const sole = mk(new RoundedBoxGeometry(0.115, 0.022, 0.27, 2, 0.01), soleMat, ankle); sole.position.set(0, -0.055, 0.06);
    legs.push({ hip, knee, ankle, sx });
  }
  // torso
  const spine = new THREE.Group(); spine.position.set(0, 0.10, -0.01); pelvis.add(spine);
  const torso = mk(cap(0.165, 0.26), tee, spine); torso.position.y = 0.23; torso.scale.set(1.12, 1, 0.78);
  const belly = mk(sph, tee, spine); belly.position.set(0, 0.13, 0.0); belly.scale.set(0.16, 0.12, 0.11);
  const collar = mk(new THREE.TorusGeometry(0.066, 0.014, 10, 28), tee, spine); collar.position.set(0, 0.47, 0.0); collar.rotation.x = Math.PI / 2 - 0.15;
  const neck = mk(new THREE.CylinderGeometry(0.056, 0.062, 0.12, 18), skin, spine); neck.position.set(0, 0.51, 0.0);
  // head
  const head = new THREE.Group(); head.position.set(0, 0.55, 0.01); head.scale.setScalar(1.32); spine.add(head);
  const skull = mk(sph, skin, head); skull.scale.set(0.108, 0.128, 0.115); skull.position.y = 0.105;
  const jaw = mk(sph, skin, head); jaw.scale.set(0.092, 0.068, 0.088); jaw.position.set(0, 0.052, 0.012);
  const chin = mk(sph, skin, head); chin.scale.set(0.034, 0.026, 0.026); chin.position.set(0, 0.022, 0.074);
  const stubbleX = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.42), new THREE.MeshStandardMaterial({ color: '#3a2418', roughness: 1, transparent: true, opacity: 0.22, depthWrite: false }));

  const nose = mk(sph, skin, head); nose.scale.set(0.013, 0.026, 0.017); nose.position.set(0, 0.094, 0.108);
  const noseTip = mk(sph, skin, head); noseTip.scale.set(0.017, 0.014, 0.013); noseTip.position.set(0, 0.08, 0.117);
  for (const sx of [1, -1]) { const ear = mk(sph, skin, head); ear.scale.set(0.018, 0.034, 0.024); ear.position.set(sx * 0.107, 0.1, -0.005); ear.rotation.y = sx * 0.4; }
  // hair
  const hairParts = [[0, 0.185, -0.005, 0.112, 0.07, 0.118], [0, 0.15, -0.045, 0.114, 0.1, 0.1], [0.06, 0.17, 0.03, 0.06, 0.05, 0.07], [-0.06, 0.17, 0.03, 0.06, 0.05, 0.07], [0, 0.175, 0.07, 0.085, 0.04, 0.05], [0.09, 0.13, -0.02, 0.03, 0.06, 0.08], [-0.09, 0.13, -0.02, 0.03, 0.06, 0.08]];
  for (const p of hairParts) { const m = mk(sph, hairMat, head); m.position.set(p[0], p[1], p[2]); m.scale.set(p[3], p[4], p[5]); }
  // eyes
  const eGeo = eyeGeo(0.0205);
  const eyes = [];
  for (const sx of [1, -1]) {
    const eg = new THREE.Group(); eg.position.set(sx * 0.043, 0.12, 0.094); head.add(eg);
    const ball = mk(eGeo, eyeMat, eg, false);
    const lidU = mk(new THREE.SphereGeometry(0.0222, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), skin, eg); // dome; rotate to cover
    const lidL = mk(new THREE.SphereGeometry(0.0216, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), skin, eg);
    lidL.rotation.x = Math.PI;
    const brow = mk(cap(0.0075, 0.032), browMat, head); brow.rotation.z = Math.PI / 2; brow.position.set(sx * 0.045, 0.152, 0.108);
    eyes.push({ eg, ball, lidU, lidL, brow, sx });
  }
  // mouth
  const mouth = new THREE.Group(); mouth.position.set(0, 0.05, 0.108); head.add(mouth);
  const mouthIn = mk(sph, dark, mouth, false); mouthIn.scale.set(0.028, 0.006, 0.012);
  const teeth = mk(new RoundedBoxGeometry(0.04, 0.012, 0.01, 2, 0.004), new THREE.MeshStandardMaterial({ color: '#f4efe6', roughness: 0.3 }), mouth, false); teeth.position.set(0, 0.0, 0.004);
  const tongueM = mk(sph, new THREE.MeshStandardMaterial({ color: '#b04a55', roughness: 0.5 }), mouth, false); tongueM.scale.set(0.018, 0.008, 0.01);
  const lipU = mk(cap(0.0042, 0.036), new THREE.MeshPhysicalMaterial({ color: '#cf8a74', roughness: 0.45, sheen: 0.5 }), mouth); lipU.rotation.z = Math.PI / 2;
  const lipL = mk(cap(0.0052, 0.032), new THREE.MeshPhysicalMaterial({ color: '#c98070', roughness: 0.45, sheen: 0.5 }), mouth); lipL.rotation.z = Math.PI / 2;
  // arms
  const arms = [];
  for (const sx of [1, -1]) {
    const sh = new THREE.Group(); sh.position.set(sx * 0.205, 0.405, -0.01); spine.add(sh);
    const sleeve = mk(sph, tee, sh); sleeve.scale.set(0.068, 0.075, 0.066); sleeve.position.y = -0.03;
    const upper = mk(cap(0.052, 0.2), skin, sh); upper.position.y = -0.15;
    const sleeveTube = mk(new THREE.CylinderGeometry(0.068, 0.07, 0.13, 18), tee, sh); sleeveTube.position.y = -0.08;
    const elbow = new THREE.Group(); elbow.position.y = -0.29; sh.add(elbow);
    mk(sph, skin, elbow).scale.setScalar(0.048);
    const fore = mk(cap(0.044, 0.2), skin, elbow); fore.position.y = -0.13;
    const wrist = new THREE.Group(); wrist.position.y = -0.27; elbow.add(wrist);
    const palm = mk(new RoundedBoxGeometry(0.075, 0.085, 0.032, 3, 0.014), skin, wrist); palm.position.y = -0.045;
    const fingers = [];
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Group(); f.position.set((i - 1.5) * 0.019, -0.085, 0); wrist.add(f);
      const seg = mk(cap(0.0085, 0.038), skin, f); seg.position.y = -0.024;
      fingers.push(f);
    }
    const thumb = new THREE.Group(); thumb.position.set(-sx * 0.036, -0.035, 0.012); wrist.add(thumb);
    const tseg = mk(cap(0.0095, 0.03), skin, thumb); tseg.position.y = -0.02; thumb.rotation.z = -sx * 0.7;
    arms.push({ sh, elbow, wrist, fingers, thumb, sx });
  }
  // phone
  const phone = new THREE.Group();
  const pbody = mk(new RoundedBoxGeometry(0.075, 0.15, 0.009, 3, 0.008), new THREE.MeshStandardMaterial({ color: '#1b1d22', roughness: 0.35, metalness: 0.5 }), phone);
  const screen = mk(new THREE.PlaneGeometry(0.066, 0.138), new THREE.MeshBasicMaterial({ color: '#9fd3ff' }), phone, false); screen.position.z = 0.0048;
  const phoneLight = new THREE.PointLight('#a8d8ff', 0.25, 0.6, 2); phoneLight.position.z = 0.08; phone.add(phoneLight);
  arms[1].wrist.add(phone); phone.position.set(0.0, -0.075, 0.03); phone.rotation.set(-0.15, 0, 0);

  const P = { t: 0, scare: 0, jump: 0, lookUp: 0, headYaw: 0, suspicious: 0, freeze: false, mouthOpen: 0, phone: 1, recoil: 0 };

  function update(p) {
    Object.assign(P, p);
    const t = P.t, sc = clamp(P.scare), su = clamp(P.suspicious);
    const breath = Math.sin(t * 1.6) * 0.012;
    const flail = sc * Math.sin(t * 16);
    // pelvis / jump
    pelvis.position.set(0, P.jump * 0.13 + Math.max(0, Math.sin(t * 9)) * 0.02 * sc, -P.recoil * 0.05);
    spine.rotation.x = lerp(0.08 + breath * 0.3, -0.32, sc) + flail * 0.03;
    spine.rotation.z = flail * 0.05;
    torso.scale.y = 1 + breath * 0.6;
    // legs
    for (const L of legs) {
      L.hip.rotation.x = -Math.PI / 2 + 0.05 - sc * (0.55 + 0.15 * Math.sin(t * 14 + L.sx)) ;
      L.hip.rotation.z = L.sx * (0.06 + sc * 0.12);
      L.knee.rotation.x = Math.PI / 2 - 0.05 - sc * 0.7;
      L.ankle.rotation.x = 0.0 - sc * 0.3;
    }
    // head
    head.rotation.x = lerp(lerp(0.32, -0.5 * P.lookUp, clamp(P.lookUp + sc)), -0.25, sc) + Math.sin(t * 0.7) * 0.015;
    head.rotation.y = P.headYaw + sc * Math.sin(t * 13) * 0.12;
    head.rotation.z = su * 0.12 + sc * Math.sin(t * 11) * 0.05;
    // eyes & lids
    const blinkCycle = (t * 0.55) % 1; const blink = (!P.freeze && sc < 0.2) ? smooth(0.0, 0.03, blinkCycle) * (1 - smooth(0.03, 0.07, blinkCycle)) : 0;
    for (const E of eyes) {
      const wide = sc * 1.0;
      E.eg.scale.setScalar(1 + wide * 0.32);
      const openU = lerp(-1.05, -1.65, wide) + lerp(0, 0.55, su) * (E.sx > 0 ? 1.0 : 0.75) + blink * 1.4;
      E.lidU.rotation.x = openU; // dome opening down toward +z
      E.lidL.rotation.x = Math.PI + lerp(0.95, 1.4, wide) - su * 0.35 - blink * 0.4;
      // pupils: look target
      const lookUp = clamp(P.lookUp + su * 0.6) * 0.35 + (P.phone > 0.5 && sc < 0.3 && P.lookUp < 0.3 ? -0.25 : 0);
      E.ball.rotation.set(-lookUp, P.headYaw * -0.2, 0);
      E.ball.scale.setScalar(1 - wide * 0.1);
      // brows
      const browUp = sc * 0.03 + (E.sx > 0 ? su * 0.012 : -su * 0.008);
      E.brow.position.y = 0.152 + browUp; E.brow.rotation.z = Math.PI / 2 + E.sx * (sc * 0.35 - (E.sx > 0 ? su * 0.25 : -su * 0.35));
    }
    // mouth
    const open = clamp(P.mouthOpen + sc * (0.85 + 0.15 * Math.sin(t * 20)));
    mouthIn.scale.set(lerp(0.022, 0.036, open) - su * 0.004, lerp(0.0022, 0.03, open), 0.012);
    mouthIn.position.y = -open * 0.01;
    teeth.visible = open > 0.15; teeth.position.y = 0.004 + open * 0.006; teeth.scale.x = 0.8 + open * 0.2;
    tongueM.position.y = -open * 0.022; tongueM.visible = open > 0.2;
    lipU.position.y = 0.003 + open * 0.008; lipL.position.y = -0.004 - open * 0.032;
    lipU.scale.set(1, 1 + open * 0.2, 1); lipL.scale.set(1, 1 + open * 0.15, 1);
    mouth.rotation.z = su * 0.12;
    jaw.position.y = 0.052 - open * 0.01; chin.position.y = 0.022 - open * 0.022;
    // arms
    for (const A of arms) {
      const rest = { sx: -0.42, sz: A.sx * 0.1, ex: -1.45, ey: A.sx * 0.3, wx: 0.15 };
      const up = { sx: -0.35 + flail * 0.2, sz: A.sx * (2.55 + Math.sin(t * 15 + A.sx) * 0.18), ex: -0.75 + Math.sin(t * 17 + A.sx) * 0.25, ey: 0, wx: -0.2 };
      const q = sc;
      A.sh.rotation.set(lerp(rest.sx, up.sx, q), 0, lerp(rest.sz, up.sz, q));
      A.elbow.rotation.set(lerp(rest.ex, up.ex, q), lerp(rest.ey, up.ey, q), 0);
      A.wrist.rotation.set(lerp(rest.wx, up.wx, q), 0, 0);
      for (let i = 0; i < 4; i++) { const f = A.fingers[i]; f.rotation.x = lerp(0.9, -0.1, q); f.rotation.z = (i - 1.5) * lerp(0.05, 0.22, q); }
      A.thumb.rotation.x = lerp(0.5, -0.2, q);
    }
    // scrolling thumb on phone hand
    if (sc < 0.1) arms[1].thumb.rotation.x = 0.5 + Math.sin(t * 3.0) * 0.25;
    phone.visible = P.phone > 0.5;
    phoneLight.intensity = phone.visible ? 0.25 : 0;
  }
  function headTop(out = new THREE.Vector3()) { return head.localToWorld(out.set(0, 0.255, -0.005)); }
  function headCenter(out = new THREE.Vector3()) { return head.localToWorld(out.set(0, 0.11, 0.02)); }
  update({});
  return { root, update, head, headTop, headCenter, P };
}
