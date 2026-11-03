"""Episodio 002 (wombat): música, efectos y mezcla final, todo sintetizado.
Salidas en audio/: musica.wav, sfx.wav, narracion_sincronizada.wav, mezcla_final.wav (48 kHz estéreo)."""
import sys, json, subprocess, wave
sys.argv = sys.argv[:1] + ['.'] if len(sys.argv) < 2 else sys.argv
from synth_lib import *

# ---------------- timing of the narration lines (raw span in TTS file -> offset in the video) ----------------
LINES = [(0.20, 5.05, 0.30), (5.05, 6.40, 0.50), (6.40, 10.25, 1.58), (10.25, 12.90, 1.33),
         (12.90, 25.20, 1.91), (25.20, 35.00, 1.99), (35.00, 43.43, 4.54)]

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
def brass(m, d, g=1.0):
    t = t_arr(d); f = midi(m); saw = sum((1 / h) * np.sin(2 * np.pi * f * h * t) for h in range(1, 12))
    return lp(saw, 1400) * env_adsr(len(t), 0.03, 0.15, 0.8, 0.3) * g

# ================= MUSIC =================
mus = np.zeros((2, N))
prog = [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]]  # Dm Bb F C
arp = [0, 1, 2, 1, 2, 3, 2, 1]
def chord_notes(c): return [c[0] + 12, c[1] + 12, c[2] + 12, c[0] + 24]
def playful(t0, t1, prog, g=1.0, start_bar=0):
    t = t0; bar = start_bar
    while t < t1:
        c = prog[bar % len(prog)]
        add(mus, pad([midi(m) for m in c], min(BEAT * 4 + 0.6, t1 - t + 0.6), 0.5, 0.6), t, 0.13 * g)
        notes = chord_notes(c)
        for i in range(8):
            tt = t + i * BEAT / 2
            if tt > t1 - 0.05: break
            add(mus, pluck_c(notes[arp[i]], 0.9), tt, 0.21 * g, pan=-0.3 if i % 2 else 0.3)
            if i % 4 == 0: add(mus, pluck_c(c[0] - 12, 1.2), tt, 0.25 * g)
            if i % 2 == 1: add(mus, tick(), tt, 0.04 * g, 0.4)
        t += BEAT * 4; bar += 1
# S1: playful walk, cut for the dramatic cube zoom
playful(0.25, 5.55, prog)
add(mus, brass(38, 1.2, 0.8), 5.88); add(mus, brass(45, 1.2, 0.5), 5.88); add(mus, brass(50, 1.2, 0.5), 5.88)  # "dun!"
add(mus, kick(0.9), 5.88, 0.5)
# innocent look + S2 curiosity (lighter, staccato) until the comic pause
playful(6.75, 13.75, [[50, 53, 57], [52, 55, 58], [53, 57, 60], [45, 49, 52]], g=0.8)
for i, m in enumerate([69, 67, 64, 61]): add(mus, pluck_c(m, 0.5), 13.0 + i * 0.18, 0.16)
# science / wonder from 15.0 to 39.4
t = 15.2; k = 0
wonder = [[50, 57, 62, 65], [46, 53, 58, 62], [55, 59, 62, 67], [52, 57, 61, 64]]
while t < 39.2:
    c = wonder[k % 4]; d = BEAT * 8
    add(mus, pad([midi(m) for m in c], min(d + 1.5, 39.6 - t), 1.4, 1.2), t, 0.19)
    for i in range(4): add(mus, bell(midi(c[(i + k) % 4] + 24), 2.2), t + i * BEAT * 2 + 0.05, 0.05, pan=(-0.5 + i / 3))
    if t > 23: add(mus, kick(), t, 0.11); add(mus, kick(), t + BEAT * 4, 0.09)
    t += d; k += 1
for i, m in enumerate([62, 66, 69, 74]): add(mus, bell(midi(m + 12), 2.0), 36.65 + i * 0.08, 0.06, -0.3 + i * 0.2)
# S5: playful in F major, stops dead at the freeze (45.8), resolves after the sting
playful(39.6, 45.75, [[53, 57, 60], [46, 50, 53], [48, 52, 55], [53, 57, 60]], g=0.85)
add(mus, pad([midi(m) for m in [41, 53, 57, 60, 65]], 1.8, 0.02, 1.2), 48.15, 0.26)
for i, m in enumerate([65, 69, 72, 77]): add(mus, bell(midi(m + 12), 2.2), 48.25 + i * 0.07, 0.07, -0.4 + i * 0.25)
mus = reverb(mus, 2.4, 0.3)
mus[:, int(49.1 * SR):] *= np.linspace(1, 0, N - int(49.1 * SR))

