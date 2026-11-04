import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildHuman } from './human.js';
import { buildLab, buildKitchen, buildMolecules, softSprite } from './world.js';
import { makePost } from './post.js';
import { clamp, lerp, smooth, smoother, easeOut } from './lib.js';

const qs = new URLSearchParams(location.search);
const W = +(qs.get('w') || 1080), H = +(qs.get('h') || 1920);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lerpV = (a, b, t) => new THREE.Vector3().lerpVectors(a, b, t);
const sm = (a, b, T) => smoother(a, b, T);

const lab = buildLab(); lab.scene.environment = envTex; lab.scene.environmentIntensity = 0.25;
const kit = buildKitchen(); kit.scene.environment = envTex; kit.scene.environmentIntensity = 0.3;
const mol = buildMolecules(); mol.scene.environment = envTex; mol.scene.environmentIntensity = 0.5;
const percy = buildHuman({ style: 'percy' }); lab.scene.add(percy.root);
const person = buildHuman({ style: 'modern' }); kit.scene.add(person.root);

// falling popcorn for the comic beat (lab) and the flying popcorn (kitchen)
function popcornMesh(seed) {
  const g = new THREE.Group(); const m = new THREE.MeshPhysicalMaterial({ color: '#fff4dc', roughness: 0.75, sheen: 0.5, sheenColor: new THREE.Color('#fff2c8') });
  let s = seed; const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let k = 0; k < 7; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.012 + r() * 0.01, 12, 10), m); b.position.set((r() - 0.5) * 0.03, (r() - 0.5) * 0.03, (r() - 0.5) * 0.03); b.castShadow = true; g.add(b); }
  return g;
}
const rain = []; for (let i = 0; i < 12; i++) { const p = popcornMesh(17 + i * 7); lab.scene.add(p); p.visible = false; rain.push({ p, x: (Math.sin(i * 2.3) * 0.22), z: (Math.cos(i * 1.7) * 0.22), d: i * 0.13, s: 1.6 + (i % 3) * 0.3 }); }
const hairPop = popcornMesh(5); percy.head.add(hairPop); hairPop.position.set(0.02, 0.19, 0.03); hairPop.scale.setScalar(1.3); hairPop.visible = false;
const flyPop = popcornMesh(77); kit.scene.add(flyPop); flyPop.visible = false; flyPop.scale.setScalar(1.6);

const cam = new THREE.PerspectiveCamera(40, W / H, 0.01, 200);
const post = makePost(renderer, W, H); const G = post.grade.uniforms;
function resetFX() { G.uFlash.value = 0; G.uZoom.value = 0; G.uRewind.value = 0; G.uDesat.value = 0; G.uVignette.value = 0.4; G.uGrain.value = 0.03; G.uBlack.value = 0; G.uCA.value = 0.0012; G.uTint.value.set(1, 1, 1); G.uFlashColor.value.set(1, 1, 1); post.bokeh.enabled = false; post.bloom.strength = 0.45; post.bloom.threshold = 0.8; }
function applyCam(c) { cam.position.copy(c.pos); cam.fov = c.fov || 40; cam.near = c.near || 0.02; cam.updateProjectionMatrix(); cam.up.set(Math.sin(c.roll || 0), Math.cos(c.roll || 0), 0); cam.lookAt(c.look); }
function useBokeh(focus, aperture = 0.003, maxblur = 0.007) { post.bokeh.enabled = true; post.bokeh.uniforms.focus.value = focus; post.bokeh.uniforms.aperture.value = aperture; post.bokeh.uniforms.maxblur.value = maxblur; }
function oldLook() { G.uDesat.value = 0.14; G.uTint.value.setRGB(1.07, 1.0, 0.86); G.uVignette.value = 0.5; G.uGrain.value = 0.05; }
const blinks = [1.2, 3.1, 8.6, 11.3, 15.2, 19.0, 26.9, 42.1, 43.8];
const blinkAt = (T) => { let b = 0; for (const bt of blinks) { const d = T - bt; if (d > 0 && d < 0.18) b = Math.max(b, Math.sin(d / 0.18 * Math.PI)); } return b; };

