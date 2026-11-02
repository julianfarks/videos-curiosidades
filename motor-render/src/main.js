import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildGecko } from './gecko.js';
import { buildMan } from './man.js';
import { buildRoom } from './room.js';
import { buildMicro } from './micro.js';
import { buildMolecular } from './molecular.js';
import { makePost } from './post.js';
import { clamp, lerp, smooth, smoother, easeInOut, easeOut, easeIn } from './lib.js';

const qs = new URLSearchParams(location.search);
const W = +(qs.get('w') || 1080), H = +(qs.get('h') || 1920);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);
const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// ---------------- ROOM WORLD ----------------
const room = new THREE.Scene();
room.background = new THREE.Color('#1a1410');
room.environment = envTex; room.environmentIntensity = 0.35;
const R = buildRoom(room);
const man = buildMan(); man.root.position.set(0, 0.53, -1.42); room.add(man.root);
const gecko = buildGecko(); room.add(gecko.root);
const GS = 1.15; gecko.root.scale.setScalar(GS);
const cam = new THREE.PerspectiveCamera(38, W / H, 0.01, 40);
room.add(cam);

const CEIL = R.H - 0.0005;
const flipQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
const yawQ = (a) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a);
const GSTART = new THREE.Vector3(-0.32, CEIL, -1.05), GYAW = -0.35; // heading slightly toward camera (+z)

// gecko on ceiling at walk phase w; walk forward along heading. Note: flipped body => local +x maps to world +x, local z to -z.
function geckoOnCeiling(walk, extra = {}) {
  gecko.root.position.copy(GSTART);
  gecko.root.quaternion.copy(yawQ(GYAW)).multiply(flipQ);
  gecko.update({ walk, sway: 1, detached: 0, ...extra });
}

const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// world point on ceiling where gecko body center is at walk w
function geckoCeilPoint(w, x = 0.02) {
  geckoOnCeiling(w); return gecko.bodyWorld(x, new THREE.Vector3());
}

// ---------------- STORY (tau) for room ----------------
const FALL0 = 8.25, FALL1 = 8.82;
const WALK_RATE = 0.62; // cycles per second
function storyRoom(tau) {
  const st = { manT: tau, scare: 0, jump: 0, lookUp: 0, freeze: false, phone: 1, suspicious: 0, headYaw: 0, recoil: 0 };
  if (tau < FALL0) {
    // slip anticipation: front foot loses grip around 7.9
    const slip = smooth(7.85, FALL0, tau);
    geckoOnCeiling(Math.min(tau, 7.8) * WALK_RATE, { peelLeg: 0, peelAmt: slip, headYaw: -slip * 0.4, look: slip > 0 ? cam.position.clone() : null });
  } else if (tau < FALL1) {
    const u = (tau - FALL0) / (FALL1 - FALL0);
    const p0 = geckoCeilPoint(7.8 * WALK_RATE);
    const p1 = man.headTop(new THREE.Vector3());
    const pos = new THREE.Vector3().lerpVectors(p0, p1, u * u);
    pos.x += Math.sin(u * Math.PI) * 0.12; pos.z += Math.sin(u * Math.PI) * 0.06;
    gecko.root.position.copy(pos);
    const spin = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI * (1 - u * 1.0) + u * 2.0 * Math.PI, GYAW + u * 1.6, u * 1.2));
    gecko.root.quaternion.copy(spin);
    gecko.root.position.sub(new THREE.Vector3(0, 0.02, 0).applyQuaternion(spin));
    gecko.update({ walk: 7.8 * WALK_RATE, detached: 1, time: tau, sway: 2, tailCurl: Math.sin(tau * 20) * 0.8, look: null, peelLeg: -1 });
  }
  if (tau >= FALL1 - 0.02) {
    const k = tau - FALL1;
    st.scare = smooth(0.0, 0.12, k); st.jump = Math.sin(clamp(k / 0.45) * Math.PI) * 1.0; st.phone = k < 0.25 ? 1 : 0;
    st.recoil = smooth(0, 0.3, k);
  }
  man.update({ t: st.manT, scare: st.scare, jump: st.jump, lookUp: st.lookUp, freeze: st.freeze, phone: st.phone, suspicious: st.suspicious, headYaw: st.headYaw, recoil: st.recoil });
  room.updateMatrixWorld(true);
  if (tau >= FALL1) {
    // gecko clings on top of the head, facing the camera
    const hq = man.head.getWorldQuaternion(new THREE.Quaternion());
    const top = man.headTop(new THREE.Vector3());
    const k = tau - FALL1; const squash = 1 - 0.25 * Math.exp(-k * 10) * Math.sin(k * 30);
    gecko.root.position.copy(top).add(new THREE.Vector3(-0.03, 0.006, 0.0).applyQuaternion(hq));
    gecko.root.quaternion.copy(hq).multiply(yawQ(-0.45));
    gecko.root.scale.set(GS, GS * squash, GS);
    gecko.update({ walk: 0.2, detached: 0, sway: 0.2, time: tau, tailCurl: Math.sin(tau * 12) * 0.5, headPitch: 0.25, headYaw: Math.sin(tau * 9) * 0.15, look: cam.position.clone(), peelLeg: -1, peelAmt: 0 });
  } else gecko.root.scale.setScalar(GS);
}

