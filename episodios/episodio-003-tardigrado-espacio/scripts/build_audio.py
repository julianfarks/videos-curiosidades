"""Episodio 003 (tardígrado en el espacio): música, efectos y mezcla final, todo sintetizado.
Salidas en audio/: musica.wav, sfx.wav, narracion_sincronizada.wav, mezcla_final.wav (48 kHz estéreo).
Música: misteriosa al inicio (espacio), juguetona en la hoja, tensa en la criptobiosis,
épica en el experimento orbital y divertida en el remate."""
import sys, json, subprocess, wave, math
sys.argv = sys.argv[:1] + ['.'] if len(sys.argv) < 2 else sys.argv
from synth_lib import *

# tramo del audio TTS original -> desplazamiento en el vídeo
LINES = [(0.0, 3.0, 0.6), (3.0, 5.07, 1.0), (5.07, 8.1, 1.1), (8.1, 15.18, 1.4),
         (15.18, 26.8, 1.7), (26.8, 38.2, 2.3), (38.2, 43.58, 3.0)]

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
# --- S1 0-6.1: mysterious space (D minor, low drones, sparse bells, rising tension into the reveal)
add(mus, pad([midi(m) for m in (38, 45, 50)], 6.5, 2.0, 2.5), 0.0, 0.28)
add(mus, strings([62, 65], 3.6, 2.2, 0.4, 1800), 0.0, 0.10)
for i, m in enumerate([74, 77, 81, 76]): add(mus, bell(midi(m), 2.6), 0.3 + i * 0.75, 0.05, -0.5 + i * 0.33)
rise = glide(110, 440, 1.0) * np.linspace(0, 1, int(SR)) ** 2; add(mus, lp(rise, 1500), 2.5, 0.07)
add(mus, brass(38, 2.2, 0.9), 3.5); add(mus, brass(45, 2.2, 0.6), 3.5); add(mus, brass(50, 2.2, 0.5), 3.5)
add(mus, strings([57, 62, 65, 69], 2.8, 0.05, 1.5), 3.5, 0.16)
for i, m in enumerate([81, 86, 89]): add(mus, bell(midi(m), 2.4), 4.9 + i * 0.09, 0.05, -0.3 + i * 0.3)
# --- needle 6.1-9.3: suspended, curious
add(mus, pad([midi(m) for m in (50, 57, 62, 65)], 3.6, 0.3, 1.0), 6.1, 0.16)
for i, m in enumerate([69, 72, 74, 77, 74, 72]): add(mus, pluck_c(m, 0.8), 6.4 + i * BEAT / 2 * 1.5, 0.12, 0.25 * (-1) ** i)
# --- leaf 9.3-16.6: playful pizzicato (F major / D minor)
arp = [0, 1, 2, 1, 2, 3, 2, 1]
def playful(t0, t1, prog, g=1.0):
    t = t0; bar = 0
    while t < t1:
        c = prog[bar % len(prog)]; notes = [c[0] + 12, c[1] + 12, c[2] + 12, c[0] + 24]
        add(mus, pad([midi(m) for m in c], min(BEAT * 4 + 0.6, t1 - t + 0.6), 0.4, 0.6), t, 0.11 * g)
        for i in range(8):
            tt = t + i * BEAT / 2
            if tt > t1 - 0.05: break
            add(mus, pluck_c(notes[arp[i]], 0.9), tt, 0.2 * g, pan=-0.3 if i % 2 else 0.3)
            if i % 4 == 0: add(mus, pluck_c(c[0] - 12, 1.2), tt, 0.24 * g)
            if i % 2 == 1: add(mus, tick(), tt, 0.035 * g, 0.4)
        t += BEAT * 4; bar += 1
playful(9.35, 16.5, [[53, 57, 60], [50, 53, 57], [46, 50, 53], [48, 52, 55]], g=0.85)
# --- crypto 16.6-29: tense / mysterious, slowing down
t = 16.7; k = 0
tense = [[50, 53, 57, 62], [46, 50, 53, 58], [49, 52, 57, 61], [50, 53, 57, 62]]
while t < 28.8:
    c = tense[k % 4]; d = BEAT * 6
    add(mus, pad([midi(m) for m in c], min(d + 1.2, 29.2 - t), 1.0, 1.2), t, 0.2)
    for i in range(3): add(mus, bell(midi(c[(i + k) % 4] + 24), 2.0), t + i * BEAT * 2, 0.035 * max(0.25, 1 - (t - 16.7) / 14), pan=-0.4 + i * 0.4)
    t += d; k += 1