// ---------------------------------------------------------------- Percy poses (spine-local targets; character faces +z)
const KNOB = V(-0.2, 0.02, 0.6), BENCH_L = V(0.24, -0.06, 0.5), POCKET = V(0.06, 0.33, 0.2), SHOW = V(-0.03, 0.5, 0.36), CHIN = V(-0.03, 0.52, 0.17);
const handWorld = (h, side) => { h.spine.updateMatrixWorld(true); return h.arms[side].hand.getWorldPosition(new THREE.Vector3()); };
function working(T, o) {
  o.handR = KNOB.clone().add(V(0, 0.005 * Math.sin(T * 2.3), 0)); o.rotR = [-1.25, 0.25 * Math.sin(T * 1.7), 1.2]; o.curlR = 0.65; o.thumbR = 0.7;
  o.handL = BENCH_L.clone(); o.rotL = [-1.45, 0, -0.2]; o.curlL = 0.2;
  o.headPitch = 0.28; o.lookY = -0.3; o.lookX = -0.15; o.lean = 0.12; o.knob = Math.sin(T * 1.7) * 0.9;
}
function percyBase(T) { return { time: T, pos: V(0, 0, 0), yaw: -Math.PI / 2, blink: blinkAt(T), choc: {} }; }

// ---------------------------------------------------------------- LAB scenes
function renderLab(T, mode) {
  const o = percyBase(T); let c, labO = { waves: 0, magOn: 1 };
  rain.forEach(r => r.p.visible = false); hairPop.visible = false;
  if (mode === 'hook') {
    if (T < 2.6) { working(T, o); }
    else {
      working(T, o);
      const s1 = sm(2.6, 3.2, T), s2 = sm(3.3, 4.3, T), s3 = sm(4.4, 5.3, T);
      o.headPitch = lerp(0.28, 0.75, s1) - 0.55 * s3; o.lookY = lerp(-0.3, -0.7, s1) + 0.7 * s3; o.lookX = lerp(-0.15, 0.2, s1) - 0.2 * s3; o.frown = s1 * (1 - s3) * 0.8;
      o.handR = lerpV(lerpV(KNOB, POCKET, s2), SHOW, s3); o.rotR = [lerp(-1.25, -0.4, s2) + s3 * -0.6, 0, lerp(1.2, 0.3, s2)]; o.curlR = lerp(0.65, 0.55, s2);
      o.choc = { inHand: s2 > 0.98 || s3 > 0 ? 'R' : null, melt: 1, handOffset: [0.0, 0.085, 0.03], handRot: [0.3, 0, 0] };
      if (!o.choc.inHand) o.choc = { melt: lerp(0.2, 1, s1), lift: 0 };
      o.stain = s1;
      // puzzled look at the bar, then at the machine, then back
      const lookM = sm(5.4, 5.7, T) * (1 - sm(6.0, 6.3, T));
      o.headYaw = lookM * 0.15; o.headPitch += lookM * -0.25; o.lookY += lookM * 0.4;
      o.puzzle = s3; o.browL = s3 * 0.7; o.mouthOpen = s3 * 0.25 + sm(6.3, 6.6, T) * 0.3; o.wide = sm(6.2, 6.5, T) * 0.7; o.lean = lerp(0.12, 0.02, s1);
    }
    // camera
    if (T < 2.6) { const u = sm(0, 2.6, T); c = { pos: lerpV(V(-1.2, 2.0, 3.4), V(-1.15, 1.7, 1.75), u), look: lerpV(V(-0.5, 1.25, -0.3), V(-0.25, 1.35, -0.05), u), fov: 40 }; }
    else if (T < 4.4) { const u = sm(2.6, 4.4, T); c = { pos: lerpV(V(-1.05, 1.62, 1.1), V(-0.95, 1.6, 0.92), u), look: V(-0.1, 1.45, 0.04), fov: 38 }; }
    else if (T < 6.35) { const u = sm(4.4, 6.35, T); percy.update(o); const bw = handWorld(percy, 'R'); c = { pos: lerpV(V(-0.95, 1.66, 0.8), V(-0.9, 1.64, 0.66), u), look: lerpV(V(-0.12, 1.58, 0.02), bw.clone().add(V(0, 0.05, 0)), u * 0.5), fov: 36 }; }
    else { const u = easeOut((T - 6.35) / 0.45); percy.update(o); const bw = percy.choc.root.getWorldPosition(new THREE.Vector3()); c = { pos: lerpV(V(-0.9, 1.64, 0.66), bw.clone().add(V(-0.26, 0.03, 0.2)), u), look: bw, fov: lerp(36, 32, u) }; G.uZoom.value = Math.max(0, 1 - Math.abs(T - 6.6) / 0.25) * 0.9; G.uFlash.value = Math.max(0, 1 - Math.abs(T - 6.62) / 0.12) * 0.35; G.uFlashColor.value.set(1, 0.82, 0.55); }
  } else if (mode === 's2') {
    oldLook();
    working(T, o);
    if (T < 10.2) { const u = sm(7.6, 10.2, T); c = { pos: lerpV(V(1.4, 2.25, 3.7), V(0.7, 1.95, 3.0), u), look: lerpV(V(-0.6, 1.2, -0.6), V(-0.55, 1.25, -0.3), u), fov: 42 }; G.uFlash.value = 1 - sm(7.6, 7.95, T); }
    else if (T < 12.4) { const u = sm(10.2, 12.4, T); c = { pos: lerpV(V(-1.2, 1.74, 1.0), V(-1.05, 1.7, 0.8), u), look: V(-0.06, 1.62, 0.02), fov: 34 }; o.smile = 0.35; o.headPitch = 0.2; }
    else if (T < 14.6) { const u = sm(12.4, 14.6, T); c = { pos: lerpV(V(-0.85, 1.75, 1.2), V(-1.05, 1.6, 1.05), u), look: V(-1.3, 1.18, -0.08), fov: 40 }; labO.waves = sm(12.8, 13.4, T); labO.waveReach = 0.62; }
    else if (T < 16.4) {
      const u = sm(14.6, 16.4, T); c = { pos: lerpV(V(-0.8, 1.52, 0.62), V(-0.68, 1.48, 0.5), u), look: V(-0.22, 1.35, 0.06), fov: 38 };
      labO.waves = 1; labO.waveReach = 0.62; labO.waveColor = '#ffb070'; o.handL = V(0.24, -0.06, 0.14); o.rotL = [-0.6, 0, -1.2]; o.curlL = 0.6;
      o.choc = { melt: sm(14.9, 16.3, T) * 0.75, glow: Math.sin(sm(14.8, 16.4, T) * Math.PI) * 0.9 }; o.stain = sm(15.0, 16.4, T) * 0.8;
    } else {
      const u = sm(16.4, 18.0, T); c = { pos: lerpV(V(-1.05, 1.66, 0.95), V(-0.95, 1.64, 0.8), u), look: V(-0.08, 1.5, 0.04), fov: 36 };
      const s = sm(16.5, 16.9, T); o.headPitch = lerp(0.28, 0.75, s); o.lookY = -0.75 * s - 0.3 * (1 - s); o.wide = s; o.mouthOpen = s * 0.55; o.brow = s * 0.4;
      o.handR = lerpV(KNOB, POCKET, sm(16.6, 17.4, T)); o.rotR = [-0.4, 0, 0.3]; o.curlR = 0.55; o.choc = { melt: 0.85, lift: sm(17.3, 17.9, T) * 0.04 }; o.stain = 0.85;
      o.puzzle = sm(17.3, 17.8, T); o.browL = o.puzzle * 0.6; o.mouthOpen = lerp(o.mouthOpen, 0.15, o.puzzle);
    }
  } else if (mode === 's3') {
    oldLook();
    working(T, o); o.choc = { visible: false }; o.stain = 0.8;
    const DISH = V(-0.08, 0.1, 0.52); // spine-local target over the stand
    let corn = { show: T > 19.3, jiggle: 0, popStart: 22.55, popSpan: 1.5, slow: 0.3, heat: 0, offset: V(0, 0, 0), stand: true };
    if (T < 20.6) {
      const think = sm(18.0, 18.5, T) * (1 - sm(19.1, 19.4, T));
      o.handR = lerpV(KNOB, CHIN, think); o.rotR = [-0.2, 0, 0.6]; o.curlR = 0.7;
      o.lookY = lerp(-0.3, 0.45, think); o.lookX = lerp(-0.15, 0.3, think); o.headPitch = lerp(0.28, -0.12, think); o.puzzle = think; o.browL = think * 0.6; o.smirk = think;
      const carry = sm(19.3, 20.3, T);
      if (T > 19.3) {
        o.handR = lerpV(V(-0.3, -0.05, 0.45), DISH.clone().add(V(0, 0.02, 0)), carry); o.rotR = [-1.5, 0, 1.4]; o.curlR = 0.35; o.headPitch = 0.35; o.lookY = -0.4; o.lookX = 0;
        // dish follows the hand until it is set down (S-local of the lab is mirrored in x)
        const hw = handWorld(percy, 'R'); const off = V(-hw.x - 0.55, hw.y - 1.1, hw.z + 0.08).multiplyScalar(1 - carry);
        corn.offset = off;
      }
      const u = sm(18.0, 20.6, T); c = { pos: lerpV(V(-1.25, 1.66, 1.15), V(-1.2, 1.58, 0.95), u), look: V(-0.3, 1.4, -0.02), fov: 40 };
    } else if (T < 22.4) {
      const u = sm(20.6, 22.4, T); c = { pos: lerpV(V(-0.25, 1.27, 0.42), V(-0.3, 1.24, 0.32), u), look: V(-0.56, 1.12, -0.08), fov: 34 };
      labO.waves = 0.5; labO.waveReach = 0.35; labO.waveDy = -0.15; corn.jiggle = sm(21.0, 22.3, T); corn.heat = sm(21.2, 22.4, T);
    } else if (T < 25.6) {
      const u = sm(22.4, 25.6, T); c = { pos: lerpV(V(-0.3, 1.24, 0.34), V(-0.18, 1.32, 0.62), u), look: lerpV(V(-0.56, 1.14, -0.08), V(-0.5, 1.3, -0.08), u), fov: 38 };
      labO.waves = 0.3; labO.waveReach = 0.35; labO.waveDy = -0.15; corn.jiggle = 1; corn.heat = 1;
    } else {
      // comic cut: Percy gets a popcorn shower, then grins
      corn.heat = 0.6; corn.jiggle = 0;
      const u = sm(25.6, 28.4, T); c = { pos: lerpV(V(-0.95, 1.72, 0.62), V(-0.88, 1.7, 0.56), u), look: V(-0.04, 1.66, 0.02), fov: 36 };
      G.uFlash.value = 1 - sm(25.6, 25.8, T); G.uFlashColor.value.set(1, 0.95, 0.7);
      o.handR = V(-0.24, 0.08, 0.32); o.rotR = [-0.9, 0, 0.5]; o.handL = V(0.22, 0.08, 0.3); o.rotL = [-0.9, 0, -0.5]; o.curlR = o.curlL = 0.15;
      o.wide = 1 - sm(27.0, 27.4, T); o.mouthOpen = 0.8 * (1 - sm(27.0, 27.4, T)); o.brow = 0.6; o.headPitch = -0.1 + 0.04 * Math.sin(T * 9) * (1 - sm(26.6, 27, T));
      o.smile = sm(27.1, 27.5, T); o.lookY = 0.5 * (1 - sm(26.8, 27.2, T)); o.lookX = sm(27.3, 27.6, T) * 0.35;
      o.blink = Math.max(o.blink, Math.max(0, 1 - Math.abs(T - 26.35) / 0.08));
      percy.update(o);
      const hp = percy.head.getWorldPosition(new THREE.Vector3());
      rain.forEach((r, i) => {
        const t0 = 25.65 + r.d; const dt = T - t0; r.p.visible = dt > 0 && dt < 2.5;
        if (!r.p.visible) return;
        let y = hp.y + 0.9 - 0.5 * 4.0 * dt * dt; const floorY = 0.95;
        let x = hp.x + r.x * (1 + dt * 0.5), z = hp.z + r.z * (1 + dt * 0.5);
        if (Math.hypot(r.x, r.z) < 0.12 && y < hp.y + 0.22 && dt < 1.2) { y = hp.y + 0.22 + Math.abs(Math.sin(dt * 9)) * 0.08 * Math.exp(-dt * 3); }
        r.p.position.set(x, Math.max(y, floorY), z); r.p.rotation.set(dt * 5 + i, dt * 3, dt * 4);
      });
      hairPop.visible = T > 26.15;
    }
    labO.corn = corn;
  } else if (mode === 's5') {
    oldLook();
    o.yaw = Math.PI / 2 * 0.85; o.pos = V(0.75, 0, 0.55);
    o.handR = CHIN.clone(); o.rotR = [-0.2, 0, 0.6]; o.curlR = 0.7; o.handL = V(0.2, 0.0, 0.12); o.rotL = [-1.2, 0, -0.8]; o.curlL = 0.6;
    o.headPitch = -0.45; o.lookY = 0.6; o.smile = sm(42.3, 43.0, T) * 0.7; o.brow = 0.4; o.choc = { visible: false }; o.stain = 0.8;
    labO.radarange = true; labO.magOn = 0.4;
    const u = sm(40.6, 44.4, T); c = { pos: lerpV(V(-0.35, 0.55, 2.35), V(-0.15, 0.62, 2.0), u), look: lerpV(V(1.3, 1.25, 0.25), V(1.35, 1.3, 0.25), u), fov: 46 };
    G.uFlash.value = 1 - sm(40.6, 40.85, T);
    if (T > 44.15) { G.uZoom.value = sm(44.15, 44.45, T) * 1.2; G.uFlash.value = sm(44.2, 44.45, T); }
  }
  lab.update(T, labO);
  percy.update(o);
  applyCam(c);
  const focus = mode === 'hook' && T > 6.35 ? cam.position.distanceTo(percy.choc.root.getWorldPosition(new THREE.Vector3())) : cam.position.distanceTo(c.look);
  useBokeh(focus, 0.0022, 0.006);
  post.bloom.strength = 0.3; post.bloom.threshold = 1.4;
  post.set(lab.scene, cam);
}

