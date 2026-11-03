import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildTardigrade, softSprite } from './tardigrade.js';
import { buildSpace, buildLeaf, buildLab } from './world.js';
import { makePost } from './post.js';
import { clamp, lerp, smooth, smoother, easeIn, easeOut } from './lib.js';

const qs = new URLSearchParams(location.search);
const W = +(qs.get('w') || 1080), H = +(qs.get('h') || 1920);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);
const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lerpV = (a, b, t) => new THREE.Vector3().lerpVectors(a, b, t);

const space = buildSpace(); space.scene.environment = envTex; space.scene.environmentIntensity = 0.15;
const leaf = buildLeaf(); leaf.scene.environment = envTex; leaf.scene.environmentIntensity = 0.35;
const lab = buildLab(); lab.scene.environment = envTex; lab.scene.environmentIntensity = 0.3;
const tg = buildTardigrade();
const extraTuns = [];
for (let i = 0; i < 5; i++) { const t = buildTardigrade(); t.update({ tun: 1, dry: 1, time: i }); t.root.scale.setScalar(0.62); space.cassette.add(t.root); extraTuns.push(t); }
const mainTunSlot = 0;
space.wells.forEach((w, i) => { if (i === mainTunSlot) return; const t = extraTuns[i - 1]; t.root.position.set(w.x, w.y - 0.062, w.z); t.root.rotation.set(0, i * 1.3, 0); });
const glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: softSprite('rgba(255,250,235,1)', 'rgba(255,220,170,0)'), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); space.scene.add(glint);

const cam = new THREE.PerspectiveCamera(40, W / H, 0.01, 3000);
const marker = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.0, 64), new THREE.MeshBasicMaterial({ color: '#FFD72B', transparent: true, depthTest: false, toneMapped: false, side: THREE.DoubleSide })); marker.renderOrder = 50; leaf.scene.add(marker);
const post = makePost(renderer, W, H); const G = post.grade.uniforms;
function resetFX() { G.uFlash.value = 0; G.uZoom.value = 0; G.uRewind.value = 0; G.uDesat.value = 0; G.uVignette.value = 0.38; G.uGrain.value = 0.03; G.uBlack.value = 0; G.uCA.value = 0.0012; G.uTint.value.set(1, 1, 1); G.uFlashColor.value.set(1, 1, 1); post.bokeh.enabled = false; post.bloom.strength = 0.4; post.bloom.threshold = 0.82; }
function applyCam(c) { cam.position.copy(c.pos); cam.fov = c.fov || 40; cam.near = c.near || 0.01; cam.updateProjectionMatrix(); cam.up.set(Math.sin(c.roll || 0), Math.cos(c.roll || 0), 0); cam.lookAt(c.look); }
function useBokeh(focus, aperture = 0.003, maxblur = 0.007) { post.bokeh.enabled = true; post.bokeh.uniforms.focus.value = focus; post.bokeh.uniforms.aperture.value = aperture; post.bokeh.uniforms.maxblur.value = maxblur; }
function attach(scene) { if (tg.root.parent !== scene) scene.add(tg.root); }
const blinks = [5.05, 7.6, 10.4, 13.2, 39.9, 42.6, 44.9];
const blinkAt = (T) => { let b = 0; for (const bt of blinks) { const d = T - bt; if (d > 0 && d < 0.2) b = Math.max(b, Math.sin(d / 0.2 * Math.PI)); } return b; };

