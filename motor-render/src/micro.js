import * as THREE from 'three';
import { canvasTex, noiseFill, grain, rng, clamp, lerp, smooth, smoother, makeLabel } from './lib.js';

// micro world: 1 unit = 1 micrometer. Lamella ridges along z, setae grow +y, curving toward +x.
function setaGeometry(L = 100, bend = 18, r0 = 2.3, r1 = 0.9, segs = 18, radial = 8) {
  const pos = [], nor = [], idx = [];
  const P = (t) => new THREE.Vector3(bend * t * t, L * t, 0);
  const D = (t) => new THREE.Vector3(2 * bend * t, L, 0).normalize();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, c = P(t), d = D(t);
    const n1 = new THREE.Vector3(0, 0, 1), n2 = new THREE.Vector3().crossVectors(d, n1).normalize();
    const r = lerp(r0, r1, Math.pow(t, 0.8));
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2; const n = n1.clone().multiplyScalar(Math.cos(a)).add(n2.clone().multiplyScalar(Math.sin(a)));
      pos.push(c.x + n.x * r, c.y + n.y * r, c.z + n.z * r); nor.push(n.x, n.y, n.z);
      if (i < segs && j < radial) { const k = i * (radial + 1) + j; idx.push(k, k + radial + 1, k + 1, k + 1, k + radial + 1, k + radial + 2); }
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
  return { geo: g, tip: P(1), tipDir: D(1) };
}

export function softSprite() {
  return canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
}

