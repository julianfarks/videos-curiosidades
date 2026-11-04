import * as THREE from 'three';
import { canvasTex, rng, noiseFill, clamp, lerp, smooth } from './lib.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export function softSprite(c0 = 'rgba(255,255,255,1)', c1 = 'rgba(255,255,255,0)') {
  return canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
}
function box(w, h, d, mat, x = 0, y = 0, z = 0, parent) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; if (parent) parent.add(m); return m; }
function cyl(rt, rb, h, mat, seg = 24) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.castShadow = true; m.receiveShadow = true; return m; }

// ======================================================================= 1940s LAB
export function buildLab() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#120f0c');
  scene.fog = new THREE.FogExp2('#17120d', 0.09);
  const S = new THREE.Group(); S.scale.x = -1; scene.add(S);
  // floor
  const floorTex = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#5b5a52'; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 0, 0.18, 90, 2); noiseFill(g, w, h, 0, 0.08, 12, 5);
    g.strokeStyle = 'rgba(30,28,24,0.55)'; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / 4); g.lineTo(w, i * h / 4); g.stroke(); }
  }, { repeat: [3, 3] });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.75, metalness: 0.05 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; S.add(floor);
  // walls: green-grey lower panel, cream upper
  const wallTex = canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = '#c9bc9a'; g.fillRect(0, 0, w, h); g.fillStyle = '#4f6152'; g.fillRect(0, h * 0.55, w, h * 0.45); g.fillStyle = '#2f3a31'; g.fillRect(0, h * 0.55, w, 8);
    noiseFill(g, w, h, 0, 0.12, 40, 7); noiseFill(g, w, h, 0, 0.05, 6, 8);
  }, { repeat: [3, 1] });
  const wallM = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(14, 4), wallM); back.position.set(0, 2, -2.3); back.receiveShadow = true; S.add(back);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(14, 4), wallM); left.position.set(-3.4, 2, 0); left.rotation.y = Math.PI / 2; left.receiveShadow = true; S.add(left);
  // racks along the back wall
  const panelTex = (seed) => canvasTex(512, 1024, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = '#5d6a5e'; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 0, 0.1, 30, seed);
    for (let row = 0; row < 7; row++) {
      const y0 = 30 + row * 140; g.fillStyle = 'rgba(20,22,20,0.55)'; g.fillRect(14, y0 - 6, w - 28, 3);
      for (let k = 0; k < 3; k++) {
        const cx = 90 + k * 165, cy = y0 + 60, kind = r();
        if (kind < 0.45) { // round meter
          g.fillStyle = '#efe6cf'; g.beginPath(); g.arc(cx, cy, 42, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#1b1b1b'; g.lineWidth = 6; g.stroke();
          g.lineWidth = 2; for (let a = -2.4; a <= -0.7; a += 0.17) { g.beginPath(); g.moveTo(cx + Math.cos(a) * 32, cy + Math.sin(a) * 32); g.lineTo(cx + Math.cos(a) * 38, cy + Math.sin(a) * 38); g.stroke(); }
          const a = -2.2 + r() * 1.3; g.strokeStyle = '#a01818'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy + 6); g.lineTo(cx + Math.cos(a) * 34, cy + Math.sin(a) * 34); g.stroke();
        } else if (kind < 0.75) { // knob
          g.fillStyle = '#1a1612'; g.beginPath(); g.arc(cx, cy, 26, 0, Math.PI * 2); g.fill(); g.fillStyle = '#3a332b'; g.beginPath(); g.arc(cx - 4, cy - 5, 18, 0, Math.PI * 2); g.fill();
          g.strokeStyle = '#d9d0b8'; g.lineWidth = 2; for (let a = 0; a < 6.28; a += 0.5) { g.beginPath(); g.moveTo(cx + Math.cos(a) * 32, cy + Math.sin(a) * 32); g.lineTo(cx + Math.cos(a) * 38, cy + Math.sin(a) * 38); g.stroke(); }
        } else { // toggle switches + label plate
          g.fillStyle = '#d8cfb6'; g.fillRect(cx - 50, cy - 40, 100, 22);
          for (let s = 0; s < 3; s++) { g.fillStyle = '#222'; g.fillRect(cx - 40 + s * 32, cy - 6, 14, 14); g.fillStyle = '#bbb'; g.fillRect(cx - 36 + s * 32, cy - 22 + (r() < 0.5 ? 0 : 20), 6, 18); }
        }
      }
      // screws
      g.fillStyle = '#2a2f2a'; for (const sx of [24, w - 24]) { g.beginPath(); g.arc(sx, y0 + 10, 5, 0, 6.3); g.fill(); }
    }
  });
  const racks = new THREE.Group(); S.add(racks);
  const tubeGlass = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.05, transmission: 0, transparent: true, opacity: 0.35, clearcoat: 1 });
  const filM = new THREE.MeshStandardMaterial({ color: '#ff9a3c', emissive: '#ff7a1a', emissiveIntensity: 2.4 });
  const tubes = [];
  const rackXs = [-2.55, -1.75, -0.95, 1.85, 2.65];
  rackXs.forEach((x, i) => {
    const m = new THREE.MeshStandardMaterial({ map: panelTex(10 + i), roughness: 0.55, metalness: 0.35 });
    const side = new THREE.MeshStandardMaterial({ color: '#4d584e', roughness: 0.6, metalness: 0.4 });
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.76, 2.15, 0.55), [side, side, side, side, m, side]); r.position.set(x, 1.075, -1.95); r.castShadow = true; r.receiveShadow = true; racks.add(r);
    // exposed vacuum-tube shelf on top
    for (let k = 0; k < 4; k++) {
      const tg = new THREE.Group(); tg.position.set(x - 0.27 + k * 0.18, 2.15, -1.85); racks.add(tg);
      const g = cyl(0.035, 0.035, 0.18, tubeGlass, 16); g.position.y = 0.11; g.castShadow = false; tg.add(g);
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 8, 0, 6.3, 0, Math.PI / 2), tubeGlass); top.position.y = 0.2; tg.add(top);
      const f = cyl(0.012, 0.012, 0.1, filM, 8); f.position.y = 0.1; f.castShadow = false; tg.add(f);
      const base = cyl(0.04, 0.04, 0.04, new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.5 }), 16); base.position.y = 0.02; tg.add(base);
      tubes.push(f);
    }
  });
  // oscilloscope (animated canvas)
  const oscC = document.createElement('canvas'); oscC.width = 256; oscC.height = 192; const oscG = oscC.getContext('2d');
  const oscTex = new THREE.CanvasTexture(oscC); oscTex.colorSpace = THREE.SRGBColorSpace;
  const osc = new THREE.Group(); osc.position.set(-0.95, 1.25, -1.6); S.add(osc);
  box(0.5, 0.38, 0.4, new THREE.MeshStandardMaterial({ color: '#3d443d', roughness: 0.5, metalness: 0.4 }), 0, 0, 0, osc);
  const scr = new THREE.Mesh(new THREE.CircleGeometry(0.13, 32), new THREE.MeshBasicMaterial({ map: oscTex, toneMapped: false })); scr.position.set(-0.05, 0.02, 0.201); osc.add(scr);
  function drawOsc(t) {
    oscG.fillStyle = '#031a08'; oscG.fillRect(0, 0, 256, 192); oscG.strokeStyle = 'rgba(80,255,120,0.18)'; oscG.lineWidth = 1;
    for (let i = 0; i < 256; i += 32) { oscG.beginPath(); oscG.moveTo(i, 0); oscG.lineTo(i, 192); oscG.stroke(); } for (let j = 0; j < 192; j += 32) { oscG.beginPath(); oscG.moveTo(0, j); oscG.lineTo(256, j); oscG.stroke(); }
    oscG.strokeStyle = '#7dff9a'; oscG.lineWidth = 4; oscG.shadowColor = '#3dff6a'; oscG.shadowBlur = 12; oscG.beginPath();
    for (let x = 0; x <= 256; x += 2) { const y = 96 + Math.sin(x * 0.07 + t * 9) * 44 * (0.7 + 0.3 * Math.sin(t * 2.1)) + Math.sin(x * 0.31 + t * 23) * 4; x ? oscG.lineTo(x, y) : oscG.moveTo(x, y); }
    oscG.stroke(); oscG.shadowBlur = 0; oscTex.needsUpdate = true;
  }
  // ---- workbench
  const woodTex = canvasTex(1024, 256, (g, w, h) => { g.fillStyle = '#6a4325'; g.fillRect(0, 0, w, h); const r = rng(4); for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(${40 + r() * 30},${20 + r() * 15},8,${0.25 + r() * 0.3})`; g.lineWidth = 1 + r() * 3; g.beginPath(); const y = r() * h; g.moveTo(0, y); for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 6); g.stroke(); } noiseFill(g, w, h, 0, 0.08, 10, 3); });
  const woodM = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.6 });
  const bench = new THREE.Group(); S.add(bench);
  box(1.6, 0.06, 0.75, woodM, 1.2, 0.9, -0.05, bench);
  for (const [x, z] of [[0.48, -0.37], [1.92, -0.37], [0.48, 0.28], [1.92, 0.28]]) box(0.06, 0.87, 0.06, woodM, x, 0.435, z, bench);
  box(1.5, 0.03, 0.6, woodM, 1.2, 0.25, -0.05, bench);
  // notebook + pencil + desk lamp
  box(0.22, 0.015, 0.3, new THREE.MeshStandardMaterial({ color: '#e9e0c8', roughness: 0.9 }), 1.75, 0.94, 0.15, bench).rotation.y = 0.3;
  // control box with a big knob (operator side)
  const ctl = new THREE.Group(); ctl.position.set(0.62, 0.93, 0.24); S.add(ctl);
  box(0.22, 0.14, 0.16, new THREE.MeshStandardMaterial({ color: '#3d443d', roughness: 0.5, metalness: 0.4 }), 0, 0.07, 0, ctl);
  const knob = cyl(0.035, 0.035, 0.03, new THREE.MeshStandardMaterial({ color: '#151210', roughness: 0.35 }), 24); knob.rotation.z = Math.PI / 2; knob.position.set(-0.115, 0.08, 0); ctl.add(knob);
  const knobMark = box(0.004, 0.03, 0.006, new THREE.MeshStandardMaterial({ color: '#e8e0c8' }), -0.132, 0.09, 0, ctl);
  const pilot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), new THREE.MeshBasicMaterial({ color: '#ff5a2a' })); pilot.position.set(-0.112, 0.11, 0.05); ctl.add(pilot);
  // ---- magnetron test rig
  const copper = new THREE.MeshPhysicalMaterial({ color: '#c8774a', metalness: 1, roughness: 0.28, clearcoat: 0.3 });
  const steel = new THREE.MeshStandardMaterial({ color: '#9aa1a6', metalness: 0.9, roughness: 0.35 });
  const magRed = new THREE.MeshPhysicalMaterial({ color: '#8f1f1a', roughness: 0.35, clearcoat: 0.6 });
  const rig = new THREE.Group(); rig.position.set(1.45, 0.93, -0.08); S.add(rig);
  box(0.42, 0.04, 0.36, steel, 0, 0.02, 0, rig);
  const anode = new THREE.Group(); anode.position.set(0, 0.27, 0); rig.add(anode);
  const ac = cyl(0.11, 0.11, 0.12, copper, 40); ac.rotation.x = Math.PI / 2; anode.add(ac);
  for (let k = 0; k < 14; k++) { const fin = box(0.24, 0.005, 0.11, copper, 0, 0, 0); fin.rotation.z = (k / 14) * Math.PI; fin.position.z = 0; anode.add(fin); }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softSprite('rgba(255,170,90,1)', 'rgba(255,120,40,0)'), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
  glow.scale.setScalar(0.32); glow.position.set(0, 0.27, 0.08); rig.add(glow);
  for (const s of [1, -1]) { // magnets
    const mg = new THREE.Group(); mg.position.set(0, 0.27, s * 0.12); rig.add(mg);
    box(0.2, 0.06, 0.06, magRed, 0, 0.13, 0, mg); box(0.2, 0.06, 0.06, magRed, 0, -0.13, 0, mg); box(0.06, 0.32, 0.06, magRed, 0.1, 0, 0, mg);
  }
  const leads = [cyl(0.012, 0.012, 0.22, steel, 8), cyl(0.012, 0.012, 0.22, steel, 8)]; leads.forEach((l, i) => { l.position.set(0.13, 0.15 + i * 0.25, 0); l.rotation.z = Math.PI / 2; rig.add(l); });
  // waveguide to horn (points -x towards the operator)
  const wg = box(0.32, 0.07, 0.05, copper, -0.26, 0.27, 0, rig);
  const hornG = new THREE.CylinderGeometry(0.17, 0.045, 0.3, 4, 1, true); hornG.rotateY(Math.PI / 4); hornG.rotateZ(Math.PI / 2);
  const horn = new THREE.Mesh(hornG, new THREE.MeshPhysicalMaterial({ color: '#c8774a', metalness: 1, roughness: 0.3, side: THREE.DoubleSide })); horn.position.set(-0.57, 0.27, 0); horn.castShadow = true; rig.add(horn);
  const hornMouthLocal = V(-0.72, 0.27, 0);
  // cables to racks
  const cableM = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.7 });
  for (let k = 0; k < 3; k++) {
    const c = new THREE.CatmullRomCurve3([V(1.6, 1.2 + k * 0.04, -0.08), V(1.75, 0.95, -0.4 - k * 0.1), V(1.9 + k * 0.1, 0.05, -1.0), V(1.85 + k * 0.2, 0.6, -1.65)]);
    const m = new THREE.Mesh(new THREE.TubeGeometry(c, 40, 0.015, 8), cableM); m.castShadow = true; S.add(m);
  }
  // kernel stand + dish (in front of the horn)
  const stand = box(0.18, 0.14, 0.18, woodM, 0.55, 1.0, -0.08, bench);
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.07, 0.025, 32), new THREE.MeshPhysicalMaterial({ color: '#f1ece2', roughness: 0.2, clearcoat: 1 })); dish.position.set(0.55, 1.085, -0.08); dish.castShadow = true; S.add(dish);
  dish.visible = false; stand.visible = false;
  // microwave wave-fronts (visualization)
  const waveM = new THREE.MeshBasicMaterial({ color: '#7fe8ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const waves = [];
  for (let k = 0; k < 7; k++) { const w = new THREE.Mesh(new THREE.TorusGeometry(1, 0.006, 6, 64, Math.PI * 0.9), waveM.clone()); w.rotation.set(0, Math.PI / 2, Math.PI * 0.55); S.add(w); waves.push(w); }
  // ---- Radarange (1947): tall water-cooled cabinet
  const rr = new THREE.Group(); rr.position.set(-1.9, 0, 0.2); rr.rotation.y = Math.PI / 2; S.add(rr);
  const rrM = new THREE.MeshPhysicalMaterial({ color: '#b7bcbd', metalness: 0.7, roughness: 0.32, clearcoat: 0.4 });
  box(0.78, 1.8, 0.66, rrM, 0, 0.9, 0, rr);
  const door = box(0.6, 0.5, 0.03, new THREE.MeshPhysicalMaterial({ color: '#d4d8d9', metalness: 0.8, roughness: 0.25 }), 0, 1.08, 0.345, rr);
  box(0.36, 0.22, 0.01, new THREE.MeshPhysicalMaterial({ color: '#1d2a2e', roughness: 0.05, clearcoat: 1, metalness: 0.2 }), 0, 1.1, 0.362, rr);
  box(0.4, 0.04, 0.03, steel, 0, 1.36, 0.37, rr);
  const dial = cyl(0.06, 0.06, 0.03, new THREE.MeshStandardMaterial({ color: '#1b1b1b', roughness: 0.4 }), 32); dial.rotation.x = Math.PI / 2; dial.position.set(0.2, 1.55, 0.35); rr.add(dial);
  const plate = box(0.34, 0.07, 0.01, new THREE.MeshPhysicalMaterial({ color: '#c79a3a', metalness: 1, roughness: 0.3 }), -0.08, 1.58, 0.335, rr);
  box(0.66, 0.1, 0.02, new THREE.MeshStandardMaterial({ color: '#2a2e30', roughness: 0.5 }), 0, 0.08, 0.34, rr);
  for (let k = 0; k < 2; k++) { const p = cyl(0.025, 0.025, 1.6, copper, 12); p.position.set(0.42, 0.9, -0.15 + k * 0.12); rr.add(p); }
  rr.visible = false;
  // ---- lights
  const hemi = new THREE.HemisphereLight('#c9b48f', '#1b1712', 0.35); S.add(hemi);
  const lamp = new THREE.PointLight('#ffc27a', 4.5, 6, 1.6); lamp.position.set(0.9, 2.3, 0.4); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.0015; lamp.shadow.radius = 4; S.add(lamp);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.16, 32, 1, true), new THREE.MeshStandardMaterial({ color: '#2e3a30', metalness: 0.5, roughness: 0.5, side: THREE.DoubleSide })); shade.position.set(0.9, 2.4, 0.4); S.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), new THREE.MeshBasicMaterial({ color: '#fff1d0' })); bulb.position.set(0.9, 2.33, 0.4); S.add(bulb);
  const cord = cyl(0.006, 0.006, 1.6, cableM, 6); cord.position.set(0.9, 3.25, 0.4); S.add(cord);
  const key = new THREE.DirectionalLight('#ffe2b8', 0.9); key.position.set(3, 4, 4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); const sc = key.shadow.camera; sc.left = -3; sc.right = 3; sc.top = 3; sc.bottom = -1; sc.near = 0.5; sc.far = 14; key.shadow.bias = -0.0008; S.add(key);
  const rim = new THREE.PointLight('#6fd3ff', 1.5, 5, 2); rim.position.set(-0.6, 1.9, -1.2); S.add(rim);
  const magLight = new THREE.PointLight('#ff9a50', 0, 1.6, 2); magLight.position.set(1.45, 1.25, 0.1); S.add(magLight);
  // dust motes
  const dg = new THREE.BufferGeometry(); const dp = new Float32Array(400 * 3); const r = rng(77); for (let i = 0; i < 400; i++) { dp[i * 3] = -2 + r() * 5; dp[i * 3 + 1] = 0.3 + r() * 2.4; dp[i * 3 + 2] = -1.6 + r() * 3; }
  dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.012, map: softSprite('rgba(255,235,200,1)', 'rgba(255,235,200,0)'), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  S.add(dust);

  // ---- popcorn system
  const kernelM = new THREE.MeshPhysicalMaterial({ color: '#e9a425', roughness: 0.25, clearcoat: 0.8, sheen: 0.3 });
  const popM = new THREE.MeshPhysicalMaterial({ color: '#fff4dc', roughness: 0.75, sheen: 0.5, sheenColor: new THREE.Color('#fff2c8') });
  const kernelG = new THREE.SphereGeometry(1, 16, 12); kernelG.scale(0.0075, 0.0095, 0.006);
  const popGs = [];
  for (let v = 0; v < 4; v++) { // fluffy irregular popcorn shapes
    const parts = []; const rr2 = rng(100 + v);
    for (let k = 0; k < 7; k++) { const s = new THREE.SphereGeometry(0.012 + rr2() * 0.01, 12, 10); s.translate((rr2() - 0.5) * 0.03, (rr2() - 0.5) * 0.03, (rr2() - 0.5) * 0.03); parts.push(s); }
    const merged = mergeGeoms(parts); popGs.push(merged);
  }
  const corn = [];
  const cr = rng(9);
  for (let i = 0; i < 14; i++) {
    const g = new THREE.Group(); S.add(g); g.visible = false;
    const k = new THREE.Mesh(kernelG, kernelM); k.castShadow = true; g.add(k);
    const p = new THREE.Mesh(popGs[i % 4], popM); p.castShadow = true; p.visible = false; g.add(p);
    const a = cr() * Math.PI * 2, rad = Math.sqrt(cr()) * 0.055;
    corn.push({ g, k, p, home: V(0.55 + Math.cos(a) * rad, 1.105, -0.08 + Math.sin(a) * rad), rot: cr() * 6, tPop: 0, vel: V((cr() - 0.7) * 0.9, 2.0 + cr() * 1.4, (cr() - 0.5) * 1.0), spin: V(cr() * 8, cr() * 8, cr() * 8), seed: cr() });
  }
  const steamM = new THREE.SpriteMaterial({ map: softSprite('rgba(255,255,255,0.8)', 'rgba(255,255,255,0)'), transparent: true, depthWrite: false, opacity: 0 });
  const steams = []; for (let i = 0; i < 10; i++) { const s = new THREE.Sprite(steamM.clone()); S.add(s); steams.push(s); }

  function update(t, o = {}) {
    drawOsc(t);
    tubes.forEach((f, i) => { f.material.emissiveIntensity = 2.0 + 0.5 * Math.sin(t * 7 + i * 1.7) * Math.sin(t * 3.1 + i); });
    const on = o.magOn ?? 1;
    glow.material.opacity = on * (0.12 + 0.04 * Math.sin(t * 31));
    magLight.intensity = on * (0.6 + 0.15 * Math.sin(t * 27));
    // wave-fronts travel from horn mouth towards target
    rig.updateMatrixWorld(true);
    const mouth = hornMouthLocal.clone().applyMatrix4(rig.matrix);
    const wv = o.waves || 0;
    waves.forEach((w, k) => {
      const ph = ((t * 0.9 + k / waves.length) % 1);
      w.position.copy(mouth).add(V(-ph * (o.waveReach || 1.0), (o.waveDy || 0) * ph, 0));
      w.scale.setScalar(0.06 + ph * 0.3);
      w.material.opacity = wv * Math.sin(ph * Math.PI) * 0.5;
      w.material.color.set(o.waveColor || '#7fe8ff');
    });
    dust.rotation.y = t * 0.01;
    // corn
    const cs = o.corn; // {show, jiggle, popStart, popSpan, slow, heat}
    dish.visible = stand.visible = !!(cs && cs.show);
    const off = (cs && cs.offset) || V(0, 0, 0); dish.position.set(0.55, 1.085, -0.08).add(off); stand.visible = !!(cs && cs.show && cs.stand !== false);
    corn.forEach((c, i) => {
      c.g.visible = !!(cs && cs.show);
      if (!c.g.visible) return;
      const tp = cs.popStart + c.seed * cs.popSpan; // pop time
      if (t < tp) {
        const j = (cs.jiggle || 0) * (0.5 + 0.5 * smooth(tp - 1.0, tp, t));
        c.g.position.copy(c.home).add(off).add(V(Math.sin(t * 61 + i) * 0.003 * j, Math.abs(Math.sin(t * 47 + i * 2)) * 0.006 * j, Math.cos(t * 53 + i) * 0.003 * j));
        c.g.rotation.set(c.rot + j * 0.3 * Math.sin(t * 40 + i), c.rot * 2, 0);
        c.k.visible = true; c.p.visible = false; c.k.scale.setScalar(1);
      } else {
        const dt = (t - tp) * (cs.slow || 1);
        const burst = clamp(dt / 0.06);
        c.k.visible = burst < 1; c.k.scale.setScalar(1 + burst * 0.6);
        c.p.visible = burst > 0.2; c.p.scale.setScalar(0.3 + 0.7 * Math.min(1, burst * 1.2) + 0.08 * Math.sin(dt * 30) * Math.exp(-dt * 4));
        const v = c.vel; let y = c.home.y + v.y * dt - 4.9 * dt * dt * 0.55;
        let x = c.home.x + v.x * dt * 0.5, z = c.home.z + v.z * dt * 0.5;
        if (y < 0.945 && x > 0.4) { y = 0.945; } if (y < 0.02) y = 0.02;
        c.g.position.set(x, y, z);
        c.g.rotation.set(c.spin.x * dt, c.spin.y * dt, c.spin.z * dt);
      }
    });
    steams.forEach((s, i) => {
      const life = cs && cs.show ? ((t * 0.5 + i / steams.length) % 1) : 0;
      s.position.set(0.55 + Math.sin(i * 3.1) * 0.05, 1.12 + life * 0.35, -0.08 + Math.cos(i * 2.3) * 0.05);
      s.scale.setScalar(0.05 + life * 0.18); s.material.opacity = (cs ? (cs.heat || 0) : 0) * Math.sin(life * Math.PI) * 0.35;
    });
    rr.visible = !!o.radarange;
    knob.rotation.x = o.knob || 0; knobMark.position.set(-0.132, 0.08 + 0.013 * Math.cos(o.knob || 0), 0.013 * Math.sin(o.knob || 0));
  }
  return { scene, S, update, rig, horn, hornMouth: () => hornMouthLocal.clone().applyMatrix4(rig.matrixWorld), racks, radarange: rr, lamp, key, dish, anode };
}

function mergeGeoms(geoms) {
  let total = 0; geoms.forEach(g => { g = g.index ? g.toNonIndexed() : g; total += g.attributes.position.count; });
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3); let off = 0;
  geoms.forEach(g0 => { const g = g0.index ? g0.toNonIndexed() : g0; pos.set(g.attributes.position.array, off * 3); nor.set(g.attributes.normal.array, off * 3); off += g.attributes.position.count; });
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); return out;
}

// ======================================================================= MODERN KITCHEN + MICROWAVE
export function buildKitchen() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#b9c4ca');
  scene.fog = new THREE.FogExp2('#b9c4ca', 0.03);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshStandardMaterial({ color: '#c9b39a', roughness: 0.6 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const tile = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#cfd6d8'; g.fillRect(0, 0, w, h); g.fillStyle = '#f6f8f8'; for (let y = 0; y < 8; y++) for (let x = -1; x < 5; x++) { const ox = (y % 2) * 64; g.fillRect(x * 128 + ox + 3, y * 64 + 3, 122, 58); } noiseFill(g, w, h, 0, 0.03, 8, 2); }, { repeat: [6, 3] });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(12, 4), new THREE.MeshStandardMaterial({ map: tile, roughness: 0.25 })); wall.position.set(0, 2, -0.7); wall.receiveShadow = true; scene.add(wall);
  const quartz = new THREE.MeshPhysicalMaterial({ color: '#f2f1ee', roughness: 0.2, clearcoat: 0.6 });
  const cab = new THREE.MeshStandardMaterial({ color: '#30485a', roughness: 0.5 });
  box(4, 0.04, 0.65, quartz, 0, 0.92, -0.35, scene); box(4, 0.88, 0.6, cab, 0, 0.44, -0.37, scene);
  for (let i = -3; i <= 3; i++) box(0.01, 0.8, 0.005, new THREE.MeshStandardMaterial({ color: '#1c2b36' }), i * 0.55, 0.46, -0.065, scene);
  box(4, 0.7, 0.35, cab, 0, 2.05, -0.52, scene);
  // plant + jar props
  const pot = cyl(0.06, 0.05, 0.12, new THREE.MeshStandardMaterial({ color: '#c46a3f', roughness: 0.7 })); pot.position.set(-0.75, 1.0, -0.45); scene.add(pot);
  for (let k = 0; k < 7; k++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshStandardMaterial({ color: '#3f8a46', roughness: 0.6 })); l.scale.set(0.5, 1.4, 0.3); l.position.set(-0.75 + Math.sin(k * 2) * 0.04, 1.12 + k * 0.012, -0.45 + Math.cos(k * 2) * 0.04); l.rotation.z = Math.sin(k * 2) * 0.6; scene.add(l); }
  // ---- microwave
  const mw = new THREE.Group(); mw.position.set(0.15, 0.94, -0.42); scene.add(mw);
  const shell = new THREE.MeshPhysicalMaterial({ color: '#202326', metalness: 0.6, roughness: 0.35, clearcoat: 0.5 });
  const W = 0.52, H = 0.31, D = 0.4;
  box(W, 0.02, D, shell, 0, 0.01, 0, mw); box(W, 0.02, D, shell, 0, H - 0.01, 0, mw); box(0.02, H, D, shell, -W / 2 + 0.01, H / 2, 0, mw); box(0.14, H, D, shell, W / 2 - 0.07, H / 2, 0, mw);
  box(W, H, 0.02, shell, 0, H / 2, -D / 2 + 0.01, mw);
  const inner = new THREE.MeshStandardMaterial({ color: '#d9dcd8', roughness: 0.4, metalness: 0.2, side: THREE.BackSide });
  const cav = new THREE.Mesh(new THREE.BoxGeometry(W - 0.17, H - 0.04, D - 0.04), inner); cav.position.set(-0.06, H / 2, 0); mw.add(cav);
  const cavLight = new THREE.PointLight('#fff1c8', 0, 0.6, 1.5); cavLight.position.set(-0.06, H - 0.05, 0.05); mw.add(cavLight);
  const turn = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.008, 40), new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.6 })); turn.position.set(-0.06, 0.035, 0); mw.add(turn);
  // door: hinge at left edge
  const doorPivot = new THREE.Group(); doorPivot.position.set(-W / 2, H / 2, D / 2 + 0.01); mw.add(doorPivot);
  const meshTex = canvasTex(256, 160, (g, w, h) => { g.fillStyle = '#0a0b0c'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.6)'; for (let y = 4; y < h; y += 6) for (let x = 4 + (y % 12 ? 3 : 0); x < w; x += 6) { g.beginPath(); g.arc(x, y, 1.8, 0, 6.3); g.fill(); } });
  const glassM = new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: meshTex, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.55, metalness: 0.1 });
  const doorFrame = box(W - 0.14, H - 0.02, 0.02, shell, (W - 0.14) / 2, 0, 0, doorPivot);
  doorFrame.material = shell;
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.22, H - 0.08), glassM); glass.position.set((W - 0.14) / 2 - 0.01, 0, 0.012); doorPivot.add(glass);
  doorFrame.visible = false; // frame drawn as border pieces so the window shows the cavity
  const bm = shell; box(W - 0.14, 0.035, 0.02, bm, (W - 0.14) / 2, H / 2 - 0.028, 0, doorPivot); box(W - 0.14, 0.035, 0.02, bm, (W - 0.14) / 2, -H / 2 + 0.028, 0, doorPivot); box(0.035, H - 0.02, 0.02, bm, 0.017, 0, 0, doorPivot); box(0.035, H - 0.02, 0.02, bm, W - 0.14 - 0.017, 0, 0, doorPivot);
  const handle = box(0.018, 0.22, 0.03, new THREE.MeshStandardMaterial({ color: '#8d9399', metalness: 0.9, roughness: 0.3 }), W - 0.165, 0, 0.03, doorPivot);
  // control panel
  const dispC = document.createElement('canvas'); dispC.width = 256; dispC.height = 96; const dispG = dispC.getContext('2d'); const dispTex = new THREE.CanvasTexture(dispC); dispTex.colorSpace = THREE.SRGBColorSpace;
  const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.035), new THREE.MeshBasicMaterial({ map: dispTex, toneMapped: false })); disp.position.set(W / 2 - 0.07, H - 0.06, D / 2 + 0.001); mw.add(disp);
  function drawDisp(txt) { dispG.fillStyle = '#05080a'; dispG.fillRect(0, 0, 256, 96); dispG.fillStyle = '#7ef2ff'; dispG.font = '700 64px monospace'; dispG.textAlign = 'center'; dispG.textBaseline = 'middle'; dispG.shadowColor = '#3ad8ff'; dispG.shadowBlur = 14; dispG.fillText(txt, 128, 50); dispG.shadowBlur = 0; dispTex.needsUpdate = true; }
  const btnM = new THREE.MeshStandardMaterial({ color: '#3a3f44', roughness: 0.4 });
  const btns = [];
  for (let r2 = 0; r2 < 3; r2++) for (let c = 0; c < 3; c++) { const b = box(0.026, 0.02, 0.008, btnM, W / 2 - 0.1 + c * 0.03, H - 0.11 - r2 * 0.03, D / 2 + 0.004, mw); btns.push(b); }
  const startM = new THREE.MeshStandardMaterial({ color: '#2fbf6b', emissive: '#1aa356', emissiveIntensity: 0.4, roughness: 0.3 });
  const start = box(0.086, 0.03, 0.01, startM, W / 2 - 0.07, 0.06, D / 2 + 0.005, mw);
  // popcorn bag on the turntable (inflates)
  const bagTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#f4ead4'; g.fillRect(0, 0, w, h); g.fillStyle = '#d43b2a'; for (let i = 0; i < 6; i++) g.fillRect(i * 46, 0, 22, h); g.fillStyle = '#fff6e4'; g.fillRect(50, 90, 156, 80); g.fillStyle = '#d43b2a'; g.font = '800 34px Inter, sans-serif'; g.textAlign = 'center'; g.fillText('POP', 128, 145); noiseFill(g, w, h, 0, 0.05, 8, 3); });
  const bagG = new THREE.BoxGeometry(0.2, 0.02, 0.13, 12, 4, 8); const bagBase = bagG.attributes.position.array.slice();
  const bag = new THREE.Mesh(bagG, new THREE.MeshPhysicalMaterial({ map: bagTex, roughness: 0.75, sheen: 0.3 })); bag.castShadow = true; bag.position.set(-0.06, 0.05, 0); mw.add(bag);
  function inflate(k) {
    const p = bagG.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) { const x = bagBase[i], y = bagBase[i + 1], z = bagBase[i + 2]; const fx = 1 - Math.pow(Math.abs(x) / 0.1, 2), fz = 1 - Math.pow(Math.abs(z) / 0.065, 2); const bulge = k * 0.07 * Math.max(0, fx) * Math.max(0, fz); p[i] = x * (1 - k * 0.06); p[i + 1] = y + Math.sign(y || 1) * bulge + 0.003 * Math.sin(x * 90 + z * 70) * k; p[i + 2] = z * (1 - k * 0.05); }
    bagG.attributes.position.needsUpdate = true; bagG.computeVertexNormals();
  }
  // bowl option (for the science shot): soup bowl with steam
  const bowl = new THREE.Group(); bowl.position.set(-0.06, 0.04, 0); mw.add(bowl);
  const bowlM = new THREE.MeshPhysicalMaterial({ color: '#f5efe4', roughness: 0.2, clearcoat: 1 });
  const bw = new THREE.Mesh(new THREE.SphereGeometry(0.085, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bowlM); bw.scale.set(1, 0.65, 1); bw.position.y = 0.06; bw.rotation.x = 0; bowl.add(bw);
  const bwIn = new THREE.Mesh(new THREE.SphereGeometry(0.083, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#f5efe4', roughness: 0.2, side: THREE.BackSide })); bwIn.scale.set(1, 0.64, 1); bwIn.position.y = 0.06; bowl.add(bwIn);
  const soupTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#d0782a'; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 0, 0.2, 20, 4); const r = rng(5); for (let i = 0; i < 40; i++) { g.fillStyle = r() < 0.5 ? 'rgba(80,140,50,0.8)' : 'rgba(240,200,90,0.8)'; g.beginPath(); g.arc(r() * w, r() * h, 3 + r() * 6, 0, 6.3); g.fill(); } });
  const soup = new THREE.Mesh(new THREE.CircleGeometry(0.078, 40), new THREE.MeshPhysicalMaterial({ map: soupTex, roughness: 0.15, clearcoat: 1 })); soup.rotation.x = -Math.PI / 2; soup.position.y = 0.035; bowl.add(soup);
  const steamM = new THREE.SpriteMaterial({ map: softSprite('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)'), transparent: true, depthWrite: false, opacity: 0 });
  const steams = []; for (let i = 0; i < 8; i++) { const s = new THREE.Sprite(steamM.clone()); bowl.add(s); steams.push(s); }
  // ---- lights (daylight)
  scene.add(new THREE.HemisphereLight('#ffffff', '#b8a68f', 0.4));
  const sun = new THREE.DirectionalLight('#fff3e0', 1.3); sun.position.set(-2.5, 3.5, 2.5); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const s2 = sun.shadow.camera; s2.left = -2; s2.right = 2; s2.top = 2.5; s2.bottom = -0.5; sun.shadow.bias = -0.0006; scene.add(sun);
  const fill = new THREE.PointLight('#d8ecff', 1.2, 5, 2); fill.position.set(1.5, 1.6, 1.4); scene.add(fill);
  let lastTxt = '';
  function update(t, o = {}) {
    doorPivot.rotation.y = -(o.door || 0) * 1.75;
    cavLight.intensity = (o.running || 0) * 0.9 + (o.door || 0) * 0.4;
    turn.rotation.y = (o.spin || 0); bag.rotation.y = (o.spin || 0); bowl.rotation.y = (o.spin || 0);
    bag.visible = !!o.bag; bowl.visible = !!o.bowl;
    if (o.bag) { inflate(o.inflate || 0); bag.position.set(-0.06 + (o.bagOffset ? o.bagOffset.x : 0), 0.05 + (o.bagOffset ? o.bagOffset.y : 0), 0 + (o.bagOffset ? o.bagOffset.z : 0)); }
    steams.forEach((s, i) => { const life = ((t * 0.45 + i / steams.length) % 1); s.position.set(Math.sin(i * 2.7) * 0.03, 0.05 + life * 0.18, Math.cos(i * 1.9) * 0.03); s.scale.setScalar(0.03 + life * 0.09); s.material.opacity = (o.steam || 0) * Math.sin(life * Math.PI) * 0.5; });
    startM.emissiveIntensity = 0.4 + (o.press || 0) * 2.0;
    start.position.z = D / 2 + 0.005 - (o.press || 0) * 0.004;
    const txt = o.display || '0:30'; if (txt !== lastTxt) { drawDisp(txt); lastTxt = txt; }
  }
  drawDisp('0:30');
  mw.updateMatrixWorld(true);
  return { scene, update, mw, doorPivot, start, handle, sun, bag, bowl, W, H, D };
}

// ======================================================================= MOLECULAR VIEW (dielectric heating)
export function buildMolecules() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#06122a');
  scene.fog = new THREE.FogExp2('#071634', 0.11);
  const N = 170;
  const oG = new THREE.SphereGeometry(0.16, 24, 18), hG = new THREE.SphereGeometry(0.095, 20, 14), bG = new THREE.CylinderGeometry(0.035, 0.035, 1, 10);
  const oM = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.25, clearcoat: 0.8 });
  const hM = new THREE.MeshPhysicalMaterial({ color: '#f4f6ff', roughness: 0.25, clearcoat: 0.8 });
  const bM = new THREE.MeshStandardMaterial({ color: '#c9d2e6', roughness: 0.4 });
  const O = new THREE.InstancedMesh(oG, oM, N), H1 = new THREE.InstancedMesh(hG, hM, N), H2 = new THREE.InstancedMesh(hG, hM, N), B1 = new THREE.InstancedMesh(bG, bM, N), B2 = new THREE.InstancedMesh(bG, bM, N);
  [O, H1, H2, B1, B2].forEach(m => { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); });
  const r = rng(31);
  const mols = [];
  for (let i = 0; i < N; i++) {
    const p = V((r() - 0.5) * 7, (r() - 0.5) * 11, -r() * 9 + 1.2);
    if (Math.abs(p.x) < 0.9 && Math.abs(p.y) < 1.1 && p.z > -1.5) p.x += Math.sign(p.x || 1) * 1.2; // keep the hero area clear
    mols.push({ p, a0: r() * 6.28, tilt: (r() - 0.5) * 1.2, ph: r() * 6.28, lag: 0.15 + r() * 0.25, rnd: r() });
  }
  O.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
  H1.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
  H2.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
  // hero molecule (bigger, with partial-charge labels)
  const hero = new THREE.Group(); scene.add(hero);
  const ho = new THREE.Mesh(new THREE.SphereGeometry(0.42, 48, 32), new THREE.MeshPhysicalMaterial({ color: '#e5463a', roughness: 0.2, clearcoat: 1 }));
  hero.add(ho);
  const HA = 104.5 * Math.PI / 180;
  const hh = [];
  for (const s of [1, -1]) {
    const dir = V(Math.sin(HA / 2) * s, -Math.cos(HA / 2), 0);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.25, 40, 28), new THREE.MeshPhysicalMaterial({ color: '#f3f5ff', roughness: 0.2, clearcoat: 1 })); h.position.copy(dir.clone().multiplyScalar(0.62)); hero.add(h);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.62, 16), bM); b.position.copy(dir.clone().multiplyScalar(0.31)); b.quaternion.setFromUnitVectors(V(0, 1, 0), dir); hero.add(b);
    hh.push(h);
  }
  const lab = (txt, col) => { const tex = canvasTex(256, 256, (g, w, h) => { g.font = '800 150px Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 16; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.strokeText(txt, w / 2, h / 2); g.fillStyle = col; g.fillText(txt, w / 2, h / 2); }); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, toneMapped: false })); s.renderOrder = 60; s.scale.setScalar(0.5); return s; };
  const dMinus = lab('δ−', '#ff8a7a'); dMinus.position.set(0, 0.68, 0.2); hero.add(dMinus);
  const dPlus1 = lab('δ+', '#9fd8ff'); dPlus1.position.set(0.72, -0.62, 0.2); hero.add(dPlus1);
  const dPlus2 = lab('δ+', '#9fd8ff'); dPlus2.position.set(-0.72, -0.62, 0.2); hero.add(dPlus2);
  // field arrows (E-field) left/right columns
  const arrows = [];
  const arM = new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
  for (let k = 0; k < 6; k++) {
    const g = new THREE.Group(); const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 12), arM); const head = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.24, 16), arM); head.position.y = 0.57; g.add(shaft, head);
    g.position.set(k % 2 ? 1.75 : -1.75, -2.4 + Math.floor(k / 2) * 2.4, -0.6); scene.add(g); arrows.push(g);
  }
  // travelling EM wave (sine ribbon)
  const wavePts = 200; const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(wavePts * 3), 3));
  const waveLine = new THREE.Line(wg, new THREE.LineBasicMaterial({ color: '#7fe8ff', transparent: true, opacity: 0, toneMapped: false })); scene.add(waveLine);
  // heat glow sprites
  const glowM = new THREE.SpriteMaterial({ map: softSprite('rgba(255,140,60,1)', 'rgba(255,80,20,0)'), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 });
  const glows = []; for (let i = 0; i < 26; i++) { const s = new THREE.Sprite(glowM.clone()); s.position.set((r() - 0.5) * 6, (r() - 0.5) * 9, -r() * 6); s.scale.setScalar(1 + r() * 2); scene.add(s); glows.push(s); }
  // lights
  scene.add(new THREE.HemisphereLight('#9cc8ff', '#0a1020', 0.9));
  const key = new THREE.DirectionalLight('#ffffff', 2.2); key.position.set(2, 3, 4); scene.add(key);
  const warm = new THREE.PointLight('#ff8a3a', 0, 12, 1.5); warm.position.set(0, 0, 2); scene.add(warm);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = V(1, 1, 1), tmp = V(0, 0, 0);
  const cBlue = new THREE.Color('#5b8fe0'), cRed = new THREE.Color('#e5463a'), cHot = new THREE.Color('#ff7a2a'), cW = new THREE.Color('#f3f5ff'), cWh = new THREE.Color('#ffd0a8');
  // o: { E (signed field -1..1), follow (0..1 how much dipoles align), heat (0..1), wave (0..1), arrows (0..1), hero (0..1), heroPos, labels }
  function update(t, o = {}) {
    const E = o.E || 0, follow = o.follow || 0, heat = o.heat || 0;
    mols.forEach((m, i) => {
      // dipole direction: O->H bisector points opposite to the dipole; dipole (δ- at O) aligns *against*... we align molecule so O (δ−) points toward +E side? Field pushes δ− opposite E: O points to -E.
      const target = E >= 0 ? Math.PI / 2 : -Math.PI / 2; // H side (δ+) points along E, O (δ−) against it
      const lagE = Math.sin(m.ph + t * 0.6) * 0.4;
      const free = m.a0 + Math.sin(t * 0.7 + m.ph) * 0.6;
      let ang = lerp(free, target + lagE * (1 - heat * 0.3), follow * (1 - m.lag * 0.6));
      const jit = heat * (0.35 + 0.65 * m.rnd);
      ang += Math.sin(t * 23 + i * 1.7) * 0.35 * jit;
      const tilt = m.tilt + Math.sin(t * 17 + i) * 0.4 * jit;
      const pos = tmp.copy(m.p).add(V(Math.sin(t * 19 + i * 3) * 0.06 * jit, Math.cos(t * 21 + i * 2) * 0.06 * jit, Math.sin(t * 15 + i) * 0.05 * jit + Math.sin(t * 0.3 + m.ph) * 0.1));
      e.set(tilt, m.rnd * 2 * (1 - follow), ang); q.setFromEuler(e);
      m4.compose(pos, q, sc); O.setMatrixAt(i, m4);
      for (const [k, s] of [[0, 1], [1, -1]]) {
        const dir = V(Math.sin(HA / 2) * s, -Math.cos(HA / 2), 0).applyQuaternion(q);
        const hp = pos.clone().add(dir.clone().multiplyScalar(0.25)); m4.compose(hp, q, sc); (k ? H2 : H1).setMatrixAt(i, m4);
        const bp = pos.clone().add(dir.clone().multiplyScalar(0.125)); const bq = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir); m4.compose(bp, bq, V(1, 0.25, 1)); (k ? B2 : B1).setMatrixAt(i, m4);
      }
      const hc = cRed.clone().lerp(cHot, heat * (0.5 + 0.5 * m.rnd));
      O.setColorAt(i, hc); H1.setColorAt(i, cW.clone().lerp(cWh, heat * 0.8)); H2.setColorAt(i, cW.clone().lerp(cWh, heat * 0.8));
    });
    [O, H1, H2, B1, B2].forEach(mm => { mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; });
    // hero
    hero.visible = (o.hero ?? 1) > 0.01; hero.position.copy(o.heroPos || V(0, 0, 0)); hero.scale.setScalar(o.heroScale || 1);
    const target = E >= 0 ? Math.PI / 2 : -Math.PI / 2;
    const hAng = lerp(0.25 * Math.sin(t * 0.8), target * 0.92, follow) + Math.sin(t * 25) * 0.15 * heat;
    hero.rotation.set(0.15 * Math.sin(t * 0.5) + heat * 0.2 * Math.sin(t * 19), 0.25 * Math.sin(t * 0.4), hAng);
    ho.material.color.copy(cRed).lerp(cHot, heat * 0.6);
    [dMinus, dPlus1, dPlus2].forEach(s => { s.material.opacity = o.labels || 0; s.visible = (o.labels || 0) > 0.01; s.material.rotation = -hero.rotation.z; });
    arrows.forEach((a, k) => { a.children.forEach(c => c.material.opacity = (o.arrows || 0) * 0.9); a.rotation.z = E >= 0 ? -Math.PI / 2 : Math.PI / 2; a.scale.set(1, 0.4 + 0.6 * Math.abs(E), 1); });
    const wp = wg.attributes.position.array;
    for (let i = 0; i < wavePts; i++) { const u = i / (wavePts - 1); const z = -8 + u * 10; wp[i * 3] = Math.sin(u * 30 - t * 9) * 0.9; wp[i * 3 + 1] = -3.2; wp[i * 3 + 2] = z; }
    wg.attributes.position.needsUpdate = true; waveLine.material.opacity = (o.wave || 0) * 0.9;
    glows.forEach((s, i) => { s.material.opacity = heat * (0.25 + 0.2 * Math.sin(t * 3 + i)); });
    warm.intensity = heat * 30;
    scene.background.set('#06122a').lerp(new THREE.Color('#2a0f08'), heat * 0.75);
    scene.fog.color.set('#071634').lerp(new THREE.Color('#3a1408'), heat * 0.75);
  }
  return { scene, update, hero };
}