# ================= SFX =================
sfx = np.zeros((2, N))
forest_mask = np.zeros(N); forest_mask[:int(16.2 * SR)] = 1; forest_mask[int(39.5 * SR):] = 1
forest_mask = np.convolve(forest_mask, np.ones(9600) / 9600, 'same')
wind = lp(rng.standard_normal(N), 700) * 0.05 * (0.7 + 0.3 * np.sin(np.arange(N) / SR * 0.7))
sfx[0] += wind * forest_mask; sfx[1] += np.roll(wind, 1777) * forest_mask
def chirp(f0=3200, n=3):
    out = np.zeros(int(SR * 0.6))
    for i in range(n):
        tt = t_arr(0.09); x = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.25 * np.sin(np.pi * tt / 0.09))) / SR) * np.sin(np.pi * tt / 0.09)
        j = int(i * 0.13 * SR); out[j:j + len(x)] += x
    return out
for tt in [0.9, 2.4, 3.9, 7.1, 9.0, 11.6, 40.2, 42.7, 44.1]:
    if forest_mask[int(tt * SR)] > 0.5: add(sfx, chirp(rng.uniform(2600, 4200), int(rng.integers(2, 5))), tt, 0.05, rng.uniform(-0.8, 0.8))
# wombat footsteps (replicates the walk curve of the render)
def smoother(a, b, x): t = min(1, max(0, (x - a) / (b - a))); return t * t * t * (t * (t * 6 - 15) + 10)
import math
D = math.dist((-0.5, -2.0), (-0.02, -0.42)); last = 0
for i in range(int(3.85 * 100)):
    T = i / 100; s = D * smoother(0, 3.8, T) * 0.985 + D * 0.015 * min(1, T / 3.8); w = s / 0.2 * 2
    if int(w) > last: last = int(w); add(sfx, thump(60 + rng.uniform(-8, 8)) + 0.3 * bp(rng.standard_normal(int(0.25 * SR)), 800, 3000) * np.exp(-t_arr(0.25) * 40), T, 0.22, 0.2 * (-1) ** last)
# cube reveal plops
for i, tt in enumerate([4.15, 4.45, 4.75]): add(sfx, plop(480 + i * 90), tt, 0.32, -0.3 + i * 0.3)
# dramatic zoom: whoosh in + impact
add(sfx, whoosh(0.35, 300, 7000), 5.55, 0.45)
add(sfx, thump(45, 0.9), 5.88, 0.6)
# innocent blink sparkle
for i, m in enumerate([88, 93]): add(sfx, bell(midi(m), 0.6), 7.32 + i * 0.07, 0.05, 0.3)
# sniffing 8.7-10.8
for i in range(12):
    tt = 8.75 + i * 0.17 + (0.3 if i >= 6 else 0); n = bp(rng.standard_normal(int(0.09 * SR)), 1500, 6000) * np.sin(np.pi * t_arr(0.09) / 0.09)
    add(sfx, n, tt, 0.13, 0.1)
# head-tilt "boing" (puzzled) 11.9
add(sfx, glide(330, 470, 0.35, 0.03) * np.exp(-t_arr(0.35) * 5), 11.95, 0.12)
# comic pause: crickets 13.8-15.0
for i in range(5):
    tt = 13.85 + i * 0.23
    cr = np.sin(2 * np.pi * 4300 * t_arr(0.12)) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 45 * t_arr(0.12)))) * np.sin(np.pi * t_arr(0.12) / 0.12)
    add(sfx, cr, tt, 0.06, 0.5)
