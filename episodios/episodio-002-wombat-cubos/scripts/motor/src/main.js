import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildWombat } from './wombat.js';
import { buildForest } from './forest.js';
import { buildLab, buildTract } from './gut.js';
import { makePost } from './post.js';
import { clamp, lerp, smooth, smoother, easeInOut, easeOut, easeIn } from './lib.js';

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

// ---------------- FOREST ----------------
const forest = new THREE.Scene(); forest.environment = envTex; forest.environmentIntensity = 0.3;
const F = buildForest(forest);
const wb = buildWombat(); forest.add(wb.root);
const cam = new THREE.PerspectiveCamera(36, W / H, 0.01, 60); forest.add(cam);
// scanning ring for the X-ray transition
const scanRing = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.006, 8, 96), new THREE.MeshBasicMaterial({ color: '#8FF0FF', toneMapped: false, transparent: true }));
forest.add(scanRing); scanRing.visible = false;
const scanDisc = new THREE.Mesh(new THREE.CircleGeometry(0.27, 64), new THREE.MeshBasicMaterial({ color: '#8FF0FF', transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
scanRing.add(scanDisc);

// ---------------- X-RAY ----------------
const xray = new THREE.Scene(); xray.background = new THREE.Color('#0B1D24'); xray.fog = new THREE.FogExp2('#0B1D24', 0.25);
xray.add(new THREE.HemisphereLight('#9fd6e0', '#20140f', 1.1));
const xk = new THREE.DirectionalLight('#FFD89A', 1.6); xk.position.set(-1, 2, -1); xray.add(xk);
const xf = new THREE.PointLight('#ffffff', 1.2, 4, 2); xf.position.set(0.8, 0.5, 0.2); xray.add(xf);
const ghost = buildWombat({ ghost: true }); xray.add(ghost.root);
const tract = buildTract(); ghost.root.add(tract.group);
const xcam = new THREE.PerspectiveCamera(36, W / H, 0.01, 60); xray.add(xcam);
const gridT = new THREE.GridHelper(6, 60, '#2c6170', '#16343d'); gridT.position.y = 0.0; gridT.material.transparent = true; gridT.material.opacity = 0.5; xray.add(gridT);
const secRing = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.0025, 8, 64), new THREE.MeshBasicMaterial({ color: '#8FF0FF', toneMapped: false, transparent: true })); ghost.root.add(secRing);

// ---------------- LAB ----------------
const lab = buildLab(renderer); lab.scene.environment = envTex; lab.scene.environmentIntensity = 0.25;
const lcam = new THREE.PerspectiveCamera(36, W / H, 0.01, 60); lab.scene.add(lcam);

const post = makePost(renderer, W, H);
const G = post.grade.uniforms;
function resetFX() { G.uFlash.value = 0; G.uZoom.value = 0; G.uRewind.value = 0; G.uDesat.value = 0; G.uVignette.value = 0.36; G.uGrain.value = 0.03; G.uBlack.value = 0; G.uCA.value = 0.0012; G.uTint.value.set(1, 1, 1); G.uFlashColor.value.set(1, 1, 1); post.bokeh.enabled = false; post.bloom.strength = 0.35; post.bloom.threshold = 0.85; }
function applyCam(c, camera = cam) { camera.position.copy(c.pos); camera.fov = c.fov || 36; camera.updateProjectionMatrix(); camera.up.set(Math.sin(c.roll || 0), Math.cos(c.roll || 0), 0); camera.lookAt(c.look); }
function useBokeh(focus, aperture = 0.003, maxblur = 0.006) { post.bokeh.enabled = true; post.bokeh.uniforms.focus.value = focus; post.bokeh.uniforms.aperture.value = aperture; post.bokeh.uniforms.maxblur.value = maxblur; }
const lerpV = (a, b, t) => new THREE.Vector3().lerpVectors(a, b, t);

// ---------------- WOMBAT STORY (forest) ----------------
const P0 = V(-0.5, 0, -2.0), P1 = V(-0.02, 0, -0.42);
const STRIDE = 0.2;
const DPATH = P0.distanceTo(P1);
const YAW_WALK = Math.atan2(P1.x - P0.x, P1.z - P0.z);
const YAW_REST = 0.18; // facing the rock
const CUBE0 = () => F.cubes[0].position;
let blinkTimes = [1.6, 7.3, 9.6, 12.9, 14.15, 14.55, 40.6, 43.0, 47.05];
function blinkAt(T) { let b = 0; for (const bt of blinkTimes) { const d = T - bt; if (d > 0 && d < 0.2) b = Math.max(b, Math.sin(d / 0.2 * Math.PI)); } return b; }

function wombatStory(T) {
  const o = { time: T, blink: blinkAt(T), moving: 0, walk: 0 };
  let pos, yaw;
  if (T < 39.5) {
    const s = DPATH * smoother(0.0, 3.8, T) * 0.985 + DPATH * 0.015 * clamp(T / 3.8);
    pos = lerpV(P0, P1, s / DPATH); o.walk = s / STRIDE; o.moving = smooth(0, 0.25, T) * (1 - smooth(3.3, 3.85, T));
    yaw = lerp(YAW_WALK, YAW_REST, smooth(3.4, 4.4, T));
    if (T < 6.6) { o.look = lerpV(V(0.2, 0.25, 1.5), V(0.1, 0.05, 0.16), smooth(3.6, 4.8, T)); o.lookAmt = 0.7; }
    else if (T < 8.0) { o.look = cam.position.clone(); o.lookAmt = smooth(6.6, 7.0, T); o.wide = 0.3; o.headTilt = 0.15 * smooth(7.0, 7.6, T); }
    else if (T < 11.3) { // sniff the cube
      const k = smooth(8.0, 9.0, T) * (1 - smooth(10.9, 11.5, T));
      o.look = CUBE0().clone().add(V(0, 0.01, 0)); o.lookAmt = k; o.sniff = k; o.bodyPitch = 0.12 * k; o.crouch = 0.6 * k; o.earTwitch = k * 0.4;
      o.headTilt = -0.2 * smooth(10.0, 10.6, T) * k;
    } else if (T < 15.0) { // puzzled look at camera
      o.look = cam.position.clone(); o.lookAmt = smooth(11.3, 11.9, T); o.headTilt = 0.35 * smooth(11.6, 12.4, T) - 0.6 * smooth(13.9, 14.3, T) * (1 - smooth(14.6, 14.9, T)); o.wide = 0.5; o.earTwitch = smooth(14.2, 14.3, T) * (1 - smooth(14.6, 14.8, T));
    } else { o.look = null; o.headYaw = 0; o.headPitch = 0.05; }
  } else {
    // S5: tail-end gag, turn to camera, freeze, waddle off
    pos = P1.clone(); yaw = YAW_REST;
    const camRear = V(-0.8, 0.36, -2.25);
    const yawToCam = Math.atan2(camRear.x - pos.x, camRear.z - pos.z); // ~ -2.5
    if (T < 44.6) { o.tailWag = smooth(41.8, 42.2, T) * (1 - smooth(44.0, 44.4, T)); o.look = lerpV(V(0.1, 0.05, 0.16), V(0.2, 0.25, 1.5), smooth(40.0, 41.0, T)); o.lookAmt = 0.6; }
    else if (T < 47.9) {
      const u = smoother(44.6, 45.8, T); yaw = lerp(YAW_REST, yawToCam + 2 * Math.PI, u); // turn clockwise the short way
      o.walk = u * 3.2; o.moving = Math.sin(u * Math.PI) * 0.9;
      o.look = camRear.clone(); o.lookAmt = smooth(45.4, 45.8, T); o.wide = 0.7 * smooth(45.6, 45.8, T); o.pupil = 0.6;
    } else {
      const u = smooth(47.95, 48.35, T); const away = Math.atan2(1, 0.3);
      yaw = lerp(yawToCam + 2 * Math.PI, away, u);
      const d = Math.max(0, T - 48.2) * 0.42; pos = P1.clone().add(V(Math.sin(away) * d, 0, Math.cos(away) * d));
      o.walk = 3.2 + u * 1.5 + d / STRIDE; o.moving = Math.max(u * 0.8, smooth(48.2, 48.4, T));
      o.tailWag = smooth(48.3, 48.5, T) * 0.6;
    }
  }
  wb.root.position.copy(pos); wb.root.rotation.set(0, yaw, 0);
  wb.update(o);
  return o;
}

function forestCam(T) {
  const head = wb.headWorld(new THREE.Vector3());
  const body = wb.bodyWorld(new THREE.Vector3());
  const cubeC = V(0.1, F.ALTAR_Y + 0.02, 0.16);
  let c;
  if (T < 3.2) {
    const u = smoother(0, 3.2, T);
    c = { pos: V(lerp(0.85, 0.75, u), lerp(0.26, 0.24, u), lerp(1.75, 1.45, u)), look: lerpV(body.clone().add(V(0, -0.02, 0)), body.clone().add(V(0.05, -0.04, 0.2)), u), fov: 38 };
  } else if (T < 5.6) {
    const u = smoother(3.2, 5.4, T);
    c = { pos: lerpV(V(0.75, 0.24, 1.45), V(0.42, 0.12, 0.72), u), look: lerpV(body.clone().add(V(0.05, -0.04, 0.2)), cubeC.clone().add(V(0, -0.015, 0)), smoother(3.4, 5.2, T)), fov: lerp(38, 34, u) };
    useBokeh(c.pos.distanceTo(c.look), 0.004 * u, 0.006);
  } else if (T < 6.6) {
    // dramatic zoom on the hero cube
    const u = easeIn(clamp((T - 5.62) / 0.28)); const hold = smooth(5.9, 6.6, T);
    const cp = CUBE0().clone();
    const from = V(0.42, 0.12, 0.72), to = cp.clone().add(V(0.06, 0.035, 0.14));
    c = { pos: lerpV(from, to, u).add(V(0.004, 0.002, 0.003).multiplyScalar(hold)), look: lerpV(cubeC.clone().add(V(0, -0.015, 0)), cp.clone().add(V(0, -0.006, 0)), u), fov: lerp(34, 28, u), roll: 0.08 * u };
    G.uZoom.value = Math.sin(clamp((T - 5.6) / 0.4) * Math.PI) * 0.9;
    const k = T - 5.9; if (k > 0) { const s = Math.exp(-k * 7) * 0.003; c.pos.x += Math.sin(k * 70) * s; c.pos.y += Math.cos(k * 63) * s; }
    useBokeh(c.pos.distanceTo(c.look), 0.006, 0.01);
  } else if (T < 8.0) {
    // innocent look into camera
    const u = smoother(6.6, 8.0, T);
    const front = V(Math.sin(YAW_REST), 0, Math.cos(YAW_REST));
    const base = head.clone().add(front.clone().multiplyScalar(1.15)).add(V(0.28, 0.05, 0));
    c = { pos: base.add(front.clone().multiplyScalar(-0.15 * u)), look: head.clone().add(V(0, -0.07, 0)), fov: 32 };
    useBokeh(c.pos.distanceTo(c.look), 0.0035, 0.007);
  } else if (T < 11.3) {
    const u = smoother(8.0, 11.3, T); const C = V(0.03, 0.13, -0.08);
    const a = lerp(1.0, -0.5, u), R = lerp(1.35, 1.15, u);
    c = { pos: C.clone().add(V(Math.sin(a) * R, lerp(0.32, 0.24, u), Math.cos(a) * R)), look: lerpV(C.clone().add(V(0, -0.06, 0)), V(0.06, 0.05, 0.02), u), fov: 36 };
    useBokeh(c.pos.distanceTo(c.look), 0.003, 0.006);
  } else if (T < 15.0) {
    const u = smoother(11.3, 13.6, T);
    const dir = V(-0.15, 0.1, 1).normalize();
    const from = V(0.03, 0.13, -0.08).add(V(Math.sin(-0.5) * 1.15, 0.24, Math.cos(-0.5) * 1.15));
    const to = head.clone().add(dir.multiplyScalar(1.05));
    c = { pos: lerpV(from, to, u), look: lerpV(V(0.06, 0.05, 0.02), head.clone().add(V(0, -0.07, 0)), u), fov: lerp(36, 32, u) };
    if (T > 13.6) c.pos.add(V(0, 0, -0.012 * smooth(13.6, 15, T)));
    useBokeh(c.pos.distanceTo(c.look), 0.0035, 0.007);
  } else if (T < 16.2) {
    // swing to a side profile for the X-ray
    const u = smoother(15.0, 15.8, T);
    const from = head.clone().add(V(-0.15, 0.1, 1).normalize().multiplyScalar(1.05)).add(V(0, 0, -0.012));
    const side = V(2.75, 0.5, -0.22); // wide enough for the whole profile
    c = { pos: lerpV(from, side, u), look: lerpV(head.clone().add(V(0, -0.07, 0)), V(-0.02, 0.12, -0.3), u), fov: 36 };
    G.uZoom.value = Math.sin(clamp((T - 15.0) / 0.8) * Math.PI) * 0.3;
  } else if (T < 41.5) {
    const u = smoother(39.5, 41.5, T);
    c = { pos: lerpV(V(1.55, 0.5, 1.45), V(1.3, 0.42, 1.15), u), look: V(0.02, 0.06, -0.2), fov: 36 };
  } else if (T < 44.6) {
    const u = smoother(41.5, 43.0, T);
    const a0 = Math.atan2(1.32, 1.15 + 0.42), a1 = Math.atan2(-0.4, -0.92);
    const a = lerp(a0, a1, u); const R = lerp(2.05, 1.45, u);
    c = { pos: V(Math.sin(a) * R - 0.02, lerp(0.42, 0.3, u), Math.cos(a) * R - 0.42), look: lerpV(V(0.02, 0.06, -0.2), V(-0.02, 0.12, -0.72), u), fov: lerp(36, 34, u) };
    useBokeh(c.pos.distanceTo(c.look), 0.0025 * u, 0.005);
  } else {
    const camRear = V(-0.8, 0.36, -2.25);
    const u = smoother(45.4, 47.8, T);
    const hd = T < 47.9 ? head.clone().add(V(0, -0.07, 0)) : V(-0.02, 0.13, -0.42); const target = T < 47.9 ? lerpV(V(-0.02, 0.12, -0.72), hd, smoother(44.6, 45.8, T)) : hd;
    c = { pos: lerpV(camRear, lerpV(camRear, V(-0.02, 0.2, -0.42), 0.18), u), look: target, fov: lerp(34, 32, u) };
    if (T >= 47.9) { const k = smoother(47.9, 49.5, T); const p0 = lerpV(camRear, V(-0.02, 0.2, -0.42), 0.18); c.pos = lerpV(p0, p0.clone().add(V(-0.1, 0.08, -0.35)), k); c.look = lerpV(V(-0.02, 0.13, -0.42), V(0.25, 0.1, -0.35), k); c.fov = 34; }
    useBokeh(c.pos.distanceTo(c.look), 0.003, 0.006);
    // comic freeze: subtle desaturation and vignette hold
    const fr = smooth(45.8, 46.0, T) * (1 - smooth(47.85, 47.95, T));
    G.uDesat.value = 0.25 * fr; G.uVignette.value = 0.36 + 0.2 * fr;
  }
  applyCam(c);
}

function renderForest(T) {
  wombatStory(T);
  forest.updateMatrixWorld(true);
  forestCam(T);
  F.update(T);
  // scan ring 15.35-16.2
  scanRing.visible = T > 15.35 && T < 16.25;
  if (scanRing.visible) {
    const u = smooth(15.35, 16.15, T); const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, YAW_REST, 0));
    scanRing.position.copy(V(0, 0.2, lerp(0.45, -0.42, u)).applyQuaternion(q).add(P1)); scanRing.quaternion.copy(q);
    scanRing.material.opacity = Math.sin(u * Math.PI); scanDisc.material.opacity = 0.15 * Math.sin(u * Math.PI);
  }
  if (T > 15.8 && T < 16.2) G.uFlash.value = smooth(15.8, 16.2, T) * 0.9, G.uFlashColor.value.set(0.56, 0.94, 1.0);
  if (T < 0.6) G.uBlack.value = 1 - smooth(0, 0.6, T);
  if (T > 39.5 && T < 39.9) { G.uFlash.value = 1 - smooth(39.5, 39.9, T); }
  G.uBlack.value = Math.max(G.uBlack.value, smooth(48.8, 49.5, T));
  post.set(forest, cam);
}

