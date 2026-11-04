"""Episodio 004 (origen del microondas): música, efectos y mezcla final, todo sintetizado.
Salidas en audio/: musica.wav, sfx.wav, narracion_sincronizada.wav, mezcla_final.wav (48 kHz estéreo).
Música: misterio al inicio, swing curioso en la historia de 1945, dinámica en el experimento
de las palomitas, asombro en la explicación científica y cierre divertido."""
import sys, json, subprocess, wave, math
sys.argv = sys.argv[:1] + ['.'] if len(sys.argv) < 2 else sys.argv
from synth_lib import *

# tramo del audio TTS original -> desplazamiento en el vídeo
LINES = [(0.0, 7.21, 0.4), (7.21, 17.31, 0.69), (17.31, 27.71, 0.43), (27.71, 39.26, 0.53), (39.26, 47.29, 1.47)]

def whoosh(d=1.0, f1=200, f2=4000, up=True):
    tt = t_arr(d); n = rng.standard_normal(len(tt)); out = np.zeros(len(tt)); blk = 1200
    for s in range(0, len(tt), blk):
        u = s / len(tt); fc = f1 * (f2 / f1) ** (u if up else 1 - u)
        out[s:s + blk] = bp(n[max(0, s - 2400):s + blk], fc * 0.7, min(fc * 1.4, 20000))[-len(out[s:s + blk]):]
    return out * np.sin(np.pi * tt / d) ** 1.5
def thump(f=70, d=0.25):
    t = t_arr(d); return np.sin(2 * np.pi * np.cumsum(f * (1 + 1.5 * np.exp(-t * 30))) / SR) * np.exp(-t * 16)
def plop(f=520, d=0.22):
    t = t_arr(d); fr = f * (1 + 1.2 * np.exp(-t * 35)); return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 22) * env_adsr(len(t), 0.002, 0.02, 1, 0.05)
def glide(f1, f2, d, vib=0.0):
    t = t_arr(d); f = f1 * (f2 / f1) ** (t / d) * (1 + vib * np.sin(2 * np.pi * 7 * t)); return np.sin(2 * np.pi * np.cumsum(f) / SR)
def brass(m, d, g=1.0, cut=1400):
    t = t_arr(d); f = midi(m); saw = sum((1 / h) * np.sin(2 * np.pi * f * h * t) for h in range(1, 12))
    return lp(saw, cut) * env_adsr(len(t), 0.06, 0.2, 0.85, 0.5) * g * 0.22
def strings(ms, d, a=0.8, r=1.2, cut=2600):
    t = t_arr(d); x = np.zeros_like(t)
    for m in ms:
        for det in (-0.08, 0.0, 0.07):
            f = midi(m) * 2 ** (det / 12) * (1 + 0.003 * np.sin(2 * np.pi * 5.2 * t + rng.uniform(0, 6)))
            ph = np.cumsum(f) / SR
            x += sum((1 / h) * np.sin(2 * np.pi * h * ph) for h in range(1, 8))
    return lp(x, cut) / (len(ms) * 3) * env_adsr(len(t), a, 0.3, 0.9, r)
def timpani(f=55, d=1.2):
    t = t_arr(d); return (np.sin(2 * np.pi * np.cumsum(f * (1 + 0.4 * np.exp(-t * 12))) / SR) + 0.3 * lp(rng.standard_normal(len(t)), 300)) * np.exp(-t * 3.5) * 0.4
def impact(d=2.5):
    t = t_arr(d); sub = np.sin(2 * np.pi * np.cumsum(30 + 70 * np.exp(-t * 6)) / SR) * np.exp(-t * 1.6)
    nz = lp(rng.standard_normal(len(t)), 1800) * np.exp(-t * 5)
    return sub * 0.9 + nz * 0.5
def sparkle(t0, n=10, g=0.03, base=86):
    for i in range(n): add(sfx, bell(midi(base + int(rng.integers(0, 10))), 0.7), t0 + i * 0.045, g, rng.uniform(-0.8, 0.8))