// camera for story (S1, S2)
function camStory(tau, out) {
  const glSaved = gecko.root.position.clone();
  const manLook = V(0.0, 1.02, -1.38);
  const gp = geckoCeilPoint(Math.min(tau, 7.8) * WALK_RATE);
  let pos, look, fov = 38;
  if (tau < 2.2) {
    const u = smooth(0, 2.2, tau);
    pos = V(lerp(0.32, 0.22, u), lerp(1.02, 1.08, u), lerp(1.15, 0.95, u)); look = manLook.clone();
  } else if (tau < 5.6) {
    const u = smoother(2.2, 5.6, tau);
    pos = V(lerp(0.22, 0.18, u), lerp(1.08, 1.62, u), lerp(0.95, 0.45, u));
    look = new THREE.Vector3().lerpVectors(manLook, gp, smoother(2.4, 5.4, tau));
  } else if (tau < FALL0) {
    const u = smoother(5.6, 8.0, tau);
    const close = gp.clone().add(V(0.06, -0.42, 0.34));
    pos = new THREE.Vector3().lerpVectors(V(0.18, 1.62, 0.45), close, u);
    look = gp.clone(); fov = lerp(38, 30, u);
  } else {
    // whip down with the fall, settle on man
    const u = smoother(FALL0, FALL0 + 0.75, tau);
    const close = gp.clone().add(V(0.06, -0.42, 0.34));
    pos = new THREE.Vector3().lerpVectors(close, V(0.2, 1.22, 0.42), u);
    const gl = glSaved;
    look = new THREE.Vector3().lerpVectors(gl, V(0.0, 1.22, -1.38), smoother(FALL0 + 0.35, FALL0 + 1.1, tau));
    fov = lerp(30, 40, u);
    // impact shake
    const k = tau - FALL1; if (k > 0) { const s = Math.exp(-k * 6) * 0.012; pos.x += Math.sin(k * 61) * s; pos.y += Math.cos(k * 53) * s; }
    // slow push-in during the scare
    const v = smooth(FALL1 + 0.6, 13, tau); pos.lerp(V(0.12, 1.28, -0.2), v * 0.5);
  }
  out.pos = pos; out.look = look; out.fov = fov; return out;
}

function applyCam(c) { cam.position.copy(c.pos); cam.fov = c.fov; cam.updateProjectionMatrix(); cam.lookAt(c.look); }
function mixCam(a, b, t) { return { pos: a.pos.clone().lerp(b.pos, t), look: a.look.clone().lerp(b.look, t), fov: lerp(a.fov, b.fov, t) }; }

// ---------------- MICRO & MOLECULAR WORLDS ----------------
const micro = buildMicro(renderer, envTex, W, H);
const mol = buildMolecular(renderer, envTex, W, H);

// ---------------- POST ----------------
const post = makePost(renderer, W, H);
const G = post.grade.uniforms;