add(mus, strings([38, 45], 12.0, 3.0, 2.0, 900), 17.0, 0.12)
# --- orbit 29-36.6: EPIC (low brass, strings, timpani)
epic = [(29.0, [50, 57, 62, 65], 38), (30.9, [46, 53, 58, 62], 34), (32.8, [48, 55, 60, 64], 36), (34.7, [45, 52, 57, 61], 33)]
for t0, ch, root in epic:
    add(mus, strings(ch + [ch[0] + 12], 2.3, 0.15, 0.7), t0, 0.22)
    add(mus, brass(root, 2.1, 0.9), t0); add(mus, brass(root + 7, 2.1, 0.55), t0); add(mus, brass(root + 12, 2.1, 0.5, 2000), t0)
    for i, dt in enumerate((0, 0.95, 1.425)): add(mus, timpani(midi(root) if root > 35 else midi(root + 12)), t0 + dt, 0.42 - i * 0.08)
for i, m in enumerate([74, 77, 81, 86]): add(mus, bell(midi(m), 2.5), 29.05 + i * 0.12, 0.05, -0.4 + i * 0.27)
add(mus, strings([69, 74, 77], 1.6, 0.4, 1.0, 3200), 35.2, 0.12)
# --- rehydration 36.6-40.9: hopeful, gentle awakening
add(mus, pad([midi(m) for m in (50, 57, 62, 66)], 4.6, 0.6, 1.4), 36.6, 0.2)
for i, m in enumerate([62, 66, 69, 74, 78, 81]): add(mus, bell(midi(m + 12), 2.0), 38.4 + i * 0.22, 0.05, -0.5 + i * 0.2)
# --- punchline 40.9-49.7: fun pizzicato in D major, comic stop for the wave, bright ending
playful(40.95, 46.6, [[50, 54, 57], [55, 59, 62], [57, 61, 64], [50, 54, 57]], g=0.95)
playful(47.9, 48.9, [[50, 54, 57]], g=0.8)
add(mus, pad([midi(m) for m in [38, 50, 54, 57, 62]], 1.9, 0.02, 1.2), 48.25, 0.24)
for i, m in enumerate([62, 66, 69, 74]): add(mus, bell(midi(m + 12), 2.2), 48.3 + i * 0.07, 0.07, -0.4 + i * 0.25)
mus = reverb(mus, 2.6, 0.32)
mus[:, int(49.0 * SR):] *= np.linspace(1, 0, N - int(49.0 * SR))

# ================= SFX =================
sfx = np.zeros((2, N))
# space ambience 0-6.1 and 29-36.6: deep rumble + airy hiss
spm = np.zeros(N); spm[:int(6.1 * SR)] = 1; spm[int(29.0 * SR):int(36.6 * SR)] = 1; spm = np.convolve(spm, np.ones(9600) / 9600, 'same')
rum = lp(rng.standard_normal(N), 90) * 0.35 + hp(lp(rng.standard_normal(N), 4000), 1500) * 0.01
sfx[0] += rum * spm; sfx[1] += np.roll(rum, 1999) * spm
# approach whoosh + CINEMATIC IMPACT at the reveal (3.5)
add(sfx, whoosh(1.6, 150, 5000), 1.95, 0.45)
add(sfx, impact(), 3.48, 0.9)
add(sfx, whoosh(0.5, 6000, 300, up=False), 3.45, 0.3)
sparkle(4.85, 8, 0.03)  # eyes open
# cut to the needle: whoosh + metallic ting
add(sfx, whoosh(0.6, 300, 6000), 5.75, 0.35)
ting = sum(np.sin(2 * np.pi * f * t_arr(1.8)) * np.exp(-t_arr(1.8) * dk) for f, dk in ((2350, 2.0), (3910, 3.0), (6120, 5.0))) / 2
add(sfx, ting, 6.2, 0.07, 0.2)
# to the leaf
add(sfx, whoosh(0.7, 5000, 250, up=False), 9.0, 0.3)
amb = lp(rng.standard_normal(N), 600) * 0.05
lm = np.zeros(N); lm[int(9.3 * SR):int(16.6 * SR)] = 1; lm[int(40.9 * SR):] = 1; lm = np.convolve(lm, np.ones(9600) / 9600, 'same')
sfx[0] += amb * lm; sfx[1] += np.roll(amb, 777) * lm
# tiny footsteps (8 legs -> quick soft taps)
def tap(): return thump(rng.uniform(260, 340), 0.07) * 0.6 + 0.3 * bp(rng.standard_normal(int(0.07 * SR)), 2000, 6000) * np.exp(-t_arr(0.07) * 70)
for span in ((9.45, 12.5), (41.0, 46.3), (48.0, 48.9)):
    tt = span[0]
    while tt < span[1]: add(sfx, tap(), tt, 0.09, rng.uniform(-0.4, 0.4)); tt += 0.155