// ---------------------------------------------------------------- S1 SPACE HOOK (0 - 6.1)
function renderHook(T) {
  attach(space.scene); space.cassette.visible = false; space.update(T);
  tg.root.position.set(0, 0, 0); tg.root.scale.setScalar(1);
  tg.root.rotation.set(0.25 * Math.sin(T * 0.4), T * 0.35 + 0.6, 0.3 * Math.sin(T * 0.3));
  const open = smooth(4.85, 5.1, T);
  tg.update({ tun: lerp(0.18, 0.0, smooth(4.6, 5.6, T)), time: T, eyesClosed: 1 - open, blink: blinkAt(T), look: T > 5.2 ? cam.position.clone() : null, lookAmt: smooth(5.2, 5.6, T), wide: open * 0.5 });
  let c;
  if (T < 3.5) {
    const u = smoother(0, 3.5, T); const d = lerp(70, 6, Math.pow(u, 1.6));
    c = { pos: V(0.4 * d / 10, 0.25 * d / 10 + 0.2, d), look: V(0, -0.15 * d / 10, 0), fov: 40 };
  } else if (T < 3.8) {
    const u = easeOut((T - 3.5) / 0.3); c = { pos: lerpV(V(0.24, 0.35, 6), V(0.6, 0.45, 3.3), u), look: V(0, 0.0, 0), fov: lerp(40, 36, u) };
    G.uZoom.value = Math.sin(clamp((T - 3.45) / 0.4) * Math.PI) * 0.9;
  } else {
    const k = T - 3.8; const a = 0.2 + k * 0.12;
    c = { pos: V(Math.sin(a) * 3.3, 0.45 - k * 0.06, Math.cos(a) * 3.3), look: V(0, -0.05, 0), fov: 36 };
    const s = Math.exp(-k * 7) * 0.03; c.pos.x += Math.sin(k * 50) * s; c.pos.y += Math.cos(k * 43) * s;
  }
  applyCam(c);
  glint.position.set(0, 0, 0); const far = clamp((cam.position.length() - 5) / 30); glint.scale.setScalar(0.4 + far * 1.8); glint.material.opacity = far * (0.6 + 0.4 * Math.sin(T * 9));
  if (T > 3.5) G.uFlash.value = (1 - smooth(3.55, 3.95, T)) * 0.85;
  G.uBlack.value = 1 - smooth(0, 0.7, T);
  post.bloom.strength = 0.6; post.bloom.threshold = 0.7;
  post.set(space.scene, cam);
}

// ---------------------------------------------------------------- needle tip (6.1 - 9.3)
function renderNeedle(T) {
  attach(lab.scene); lab.needle.visible = true; lab.sub.visible = false; lab.fallDrop.visible = false; lab.update(T, {});
  tg.root.position.set(0, -0.44, 0); tg.root.rotation.set(0, 0.5, 0); tg.root.scale.setScalar(1);
  const u = smoother(6.2, 9.2, T);
  const c = { pos: V(lerp(1.4, 6, u), lerp(0.6, 2.5, u), lerp(2.6, 16, u)), look: V(0, lerp(-0.2, -3.5, u), 0), fov: 38 };
  applyCam(c);
  tg.update({ tun: 0, time: T, blink: blinkAt(T), look: cam.position.clone(), lookAmt: 0.8, headTilt: 0, wide: 0.3, waveLeg: 0 });
  useBokeh(cam.position.distanceTo(V(0, -0.3, 0)), 0.002, 0.005);
  G.uFlash.value = 1 - smooth(6.1, 6.45, T); G.uFlashColor.value.set(0.56, 0.94, 1.0);
  post.set(lab.scene, cam);
}

