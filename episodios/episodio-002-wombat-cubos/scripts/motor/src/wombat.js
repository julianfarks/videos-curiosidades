import * as THREE from 'three';
import { canvasTex, rng, clamp, lerp } from './lib.js';

// Bare-nosed wombat (Vombatus ursinus), stylized. Faces +z, root at ground under body centre.
// Proportions: stocky barrel body, broad flat head, small rounded ears, broad bare dark nose, short strong legs.

let FUR = null;
function furTextures() {
  if (FUR) return FUR;
  const r = rng(11);
  const map = canvasTex(512, 512, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#8a745c'); grd.addColorStop(0.5, '#7a6550'); grd.addColorStop(1, '#6a5745');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const x = r() * w, y = r() * h, L = 4 + r() * 9, a = Math.PI / 2 + (r() - 0.5) * 0.5;
      const c = r(); g.strokeStyle = c < 0.33 ? 'rgba(60,45,34,0.45)' : c < 0.66 ? 'rgba(160,138,112,0.35)' : 'rgba(110,92,74,0.4)';
      g.lineWidth = 0.8 + r() * 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke();
    }
  }, { repeat: [3, 3] });
  const bump = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 12000; i++) {
      const x = r() * w, y = r() * h, L = 3 + r() * 8, a = Math.PI / 2 + (r() - 0.5) * 0.5;
      const v = Math.floor(90 + r() * 120); g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = 0.9;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke();
    }
  }, { srgb: false, repeat: [3, 3] });
  const nose = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) { const v = Math.floor(70 + r() * 150); g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 2.2, 0, 7); g.fill(); }
  }, { srgb: false });
  FUR = { map, bump, nose };
  return FUR;
}

function ghostMat(color = '#8FF0FF', power = 2.2, inten = 1.0) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uPow: { value: power }, uInt: { value: inten }, uOp: { value: 1 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uPow,uInt,uOp; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0-abs(dot(normalize(vN),normalize(vV))), uPow); gl_FragColor = vec4(uColor*(0.05+f*1.4)*uInt, (0.04+f*0.9)*uOp); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
}
export { ghostMat };