# finger approaches (low whoosh) + ding on the size callout
add(sfx, whoosh(1.6, 120, 1200), 12.9, 0.4)
add(sfx, bell(midi(93), 0.8), 13.65, 0.06)
# to the lab
add(sfx, whoosh(0.7, 300, 6000), 16.3, 0.32)
lab = lp(hp(rng.standard_normal(N), 400), 2200) * 0.018
lb = np.zeros(N); lb[int(16.6 * SR):int(29 * SR)] = 1; lb[int(36.6 * SR):int(40.9 * SR)] = 1; lb = np.convolve(lb, np.ones(9600) / 9600, 'same')
sfx[0] += lab * lb; sfx[1] += np.roll(lab, 333) * lb
# heat + drying sizzle 18.3-26
sz = hp(rng.standard_normal(int(7.7 * SR)), 3000) * (0.4 + 0.6 * (rng.random(int(7.7 * SR)) > 0.997)) * np.sin(np.pi * t_arr(7.7) / 7.7) ** 0.7
add(sfx, lp(sz, 9000), 18.3, 0.06)
add(sfx, glide(80, 160, 3.0) * np.sin(np.pi * t_arr(3.0) / 3.0) * 0.5, 18.3, 0.12)  # heat swell
# body contracts into the tun: descending creaky glide
add(sfx, glide(520, 140, 4.6, 0.02) * env_adsr(int(4.6 * SR), 0.4, 0.3, 0.8, 1.2), 21.1, 0.06)
# metabolism: heartbeat-like pulses that slow down and fade (21.3 -> 27.5)
tt, gap, g = 21.3, 0.55, 0.3
while tt < 27.6:
    add(sfx, thump(55, 0.3), tt, g); add(sfx, thump(50, 0.25), tt + 0.16, g * 0.6)
    tt += gap; gap *= 1.22; g *= 0.86
# to orbit: big whoosh + metal clunk of the experiment cassette
add(sfx, whoosh(1.0, 200, 7000), 28.5, 0.45)
add(sfx, thump(90, 0.5) + 0.3 * bp(rng.standard_normal(int(0.5 * SR)), 1500, 5000) * np.exp(-t_arr(0.5) * 18), 29.1, 0.3)
for i in range(6): add(sfx, plop(900 + i * 60, 0.08), 29.6 + i * 0.09, 0.05, -0.6 + i * 0.24)  # wells "lock"
add(sfx, bell(midi(91), 1.0), 29.45, 0.05)
# back to the lab: drop falls + PLINK + splash, reactivation chime, heartbeat speeds up
add(sfx, whoosh(0.6, 5000, 300, up=False), 36.35, 0.3)
add(sfx, glide(900, 1800, 0.6) * np.sin(np.pi * t_arr(0.6) / 0.6) * 0.3, 36.75, 0.05)
add(sfx, plop(1250, 0.35), 37.35, 0.45)
spl = lp(rng.standard_normal(int(0.6 * SR)), 3500) * np.exp(-t_arr(0.6) * 9); add(sfx, spl, 37.37, 0.2)
add(sfx, glide(200, 700, 2.0) * env_adsr(int(2.0 * SR), 0.5, 0.2, 0.8, 0.6) * 0.4, 37.8, 0.06)  # inflating
tt, gap, g = 38.1, 0.9, 0.08
while tt < 40.6:
    add(sfx, thump(60, 0.28), tt, g); add(sfx, thump(55, 0.22), tt + 0.15, g * 0.6); tt += gap; gap = max(0.38, gap * 0.8); g = min(0.26, g * 1.35)
sparkle(39.45, 12, 0.035, 88)
# back to the leaf for the punchline
add(sfx, whoosh(0.8, 300, 5000), 40.6, 0.3)
add(sfx, plop(1500, 0.05), 42.65, 0.06); add(sfx, plop(1500, 0.05), 44.95, 0.06)  # blinks
# face close-up "boop" + legs wiggle
add(sfx, glide(300, 520, 0.25) * np.exp(-t_arr(0.25) * 7), 43.3, 0.1)
for i in range(4): add(sfx, glide(600, 800, 0.1) * np.sin(np.pi * t_arr(0.1) / 0.1), 45.3 + i * 0.32, 0.045, 0.3)
# WAVE: comic boing + slide-whistle, WINK: sparkle ding
add(sfx, glide(170, 430, 0.55, 0.25) * np.exp(-t_arr(0.55) * 4), 46.7, 0.32)
add(sfx, glide(520, 1500, 0.3) * env_adsr(int(0.3 * SR), 0.02, 0.05, 0.9, 0.08), 46.85, 0.14)
add(sfx, bell(midi(96), 0.9), 46.97, 0.07); sparkle(46.98, 5, 0.025, 92)
add(sfx, whoosh(0.5, 400, 3000), 48.2, 0.15)
sfx = reverb(sfx, 1.2, 0.15, 6000)

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
for a, b in ((2.4, 6.1), (28.6, 36.6)): sec[int(a * SR):int(b * SR)] = 0.8
sec = np.convolve(sec, np.ones(9600) / 9600, 'same')
music = np.tanh(mus * sec * 1.2) / 1.2 * 0.42 / 0.55 * (1 - 0.6 * envv)
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