// ---------------------------------------------------------------- LEAF (9.3 - 16.6 and 40.9 - 49.7)
const LP0 = V(-0.9, 0, 0.8), LDIR = V(0.55, 0, -0.35).normalize();
function renderLeaf(T) {
  attach(leaf.scene); leaf.update(T); leaf.scene.fog.density = 0.035; marker.visible = false;
  let walkDist, moving, yaw = Math.atan2(LDIR.x, LDIR.z), c, o = { time: T, blink: blinkAt(T) };
  leaf.finger.visible = T < 20;
  if (T < 16.6) {
    walkDist = 0.16 * (Math.min(T, 12.7) - 9.3) + 0.08 * smooth(12.5, 13.2, T); moving = smooth(9.3, 9.6, T) * (1 - smooth(12.4, 13.0, T));
  } else {
    walkDist = 0.6 + 0.15 * (Math.min(T, 46.6) - 40.9) * (1 - 0.6 * smooth(43.2, 44.0, T)); moving = 1 - smooth(46.3, 46.7, T);
    if (T > 47.9) { walkDist += 0.2 * (T - 47.9); moving = smooth(47.9, 48.2, T); }
  }
  const pos = LP0.clone().add(LDIR.clone().multiplyScalar(walkDist));
  tg.root.position.copy(pos); tg.root.rotation.set(0, yaw, 0); tg.root.scale.setScalar(1);
  const fwd = LDIR.clone(), side = V(fwd.z, 0, -fwd.x);
  if (T < 11.0) {
    const u = smoother(9.3, 11.0, T);
    c = { pos: pos.clone().add(fwd.clone().multiplyScalar(lerp(2.4, 1.9, u))).add(side.clone().multiplyScalar(lerp(1.4, 1.0, u))).add(V(0, lerp(0.55, 0.45, u), 0)), look: pos.clone().add(V(0, 0.15, 0)), fov: 38 };
  } else if (T < 12.7) {
    const u = smoother(11.0, 12.7, T);
    c = { pos: pos.clone().add(side.clone().multiplyScalar(lerp(1.0, 1.85, u))).add(fwd.clone().multiplyScalar(lerp(1.9, 0.35, u))).add(V(0, lerp(0.45, 0.38, u), 0)), look: pos.clone().add(V(0, lerp(0.15, 0.1, u), 0)), fov: 36 };
  } else if (T < 16.6) {
    const u = Math.pow(smoother(12.7, 16.2, T), 1.5);
    const near = pos.clone().add(side.clone().multiplyScalar(1.85)).add(fwd.clone().multiplyScalar(0.35)).add(V(0, 0.38, 0));
    const far = pos.clone().add(V(-3, 17, 29));
    c = { pos: lerpV(near, far, u), look: lerpV(pos.clone().add(V(0, 0.1, 0)), pos.clone().add(V(4.5, 3.5, -2.5)), u), fov: lerp(36, 40, u) };
    leaf.finger.position.copy(pos).add(V(26.4, 14.1 + 9 * (1 - smoother(13.0, 15.0, T)), -2.5));
    leaf.finger.visible = T > 12.9; leaf.scene.fog.density = lerp(0.035, 0.004, u);
    marker.visible = T > 13.6; marker.position.copy(pos).add(V(0, 0.2, 0)); marker.lookAt(cam.position); marker.scale.setScalar(lerp(0.9, 2.2, u)); marker.material.opacity = smooth(13.6, 14.2, T);
  } else if (T < 43.2) {
    const u = smoother(40.9, 43.2, T);
    c = { pos: pos.clone().add(fwd.clone().multiplyScalar(lerp(2.8, 2.0, u))).add(side.clone().multiplyScalar(lerp(-1.6, -0.9, u))).add(V(0, lerp(0.8, 0.5, u), 0)), look: pos.clone().add(V(0, 0.15, 0)), fov: 38 };
  } else if (T < 45.2) {
    const u = smoother(43.2, 44.2, T); const hp = tg.headWorld(new THREE.Vector3());
    c = { pos: lerpV(pos.clone().add(fwd.clone().multiplyScalar(2.0)).add(side.clone().multiplyScalar(-0.9)).add(V(0, 0.5, 0)), hp.clone().add(fwd.clone().multiplyScalar(1.05)).add(side.clone().multiplyScalar(-0.25)).add(V(0, 0.1, 0)), u), look: hp.clone().add(V(0, -0.03, 0)), fov: 34 };
    o.look = cam.position.clone(); o.lookAmt = smooth(43.6, 44.0, T);
  } else if (T < 46.7) {
    const u = smoother(45.2, 46.0, T); const hp = tg.headWorld(new THREE.Vector3());
    const legP = pos.clone().add(fwd.clone().multiplyScalar(0.1)).add(side.clone().multiplyScalar(-0.2)).add(V(0, 0.05, 0));
    c = { pos: lerpV(hp.clone().add(fwd.clone().multiplyScalar(1.05)).add(side.clone().multiplyScalar(-0.25)).add(V(0, 0.1, 0)), legP.clone().add(side.clone().multiplyScalar(-0.75)).add(fwd.clone().multiplyScalar(0.35)).add(V(0, 0.02, 0)), u), look: lerpV(hp, legP, u), fov: 34 };
  } else {
    const hp = tg.headWorld(new THREE.Vector3());
    const k = smoother(46.7, 47.2, T), k2 = smoother(47.9, 49.5, T);
    const p1 = pos.clone().add(fwd.clone().multiplyScalar(1.4)).add(side.clone().multiplyScalar(-0.6)).add(V(0, 0.35, 0));
    c = { pos: lerpV(p1, p1.clone().add(V(0, 0.4, 0.9)), k2), look: lerpV(hp, pos.clone().add(V(0, 0.1, 0)), k2 * 0.5), fov: 36 };
    if (T < 47.9) { o.look = cam.position.clone(); o.lookAmt = k; o.waveLeg = Math.sin(clamp((T - 46.8) / 1.0) * Math.PI) * (0.6 + 0.4 * Math.sin(T * 14)); o.wink = smooth(46.9, 47.05, T) * (1 - smooth(47.35, 47.5, T)); o.bob = 0.03 * Math.abs(Math.sin(clamp((T - 46.7) / 0.35) * Math.PI)); }
    if (T < 47.0) c.pos = lerpV(c.pos, c.pos, 0);
  }
  o.walk = walkDist / 0.13; o.moving = moving; o.tun = 0; o.activity = 0;
  applyCam(c);
  tg.update(o);
  useBokeh(cam.position.distanceTo(tg.root.position), T > 12.7 && T < 16.6 ? 0.0008 : 0.003, 0.007);
  if (T < 9.65) { G.uFlash.value = 1 - smooth(9.3, 9.65, T); G.uFlashColor.value.set(0.9, 1.0, 0.85); }
  if (T > 40.9 && T < 41.3) { G.uFlash.value = 1 - smooth(40.9, 41.3, T); G.uFlashColor.value.set(1, 0.98, 0.9); }
  G.uBlack.value = smooth(48.9, 49.7, T);
  post.set(leaf.scene, cam);
}