// ---------------------------------------------------------------- KITCHEN
const MWC = V(0.09, 1.0, -0.42); // cavity centre (world)
function renderKitchen(T, mode) {
  let c, k = { door: 0, running: 0, spin: 0, bag: false, bowl: false, steam: 0, press: 0, display: '0:30', inflate: 0 };
  const o = { time: T, pos: V(0.15, 0, 0.2), yaw: Math.PI, blink: blinkAt(T), choc: { visible: false } };
  person.root.visible = mode === 'end';
  flyPop.visible = false;
  if (mode === 'science') {
    k.bowl = true; k.running = 1; k.spin = T * 1.2; k.steam = 1; k.display = '1:' + String(Math.max(0, 59 - Math.floor((T - 28.4) * 3))).padStart(2, '0');
    if (T < 30.9) { const u = sm(28.4, 30.9, T); c = { pos: lerpV(V(0.75, 1.35, 1.25), V(0.14, 1.12, 0.12), u), look: lerpV(V(0.12, 1.05, -0.42), V(0.09, 1.03, -0.42), u), fov: 38 }; G.uFlash.value = 1 - sm(28.4, 28.7, T); }
    else { const u = easeOut((T - 30.9) / 0.7); c = { pos: lerpV(V(0.14, 1.12, 0.12), V(0.09, 1.03, -0.38), u), look: V(0.09, 0.98, -0.43), fov: lerp(38, 60, u), near: 0.005 }; G.uZoom.value = u * 1.4; G.uFlash.value = sm(31.2, 31.6, T); G.uFlashColor.value.set(0.6, 0.9, 1.0); }
  } else {
    // person puts a popcorn bag in, closes the door, presses START; bag puffs; DING; door pops, a popcorn flies at the camera
    k.bag = true;
    const put = sm(44.9, 45.9, T), out = sm(45.9, 46.3, T), close = sm(46.2, 46.75, T), press = Math.max(0, 1 - Math.abs(T - 47.15) / 0.18);
    k.door = 1 - close; k.press = press;
    k.running = T > 47.25 && T < 49.6 ? 1 : 0; k.spin = Math.max(0, T - 47.25) * 1.2;
    k.inflate = sm(47.9, 49.3, T) + 0.03 * Math.sin(T * 40) * sm(48.2, 49.4, T) * (1 - sm(49.4, 49.6, T));
    k.display = T < 47.25 ? '2:00' : (T < 49.6 ? '1:' + String(Math.max(0, 59 - Math.floor((T - 47.25) * 8))).padStart(2, '0') : 'END');
    // bag carried by the left hand until placed
    const bagStart = V(0.08, 0.16, 0.3), bagIn = V(0.06, 0.04, 0.6);
    o.handL = put < 1 ? lerpV(bagStart, bagIn, put) : lerpV(bagIn, V(0.25, -0.12, 0.05), out); o.rotL = [-1.4, 0, -0.3]; o.curlL = 0.5;
    if (put < 1) { // bag offset relative to the turntable (local mw coords)
      person.update(o); const hw = person.arms.L.hand.getWorldPosition(new THREE.Vector3()); const local = kit.mw.worldToLocal(hw.clone());
      k.bagOffset = V(local.x + 0.06, local.y - 0.05 + 0.02, local.z).multiplyScalar(1 - put * put * put);
      k.bagOffset = V(lerp(local.x + 0.06, 0, put), lerp(local.y - 0.03, 0, put), lerp(local.z, 0, put));
    }
    // right hand: door handle (close) then START
    const HANDLE_OPEN = V(0.32, 0.12, 0.25), HANDLE_SHUT = V(-0.1, 0.1, 0.52), START = V(-0.19, 0.0, 0.53);
    o.handR = T < 46.2 ? lerpV(V(-0.25, -0.12, 0.05), HANDLE_OPEN, sm(45.4, 46.1, T)) : (T < 46.8 ? lerpV(HANDLE_OPEN, HANDLE_SHUT, close) : lerpV(HANDLE_SHUT, START, sm(46.8, 47.05, T)));
    if (T > 47.35) o.handR = lerpV(START, V(-0.25, -0.12, 0.05), sm(47.35, 47.9, T));
    o.rotR = [-1.4, 0, 0.3]; o.curlR = T > 46.8 && T < 47.4 ? 0.85 : 0.4; o.pointR = T > 46.8 && T < 47.4; o.thumbR = 0.8;
    o.lean = 0.22 * (1 - sm(47.4, 48.0, T)); o.headPitch = 0.3; o.lookY = -0.3;
    if (T > 49.6) { o.wide = 1; o.mouthOpen = 0.7; o.lean = -0.05; o.headPitch = 0; }
    // camera
    if (T < 46.8) { const u = sm(44.9, 46.8, T); c = { pos: lerpV(V(-0.95, 1.5, 1.0), V(-0.8, 1.42, 0.82), u), look: lerpV(V(0.12, 1.12, -0.25), V(0.12, 1.06, -0.32), u), fov: 42 }; G.uFlash.value = 1 - sm(44.85, 45.15, T); }
    else if (T < 47.6) { const u = sm(46.8, 47.6, T); c = { pos: lerpV(V(0.95, 1.4, 0.6), V(0.88, 1.35, 0.5), u), look: V(0.28, 1.05, -0.22), fov: 38 }; }
    else if (T < 49.75) { const u = sm(47.6, 49.75, T); c = { pos: lerpV(V(0.35, 1.16, 0.5), V(0.12, 1.1, 0.24), u), look: V(0.07, 1.02, -0.42), fov: 36 }; }
    else { // DING + door pops + popcorn into the lens
      const u = sm(49.75, 50.0, T); k.door = 0.32 * easeOut((T - 49.75) / 0.2) - 0.06 * Math.sin((T - 49.75) * 18) * Math.exp(-(T - 49.75) * 5) * (T > 49.75 ? 1 : 0);
      c = { pos: V(0.12, 1.1, 0.24), look: V(0.07, 1.02, -0.42), fov: 36 };
      const ft = clamp((T - 49.85) / 0.55); flyPop.visible = T > 49.85 && T < 50.42;
      flyPop.position.copy(lerpV(V(0.1, 1.02, -0.3), V(0.12, 1.1, 0.2), ft * ft)).add(V(0, Math.sin(ft * Math.PI) * 0.12, 0)); flyPop.rotation.set(T * 7, T * 5, 0);
      if (T > 50.38) { G.uFlash.value = Math.max(0, 1 - (T - 50.38) / 0.35) * 0.9; G.uFlashColor.value.set(1, 0.97, 0.88); }
      G.uBlack.value = sm(51.5, 52.3, T);
    }
    o.pos = lerpV(V(0.15, 0, 0.2), V(-0.45, 0, 0.45), sm(47.5, 48.4, T)); o.yaw = Math.PI + 0.5 * sm(47.5, 48.4, T);
    person.update(o);
  }
  kit.update(T, k);
  applyCam(c);
  useBokeh(cam.position.distanceTo(c.look), 0.002, 0.005);
  post.bloom.strength = 0.25; post.bloom.threshold = 1.6;
  post.set(kit.scene, cam);
}