for tt in (14.15, 14.55): add(sfx, plop(1400, 0.06), tt, 0.06)  # blink clicks
# swing + X-ray scan + transition
add(sfx, whoosh(0.8, 200, 3000), 15.0, 0.4)
scan = glide(600, 2400, 0.85) * env_adsr(int(0.85 * SR), 0.05, 0.1, 0.9, 0.2); add(sfx, scan, 15.35, 0.08)
for i in range(14): add(sfx, bell(midi(84 + (i * 5) % 12), 1.0), 16.2 + i * 0.04, 0.025, -0.7 + i * 0.1)
add(sfx, whoosh(1.1, 150, 6000), 18.55, 0.5)
# intestine transition: wet whoosh down + soft squelch
sq = lp(rng.standard_normal(int(0.5 * SR)), 900) * np.sin(np.pi * t_arr(0.5) / 0.5) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t_arr(0.5)))
add(sfx, whoosh(0.7, 4000, 250, up=False), 19.45, 0.35); add(sfx, sq, 19.6, 0.25)
# lab ambience
amb = lp(hp(rng.standard_normal(N), 500), 2500) * 0.02
lm = np.zeros(N); lm[int(16.2 * SR):int(39.5 * SR)] = 1; lm = np.convolve(lm, np.ones(9600) / 9600, 'same')
sfx[0] += amb * lm; sfx[1] += np.roll(amb, 911) * lm
for i in range(24): add(sfx, bell(midi(88 + int(rng.integers(0, 7))), 0.8), 20.0 + i * 0.7, 0.014, rng.uniform(-0.8, 0.8))
# peristalsis: gentle squelchy pulses (wave period 1.4/0.9 s) 23.5-27.6 and 32.6-36.6
def squelch(d=0.45):
    t = t_arr(d); x = lp(rng.standard_normal(len(t)), 500) + 0.6 * np.sin(2 * np.pi * np.cumsum(90 + 60 * np.sin(np.pi * t / d)) / SR)
    return x * np.sin(np.pi * t / d) ** 2
for base, end in ((23.5, 27.6), (32.6, 36.6)):
    tt = base
    while tt < end: add(sfx, squelch(), tt, 0.12, 0.1); tt += 1.4 / 0.9
# section: contraction thump at each squeeze peak (period 1.25)
for k in range(5):
    tt = 27.6 + 0.6 + 0.625 + k * 1.25
    if tt < 32.5: add(sfx, thump(55, 0.35), tt, 0.25); add(sfx, squelch(0.3), tt - 0.1, 0.07)
for tt in (27.55, 32.55, 36.55): add(sfx, whoosh(0.6, 250, 5000), tt - 0.2, 0.3)
add(sfx, bell(midi(93), 0.8), 37.65, 0.06)  # "≈ 2 cm" ding
# back to the forest
add(sfx, whoosh(0.8, 5000, 200, up=False), 39.3, 0.35)
# tail wiggle 41.9-44.2 (springy)
for i in range(4): add(sfx, glide(500, 700, 0.12) * np.sin(np.pi * t_arr(0.12) / 0.12), 42.0 + i * 0.55, 0.05, 0.3)
# turn-around steps 44.6-45.8
for i in range(5): add(sfx, thump(65, 0.22), 44.7 + i * 0.24, 0.16, (-1) ** i * 0.2)
# FREEZE: record scratch
ts = t_arr(0.42); fsc = 300 + 900 * np.sin(np.pi * ts / 0.42)
add(sfx, (bp(rng.standard_normal(len(ts)), 500, 3000) * 0.6 + 0.4 * np.sin(2 * np.pi * np.cumsum(fsc) / SR)) * env_adsr(len(ts), 0.005, 0.05, 0.8, 0.15), 45.78, 0.32)
add(sfx, plop(1500, 0.05), 47.05, 0.07)  # slow blink click
# comic sting: boing + slide-whistle up, then quick waddle steps
add(sfx, glide(180, 420, 0.5, 0.25) * np.exp(-t_arr(0.5) * 4), 47.9, 0.35)
add(sfx, glide(500, 1600, 0.35) * env_adsr(int(0.35 * SR), 0.02, 0.05, 0.9, 0.08), 48.0, 0.18)
for i in range(6): add(sfx, thump(75, 0.18), 48.3 + i * 0.19, 0.15, 0.3 * (-1) ** i)
sfx = reverb(sfx, 1.1, 0.14, 6000)

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
music = mus / (np.max(np.abs(mus)) + 1e-9) * 0.4 * (1 - 0.6 * envv)
sfx = sfx / (np.max(np.abs(sfx)) + 1e-9) * 0.5
voice = np.vstack([nar, nar])
mix = music + sfx * (1 - 0.35 * envv) + voice
peak = np.max(np.abs(mix)); mix = mix / peak * 0.89 if peak > 0.89 else mix
def wav(path, x):
    x = np.clip(x, -1, 1); xx = (x.T * 32767).astype('<i2')
    with wave.open(path, 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(xx.tobytes())
wav('audio/musica.wav', music); wav('audio/sfx.wav', sfx); wav('audio/narracion_sincronizada.wav', voice); wav('audio/mezcla_final.wav', mix)
print('ok peak', round(float(peak), 3))