function resetFX() {
  G.uFlash.value = 0; G.uZoom.value = 0; G.uRewind.value = 0; G.uDesat.value = 0; G.uVignette.value = 0.34; G.uGrain.value = 0.03; G.uWarm.value = 1; G.uBlack.value = 0; G.uCA.value = 0.0012; G.uTint.value.set(1, 1, 1);
  post.bokeh.enabled = false; post.bloom.strength = 0.3; post.bloom.threshold = 0.85; post.bloom.radius = 0.55;
  renderer.toneMappingExposure = 0.95;
}

function useBokeh(focusDist, aperture = 0.0035, maxblur = 0.007) {
  post.bokeh.enabled = true; const u = post.bokeh.uniforms;
  u.focus.value = focusDist; u.aperture.value = aperture; u.maxblur.value = maxblur; u.aspect.value = cam.aspect; u.nearClip.value = cam.near; u.farClip.value = cam.far;
}

// ---------------- MASTER TIMELINE ----------------
// S1 0-8 | S2 8-13 | S3 13-17.8 | S4 17.8-29.2 | S5 29.2-41.6 | S6 41.6-52
export const DURATION = 52.0;

function renderRoomStory(T) {
  // T 0..13 -> tau = T
  storyRoom(T); const c = camStory(T, {}); storyRoom(T); applyCam(c);
  const fd = cam.position.distanceTo(c.look);
  if (T > 5.0 && T < 8.4) useBokeh(fd, 0.004, 0.006);
  post.set(room, cam);
}

function renderRewind(T) {
  // 13.0-13.5 freeze; 13.5-15.3 rewind 13->3; 15.3-17.8 calm walk
  let tau;
  if (T < 13.5) { tau = 13.0; G.uDesat.value = smooth(13.0, 13.12, T) * 0.35; G.uVignette.value = 0.5; }
  else if (T < 15.3) { const u = easeInOut((T - 13.5) / 1.8); tau = lerp(13.0, 3.0, u); G.uRewind.value = Math.sin(Math.PI * clamp((T - 13.5) / 1.8)) * 0.9 + 0.1; G.uDesat.value = 0.2; }
  else { tau = 3.0 + (T - 15.3) * 0.6; G.uRewind.value = 1 - smooth(15.3, 15.6, T); }
  storyRoom(tau);
  let c = camStory(tau, {}); storyRoom(tau);
  if (T >= 15.3) {
    // drift toward the ceiling, re-framing the calm gecko
    const gp = gecko.bodyWorld(0.03, new THREE.Vector3());
    const target = { pos: gp.clone().add(V(0.1, -0.55, 0.42)), look: gp.clone(), fov: 34 };
    c = mixCam(c, target, smoother(15.3, 17.6, T));
  }
  applyCam(c);
  if (T > 15.6) useBokeh(cam.position.distanceTo(c.look), 0.003, 0.005);
  post.set(room, cam);
}

function renderFootMacro(T) {
  // 17.8 - 22.1 : macro on front foot; toes peel to reveal pads; zoom into a lamella
  const tau = 3.0 + (17.8 - 15.3) * 0.6; // continuity of walk
  const peel = smooth(18.6, 19.8, T);
  const w = tau * WALK_RATE;
  geckoOnCeiling(w, { peelLeg: 0, peelAmt: peel * 0.85, headYaw: 0.1, look: null });
  man.update({ t: T, phone: 1 });
  room.updateMatrixWorld(true);
  const foot = gecko.footWorld(0, new THREE.Vector3());
  const gp = gecko.bodyWorld(0.03, new THREE.Vector3());
  const a = { pos: gp.clone().add(V(0.1, -0.55, 0.42)), look: gp.clone(), fov: 34 };
  const b = { pos: foot.clone().add(V(0.05, -0.085, 0.11)), look: foot.clone().add(V(0, -0.006, 0)), fov: 30 };
  const cpad = { pos: foot.clone().add(V(0.012, -0.022, 0.03)), look: foot.clone().add(V(0.004, -0.004, 0)), fov: 22 };
  let c = mixCam(a, b, smoother(17.8, 19.6, T));
  c = mixCam(c, cpad, smoother(19.8, 21.9, T));
  applyCam(c);
  useBokeh(cam.position.distanceTo(c.look), lerp(0.003, 0.008, smooth(19, 21.5, T)), 0.01);
  G.uZoom.value = smooth(21.2, 22.1, T) * 1.0; G.uFlash.value = smooth(21.7, 22.1, T) * 0.85;
  post.set(room, cam);
}