// ---------------------------------------------------------------- MOLECULES
function renderMolecules(T) {
  const fieldOn = sm(34.0, 34.6, T);
  const E = Math.sin((T - 34.0) * 2 * Math.PI * 0.75) * fieldOn;
  const heat = sm(37.3, 39.8, T);
  const follow = fieldOn * (1 - heat * 0.35);
  mol.update(T, { E, follow, heat, wave: fieldOn, arrows: fieldOn, hero: 1, heroPos: V(0, 0.15, 0), heroScale: 0.7, labels: sm(32.1, 32.6, T) * (1 - sm(37.6, 38.1, T)) });
  const a = (T - 31.6) * 0.1;
  let c;
  if (T < 37.3) { const u = sm(31.6, 34.0, T); c = { pos: V(Math.sin(a) * lerp(2.2, 3.6, u), 0.25, Math.cos(a) * lerp(2.2, 3.6, u)), look: V(0, 0.1, 0), fov: 42 }; }
  else { const u = sm(37.3, 40.6, T); c = { pos: V(Math.sin(a) * lerp(3.6, 6.2, u), lerp(0.25, 0.8, u), Math.cos(a) * lerp(3.6, 6.2, u)), look: V(0, 0, -1.5 * u), fov: 42 }; }
  applyCam(c);
  G.uFlash.value = 1 - sm(31.6, 31.95, T); G.uFlashColor.value.set(0.6, 0.9, 1.0);
  if (T > 40.3) { G.uFlash.value = sm(40.3, 40.6, T); G.uFlashColor.value.set(1, 0.85, 0.6); }
  useBokeh(cam.position.distanceTo(V(0, 0.15, 0)), 0.0025, 0.007);
  post.bloom.strength = 0.35; post.bloom.threshold = 1.2;
  post.set(mol.scene, cam);
}