// ---------------- X-RAY ----------------
function renderXray(T) {
  // same pose as the end of the forest swing
  ghost.root.position.copy(P1); ghost.root.rotation.set(0, YAW_REST, 0);
  ghost.update({ time: T, headPitch: 0.05, blink: 0 });
  xray.updateMatrixWorld(true);
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, YAW_REST, 0));
  const toW = (v) => v.clone().applyQuaternion(q).add(P1);
  const distalMid = toW(tract.distalCurve.getPointAt(0.5));
  let c;
  if (T < 18.6) {
    const u = smoother(16.2, 18.6, T);
    c = { pos: lerpV(V(2.75, 0.5, -0.22), V(2.3, 0.95, 0.15), u), look: lerpV(V(-0.02, 0.12, -0.3), V(-0.02, 0.1, -0.36), u), fov: 36 };
  } else {
    const u = easeIn(clamp((T - 18.6) / 1.0));
    const from = V(2.3, 0.95, 0.15);
    const to = distalMid.clone().add(V(0.06, 0.012, 0.02));
    c = { pos: lerpV(from, to, u), look: lerpV(V(-0.02, 0.1, -0.36), distalMid, smoother(18.6, 19.1, T)), fov: lerp(36, 28, u) };
    G.uZoom.value = u * 0.8;
  }
  applyCam(c, xcam);
  // glow pulses
  const pulse = 0.5 + 0.5 * Math.sin(T * 6);
  tract.hot.emissiveIntensity = lerp(0.25, 1.4 + 0.5 * pulse, smooth(18.2, 18.8, T));
  tract.hot.color.set(T > 18.2 ? '#ffb35a' : '#f29a8c'); tract.hot.emissive.set(T > 18.2 ? '#ff8a1a' : '#7a2a24');
  tract.dcubes.forEach(cb => cb.visible = T > 18.4);
  // reveal: tract fades in, ghost shell glows
  const rev = smooth(16.2, 16.9, T);
  tract.mat.opacity = tract.matC.opacity = 0.95 * rev;
  if (ghost.ghostMat) ghost.ghostMat.uniforms.uOp.value = 0.6 + 0.4 * rev;
  // round cross-section marker on the distal colon (17.0-18.6)
  secRing.visible = T > 16.9 && T < 18.7;
  if (secRing.visible) { const p = tract.distalCurve.getPointAt(0.35), tg = tract.distalCurve.getTangentAt(0.35); secRing.position.copy(p); secRing.quaternion.setFromUnitVectors(V(0, 0, 1), tg); const k = smooth(16.9, 17.3, T) * (1 - smooth(18.4, 18.7, T)); secRing.scale.setScalar(0.6 + 0.5 * k); secRing.material.opacity = k; }
  G.uFlash.value = (1 - smooth(16.2, 16.6, T)) * 0.9; G.uFlashColor.value.set(0.56, 0.94, 1.0);
  if (T > 19.35) { G.uFlash.value = smooth(19.35, 19.6, T); G.uFlashColor.value.set(1.0, 0.85, 0.6); }
  post.bloom.strength = 0.6; post.bloom.threshold = 0.6;
  post.set(xray, xcam);
}

