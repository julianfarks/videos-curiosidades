import * as THREE from 'three';
import { canvasTex, rng, clamp, lerp, smooth, smoother, makeLabel } from './lib.js';
import { softSprite } from './micro.js';

export function buildMolecular(renderer, env, W, H) {
  const r = rng(123);
  // ======== M1: spatulae approaching glass (units ~10 nm) ========
  const s1 = new THREE.Scene();
  s1.background = new THREE.Color('#0a1a22'); s1.fog = new THREE.Fog('#0d2430', 300, 1300);
  s1.environment = env; s1.environmentIntensity = 0.12;
  const cam1 = new THREE.PerspectiveCamera(40, W / H, 0.5, 5000); s1.add(cam1);
  s1.add(new THREE.HemisphereLight('#cfeeff', '#1a2a30', 0.3));
  const k1 = new THREE.DirectionalLight('#ffe2b0', 1.8); k1.position.set(-300, 500, 200); s1.add(k1);
  const k2 = new THREE.DirectionalLight('#9fdcff', 0.8); k2.position.set(300, 100, -300); s1.add(k2);
  const glassTex = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#9fc9da'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(255,255,255,${0.05 + r() * 0.12})`; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 2, 0, 7); g.fill(); }
  }, { repeat: [6, 6] });
  const glassTop = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshStandardMaterial({ map: glassTex, color: '#24505e', roughness: 0.55, metalness: 0.0 }));
  glassTop.rotation.x = -Math.PI / 2; s1.add(glassTop);
  const glassBody = new THREE.Mesh(new THREE.BoxGeometry(4000, 400, 4000), new THREE.MeshStandardMaterial({ color: '#1d4a5c', roughness: 0.2, transparent: true, opacity: 0.6 }));
  glassBody.position.y = -201; s1.add(glassBody);
  const kerMat = new THREE.MeshPhysicalMaterial({ color: '#b89a64', roughness: 0.4, sheen: 0.8, sheenColor: new THREE.Color('#ffe6a8'), emissive: new THREE.Color('#1a1206'), emissiveIntensity: 0.4, clearcoat: 0.3 });
  const spatMat = new THREE.MeshPhysicalMaterial({ color: '#e0c890', roughness: 0.3, side: THREE.DoubleSide, emissive: new THREE.Color('#2a1e08'), emissiveIntensity: 0.5 });
  const tuft = new THREE.Group(); s1.add(tuft);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(55, 70, 900, 32), kerMat); shaft.position.y = 640; tuft.add(shaft);
  const spats = [];
  const NB = 34;
  for (let i = 0; i < NB; i++) {
    const a = (i / NB) * Math.PI * 2 * 3.1 + r() * 0.3; const rr = 30 + (i / NB) * 260;
    const end = new THREE.Vector3(Math.cos(a) * rr, 0, Math.sin(a) * rr);
    const start = new THREE.Vector3(Math.cos(a) * 25, 200, Math.sin(a) * 25);
    const mid = new THREE.Vector3(Math.cos(a) * rr * 0.6, 110 + r() * 30, Math.sin(a) * rr * 0.6);
    const curve = new THREE.CatmullRomCurve3([start, mid, end.clone().add(new THREE.Vector3(0, 14, 0))]);
    const br = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 4.5, 8, false), kerMat); tuft.add(br);
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(20, 22, 2.5, 3, 1), spatMat); sp.scale.set(1.2, 1, 0.9); sp.rotation.y = a; sp.position.copy(end).add(new THREE.Vector3(0, 12, 0)); tuft.add(sp);
    spats.push(sp);
  }
  // fake reflection
  const refl = tuft.clone(); refl.scale.y = -1; refl.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.18; o.material.depthWrite = false; } }); s1.add(refl);
  const contactGlowMat = new THREE.MeshBasicMaterial({ map: softSprite(), color: '#8ff0ff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const contactGlows = spats.map(sp => { const m = new THREE.Mesh(new THREE.PlaneGeometry(55, 55), contactGlowMat.clone()); m.rotation.x = -Math.PI / 2; m.position.set(sp.position.x, 1, sp.position.z); s1.add(m); return m; });
  const dust = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 2400 }, (_, i) => i % 3 === 1 ? r() * 600 : (r() - 0.5) * 1800), 3)), new THREE.PointsMaterial({ size: 3, map: softSprite(), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, color: '#bfefff' }));
  s1.add(dust);

  // ======== M2: atoms (units = 1 angstrom) ========
  const s2 = new THREE.Scene();
  s2.background = new THREE.Color('#071420'); s2.fog = new THREE.Fog('#071420', 40, 110);
  s2.environment = env; s2.environmentIntensity = 0.15;
  const cam2 = new THREE.PerspectiveCamera(38, W / H, 0.1, 400); s2.add(cam2);
  s2.add(new THREE.HemisphereLight('#d8f2ff', '#102030', 0.35));
  const d1 = new THREE.DirectionalLight('#fff0d8', 1.6); d1.position.set(-10, 20, 15); s2.add(d1);
  const d2 = new THREE.DirectionalLight('#7fd8ff', 0.7); d2.position.set(15, -5, -10); s2.add(d2);
  const sphG = new THREE.SphereGeometry(1, 28, 18);
  const NX = 16, NZ = 9, SPX = 2.9;
  // glass atoms (amorphous silica-like): 3 layers
  const gAt = [];
  for (let l = 0; l < 3; l++) for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
    const big = (i + j + l) % 2 === 0;
    gAt.push({ p: new THREE.Vector3((i - NX / 2) * SPX + (r() - 0.5) * 0.9, -1.4 - l * 2.6 + (r() - 0.5) * 0.5, (j - NZ / 2) * SPX + (r() - 0.5) * 0.9), rad: big ? 1.25 : 0.85, big, ph: r() * 6.28, top: l === 0 });
  }
  const kAt = [];
  for (let l = 0; l < 2; l++) for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
    kAt.push({ p: new THREE.Vector3((i - NX / 2) * SPX + 1.2 * Math.sin(j * 0.9) + (r() - 0.5) * 0.4, 3.2 + l * 2.5 + 0.35 * Math.sin(i * 1.3 + j), (j - NZ / 2) * SPX + (r() - 0.5) * 0.4), rad: 1.05 + r() * 0.15, ph: r() * 6.28, bottom: l === 0 });
  }
  const gMatA = new THREE.MeshPhysicalMaterial({ color: '#5aa9d6', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });
  const gMatB = new THREE.MeshPhysicalMaterial({ color: '#b9d9ea', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });
  const kMat = new THREE.MeshPhysicalMaterial({ color: '#d79a4a', roughness: 0.3, clearcoat: 0.8, sheen: 0.6, sheenColor: new THREE.Color('#fff0c8') });
  const gBig = gAt.filter(a => a.big), gSmall = gAt.filter(a => !a.big);
  const mkInst = (list, mat) => { const im = new THREE.InstancedMesh(sphG, mat, list.length); list.forEach((a, i) => im.setMatrixAt(i, new THREE.Matrix4().compose(a.p, new THREE.Quaternion(), new THREE.Vector3(a.rad, a.rad, a.rad)))); s2.add(im); return im; };
  const kGroup = new THREE.Group(); s2.add(kGroup);
  mkInst(gBig, gMatB); mkInst(gSmall, gMatA);
  const kIm = new THREE.InstancedMesh(sphG, kMat, kAt.length); kGroup.add(kIm);
  kAt.forEach((a, i) => kIm.setMatrixAt(i, new THREE.Matrix4().compose(a.p, new THREE.Quaternion(), new THREE.Vector3(a.rad, a.rad, a.rad))));
  // bonds within the keratin layer (chains along x)
  const bondG = new THREE.CylinderGeometry(0.22, 0.22, 1, 8); const bondMat = new THREE.MeshStandardMaterial({ color: '#d9a35a', roughness: 0.5 });
  const bonds = []; for (let n = 0; n < kAt.length; n++) { const a = kAt[n]; const b = kAt[n + NZ]; if (b && Math.floor(n / (NX * NZ)) === Math.floor((n + NZ) / (NX * NZ))) bonds.push([a.p, b.p]); }
  const bondIm = new THREE.InstancedMesh(bondG, bondMat, bonds.length); kGroup.add(bondIm);
  bonds.forEach(([a, b], i) => { const d = new THREE.Vector3().subVectors(b, a); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()); bondIm.setMatrixAt(i, new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, d.length(), 1))); });
  // electron clouds
  const cloudMat = new THREE.MeshBasicMaterial({ color: '#59c8ff', transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const cloudMatK = new THREE.MeshBasicMaterial({ color: '#ffb35a', transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const gTop = gAt.filter(a => a.top), kBot = kAt.filter(a => a.bottom);
  const gCloud = new THREE.InstancedMesh(sphG, cloudMat, gTop.length); s2.add(gCloud);
  const kCloud = new THREE.InstancedMesh(sphG, cloudMatK, kBot.length); kGroup.add(kCloud);
  // links between facing pairs
  const pairs = [];
  for (const a of kBot) { let best = null, bd = 1e9; for (const g of gTop) { const d = Math.hypot(a.p.x - g.p.x, a.p.z - g.p.z); if (d < bd) { bd = d; best = g; } } pairs.push([a, best]); }
  const linkMat = new THREE.MeshBasicMaterial({ color: '#9ff6ff', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const linkIm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.12, 1, 6), linkMat, pairs.length); s2.add(linkIm);
  const pulseIm = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: softSprite(), color: '#e8ffff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), pairs.length * 2); s2.add(pulseIm);
  const labVdW = makeLabel('Fuerzas de Van der Waals', 2.6, { size: 72 }); s2.add(labVdW);
  const labDm = makeLabel('δ−', 1.5, { size: 64, border: 'rgba(120,210,255,0.9)' }); s2.add(labDm);
  const labDp = makeLabel('δ+', 1.5, { size: 64, border: 'rgba(255,190,110,0.9)' }); s2.add(labDp);
  const dust2 = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 900 }, () => (r() - 0.5) * 70), 3)), new THREE.PointsMaterial({ size: 0.25, map: softSprite(), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, color: '#bfefff' }));
  s2.add(dust2);

  const m4 = new THREE.Matrix4(), qI = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);

  function render(T, post, G) {
    post.bloom.strength = 0.45; post.bloom.threshold = 0.82; post.bloom.radius = 0.5; G.uWarm.value = 0.5;
    if (T < 32.3) {
      post.set(s1, cam1);
      const u = smoother(29.2, 31.4, T);
      tuft.position.y = lerp(150, 0, u); refl.position.y = -tuft.position.y;
      const contact = smooth(31.0, 31.6, T);
      contactGlows.forEach((g, i) => { g.material.opacity = contact * (0.55 + 0.45 * Math.sin(T * 9 + i)); });
      const p = new THREE.Vector3(lerp(-520, -300, smoother(29.2, 32.3, T)), lerp(70, 34, smoother(29.2, 32.3, T)), lerp(620, 300, smoother(29.2, 32.3, T)));
      const l = new THREE.Vector3(lerp(0, 60, u), lerp(110, 14, u), lerp(0, 40, u));
      cam1.position.copy(p); cam1.lookAt(l); cam1.fov = 40; cam1.updateProjectionMatrix();
      G.uFlash.value = (1 - smooth(29.2, 29.6, T)) * 0.8; G.uZoom.value = 1 - smooth(29.2, 29.9, T);
      G.uZoom.value = Math.max(G.uZoom.value, smooth(31.7, 32.3, T)); G.uFlash.value = Math.max(G.uFlash.value, smooth(32.0, 32.3, T) * 0.85);
      dust.position.y = Math.sin(T * 0.4) * 10;
      labVdW.visible = false;
    } else {
      post.set(s2, cam2);
      const k = T - 32.3;
      const approach = smoother(32.3, 33.6, T);
      kGroup.position.y = lerp(4.0, 0, approach);
      const couple = smooth(33.0, 34.2, T);
      // clouds: fluctuating dipoles; coupled -> correlated (both shift up => attraction)
      gTop.forEach((a, i) => {
        const free = Math.sin(T * 7 + a.ph) * 0.35; const off = lerp(free, 0.42 + 0.12 * Math.sin(T * 7), couple);
        m4.compose(new THREE.Vector3(a.p.x, a.p.y + off, a.p.z), qI, new THREE.Vector3(a.rad * 1.55, a.rad * 1.55 * (1 + couple * 0.1), a.rad * 1.55)); gCloud.setMatrixAt(i, m4);
      });
      kBot.forEach((a, i) => {
        const free = Math.sin(T * 6.3 + a.ph) * 0.35; const off = lerp(free, 0.42 + 0.12 * Math.sin(T * 7), couple);
        m4.compose(new THREE.Vector3(a.p.x, a.p.y + off, a.p.z), qI, new THREE.Vector3(a.rad * 1.6, a.rad * 1.6, a.rad * 1.6)); kCloud.setMatrixAt(i, m4);
      });
      gCloud.instanceMatrix.needsUpdate = true; kCloud.instanceMatrix.needsUpdate = true;
      cloudMat.opacity = 0.06 + couple * 0.05; cloudMatK.opacity = 0.05 + couple * 0.05;
      pairs.forEach(([a, g], i) => {
        const pa = a.p.clone().add(new THREE.Vector3(0, kGroup.position.y - a.rad * 0.9, 0)); const pg = g.p.clone().add(new THREE.Vector3(0, g.rad * 0.9, 0));
        const d = new THREE.Vector3().subVectors(pa, pg); const len = d.length();
        const vis = couple * (0.55 + 0.45 * Math.sin(T * 5 + i * 0.7));
        m4.compose(pg.clone().add(pa).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(up, d.normalize()), new THREE.Vector3(vis, len, vis)); linkIm.setMatrixAt(i, m4);
        for (let s = 0; s < 2; s++) {
          const f = ((T * 0.9 + i * 0.137 + s * 0.5) % 1); const pp = s ? pa.clone().lerp(pg, f * 0.5) : pg.clone().lerp(pa, f * 0.5);
          const sc = couple * 0.9 * Math.sin(Math.PI * f);
          m4.compose(pp, cam2.quaternion, new THREE.Vector3(sc, sc, sc)); pulseIm.setMatrixAt(i * 2 + s, m4);
        }
      });
      linkIm.instanceMatrix.needsUpdate = true; pulseIm.instanceMatrix.needsUpdate = true;
      linkMat.opacity = 0.45;
      // camera: slow dolly + orbit around the interface
      const ang = lerp(-0.55, 0.15, smoother(32.3, 36.6, T));
      const dist = lerp(44, 30, smoother(32.3, 36.0, T));
      cam2.position.set(Math.sin(ang) * dist, lerp(9, 4, smoother(32.3, 36.0, T)), Math.cos(ang) * dist);
      cam2.lookAt(0, 0.9, 0); cam2.fov = 38; cam2.updateProjectionMatrix(); cam2.updateMatrixWorld(true);
      const lv = smooth(33.3, 33.7, T);
      labVdW.visible = false;
      const ld = smooth(34.0, 34.4, T) * (1 - smooth(36.0, 36.4, T));
      const pr = pairs[Math.floor(pairs.length / 2) + 4];
      labDm.position.copy(pr[1].p).add(new THREE.Vector3(-2.2, 0.6, 1.5)); labDp.position.copy(pr[0].p).add(new THREE.Vector3(-2.2, -0.4, 1.5));
      for (const L of [labDm, labDp]) { L.quaternion.copy(cam2.quaternion); L.material.opacity = ld; L.visible = ld > 0.01; L.scale.setScalar(0.8); }
      dust2.rotation.y = T * 0.05;
      G.uFlash.value = (1 - smooth(32.3, 32.7, T)) * 0.85; G.uZoom.value = 1 - smooth(32.3, 33.0, T);
      G.uZoom.value = Math.max(G.uZoom.value, smooth(36.0, 36.6, T)); G.uFlash.value = Math.max(G.uFlash.value, smooth(36.3, 36.6, T) * 0.8);
      post.bokeh.enabled = true; const ub = post.bokeh.uniforms; ub.focus.value = dist; ub.aperture.value = 0.006; ub.maxblur.value = 0.01; ub.aspect.value = cam2.aspect; ub.nearClip.value = cam2.near; ub.farClip.value = cam2.far;
    }
  }
  return { render };
}
