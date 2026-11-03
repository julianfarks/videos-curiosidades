import * as THREE from 'three';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const smoother = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * t * (t * (t * 6 - 15) + 10); };
export const easeInOut = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t) => Math.pow(clamp(t), 3);

export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function canvasTex(w, h, draw, { srgb = true, repeat = null } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.needsUpdate = true;
  return t;
}

// value noise for canvases
export function noiseFill(g, w, h, base, amp, scale, seed = 3) {
  const r = rng(seed);
  const img = g.getImageData(0, 0, w, h);
  const gw = Math.ceil(w / scale) + 2, gh = Math.ceil(h / scale) + 2;
  const grid = new Float32Array(gw * gh).map(() => r());
  const d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const fx = x / scale, fy = y / scale, ix = Math.floor(fx), iy = Math.floor(fy);
    const tx = fx - ix, ty = fy - iy;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = grid[iy * gw + ix], b = grid[iy * gw + ix + 1], c = grid[(iy + 1) * gw + ix], e = grid[(iy + 1) * gw + ix + 1];
    const v = (a + (b - a) * sx) + ((c + (e - c) * sx) - (a + (b - a) * sx)) * sy;
    const k = (y * w + x) * 4; const n = (v - 0.5) * amp;
    d[k] = clamp(d[k] + n * 255, 0, 255); d[k + 1] = clamp(d[k + 1] + n * 255, 0, 255); d[k + 2] = clamp(d[k + 2] + n * 255, 0, 255);
  }
  g.putImageData(img, 0, 0);
}

export function grain(g, w, h, amp, seed = 7) {
  const r = rng(seed); const img = g.getImageData(0, 0, w, h); const d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * amp * 255; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
}

// orient a Y-aligned unit mesh between points a and b
const _up = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3(), _q = new THREE.Quaternion();
export function placeSegment(mesh, a, b, radiusScale = 1) {
  _d.subVectors(b, a); const L = _d.length();
  mesh.position.addVectors(a, b).multiplyScalar(0.5);
  _q.setFromUnitVectors(_up, _d.multiplyScalar(1 / Math.max(L, 1e-6)));
  mesh.quaternion.copy(_q);
  mesh.scale.set(radiusScale, L, radiusScale);
}

// 2-bone IK: returns joint position given root, target, lengths, and pole hint
export function ik2(root, target, l1, l2, pole) {
  const d = new THREE.Vector3().subVectors(target, root);
  let dist = d.length();
  const maxd = (l1 + l2) * 0.999; if (dist > maxd) { d.multiplyScalar(maxd / dist); dist = maxd; }
  const dir = d.clone().normalize();
  const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const p = pole.clone().sub(root); p.sub(dir.clone().multiplyScalar(p.dot(dir))).normalize();
  return root.clone().add(dir.multiplyScalar(a)).add(p.multiplyScalar(h));
}

export function labelTexture(text, { size = 64, color = '#ffffff', bg = 'rgba(10,20,28,0.55)', pad = 28, weight = 800, border = 'rgba(255,214,90,0.9)' } = {}) {
  const c = document.createElement('canvas'); const g = c.getContext('2d');
  g.font = `${weight} ${size}px Inter, "Inter", sans-serif`;
  const tw = g.measureText(text).width;
  c.width = Math.ceil(tw + pad * 2); c.height = Math.ceil(size * 1.6);
  const g2 = c.getContext('2d');
  g2.font = `${weight} ${size}px Inter, "Inter", sans-serif`;
  const r = c.height / 2;
  g2.fillStyle = bg; g2.beginPath(); g2.roundRect(2, 2, c.width - 4, c.height - 4, r - 2); g2.fill();
  g2.lineWidth = 4; g2.strokeStyle = border; g2.stroke();
  g2.fillStyle = color; g2.textBaseline = 'middle'; g2.fillText(text, pad, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
  return { tex: t, aspect: c.width / c.height };
}

export function makeLabel(text, height, opts) {
  const { tex, aspect } = labelTexture(text, opts);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(height * aspect, height), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false }));
  m.renderOrder = 999;
  return m;
}