// ---------------------------------------------------------------- CRYPTOBIOSIS (16.6 - 29.0) and REHYDRATION (36.6 - 40.9)
function renderCrypto(T) {
  attach(lab.scene); lab.needle.visible = false; lab.sub.visible = true;
  let dry, heat, tun, act, c, o = { time: T };
  if (T < 29.0) {
    heat = smooth(18.3, 19.5, T) * (1 - smooth(26.5, 28.5, T) * 0.6); dry = smooth(19.0, 24.5, T);
    tun = smoother(21.0, 25.8, T); act = 1 - smooth(22.6, 27.4, T);
    const walk = 0.12 * (Math.min(T, 20.5) - 16.6); o.walk = walk / 0.13; o.moving = smooth(16.7, 17.0, T) * (1 - smooth(19.8, 20.6, T));
    tg.root.position.set(-0.3 + walk * 0.6, 0, -0.1); tg.root.rotation.set(0, 0.9 + smooth(20, 21.5, T) * 0.3, 0);
    const u = smoother(16.6, 29.0, T); const a = lerp(0.3, -0.5, u);
    c = { pos: V(Math.sin(a) * lerp(3.4, 2.5, u), lerp(1.4, 1.0, u), Math.cos(a) * lerp(3.4, 2.5, u)), look: V(0, 0.18, 0), fov: 36 };
    o.eyesClosed = smooth(22, 23.5, T); o.wide = smooth(18.4, 18.8, T) * (1 - smooth(20.8, 21.4, T)) * 0.6;
    o.look = (T > 18.3 && T < 21.3) ? V(2, 3, 2) : null; o.lookAmt = 0.7;
    G.uFlash.value = 1 - smooth(16.6, 17.0, T); G.uFlashColor.value.set(0.56, 0.94, 1.0);
    if (T < 17.0) G.uZoom.value = (1 - smooth(16.6, 17.0, T)) * 0.8;
    G.uTint.value.setRGB(1 + heat * 0.08, 1 - heat * 0.02, 1 - heat * 0.1);
  } else {
    // rehydration
    const drop = smooth(36.7, 37.35, T);
    lab.fallDrop.visible = T > 36.6 && T < 37.45; lab.fallDrop.position.set(0, lerp(4, 0.3, Math.pow(drop, 2)), 0);
    dry = 1 - smooth(37.3, 38.6, T); heat = 0; tun = 1 - smoother(37.8, 39.8, T); act = smooth(38.3, 39.8, T);
    tg.root.position.set(0.15, 0, -0.1); tg.root.rotation.set(0, 0.6, 0);
    const u = smoother(36.6, 40.9, T);
    c = { pos: V(lerp(1.6, 1.3, u), lerp(1.5, 1.05, u), lerp(2.6, 2.4, u)), look: V(0.1, 0.2, 0), fov: 36 };
    o.eyesClosed = 1 - smooth(39.4, 39.7, T); o.blink = blinkAt(T); o.look = T > 40.0 ? cam.position.clone() : null; o.lookAmt = smooth(40.0, 40.3, T); o.wide = smooth(39.5, 39.8, T) * 0.4;
    o.walk = (T - 36.6) * 0.3; o.moving = smooth(39.6, 40.1, T) * 0.25;
    G.uFlash.value = 1 - smooth(36.6, 36.95, T); G.uFlashColor.value.set(1, 0.9, 0.7);
    if (T > 37.35 && T < 37.9) { const k = (T - 37.35); lab.water.scale.y += Math.sin(k * 20) * Math.exp(-k * 8) * 0.12; }
  }
  o.tun = tun; o.activity = act; o.dry = dry;
  lab.update(T, { dry, heat });
  if (T >= 29.0) lab.water.scale.y += 0;
  applyCam(c); tg.update(o);
  useBokeh(cam.position.distanceTo(tg.root.position), 0.0025, 0.006);
  post.bloom.strength = 0.55; post.bloom.threshold = 0.7;
  post.set(lab.scene, cam);
}

