import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTex, noiseFill, grain, rng } from './lib.js';

export function buildRoom(scene) {
  const group = new THREE.Group(); scene.add(group);
  const W = 5.2, D = 4.6, H = 2.7; // x: -2.6..2.6, z: -2.0..2.6
  const zBack = -2.0;

  const woodTex = canvasTex(1024, 1024, (g, w, h) => {
    const r = rng(2);
    const pw = w / 6;
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        const y0 = (j * h / 3 + (i % 2) * h / 6) % h; const tone = 0.85 + r() * 0.3;
        g.fillStyle = `rgb(${(150 * tone) | 0},${(102 * tone) | 0},${(66 * tone) | 0})`;
        g.fillRect(i * pw, y0, pw, h / 3); g.fillRect(i * pw, y0 - h, pw, h / 3);
        for (let k = 0; k < 40; k++) { g.strokeStyle = `rgba(70,40,20,${0.05 + r() * 0.12})`; g.lineWidth = 1 + r() * 2; const x = i * pw + r() * pw; g.beginPath(); g.moveTo(x, y0); g.bezierCurveTo(x + r() * 8 - 4, y0 + 80, x + r() * 8 - 4, y0 + 200, x + r() * 6 - 3, y0 + h / 3); g.stroke(); }
        g.fillStyle = 'rgba(40,22,10,0.55)'; g.fillRect(i * pw, y0, pw, 3);
      }
      g.fillStyle = 'rgba(40,22,10,0.6)'; g.fillRect(i * pw, 0, 3, h);
    }
    grain(g, w, h, 0.06, 5);
  }, { repeat: [2.2, 2.2] });
  const floorMat = new THREE.MeshPhysicalMaterial({ map: woodTex, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3 });
  const plaster = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#e9dcc8'; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 0, 0.05, 40, 4); grain(g, w, h, 0.03, 6); }, { repeat: [3, 2] });
  const wallMat = new THREE.MeshStandardMaterial({ map: plaster, roughness: 0.95 });
  const accentMat = new THREE.MeshStandardMaterial({ color: '#3f6f6a', roughness: 0.9 });
  const ceilTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 0, 0.035, 30, 9); grain(g, w, h, 0.025, 3); }, { repeat: [4, 4] });
  const ceilMat = new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 0.92 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 0.3); floor.receiveShadow = true; group.add(floor);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W, D), ceilMat); ceiling.rotation.x = Math.PI / 2; ceiling.position.set(0, H, 0.3); ceiling.receiveShadow = true; group.add(ceiling);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), accentMat); back.position.set(0, H / 2, zBack); back.receiveShadow = true; group.add(back);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(D, H), wallMat); left.rotation.y = Math.PI / 2; left.position.set(-W / 2, H / 2, 0.3); left.receiveShadow = true; group.add(left);
  // right wall with window opening (built from 4 panels)
  const rx = W / 2;
  const mkPanel = (w, h, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat); m.rotation.y = -Math.PI / 2; m.position.set(rx, y, z); m.receiveShadow = true; group.add(m); };
  const wz0 = -1.2, wz1 = 0.6, wy0 = 0.85, wy1 = 2.35;
  mkPanel(wz0 - zBack, H, H / 2, (zBack + wz0) / 2);
  mkPanel(2.6 - wz1, H, H / 2, (wz1 + 2.6) / 2);
  mkPanel(wz1 - wz0, wy0, wy0 / 2, (wz0 + wz1) / 2);
  mkPanel(wz1 - wz0, H - wy1, (wy1 + H) / 2, (wz0 + wz1) / 2);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(wz1 - wz0, wy1 - wy0), new THREE.MeshBasicMaterial({ color: new THREE.Color('#bfe0ff').multiplyScalar(1.15), toneMapped: true }));
  glow.rotation.y = -Math.PI / 2; glow.position.set(rx + 0.25, (wy0 + wy1) / 2, (wz0 + wz1) / 2); group.add(glow);
  const frameMat = new THREE.MeshStandardMaterial({ color: '#f2efe8', roughness: 0.6 });
  for (const [w, h, y, z] of [[0.06, wy1 - wy0, (wy0 + wy1) / 2, wz0], [0.06, wy1 - wy0, (wy0 + wy1) / 2, wz1], [wz1 - wz0, 0.06, wy0, (wz0 + wz1) / 2], [wz1 - wz0, 0.06, wy1, (wz0 + wz1) / 2], [0.04, wy1 - wy0, (wy0 + wy1) / 2, (wz0 + wz1) / 2]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.12, h, w), frameMat); b.position.set(rx - 0.03, y, z); group.add(b);
  }
  // sheer curtain
  const curtain = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 2.3, 30, 1), new THREE.MeshStandardMaterial({ color: '#fbf6ee', roughness: 1, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  { const p = curtain.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 28) * 0.03); curtain.geometry.computeVertexNormals(); }
  curtain.rotation.y = -Math.PI / 2; curtain.position.set(rx - 0.12, 1.4, wz1 + 0.1); group.add(curtain);
  // baseboards & crown molding
  const trim = new THREE.MeshStandardMaterial({ color: '#f3efe6', roughness: 0.55 });
  const bb = new THREE.Mesh(new THREE.BoxGeometry(W, 0.1, 0.02), trim); bb.position.set(0, 0.05, zBack + 0.01); group.add(bb);
  const crown = new THREE.Mesh(new THREE.BoxGeometry(W, 0.07, 0.07), trim); crown.position.set(0, H - 0.035, zBack + 0.035); group.add(crown);
  const crownL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, D), trim); crownL.position.set(-W / 2 + 0.035, H - 0.035, 0.3); group.add(crownL);
  // recessed ceiling lights
  for (const [x, z] of [[-1.2, -0.4], [1.2, -0.4], [0, 1.2]]) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.01, 32), new THREE.MeshStandardMaterial({ color: '#fffaf0', emissive: '#fff1d6', emissiveIntensity: 0.8 }));
    ring.position.set(x, H - 0.004, z); group.add(ring);
  }

  // sofa
  const sofaTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#c9902f'; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 0, 0.12, 6, 12); grain(g, w, h, 0.1, 13); }, { repeat: [4, 4] });
  const sofaMat = new THREE.MeshPhysicalMaterial({ map: sofaTex, roughness: 0.9, sheen: 1, sheenColor: new THREE.Color('#ffd27a'), sheenRoughness: 0.7 });
  const sofa = new THREE.Group(); sofa.position.set(0, 0, -1.55); group.add(sofa);
  const add = (geo, mat, x, y, z, parent = sofa) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  add(new RoundedBoxGeometry(2.1, 0.26, 0.9, 4, 0.08), sofaMat, 0, 0.27, 0);
  add(new RoundedBoxGeometry(2.1, 0.6, 0.24, 4, 0.1), sofaMat, 0, 0.62, -0.36);
  add(new RoundedBoxGeometry(0.22, 0.55, 0.9, 4, 0.1), sofaMat, -1.05, 0.42, 0);
  add(new RoundedBoxGeometry(0.22, 0.55, 0.9, 4, 0.1), sofaMat, 1.05, 0.42, 0);
  add(new RoundedBoxGeometry(0.92, 0.14, 0.7, 4, 0.06), sofaMat, -0.47, 0.46, 0.06);
  add(new RoundedBoxGeometry(0.92, 0.14, 0.7, 4, 0.06), sofaMat, 0.47, 0.46, 0.06);
  add(new RoundedBoxGeometry(0.9, 0.45, 0.18, 4, 0.08), sofaMat, -0.47, 0.72, -0.2).rotation.x = -0.15;
  add(new RoundedBoxGeometry(0.9, 0.45, 0.18, 4, 0.08), sofaMat, 0.47, 0.72, -0.2).rotation.x = -0.15;
  const pillowMat = new THREE.MeshPhysicalMaterial({ color: '#2f5d74', roughness: 0.9, sheen: 1, sheenColor: new THREE.Color('#8fc3d9') });
  add(new RoundedBoxGeometry(0.42, 0.4, 0.14, 4, 0.08), pillowMat, -0.82, 0.72, -0.08).rotation.set(-0.25, 0.3, 0.12);
  add(new RoundedBoxGeometry(0.4, 0.38, 0.14, 4, 0.08), new THREE.MeshPhysicalMaterial({ color: '#e8dccb', roughness: 0.95, sheen: 1, sheenColor: new THREE.Color('#ffffff') }), 0.84, 0.72, -0.08).rotation.set(-0.25, -0.3, -0.1);
  const legMat = new THREE.MeshStandardMaterial({ color: '#3a2618', roughness: 0.5 });
  for (const [x, z] of [[-0.98, 0.36], [0.98, 0.36], [-0.98, -0.36], [0.98, -0.36]]) add(new THREE.CylinderGeometry(0.025, 0.018, 0.14, 12), legMat, x, 0.07, z);

  // rug
  const rugTex = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#d9cbb3'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#a2573a'; g.lineWidth = 26; g.strokeRect(70, 70, w - 140, h - 140);
    g.strokeStyle = '#3f6f6a'; g.lineWidth = 10; g.strokeRect(120, 120, w - 240, h - 240);
    for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(162,87,58,0.45)'; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, h / 2, 60 + i * 55, 0, 7); g.stroke(); }
    noiseFill(g, w, h, 0, 0.1, 3, 31); grain(g, w, h, 0.12, 32);
  });
  const rug = new THREE.Mesh(new RoundedBoxGeometry(2.4, 0.012, 1.7, 2, 0.005), new THREE.MeshStandardMaterial({ map: rugTex, roughness: 1 }));
  rug.position.set(0, 0.006, -0.25); rug.receiveShadow = true; group.add(rug);
  // coffee table + mug + book
  const wood2 = new THREE.MeshPhysicalMaterial({ color: '#6b4428', roughness: 0.35, clearcoat: 0.5 });
  const table = new THREE.Group(); table.position.set(0.15, 0, -0.35); group.add(table);
  add(new RoundedBoxGeometry(1.0, 0.05, 0.55, 3, 0.02), wood2, 0, 0.4, 0, table);
  for (const [x, z] of [[-0.42, 0.2], [0.42, 0.2], [-0.42, -0.2], [0.42, -0.2]]) add(new THREE.CylinderGeometry(0.022, 0.016, 0.38, 10), wood2, x, 0.19, z, table);
  const mug = add(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 24), new THREE.MeshPhysicalMaterial({ color: '#e7e2d8', roughness: 0.25, clearcoat: 0.6 }), 0.28, 0.475, 0.08, table);
  add(new THREE.TorusGeometry(0.03, 0.009, 8, 16), mug.material, 0.33, 0.48, 0.08, table).rotation.y = Math.PI / 2;
  add(new RoundedBoxGeometry(0.26, 0.04, 0.19, 2, 0.006), new THREE.MeshStandardMaterial({ color: '#a2573a', roughness: 0.7 }), -0.2, 0.445, 0.02, table).rotation.y = 0.2;
  add(new RoundedBoxGeometry(0.24, 0.03, 0.17, 2, 0.006), new THREE.MeshStandardMaterial({ color: '#e5c56a', roughness: 0.7 }), -0.2, 0.48, 0.02, table).rotation.y = 0.35;

  // floor lamp (left)
  const lamp = new THREE.Group(); lamp.position.set(-1.55, 0, -1.45); group.add(lamp);
  const metal = new THREE.MeshStandardMaterial({ color: '#1e1e1e', roughness: 0.35, metalness: 0.8 });
  add(new THREE.CylinderGeometry(0.17, 0.19, 0.03, 32), metal, 0, 0.015, 0, lamp);
  add(new THREE.CylinderGeometry(0.014, 0.014, 1.55, 12), metal, 0, 0.8, 0, lamp);
  const shade = add(new THREE.CylinderGeometry(0.17, 0.25, 0.32, 40, 1, true), new THREE.MeshStandardMaterial({ color: '#f5e3c0', emissive: '#ffcf86', emissiveIntensity: 0.6, roughness: 1, side: THREE.DoubleSide }), 0, 1.66, 0, lamp);
  shade.castShadow = false;
  // plant (right corner)
  const plant = new THREE.Group(); plant.position.set(1.7, 0, -1.55); group.add(plant);
  add(new THREE.CylinderGeometry(0.2, 0.15, 0.4, 28), new THREE.MeshStandardMaterial({ color: '#d8cfc0', roughness: 0.7 }), 0, 0.2, 0, plant);
  const leafMat = new THREE.MeshPhysicalMaterial({ color: '#3f7f3a', roughness: 0.5, side: THREE.DoubleSide, sheen: 0.4, sheenColor: new THREE.Color('#b8f0a0') });
  const r = rng(77);
  for (let i = 0; i < 16; i++) {
    const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.bezierCurveTo(0.14, 0.05, 0.16, 0.28, 0, 0.4); shape.bezierCurveTo(-0.16, 0.28, -0.14, 0.05, 0, 0);
    const leaf = new THREE.Mesh(new THREE.ShapeGeometry(shape, 12), leafMat); leaf.castShadow = true;
    const stem = new THREE.Group(); stem.position.set(0, 0.38, 0); stem.rotation.set(0.5 + r() * 0.6, r() * Math.PI * 2, 0); plant.add(stem);
    leaf.position.y = 0.25 + r() * 0.35; leaf.rotation.x = -0.6 - r() * 0.4; leaf.scale.setScalar(0.8 + r() * 0.6); stem.add(leaf);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, leaf.position.y, 6), new THREE.MeshStandardMaterial({ color: '#3d6b2f' })); st.position.y = leaf.position.y / 2; stem.add(st);
  }
  // wall art & shelf
  const artTex = canvasTex(512, 640, (g, w, h) => {
    g.fillStyle = '#efe5d3'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e1a14a'; g.beginPath(); g.arc(w * 0.62, h * 0.38, 120, 0, 7); g.fill();
    g.fillStyle = '#2f5d74'; g.fillRect(w * 0.12, h * 0.55, w * 0.76, h * 0.3);
    g.fillStyle = '#a2573a'; g.beginPath(); g.moveTo(w * 0.12, h * 0.55); g.lineTo(w * 0.4, h * 0.3); g.lineTo(w * 0.68, h * 0.55); g.fill();
    grain(g, w, h, 0.05, 2);
  });
  const frame = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.78, 0.04, 2, 0.01), new THREE.MeshStandardMaterial({ color: '#2b2219', roughness: 0.5 }));
  frame.position.set(-0.35, 1.72, zBack + 0.03); group.add(frame);
  const art = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.7), new THREE.MeshStandardMaterial({ map: artTex, roughness: 0.8 })); art.position.set(-0.35, 1.72, zBack + 0.052); group.add(art);
  const frame2 = frame.clone(); frame2.scale.set(0.7, 0.55, 1); frame2.position.set(0.45, 1.85, zBack + 0.03); group.add(frame2);
  const art2 = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.38), new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#d9cbb3'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2b2219'; g.lineWidth = 6; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(w / 2, h / 2, 20 + i * 20, 0.3 * i, 0.3 * i + 4); g.stroke(); } }), roughness: 0.8 }));
  art2.position.set(0.45, 1.85, zBack + 0.052); group.add(art2);

  // ---- lights ----
  const hemi = new THREE.HemisphereLight('#fff3e0', '#6b4a33', 0.32); scene.add(hemi);
  const lampLight = new THREE.PointLight('#ffb46a', 3.2, 7, 1.6); lampLight.position.set(-1.55, 1.62, -1.45); lampLight.castShadow = false; lampLight.shadow.mapSize.set(1024, 1024); lampLight.shadow.bias = -0.002; lampLight.shadow.radius = 6; scene.add(lampLight);
  const sun = new THREE.DirectionalLight('#cfe6ff', 1.1); sun.position.set(5, 3.2, -0.2); sun.target.position.set(0, 1, -1); scene.add(sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -2.5; sun.shadow.camera.right = 2.5; sun.shadow.camera.top = 2.5; sun.shadow.camera.bottom = -1.5; sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 12; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4;
  scene.add(sun);
  const key = new THREE.SpotLight('#ffe0bd', 7, 9, 0.55, 0.75, 1.4); key.position.set(1.3, 2.2, 1.9); key.target.position.set(0, 1.1, -1.3); scene.add(key.target); key.castShadow = true; key.shadow.mapSize.set(1536, 1536); key.shadow.bias = -0.0008; key.shadow.normalBias = 0.01; key.shadow.radius = 5; scene.add(key);
  const ceilFill = new THREE.PointLight('#fff1dd', 0.9, 4, 1.8); ceilFill.position.set(0.1, 1.6, -0.6); scene.add(ceilFill);

  return { group, H, lampLight, sun, key, hemi, ceilFill, sofa };
}
