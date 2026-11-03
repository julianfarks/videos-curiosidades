import * as THREE from 'three';
import { canvasTex, rng, clamp, lerp, noiseFill } from './lib.js';

// Stylized tardigrade ("water bear"): plump segmented barrel body, head with round mouth (buccal tube opening),
// small dark eyespots, 4 pairs of stubby legs (3 ventral walking pairs + rear pair pointing backwards), each with hooked claws.
// Faces +z, ventral side down (-y). Body length ~1 unit. `tun` 0..1 = cryptobiotic contraction (legs retract, body shortens into a barrel).

export function softSprite(inner = 'rgba(255,240,200,1)', outer = 'rgba(255,220,150,0)') {
  return canvasTex(64, 64, (g, w, h) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, inner); r.addColorStop(1, outer); g.fillStyle = r; g.fillRect(0, 0, w, h); });
}

let TEX = null;
function textures() {
  if (TEX) return TEX;
  const r = rng(21);
  const map = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#d9b48a'; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 0, 0.12, 40, 2); noiseFill(g, w, h, 0, 0.06, 8, 3);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${150 + r() * 60 | 0},${100 + r() * 40 | 0},${60 + r() * 30 | 0},0.18)`; g.beginPath(); g.arc(r() * w, r() * h, 2 + r() * 6, 0, 7); g.fill(); }
  });
  // segment folds run around the body (texture v = along the body)
  const bump = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 0, 0.35, 6, 7);
    for (let i = 0; i < 2200; i++) { const v = 90 + r() * 90 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 2.2, 0, 7); g.fill(); }
  }, { srgb: false });
  TEX = { map, bump };
  return TEX;
}

const SEG = [0.43, 0.2, -0.02, -0.22, -0.4]; // segment centres along z (head .. rear)