// ---------------------------------------------------------------- SPACE EXPERIMENT (29.0 - 36.6)
function renderOrbit(T) {
  attach(space.scene); space.cassette.visible = true; space.update(T);
  space.cassette.position.set(0, -0.2, 0); space.cassette.rotation.set(0.25 + 0.03 * Math.sin(T * 0.3), -0.4 + T * 0.02, 0.05);
  space.cassette.updateMatrixWorld(true);
  const w0 = space.wells[mainTunSlot].clone().applyMatrix4(space.cassette.matrixWorld);
  tg.root.scale.setScalar(0.62); tg.root.position.copy(w0).add(V(0, -0.062, 0)); tg.root.quaternion.copy(space.cassette.quaternion);
  tg.update({ tun: 1, dry: 1, time: T, activity: 0 });
  const u = smoother(29.0, 36.6, T);
  const c = { pos: lerpV(V(1.5, 3.2, 6.5), V(-0.2, 1.4, 2.6), u), look: lerpV(V(0, -0.4, 0), w0, u), fov: 38 };
  applyCam(c);
  glint.material.opacity = 0;
  useBokeh(cam.position.distanceTo(w0), 0.002, 0.006);
  G.uFlash.value = 1 - smooth(29.0, 29.4, T); G.uFlashColor.value.set(1, 1, 1);
  post.bloom.strength = 0.6; post.bloom.threshold = 0.72;
  post.set(space.scene, cam);
}

window.renderFrame = (T) => {
  resetFX(); G.uTime.value = T;
  if (T < 6.1) renderHook(T);
  else if (T < 9.3) renderNeedle(T);
  else if (T < 16.6) renderLeaf(T);
  else if (T < 29.0) renderCrypto(T);
  else if (T < 36.6) renderOrbit(T);
  else if (T < 40.9) renderCrypto(T);
  else renderLeaf(T);
  post.composer.render();
  return renderer.domElement.toDataURL('image/jpeg', 0.93);
};
window.READY = true;