export function buildWombat({ ghost = false } = {}) {
  const T = furTextures();
  const root = new THREE.Group(); root.name = 'wombat';
  const mats = [];
  const M = (m) => { mats.push(m); return m; };
  const gm = ghost ? ghostMat() : null;
  const fur = ghost ? gm : M(new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: T.map, bumpMap: T.bump, bumpScale: 0.6, roughness: 0.88, sheen: 1.0, sheenRoughness: 0.45, sheenColor: new THREE.Color('#c8b49c') }));
  const furDark = ghost ? gm : M(new THREE.MeshPhysicalMaterial({ color: '#b9a895', map: T.map, bumpMap: T.bump, bumpScale: 1.2, roughness: 0.9, sheen: 0.8, sheenRoughness: 0.5, sheenColor: new THREE.Color('#a8947e') }));
  const noseM = ghost ? gm : M(new THREE.MeshPhysicalMaterial({ color: '#2b2422', bumpMap: T.nose, bumpScale: 2.0, roughness: 0.45, clearcoat: 0.4, clearcoatRoughness: 0.4 }));
  const darkM = ghost ? gm : M(new THREE.MeshStandardMaterial({ color: '#171211', roughness: 0.6 }));
  const clawM = ghost ? gm : M(new THREE.MeshStandardMaterial({ color: '#d9cdb5', roughness: 0.5 }));
  const earIn = ghost ? gm : M(new THREE.MeshStandardMaterial({ color: '#5a4438', roughness: 0.8 }));
  const irisM = ghost ? gm : M(new THREE.MeshPhysicalMaterial({ color: '#3a2416', roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 }));
  const pupilM = ghost ? gm : M(new THREE.MeshPhysicalMaterial({ color: '#050404', roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.02 }));
  const hiM = ghost ? gm : new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  const add = (parent, geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = !ghost; m.receiveShadow = false; parent.add(m); return m; };

  // ---- body: barrel
  const bodyG = new THREE.SphereGeometry(1, 72, 48);
  { const p = bodyG.attributes.position; const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const zr = v.z; // -1 rear .. 1 front
      let x = v.x * 0.215, y = v.y * 0.175, z = v.z * 0.37;
      if (v.y < 0) y *= 0.8;                       // flatter belly
      const rear = clamp(-zr); x *= 1 + 0.10 * rear; // broad rump
      y *= 1 + 0.06 * rear * (v.y > 0 ? 1 : 0);
      if (zr > 0.55) { const k = (zr - 0.55) / 0.45; x *= 1 - 0.18 * k; y *= 1 - 0.1 * k; } // neck taper
      p.setXYZ(i, x, y, z);
    } bodyG.computeVertexNormals(); }
  const bodyPivot = new THREE.Group(); bodyPivot.position.set(0, 0.215, 0); root.add(bodyPivot);
  const body = add(bodyPivot, bodyG, fur, 0, 0, 0);
  // tiny tail stub
  const tail = add(bodyPivot, new THREE.SphereGeometry(0.022, 16, 12), fur, 0, 0.0, -0.36, 1, 0.8, 0.7);

  // ---- head
  const neck = new THREE.Group(); neck.position.set(0, 0.04, 0.27); bodyPivot.add(neck);
  const head = new THREE.Group(); head.position.set(0, 0.005, 0.07); neck.add(head);
  const headG = new THREE.SphereGeometry(1, 64, 44);
  { const p = headG.attributes.position; const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); let x = v.x * 0.14, y = v.y * 0.095, z = v.z * 0.125; if (v.y > 0.1) y *= 0.85; if (v.y < -0.3) x *= 1.04; x *= 1 + 0.12 * clamp(-v.z) * (v.y > -0.2 ? 1 : 0); p.setXYZ(i, x, y, z); }
    headG.computeVertexNormals(); }
  add(head, headG, fur, 0, 0, 0);
  // cheeks
  add(head, new THREE.SphereGeometry(1, 32, 24), fur, 0.075, -0.04, 0.03, 0.06, 0.055, 0.07);
  add(head, new THREE.SphereGeometry(1, 32, 24), fur, -0.075, -0.04, 0.03, 0.06, 0.055, 0.07);
  // muzzle
  add(head, new THREE.SphereGeometry(1, 40, 30), furDark, 0, -0.03, 0.095, 0.085, 0.06, 0.06);
  // bare broad nose
  const nose = add(head, new THREE.SphereGeometry(1, 40, 30), noseM, 0, -0.016, 0.142, 0.052, 0.032, 0.028);
  add(head, new THREE.SphereGeometry(0.011, 12, 10), darkM, 0.021, -0.025, 0.163, 0.85, 0.6, 0.55);
  add(head, new THREE.SphereGeometry(0.011, 12, 10), darkM, -0.021, -0.025, 0.163, 0.85, 0.6, 0.55);
  // mouth line
  const mouth = add(head, new THREE.TorusGeometry(0.03, 0.0035, 6, 24, Math.PI), darkM, 0, -0.068, 0.128);
  mouth.rotation.z = Math.PI; mouth.rotation.x = -0.35; mouth.scale.set(1, 0.45, 1);
  // ears (small, rounded)
  const ears = [];
  for (const s of [1, -1]) {
    const ear = new THREE.Group(); ear.position.set(s * 0.088, 0.07, -0.035); ear.rotation.z = -s * 0.3; ear.rotation.x = -0.15; head.add(ear);
    const eg = new THREE.SphereGeometry(1, 24, 18); { const p = eg.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); const k = 1 - 0.45 * Math.max(0, y); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * (p.getZ(i) > 0 ? 0.35 : 1)); } eg.computeVertexNormals(); }
    add(ear, eg, fur, 0, 0.03, 0, 0.03, 0.036, 0.016);
    add(ear, new THREE.SphereGeometry(1, 20, 14), earIn, 0, 0.026, 0.004, 0.017, 0.022, 0.004);
    ears.push(ear);
  }
  // eyes (stylized: larger than life, dark brown iris, bright highlight)
  const eyes = [];
  for (const s of [1, -1]) {
    const e = new THREE.Group(); e.position.set(s * 0.064, 0.02, 0.09); e.scale.setScalar(0.88); head.add(e);
    const ball = add(e, new THREE.SphereGeometry(0.024, 32, 24), irisM, 0, 0, 0);
    const pupil = add(e, new THREE.SphereGeometry(0.0145, 24, 18), pupilM, 0, 0, 0.0125, 1, 1, 0.55);
    const hi = add(e, new THREE.SphereGeometry(0.0055, 12, 10), hiM, -0.006, 0.008, 0.021); hi.castShadow = false;
    const hi2 = add(e, new THREE.SphereGeometry(0.0028, 10, 8), hiM, 0.007, -0.006, 0.021); hi2.castShadow = false;
    // eyelids (fur shells)
    const lidU = add(e, new THREE.SphereGeometry(0.0248, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), fur, 0, 0, 0);
    const lidL = add(e, new THREE.SphereGeometry(0.0246, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), fur, 0, 0, 0); lidL.rotation.x = Math.PI;
    // brow fur ridge
    eyes.push({ g: e, lidU, lidL, pupil, look: e });
  }

  // ---- legs (short, strong)
  const legs = [];
  const legDefs = [
    { x: 0.135, z: 0.19, front: true }, { x: -0.135, z: 0.19, front: true },
    { x: 0.15, z: -0.2, front: false }, { x: -0.15, z: -0.2, front: false },
  ];
  for (const d of legDefs) {
    const hip = new THREE.Group(); hip.position.set(d.x, -0.06, d.z); bodyPivot.add(hip);
    const L = 0.12;
    add(hip, new THREE.CapsuleGeometry(0.055, 0.09, 8, 20), fur, 0, -0.035, 0, 1, 1, 1.05);
    const knee = new THREE.Group(); knee.position.set(0, -0.095, 0); hip.add(knee);
    add(knee, new THREE.CapsuleGeometry(0.046, 0.035, 8, 18), fur, 0, -0.012, 0.004);
    const paw = new THREE.Group(); paw.position.set(0, -0.05, 0.02); knee.add(paw);
    add(paw, new THREE.SphereGeometry(1, 24, 16), furDark, 0, 0.0, 0.0, 0.05, 0.024, 0.06);
    for (let c = -2; c <= 2; c++) {
      const cl = add(paw, new THREE.ConeGeometry(0.0065, 0.03, 8), clawM, c * 0.017, -0.006, 0.055 - Math.abs(c) * 0.006);
      cl.rotation.x = Math.PI / 2 + 0.5;
    }
    legs.push({ hip, knee, paw, ...d, L });
  }

  root.traverse(o => { if (o.isMesh && ghost) { o.castShadow = false; o.receiveShadow = false; o.renderOrder = 5; } });

  const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4();
  const state = { headYaw: 0, headPitch: 0 };
  function update(o = {}) {
    const walk = o.walk ?? 0, moving = o.moving ?? 0, time = o.time ?? 0;
    const ph = walk * Math.PI * 2;
    // legs: diagonal pairs (trot-like waddle)
    legs.forEach((l, i) => {
      const off = (i === 0 || i === 3) ? 0 : Math.PI;
      const s = Math.sin(ph + off), c = Math.cos(ph + off);
      l.hip.rotation.x = s * 0.55 * moving;
      const lift = Math.max(0, c) * moving;
      l.knee.rotation.x = -lift * 0.9;
      l.paw.rotation.x = lift * 0.6 - s * 0.3 * moving;
      l.hip.position.y = -0.06 + lift * 0.012;
    });
    // body bob + waddle roll
    bodyPivot.position.y = 0.215 + Math.abs(Math.sin(ph)) * 0.012 * moving - 0.006 * moving + (o.crouch || 0) * -0.03;
    bodyPivot.rotation.z = Math.sin(ph) * 0.06 * moving + (o.roll || 0);
    bodyPivot.rotation.y = Math.sin(ph) * 0.03 * moving;
    bodyPivot.rotation.x = (o.bodyPitch || 0);
    tail.rotation.y = Math.sin(time * 14) * (o.tailWag || 0);
    tail.position.x = Math.sin(time * 16) * 0.012 * (o.tailWag || 0);
    // head
    let yaw = o.headYaw || 0, pitch = o.headPitch || 0;
    if (o.look) {
      root.updateMatrixWorld(true);
      neck.updateMatrixWorld(true);
      const inv = _m.copy(neck.matrixWorld).invert();
      _v.copy(o.look).applyMatrix4(inv).sub(head.position);
      const ly = Math.atan2(_v.x, _v.z), lp = -Math.atan2(_v.y, Math.hypot(_v.x, _v.z));
      const k = o.lookAmt ?? 1;
      yaw = lerp(yaw, clamp(ly, -1.3, 1.3), k); pitch = lerp(pitch, clamp(lp, -0.7, 0.7), k);
    }
    yaw += Math.sin(ph * 0.5) * 0.05 * moving; pitch += Math.sin(ph) * 0.03 * moving;
    neck.rotation.set(pitch * 0.35, yaw * 0.4, (o.headTilt || 0) * 0.5);
    head.rotation.set(pitch * 0.65 + (o.sniff || 0) * Math.sin(time * 38) * 0.02, yaw * 0.6, (o.headTilt || 0) * 0.5);
    nose.scale.set(0.052 * (1 + (o.sniff || 0) * 0.06 * Math.sin(time * 38)), 0.032, 0.028);
    // blink
    const bl = clamp(o.blink || 0);
    for (const e of eyes) {
      e.lidU.rotation.x = -1.82 - (o.wide || 0) * 0.25 + (o.sleepy || 0) * 0.55 + bl * (1.82 - (o.sleepy || 0) * 0.55);
      e.lidL.rotation.x = -2.2 - bl * 0.94;
      const pr = 1 + (o.pupil || 0) * 0.25; e.pupil.scale.set(pr, pr, 0.55);
    }
    ears.forEach((e, i) => { e.rotation.x = (o.earTwitch || 0) * Math.sin(time * 30 + i) * 0.3; });
  }
  update({});
  const headWorld = (out) => head.getWorldPosition(out);
  const noseWorld = (out) => nose.getWorldPosition(out);
  const bodyWorld = (out) => body.getWorldPosition(out);
  return { root, update, headWorld, noseWorld, bodyWorld, head, neck, bodyPivot, mats, ghostMat: gm };
}