# ================= MUSIC =================
mus = np.zeros((2, N))
arp = [0, 1, 2, 1, 2, 3, 2, 1]
def playful(t0, t1, prog, g=1.0, bass=True, beat=BEAT):
    t = t0; bar = 0
    while t < t1:
        c = prog[bar % len(prog)]; notes = [c[0] + 12, c[1] + 12, c[2] + 12, c[0] + 24]
        add(mus, pad([midi(m) for m in c], min(beat * 4 + 0.6, t1 - t + 0.6), 0.4, 0.6), t, 0.1 * g)
        for i in range(8):
            tt = t + i * beat / 2
            if tt > t1 - 0.05: break
            add(mus, pluck_c(notes[arp[i]], 0.9), tt, 0.19 * g, pan=-0.3 if i % 2 else 0.3)
            if bass and i % 2 == 0: add(mus, pluck_c(c[(i // 2) % 3] - 12, 1.0), tt, 0.22 * g)
            if i % 2 == 1: add(mus, tick(), tt, 0.04 * g, 0.4)
            if i % 4 == 2: add(mus, kick(0.25), tt, 0.05 * g)
        t += beat * 4; bar += 1
# S1 0-7.6 mystery: low drones, ticking clock-like plucks, rising tension, hit at 6.6
add(mus, pad([midi(m) for m in (38, 45, 50, 53)], 7.2, 1.5, 1.0), 0.0, 0.26)
add(mus, strings([62, 65], 6.4, 2.5, 0.6, 1600), 0.2, 0.09)
for i in range(13): add(mus, pluck_c([74, 69, 72, 69][i % 4], 0.6), 0.3 + i * 0.47, 0.08, -0.4 if i % 2 else 0.4)
rise = glide(110, 520, 1.6) * np.linspace(0, 1, int(1.6 * SR)) ** 2; add(mus, lp(rise, 1800), 5.0, 0.07)
add(mus, brass(38, 1.8, 0.9), 6.6); add(mus, brass(45, 1.8, 0.6), 6.6); add(mus, brass(50, 1.8, 0.5), 6.6)
add(mus, strings([57, 62, 65, 69], 1.6, 0.03, 1.0), 6.6, 0.14)
# S2 7.6-18 the 1945 story: curious swing (pizzicato, Dm-G-C-A)
playful(7.75, 17.9, [[50, 53, 57], [55, 59, 62], [48, 52, 55], [57, 61, 64]], g=0.8)
for i, m in enumerate([81, 84, 88]): add(mus, bell(midi(m), 1.8), 16.6 + i * 0.1, 0.04, -0.3 + i * 0.3)
# S3 18-28.4 experiment: dynamic, faster
playful(18.05, 22.5, [[53, 57, 60], [50, 53, 57], [46, 50, 53], [48, 52, 55]], g=0.9, beat=BEAT * 0.85)
add(mus, strings([65, 69, 72], 2.0, 0.6, 0.5), 22.5, 0.12)
playful(24.2, 25.55, [[53, 57, 60]], g=0.9, beat=BEAT * 0.8)
playful(25.75, 28.3, [[53, 57, 60], [48, 52, 55], [50, 53, 57], [53, 57, 60]], g=0.85, beat=BEAT * 0.8)
# S4 28.4-40.6 wonder + pulse (science)
t = 28.5; k = 0
wonder = [[50, 57, 62, 65], [46, 53, 58, 62], [48, 55, 60, 64], [45, 52, 57, 61]]
while t < 40.4:
    c = wonder[k % 4]; d = BEAT * 6
    add(mus, pad([midi(m) for m in c], min(d + 1.2, 40.8 - t), 1.0, 1.2), t, 0.17)
    for i in range(3): add(mus, bell(midi(c[(i + k) % 4] + 24), 2.0), t + i * BEAT * 2, 0.04, pan=-0.4 + i * 0.4)
    if t > 33.5: add(mus, kick(0.35), t, 0.1); add(mus, kick(0.3), t + BEAT * 3, 0.08)
    t += d; k += 1
add(mus, strings([62, 69, 74], 3.0, 1.0, 1.2, 3000), 37.4, 0.1)
# S5 40.6-52.3 fun ending
add(mus, pad([midi(m) for m in (53, 57, 60, 65)], 4.2, 0.4, 1.0), 40.6, 0.16)
for i, m in enumerate([72, 77, 81]): add(mus, bell(midi(m), 1.6), 42.2 + i * 0.12, 0.04)
playful(44.95, 49.7, [[53, 57, 60], [50, 53, 57], [55, 59, 62], [48, 52, 55]], g=0.95, beat=BEAT * 0.85)
add(mus, pad([midi(m) for m in [41, 53, 57, 60, 65]], 1.9, 0.02, 1.2), 50.75, 0.22)
for i, m in enumerate([65, 69, 72, 77]): add(mus, bell(midi(m + 12), 2.2), 50.8 + i * 0.07, 0.07, -0.4 + i * 0.25)
mus = reverb(mus, 2.4, 0.3)
mus[:, int(51.5 * SR):] *= np.linspace(1, 0, N - int(51.5 * SR))

# ================= SFX =================
sfx = np.zeros((2, N))
lab_mask = np.zeros(N); lab_mask[:int(28.4 * SR)] = 1; lab_mask[int(40.6 * SR):int(44.85 * SR)] = 1
lab_mask = np.convolve(lab_mask, np.ones(4800) / 4800, 'same')
tt = t_arr(DUR)[:N]
hum = (np.sin(2 * np.pi * 60 * tt) * 0.5 + np.sin(2 * np.pi * 120 * tt) * 0.3 + np.sin(2 * np.pi * 180 * tt) * 0.15) * 0.05 + lp(rng.standard_normal(N), 300) * 0.03
sfx[0] += hum * lab_mask; sfx[1] += np.roll(hum, 211) * lab_mask
whine = np.sin(2 * np.pi * np.cumsum(2400 + 30 * np.sin(2 * np.pi * 5 * tt)) / SR) * 0.02
wm = np.zeros(N); wm[int(12.6 * SR):int(16.6 * SR)] = 1; wm[int(20.6 * SR):int(25.6 * SR)] = 0.7; wm = np.convolve(wm, np.ones(9600) / 9600, 'same')
sfx[0] += whine * wm; sfx[1] += whine * wm
for i in range(10): add(sfx, plop(1800 + 200 * (i % 3), 0.03), 0.4 + i * 0.26, 0.04, -0.2)   # knob clicks
rust = bp(rng.standard_normal(int(1.0 * SR)), 800, 5000) * np.sin(np.pi * t_arr(1.0) / 1.0) ** 2 * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t_arr(1.0)))
add(sfx, rust, 3.5, 0.08); add(sfx, rust[:int(0.6 * SR)], 4.5, 0.06)
squish = lp(rng.standard_normal(int(0.4 * SR)), 900) * np.sin(np.pi * t_arr(0.4) / 0.4); add(sfx, squish, 4.7, 0.12)
add(sfx, whoosh(0.5, 300, 6000), 6.15, 0.35); add(sfx, impact(2.2), 6.6, 0.55)
drip = plop(700, 0.25); add(sfx, drip, 7.15, 0.18)
add(sfx, whoosh(0.7, 5000, 250, up=False), 7.4, 0.3)
add(sfx, glide(330, 470, 0.35, 0.03) * np.exp(-t_arr(0.35) * 5), 17.35, 0.08)  # curious "hmm"
add(sfx, whoosh(0.6, 300, 5000), 17.85, 0.25)
add(sfx, bell(midi(96), 0.7), 18.3, 0.05)  # idea ping
sz = hp(rng.standard_normal(int(2.0 * SR)), 2500) * np.linspace(0, 1, int(2.0 * SR)) ** 1.5; add(sfx, lp(sz, 8000), 20.6, 0.05)
pr = np.random.default_rng(3)
for i in range(14):
    tp = 22.55 + pr.random() * 1.5
    pp = plop(260 + pr.random() * 160, 0.45); pp[:int(0.3 * SR)] += 0.5 * thump(90, 0.3); add(sfx, pp, tp, 0.4, pr.uniform(-0.6, 0.6))
add(sfx, whoosh(0.4, 400, 7000), 25.45, 0.3)
add(sfx, glide(160, 420, 0.5, 0.25) * np.exp(-t_arr(0.5) * 4), 25.7, 0.28)  # boing
for i in range(12): add(sfx, plop(1100 + pr.random() * 500, 0.06), 25.75 + i * 0.12 + pr.random() * 0.05, 0.08, pr.uniform(-0.5, 0.5))
sparkle(27.25, 6, 0.03, 90)
add(sfx, whoosh(0.7, 300, 6000), 28.2, 0.3)
mw_hum = (np.sin(2 * np.pi * 100 * tt) * 0.4 + lp(rng.standard_normal(N), 500) * 0.6) * 0.06
mh = np.zeros(N); mh[int(28.4 * SR):int(31.4 * SR)] = 1; mh[int(47.25 * SR):int(49.7 * SR)] = 1; mh = np.convolve(mh, np.ones(2400) / 2400, 'same')
sfx[0] += mw_hum * mh; sfx[1] += mw_hum * mh
add(sfx, whoosh(0.9, 200, 8000), 30.85, 0.45)
for k in range(9):  # field flips (0.75 Hz -> a swish every half period)
    t0 = 34.0 + k * (1 / 1.5)
    if t0 < 37.4: add(sfx, whoosh(0.35, 600, 2500), t0, 0.12, -0.5 if k % 2 else 0.5)
cr = hp(rng.standard_normal(int(3.2 * SR)), 2000) * (rng.random(int(3.2 * SR)) > 0.996) * np.linspace(0, 1, int(3.2 * SR))
add(sfx, cr, 37.4, 0.5); add(sfx, glide(80, 160, 3.0) * np.sin(np.pi * t_arr(3.0) / 3.0) * 0.4, 37.4, 0.12)
add(sfx, whoosh(0.6, 5000, 300, up=False), 40.4, 0.3)
add(sfx, whoosh(0.5, 300, 8000), 44.6, 0.4)
add(sfx, thump(120, 0.2), 46.72, 0.3); add(sfx, plop(900, 0.08), 46.72, 0.12)  # door click
beep = np.sin(2 * np.pi * 2000 * t_arr(0.12)) * env_adsr(int(0.12 * SR), 0.005, 0.02, 0.9, 0.03); add(sfx, beep, 47.15, 0.12)
for i in range(18): add(sfx, plop(500 + pr.random() * 300, 0.12), 48.1 + pr.random() * 1.4, 0.2, pr.uniform(-0.3, 0.3))
ding = sum(np.sin(2 * np.pi * f * t_arr(2.0)) * np.exp(-t_arr(2.0) * dk) for f, dk in ((1760, 1.6), (2640, 2.5), (4400, 4.0)))
add(sfx, ding / 2, 49.75, 0.25)
add(sfx, thump(150, 0.15), 49.8, 0.25)
add(sfx, glide(200, 600, 0.45, 0.2) * np.exp(-t_arr(0.45) * 4), 49.9, 0.3)
add(sfx, plop(300, 0.3), 50.38, 0.4)
sfx = reverb(sfx, 1.0, 0.14, 6000)

# ================= NARRATION =================
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', 'raw/narracion_raw.ogg', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
nar_raw = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
nar = np.zeros(N)
for a, b, off in LINES:
    seg = nar_raw[int(a * SR):int(b * SR)].copy(); fd = int(0.02 * SR); seg[:fd] *= np.linspace(0, 1, fd); seg[-fd:] *= np.linspace(1, 0, fd)
    i = int((a + off) * SR); nar[i:i + len(seg)] += seg[:N - i]
nar = hp(nar, 80); nar = nar / (np.max(np.abs(nar)) + 1e-9) * 0.7
json.dump([[a + off, b + off] for a, b, off in LINES], open('narration_lines.json', 'w'))

# ================= DUCKING + MIX =================
envv = np.convolve(np.abs(nar), np.ones(4800) / 4800, 'same'); envv = envv / (envv.max() + 1e-9)
envv = np.convolve(np.clip(envv * 4, 0, 1), np.ones(9600) / 9600, 'same')
ref = np.percentile(np.abs(mus), 99.7) + 1e-9
mus = np.tanh(mus / ref * 0.9) / np.tanh(0.9) * 0.55
sec = np.full(N, 1.7)
for a, b in ((6.4, 8.4),): sec[int(a * SR):int(b * SR)] = 0.8
sec = np.convolve(sec, np.ones(9600) / 9600, 'same')
music = np.tanh(mus * sec * 1.2) / 1.2 * 0.36 / 0.55 * (1 - 0.6 * envv)
sref = np.percentile(np.abs(sfx), 99.9) + 1e-9
sfx = np.tanh(sfx / sref * 0.8) / np.tanh(0.8) * 0.5
voice = np.vstack([nar, nar])
mix = music + sfx * (1 - 0.35 * envv) + voice
peak = np.max(np.abs(mix)); mix = mix / peak * 0.89 if peak > 0.89 else mix
def wav(path, x):
    x = np.clip(x, -1, 1); xx = (x.T * 32767).astype('<i2')
    with wave.open(path, 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(xx.tobytes())
wav('audio/musica.wav', music); wav('audio/sfx.wav', sfx); wav('audio/narracion_sincronizada.wav', voice); wav('audio/mezcla_final.wav', mix)
print('ok peak', round(float(peak), 3))