function renderFinale(T) {
  // S6 41.6-52: A) 41.6-46.6 foot peel low-angle; B) 46.6-52 face close-up, look to camera, man suspicious
  const k = T - 41.6;
  if (T < 46.6) {
    const w = 2.0 + k * 0.42;
    geckoOnCeiling(w, { look: null, headYaw: 0.05 });
    man.update({ t: T, phone: 0, lookUp: 1, suspicious: 0.6 });
    room.updateMatrixWorld(true);
    const foot = gecko.footWorld(1, new THREE.Vector3());
    const gp = gecko.bodyWorld(0.0, new THREE.Vector3());
    const c = { pos: gp.clone().add(V(0.09, -0.11, 0.17)), look: gp.clone().lerp(foot, 0.6), fov: 32 };
    c.pos.x += k * 0.012;
    applyCam(c); useBokeh(cam.position.distanceTo(c.look), 0.005, 0.008);
  } else {
    const kk = T - 46.6; const w = 2.0 + 5.0 * 0.42 + kk * 0.30 * (1 - smooth(1.0, 1.8, kk)) + smooth(3.6, 4.6, kk) * 0.4 * (kk - 3.6);
    const lookAtCam = smooth(0.9, 1.4, kk) * (1 - smooth(3.4, 3.9, kk));
    const lick = smooth(2.2, 2.45, kk) * (1 - smooth(2.75, 3.0, kk));
    geckoOnCeiling(w, { look: lookAtCam > 0.1 ? cam.position.clone() : null, headYaw: -0.55 * lookAtCam, headPitch: -0.35 * lookAtCam, tongue: lick });
    man.update({ t: T, phone: 0, lookUp: 1, suspicious: 1 });
    room.updateMatrixWorld(true);
    const head = gecko.headWorld(new THREE.Vector3());
    const c = { pos: head.clone().add(V(0.0, -0.17, 0.2)), look: head.clone().add(V(0, -0.01, 0)), fov: 30 };
    c.pos.add(V(-0.03, -0.01, -0.03).multiplyScalar(kk / 5));
    applyCam(c); useBokeh(cam.position.distanceTo(c.look), 0.0045, 0.009);
  }
  G.uFlash.value = 1 - smooth(41.6, 42.0, T);
  G.uBlack.value = smooth(50.4, 51.6, T);
  post.set(room, cam);
}

window.NOPOST = false;
window.renderFrame = (T) => {
  resetFX();
  G.uTime.value = T;
  if (T < 13.0) renderRoomStory(T);
  else if (T < 17.8) renderRewind(T);
  else if (T < 22.1) renderFootMacro(T);
  else if (T < 29.2) { micro.render(T, post, G); }
  else if (T < 36.6) { mol.render(T, post, G); }
  else if (T < 41.6) { micro.render(T, post, G); }
  else renderFinale(T);
  if (window.NOPOST) { renderer.render(post.renderPass.scene, post.renderPass.camera); } else post.composer.render();
  return renderer.domElement.toDataURL('image/jpeg', 0.93);
};
window.debugView = (T, px, py, pz, lx, ly, lz, fov = 30) => {
  window.renderFrame(T); resetFX(); applyCam({ pos: V(px, py, pz), look: V(lx, ly, lz), fov }); post.set(room, cam); post.composer.render();
  return renderer.domElement.toDataURL('image/jpeg', 0.93);
};
window.diagWalk = (n = 400) => {
  const res = { worstBody: 1e9, worstLeg: 1e9, elbowMinDeg: 1e9, minFootY: 1e9, where: '' };
  for (let i = 0; i < n; i++) {
    const w = i / n * 4; geckoOnCeiling(w, { peelLeg: -1, peelAmt: 0 });
    const d = gecko.diagnose();
    if (d.worstBody < res.worstBody) { res.worstBody = d.worstBody; res.where = d.where + ' w=' + w.toFixed(3); }
    res.worstLeg = Math.min(res.worstLeg, d.worstLeg); res.elbowMinDeg = Math.min(res.elbowMinDeg, d.elbowMinDeg); res.minFootY = Math.min(res.minFootY, d.minFootY);
  }
  return res;
};
window.READY = true;