export function buildMicro(renderer, env, W, H) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0b1d24');
  scene.fog = new THREE.FogExp2('#0e2a33', 0.0019);
  scene.environment = env; scene.environmentIntensity = 0.08;
  const cam = new THREE.PerspectiveCamera(42, W / H, 0.5, 4000); scene.add(cam);

  // lights
  scene.add(new THREE.HemisphereLight('#bfe8ff', '#20343a', 0.22));
  const rim = new THREE.DirectionalLight('#ffd89a', 2.2); rim.position.set(-200, 300, -400); scene.add(rim);
  const key = new THREE.DirectionalLight('#e8f6ff', 0.55); key.position.set(300, 400, 300); scene.add(key);
  const glowL = new THREE.PointLight('#7fe0ff', 0, 600, 1.2); scene.add(glowL);

  // lamellae
  const skinTex = canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = '#8fa38a'; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 0, 0.18, 40, 3); noiseFill(g, w, h, 0, 0.1, 8, 4); grain(g, w, h, 0.05, 5); }, { repeat: [4, 4] });
  const skinMat = new THREE.MeshPhysicalMaterial({ map: skinTex, bumpMap: skinTex, bumpScale: 4, roughness: 0.6, sheen: 0.6, sheenColor: new THREE.Color('#d8ffe0') });
  const LAM_R = 260, LAM_SP = 360, NLAM = 3;
  const lamGeo = new THREE.CylinderGeometry(LAM_R, LAM_R, 2400, 96, 1); lamGeo.rotateX(Math.PI / 2);
  const lamCenters = [];
  for (let i = 0; i < NLAM; i++) { const cx = (i - 1) * LAM_SP; lamCenters.push(cx); const m = new THREE.Mesh(lamGeo, skinMat); m.position.set(cx, -LAM_R, 0); scene.add(m); }
  const backGlow = new THREE.Mesh(new THREE.PlaneGeometry(6000, 3000), new THREE.MeshBasicMaterial({ color: '#0e2a33', fog: false })); backGlow.position.set(0, 0, -1600); scene.add(backGlow);

  // setae
  const S = setaGeometry(100, 18, 2.3, 0.9, 10, 6);
  const setaMat = new THREE.MeshPhysicalMaterial({ color: '#b89a64', roughness: 0.4, sheen: 0.8, sheenColor: new THREE.Color('#ffe6a8'), sheenRoughness: 0.4, emissive: new THREE.Color('#1a1206'), emissiveIntensity: 0.4, clearcoat: 0.3 });
  const r = rng(42);
  const setaMats = [], tips = [];
  const SP = 11.5;
  for (const cx of lamCenters) {
    for (let x = cx - 175; x <= cx + 175; x += SP) for (let z = -300; z <= 300; z += SP) {
      const jx = x + (r() - 0.5) * SP * 0.7, jz = z + (r() - 0.5) * SP * 0.7;
      const dx = jx - cx; if (Math.abs(dx) > LAM_R * 0.72) continue;
      const by = Math.sqrt(LAM_R * LAM_R - dx * dx) - LAM_R;
      const n = new THREE.Vector3(dx / LAM_R, (by + LAM_R) / LAM_R, 0).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (r() - 0.5) * 0.5));
      q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.12 + (r() - 0.5) * 0.12));
      const s = 0.88 + r() * 0.22;
      const m = new THREE.Matrix4().compose(new THREE.Vector3(jx, by, jz), q, new THREE.Vector3(s, s, s));
      setaMats.push(m);
      const tip = S.tip.clone().applyMatrix4(m); const tdir = S.tipDir.clone().applyQuaternion(q);
      tips.push({ p: tip, d: tdir, q, s });
    }
  }
  const setae = new THREE.InstancedMesh(S.geo, setaMat, setaMats.length);
  setaMats.forEach((m, i) => setae.setMatrixAt(i, m)); scene.add(setae);

  // branches + spatulae at tips
  const NB = 7;
  const brGeo = new THREE.CylinderGeometry(0.16, 0.42, 1, 5, 1); brGeo.translate(0, 0.5, 0);
  const spShape = new THREE.Shape(); spShape.moveTo(0, 0); spShape.lineTo(0.9, 0.55); spShape.quadraticCurveTo(0.0, 1.35, -0.9, 0.55); spShape.lineTo(0, 0);
  const spGeo = new THREE.ShapeGeometry(spShape, 3); spGeo.rotateX(-Math.PI / 2);
  const brMat = new THREE.MeshPhysicalMaterial({ color: '#c9ad78', roughness: 0.4, sheen: 0.8, sheenColor: new THREE.Color('#fff0c8'), emissive: new THREE.Color('#1a1206'), emissiveIntensity: 0.4 });
  const spMat = new THREE.MeshPhysicalMaterial({ color: '#e0c890', roughness: 0.3, side: THREE.DoubleSide, emissive: new THREE.Color('#2a1e08'), emissiveIntensity: 0.5 });
  const branches = new THREE.InstancedMesh(brGeo, brMat, tips.length * NB);
  const spatulae = new THREE.InstancedMesh(spGeo, spMat, tips.length * NB);
  const spPositions = [];
  let k = 0;
  for (const t of tips) {
    for (let b = 0; b < NB; b++) {
      const a = (b / NB) * Math.PI * 2 + r() * 0.4; const spread = 0.35 + r() * 0.45;
      const dir = t.d.clone().add(new THREE.Vector3(Math.cos(a) * spread, 0, Math.sin(a) * spread)).normalize();
      const len = (6 + r() * 4) * t.s;
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      branches.setMatrixAt(k, new THREE.Matrix4().compose(t.p, q, new THREE.Vector3(1, len, 1)));
      const end = t.p.clone().add(dir.clone().multiplyScalar(len));
      const sq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a + Math.PI / 2);
      spatulae.setMatrixAt(k, new THREE.Matrix4().compose(end, sq, new THREE.Vector3(1.1, 1, 1.1)));
      spPositions.push(end);
      k++;
    }
  }
  scene.add(branches); scene.add(spatulae);

  // floating particles
  const pg = new THREE.BufferGeometry(); const pp = [];
  for (let i = 0; i < 1800; i++) pp.push((r() - 0.5) * 1600, r() * 380 - 40, (r() - 0.5) * 1200);
  pg.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
  const particles = new THREE.Points(pg, new THREE.PointsMaterial({ size: 3.2, map: softSprite(), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, color: '#bfefff' }));
  scene.add(particles);

  // glass (contact mode) + contact glows
  const glassMat = new THREE.MeshPhysicalMaterial({ color: '#7fc8e8', roughness: 0.1, metalness: 0, transparent: true, opacity: 0.32, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
  const glass = new THREE.Mesh(new THREE.BoxGeometry(3000, 6, 2400), glassMat); glass.visible = false; scene.add(glass);
  const glowGeo = new THREE.PlaneGeometry(1, 1);
  const glowMat = new THREE.MeshBasicMaterial({ map: softSprite(), color: '#8ff0ff', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const glows = new THREE.InstancedMesh(glowGeo, glowMat, spPositions.length); glows.visible = false; scene.add(glows);
  const tipTop = tips.reduce((m, t) => Math.max(m, t.p.y), -1e9);

  // labels
  const labSetas = makeLabel('Setas', 14, { size: 72 }); scene.add(labSetas);
  const labScale = makeLabel('≈ 0,1 mm', 10, { size: 60, border: 'rgba(160,230,255,0.9)' }); scene.add(labScale);
  const labEsp = makeLabel('Espátulas', 4.2, { size: 72 }); scene.add(labEsp);

  // pick a hero seta near the center of the middle lamella
  let hero = tips[0], best = 1e9;
  for (const t of tips) { const d = Math.hypot(t.p.x - 20, t.p.z - 60); if (d < best) { best = d; hero = t; } }

  function placeLabel(lab, p, op) { lab.position.copy(p); lab.quaternion.copy(cam.quaternion); lab.material.opacity = op; lab.visible = op > 0.01; }

  function render(T, post, G) {
    post.set(scene, cam);
    glass.visible = false; glows.visible = false; glowL.intensity = 0;
    post.bloom.strength = 0.35; post.bloom.threshold = 0.88; post.bloom.radius = 0.5;
    G.uWarm.value = 0.6;
    const hp = hero.p;
    let pos, look, fov = 42; let labelsTodo = [];
    if (T < 36.0) {
      // 22.1 - 29.2 fly over the setae forest and dive to a tip
      const a = smoother(22.1, 24.6, T), b = smoother(24.4, 27.0, T), c = smoother(26.8, 29.2, T);
      const p0 = new THREE.Vector3(-260, 330, 420), l0 = new THREE.Vector3(60, 20, -60);
      const p1 = new THREE.Vector3(-90, 150, 230), l1 = hp.clone().add(new THREE.Vector3(10, -20, -40));
      const p2 = hp.clone().add(new THREE.Vector3(-34, 22, 48)), l2 = hp.clone().add(new THREE.Vector3(0, 0, 0));
      const p3 = hp.clone().add(new THREE.Vector3(-9, 9, 14)), l3 = hp.clone().add(new THREE.Vector3(1.5, 4, 0));
      pos = p0.clone().lerp(p1, a).lerp(p2, b).lerp(p3, c);
      look = l0.clone().lerp(l1, a).lerp(l2, b).lerp(l3, c);
      fov = lerp(42, 34, c);
      G.uFlash.value = (1 - smooth(22.1, 22.6, T)) * 0.85; G.uZoom.value = 1 - smooth(22.1, 22.9, T);
      G.uZoom.value = Math.max(G.uZoom.value, smooth(28.6, 29.2, T)); G.uFlash.value = Math.max(G.uFlash.value, smooth(28.9, 29.2, T) * 0.8);
      labelsTodo = [[labSetas, hp.clone().add(new THREE.Vector3(-30, 8, 10)), smooth(24.2, 24.6, T) * (1 - smooth(26.6, 27.0, T))],
        [labScale, hp.clone().add(new THREE.Vector3(-30, -30, 10)), smooth(25.2, 25.6, T) * (1 - smooth(26.6, 27.0, T))],
        [labEsp, hp.clone().add(new THREE.Vector3(-6, 11, 4)), smooth(27.2, 27.6, T) * (1 - smooth(28.7, 29.0, T))]];
      if (T > 27.5 && T < 28.9) { post.bokeh.enabled = true; const u = post.bokeh.uniforms; u.focus.value = pos.distanceTo(look); u.aperture.value = 0.0025; u.maxblur.value = 0.012; u.aspect.value = cam.aspect; u.nearClip.value = cam.near; u.farClip.value = cam.far; }
    } else {
      // 36.6 - 41.6 contact mode: glass on top of all spatulae, pull back to reveal the whole array
      labSetas.visible = labScale.visible = labEsp.visible = false;
      glass.visible = true; glows.visible = true;
      glass.position.set(0, tipTop + 3 + 3, 0);
      // place glows at each spatula touching glass
      const m = new THREE.Matrix4(); const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
      let i = 0; const rr = rng(9);
      for (const p of spPositions) {
        const fl = 0.6 + 0.4 * Math.sin(T * 7 + i * 1.7);
        const s = 9 * fl;
        m.compose(new THREE.Vector3(p.x, p.y + 0.6, p.z), q, new THREE.Vector3(s, s, s)); glows.setMatrixAt(i++, m);
      }
      glows.instanceMatrix.needsUpdate = true;
      // the whole forest is lifted so tips meet the glass
      const u = smoother(36.6, 41.4, T);
      const p0 = hp.clone().add(new THREE.Vector3(-14, -6, 22)), l0 = hp.clone().add(new THREE.Vector3(2, 4, 0));
      const p1 = new THREE.Vector3(-360, tipTop - 70, 520), l1 = new THREE.Vector3(60, tipTop + 10, -160);
      pos = p0.clone().lerp(p1, u); look = l0.clone().lerp(l1, smoother(36.6, 40.5, T)); fov = lerp(36, 44, u);
      glowL.position.set(pos.x * 0.3, tipTop + 40, pos.z * 0.3); glowL.intensity = 120;
      post.bloom.strength = 0.6; post.bloom.threshold = 0.8;
      G.uFlash.value = (1 - smooth(36.6, 37.0, T)) * 0.8; G.uZoom.value = 1 - smooth(36.6, 37.3, T);
      G.uZoom.value = Math.max(G.uZoom.value, smooth(41.0, 41.6, T)); G.uFlash.value = Math.max(G.uFlash.value, smooth(41.1, 41.6, T));
    }
    // particles drift
    particles.position.set(Math.sin(T * 0.3) * 20, Math.sin(T * 0.21) * 10, T * 4 % 50);
    cam.position.copy(pos); cam.fov = fov; cam.updateProjectionMatrix(); cam.lookAt(look); cam.updateMatrixWorld(true);
    labSetas.visible = labScale.visible = labEsp.visible = false;
  }
  return { render, scene, cam };
}