function renderTest(T) {
  const o = percyBase(0); o.yaw = 0; o.smile = T === -4 ? 1 : 0; o.wide = T === -5 ? 1 : 0; o.mouthOpen = T === -5 ? 0.7 : 0;
  lab.update(0, {}); percy.update(o);
  const c = T === -1 ? { pos: V(0, 1.68, 0.75), look: V(0, 1.66, 0), fov: 30 } : T === -2 ? { pos: V(0.55, 1.65, 0.6), look: V(0, 1.6, 0), fov: 32 } : T === -3 ? { pos: V(0.6, 1.3, 2.6), look: V(0, 1.0, 0), fov: 40 } : { pos: V(0, 1.68, 0.65), look: V(0, 1.66, 0), fov: 30 };
  applyCam(c); post.set(lab.scene, cam);
}
window.renderFrame = (T) => {
  resetFX(); G.uTime.value = T;
  if (T < 0) { renderTest(T); post.composer.render(); return renderer.domElement.toDataURL('image/jpeg', 0.93); }
  if (T < 7.6) renderLab(T, 'hook');
  else if (T < 18.0) renderLab(T, 's2');
  else if (T < 28.4) renderLab(T, 's3');
  else if (T < 31.6) renderKitchen(T, 'science');
  else if (T < 40.6) renderMolecules(T);
  else if (T < 44.85) renderLab(T, 's5');
  else renderKitchen(T, 'end');
  post.composer.render();
  return renderer.domElement.toDataURL('image/jpeg', 0.93);
};
window.READY = true;