// ---------------- LAB ----------------
function renderLab(T) {
  const ts = lab.tubeState, ss = lab.secState;
  let mode = 'tube', c;
  if (T < 27.6) {
    ts.code = smooth(20.2, 21.2, T); ts.wave = smooth(23.3, 24.0, T); ts.square = smooth(23.8, 27.4, T) * 0.75; ts.amp = 0.14;
    if (T < 21.8) { const u = smoother(19.6, 21.8, T); c = { pos: lerpV(V(0.25, 1.6, 1.0), V(0.55, 0.9, 3.5), u), look: lerpV(V(0, 1.5, 0), V(0, 0.6, 0), u), fov: lerp(32, 38, u) }; }
    else if (T < 23.5) { const u = smoother(21.8, 23.5, T); c = { pos: lerpV(V(0.55, 0.9, 3.5), V(0.35, 0.2, 3.4), u), look: lerpV(V(0, 0.6, 0), V(0, -0.1, 0), u), fov: 38 }; }
    else { const u = smoother(23.5, 27.6, T); c = { pos: lerpV(V(0.35, 0.2, 3.4), V(0.5, -0.8, 3.0), u), look: lerpV(V(0, -0.1, 0), V(0, -0.75, 0), u), fov: lerp(38, 36, u) }; }
    G.uFlash.value = (1 - smooth(19.6, 20.0, T)) * 0.9; G.uFlashColor.value.set(1.0, 0.85, 0.6);
    useBokeh(c.pos.distanceTo(c.look), 0.0012, 0.004);
  } else if (T < 32.6) {
    mode = 'section';
    const k = T - 27.6; const period = 1.25;
    ss.c = (0.5 - 0.5 * Math.cos(Math.max(0, k - 0.6) / period * Math.PI * 2)) * smooth(27.9, 28.4, T);
    ss.n = 2 + 4.6 * smoother(29.0, 32.4, T);
    const u = smoother(27.6, 32.6, T);
    c = { pos: V(lerp(0.5, -0.35, u), lerp(0.1, -0.15, u), lerp(4.9, 4.4, u)), look: V(0, -0.35, 0), fov: 40 };
    lab.section.rotation.set(-0.12, 0.12 * Math.sin(T * 0.4), 0);
    G.uFlash.value = (1 - smooth(27.6, 27.95, T)) * 0.8; G.uFlashColor.value.set(0.56, 0.94, 1.0);
  } else if (T < 36.6) {
    ts.code = 1; ts.wave = 1; ts.square = 1; ts.amp = 0.16;
    const u = smoother(32.6, 36.6, T);
    c = { pos: lerpV(V(0.9, -1.0, 3.2), V(0.5, -2.0, 2.3), u), look: lerpV(V(0, -1.6, 0), V(0, -2.5, 0), u), fov: 36 };
    G.uFlash.value = (1 - smooth(32.6, 32.95, T)) * 0.8; G.uFlashColor.value.set(0.56, 0.94, 1.0);
    useBokeh(c.pos.distanceTo(c.look), 0.0015, 0.005);
  } else {
    mode = 'compare';
    const u = smoother(36.6, 39.5, T);
    lab.pellet.rotation.y = T * 0.5; lab.bigCube.rotation.y = 0.5 + T * 0.5;
    lab.dimM.opacity = smooth(37.6, 38.0, T);
    c = { pos: lerpV(V(0, 0.1, 4.8), V(0, 0.0, 4.45), u), look: V(0, -0.42, 0), fov: 36 };
    G.uFlash.value = (1 - smooth(36.6, 36.95, T)) * 0.8; G.uFlashColor.value.set(0.56, 0.94, 1.0);
    if (T > 39.1) { G.uFlash.value = smooth(39.1, 39.5, T); G.uFlashColor.value.set(1, 0.95, 0.85); }
  }
  lab.update(T - 19.6, mode);
  applyCam(c, lcam);
  post.bloom.strength = 0.4; post.bloom.threshold = 0.8;
  G.uVignette.value = 0.45;
  post.set(lab.scene, lcam);
}

window.NOPOST = false;
window.renderFrame = (T) => {
  resetFX(); G.uTime.value = T;
  if (T < 16.2 || T >= 39.5) renderForest(T);
  else if (T < 19.6) renderXray(T);
  else renderLab(T);
  if (window.NOPOST) renderer.render(post.renderPass.scene, post.renderPass.camera); else post.composer.render();
  return renderer.domElement.toDataURL('image/jpeg', 0.93);
};
window.READY = true;