export function buildTardigrade() {
  const T = textures();
  const root = new THREE.Group();
  const skin = new THREE.MeshPhysicalMaterial({ color: '#f2d3ad', map: T.map, bumpMap: T.bump, bumpScale: 0.8, roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.35, sheen: 0.8, sheenColor: new THREE.Color('#ffd6b8'), sheenRoughness: 0.4, emissive: new THREE.Color('#5a2e10'), emissiveIntensity: 0.12 });
  const clawM = new THREE.MeshStandardMaterial({ color: '#4a3020', roughness: 0.35, metalness: 0.0 });
  const darkM = new THREE.MeshPhysicalMaterial({ color: '#0d0907', roughness: 0.15, clearcoat: 1 });
  const hiM = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  const mouthM = new THREE.MeshStandardMaterial({ color: '#b86a5a', roughness: 0.5 });
  const lidM = skin;

  const pivot = new THREE.Group(); root.add(pivot);
  // ---- body: deformable sphere, rebuilt each update for tun/breathing
  const bodyG = new THREE.SphereGeometry(1, 96, 64);
  bodyG.rotateX(Math.PI / 2); // poles along z
  const base = bodyG.attributes.position.array.slice();
  const body = new THREE.Mesh(bodyG, skin); body.castShadow = true; body.receiveShadow = true; pivot.add(body);
  function shapeBody(tun, breathe) {
    const p = bodyG.attributes.position.array;
    const L = lerp(0.52, 0.4, tun), R = lerp(0.235, 0.25, tun), H = lerp(0.2, 0.215, tun);
    const ring = lerp(0.035, 0.028, tun);
    for (let i = 0; i < p.length; i += 3) {
      const z = base[i + 2], q = Math.sqrt(Math.max(1e-6, 1 - z * z)), x = base[i] / q, y = base[i + 1] / q;
      const zz = z * L;
      // segment bulges + head taper
      let s = 1 + ring * Math.cos((z * 0.5 + 0.5) * Math.PI * 5 * 2 - 0.4);
      const prof = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(z), lerp(2.4, 2.2, tun))), lerp(0.42, 0.45, tun));
      let rx = R * prof * s * (1 + breathe * 0.02), ry = H * prof * s;
      if (z > 0.55) { const k = (z - 0.55) / 0.45; rx *= 1 - 0.25 * k * (1 - tun); ry *= 1 - 0.18 * k * (1 - tun); }
      let yy = y * ry; if (y < 0) yy *= lerp(0.72, 0.9, tun); // flatter belly
      p[i] = x * rx; p[i + 1] = yy; p[i + 2] = zz;
    }
    bodyG.attributes.position.needsUpdate = true; bodyG.computeVertexNormals();
    return { L, R, H };
  }

  // ---- head features
  const head = new THREE.Group(); pivot.add(head);
  const snout = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), skin); snout.scale.set(0.1, 0.085, 0.07); snout.position.set(0, -0.015, 0); head.add(snout);
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.012, 12, 32), mouthM); mouth.position.set(0, -0.02, 0.062); head.add(mouth);
  const mouthHole = new THREE.Mesh(new THREE.CircleGeometry(0.026, 24), darkM); mouthHole.position.set(0, -0.02, 0.058); head.add(mouthHole);
  const eyes = [];
  for (const s of [1, -1]) {
    const e = new THREE.Group(); e.position.set(s * 0.085, 0.055, -0.03); head.add(e);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.036, 24, 18), darkM); e.add(ball);
    const h1 = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 8), hiM); h1.position.set(-s * 0.008 + 0.0, 0.016, 0.03); e.add(h1);
    const h2 = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 8, 6), hiM); h2.position.set(s * 0.012, -0.01, 0.033); e.add(h2);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.039, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), lidM); e.add(lid);
    e.rotation.y = s * 0.55;
    eyes.push({ e, lid, ball });
  }

  // ---- legs
  const legs = [];
  const legDefs = [
    { z: 0.27, x: 0.2, rear: false }, { z: 0.06, x: 0.215, rear: false }, { z: -0.15, x: 0.21, rear: false }, { z: -0.36, x: 0.13, rear: true },
  ];
  const clawG = new THREE.TorusGeometry(0.022, 0.0055, 6, 12, Math.PI * 0.85);
  legDefs.forEach((d, idx) => {
    for (const s of [1, -1]) {
      const hip = new THREE.Group(); pivot.add(hip);
      const seg1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.07, 8, 16), skin); seg1.castShadow = true; hip.add(seg1);
      const foot = new THREE.Group(); hip.add(foot);
      const pad = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), skin); pad.scale.set(1, 0.7, 1); foot.add(pad);
      for (let c = 0; c < 4; c++) {
        const cl = new THREE.Mesh(clawG, clawM); const a = (c - 1.5) * 0.45;
        cl.position.set(Math.sin(a) * 0.03, -0.012, Math.cos(a) * 0.03 * (d.rear ? -1 : 1));
        cl.rotation.set(0, a + (d.rear ? Math.PI : 0), 0); cl.rotateX(Math.PI / 2); cl.rotateZ(-0.4);
        foot.add(cl);
      }
      legs.push({ hip, seg1, foot, s, ...d, idx });
    }
  });

  // inner "activity" sparkles (stylized metabolism), visible through a faint glow
  const nS = 70; const sp = new Float32Array(nS * 3); const r = rng(5); const sbase = [];
  for (let i = 0; i < nS; i++) { const a = r() * 6.28, rr = Math.sqrt(r()) * 0.17, z = (r() - 0.5) * 0.7; sbase.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.8, z, r() * 6.28]); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const sparkM = new THREE.PointsMaterial({ size: 0.035, map: softSprite('rgba(255,250,210,1)', 'rgba(255,200,120,0)'), transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, opacity: 0 });
  const sparks = new THREE.Points(sg, sparkM); sparks.renderOrder = 10; pivot.add(sparks);

  const _m = new THREE.Matrix4(), _v = new THREE.Vector3();
  function update(o = {}) {
    const tun = clamp(o.tun || 0), walk = o.walk || 0, moving = (o.moving ?? 0) * (1 - tun), t = o.time || 0;
    const dims = shapeBody(tun, Math.sin(t * 2.2) * (1 - tun));
    const ph = walk * Math.PI * 2;
    pivot.position.y = lerp(0.265, 0.195, tun) + Math.abs(Math.sin(ph * 2)) * 0.008 * moving + (o.bob || 0);
    pivot.rotation.z = Math.sin(ph) * 0.05 * moving + (o.roll || 0);
    pivot.rotation.x = (o.pitch || 0);
    // head: sits at front, retracts into the body when tun
    const hz = dims.L * lerp(0.92, 0.55, tun);
    head.position.set(0, lerp(0.0, -0.01, tun), hz);
    head.scale.setScalar(lerp(1, 0.55, tun));
    let yaw = o.headYaw || 0, pitch = o.headPitch || 0;
    if (o.look) { root.updateMatrixWorld(true); _m.copy(pivot.matrixWorld).invert(); _v.copy(o.look).applyMatrix4(_m).sub(head.position); yaw = lerp(yaw, clamp(Math.atan2(_v.x, _v.z), -0.6, 0.6), o.lookAmt ?? 1); pitch = lerp(pitch, clamp(-Math.atan2(_v.y, Math.hypot(_v.x, _v.z)), -0.4, 0.4), o.lookAmt ?? 1); }
    head.rotation.set(pitch + Math.sin(ph) * 0.04 * moving, yaw + Math.sin(ph * 0.5) * 0.06 * moving, 0);
    const bl = clamp(Math.max(o.blink || 0, tun * 0.95, o.eyesClosed || 0));
    eyes.forEach((e, i) => {
      const wink = (o.wink && i === 0) ? clamp(o.wink) : 0;
      e.lid.rotation.x = -1.9 + Math.max(bl, wink) * 1.9;
      e.ball.scale.setScalar(1 + (o.wide || 0) * 0.15);
    });
    // legs
    legs.forEach((l) => {
      const offs = [0, Math.PI * 0.66, Math.PI * 1.33, Math.PI][l.idx] + (l.s > 0 ? 0 : Math.PI);
      const sw = Math.sin(ph + offs), lift = Math.max(0, Math.cos(ph + offs));
      const retract = tun;
      const hx = l.s * dims.R * (l.rear ? 0.55 : 0.82) * lerp(1, 0.8, retract);
      const hz = l.z * dims.L / 0.52;
      l.hip.position.set(hx, -dims.H * 0.55, hz);
      const len = lerp(0.13, 0.02, retract);
      l.seg1.scale.set(1, lerp(1, 0.35, retract), 1);
      if (l.rear) {
        l.hip.rotation.set(-1.15 - 0.2 * sw * moving, 0, l.s * 0.25);
        l.seg1.position.set(0, -0.05, 0);
        l.foot.position.set(0, -len - 0.02, 0);
      } else {
        const wave = (o.waveLeg && l.idx === 0 && l.s > 0) ? o.waveLeg : 0;
        l.hip.rotation.set(sw * 0.45 * moving - wave * 1.6, 0, l.s * (0.35 + 0.25 * lift * moving + wave * 0.6));
        l.seg1.position.set(0, -0.05, 0);
        l.foot.position.set(0, -len - 0.025 + lift * 0.02 * moving, 0.0);
        l.foot.rotation.set(-sw * 0.3 * moving + wave * 0.8, 0, 0);
      }
      l.hip.visible = retract < 0.98;
      l.hip.scale.setScalar(lerp(1, 0.6, retract));
    });
    // sparkles
    const act = o.activity ?? 0;
    sparkM.opacity = act * 0.9;
    for (let i = 0; i < nS; i++) { const b = sbase[i]; const sp2 = Math.max(0.05, act); sp[i * 3] = b[0] * dims.R / 0.235; sp[i * 3 + 1] = b[1] + 0.0 + Math.sin(t * 3 * sp2 + b[3]) * 0.02; sp[i * 3 + 2] = (b[2] + Math.sin(t * 2 * sp2 + b[3]) * 0.03) * dims.L / 0.52; }
    sg.attributes.position.needsUpdate = true;
    skin.color.set('#f2d3ad').lerp(new THREE.Color('#b98a55'), (o.dry || 0) * 0.8);
    skin.clearcoat = lerp(0.7, 0.1, o.dry || 0); skin.roughness = lerp(0.42, 0.75, o.dry || 0);
  }
  update({});
  const headWorld = (out) => head.getWorldPosition(out);
  const footWorld = (i, out) => legs[i].foot.getWorldPosition(out);
  return { root, update, headWorld, footWorld, skin, pivot };
}
