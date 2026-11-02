"""Builds music, SFX and final mix for Episode 001 (all synthesized procedurally).
Outputs: musica.wav, sfx.wav, narracion_sincronizada.wav, mezcla_final.wav (48 kHz stereo)."""
import numpy as np, subprocess, json, sys
from scipy.signal import fftconvolve, butter, sosfilt

SR = 48000; DUR = 52.0; N = int(SR * DUR)
rng = np.random.default_rng(7)
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'

def t_arr(d): return np.arange(int(SR * d)) / SR
def env_adsr(n, a=0.01, d=0.1, s=0.7, r=0.2):
    e = np.ones(n) * s; ia, idd, ir = int(a * SR), int(d * SR), int(r * SR)
    ia = min(ia, n); e[:ia] = np.linspace(0, 1, ia)
    j = min(ia + idd, n); e[ia:j] = np.linspace(1, s, j - ia)
    if ir > 0 and ir < n: e[-ir:] *= np.linspace(1, 0, ir)
    return e
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, f1, f2, o=2): return sosfilt(butter(o, [f1, f2], 'band', fs=SR, output='sos'), x)
def add(buf, x, t0, g=1.0, pan=0.0):
    i = int(t0 * SR); j = min(N, i + len(x))
    if j <= i: return
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    buf[0, i:j] += x[:j - i] * g * l * 1.414; buf[1, i:j] += x[:j - i] * g * r * 1.414
def midi(m): return 440 * 2 ** ((m - 69) / 12)

def reverb(st, secs=2.4, wet=0.3, damp=4000):
    n = int(SR * secs); ir = rng.standard_normal(n) * np.exp(-np.linspace(0, 7, n)); ir = lp(ir, damp)
    ir /= np.sqrt((ir ** 2).sum())
    out = np.zeros_like(st)
    for c in range(2):
        irc = np.roll(ir, c * 37)
        out[c] = st[c] * (1 - wet) + fftconvolve(st[c], irc)[:st.shape[1]] * wet * 0.6
    return out

# ---------------- MUSIC ----------------
def pluck(f, d=1.2, bright=0.5):
    n = int(SR * d); p = max(2, int(SR / f)); buf = rng.uniform(-1, 1, p); out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]; buf[i % p] = 0.5 * (buf[i % p] + buf[(i + 1) % p]) * (0.994 + 0.005 * bright)
    return out * np.exp(-np.linspace(0, 3, n))
_pl_cache = {}
def pluck_c(m, d=1.0):
    k = (m, d)
    if k not in _pl_cache: _pl_cache[k] = pluck(midi(m), d)
    return _pl_cache[k]
def pad(freqs, d, a=1.2, r=1.5):
    t = t_arr(d); x = np.zeros_like(t)
    for f in freqs:
        for det in (-0.12, 0.0, 0.11):
            ff = f * 2 ** (det / 12)
            for h, g in ((1, 1), (2, 0.35), (3, 0.18), (4, 0.08)):
                x += g * np.sin(2 * np.pi * ff * h * t + rng.uniform(0, 6.28))
    x = lp(x, 2200) / (len(freqs) * 3)
    return x * env_adsr(len(t), a, 0.3, 0.9, r)
def bell(f, d=2.5):
    t = t_arr(d)
    x = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 3) + 0.25 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 6)
    return x * np.exp(-t * 1.6) * env_adsr(len(t), 0.002, 0.05, 1, 0.3)
def kick(d=0.4):
    t = t_arr(d); f = 120 * np.exp(-t * 18) + 45
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
def tick(d=0.08):
    t = t_arr(d); return hp(rng.standard_normal(len(t)), 5000) * np.exp(-t * 60)

mus = np.zeros((2, N))
BEAT = 60 / 96
# chords (midi roots) Dm Bb F C
prog = [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]]
arp = [0, 1, 2, 1, 2, 3, 2, 1]
def chord_notes(c): return [c[0] + 12, c[1] + 12, c[2] + 12, c[0] + 24]
# S1 0 - 8.8 : playful pizzicato curiosity
t = 0.35; bar = 0
while t < 8.6:
    c = prog[bar % 4]
    add(mus, pad([midi(m) for m in c], BEAT * 4 + 0.6, 0.6, 0.8), t, 0.16)
    notes = chord_notes(c)
    for i in range(8):
        tt = t + i * BEAT / 2
        if tt > 8.75: break
        add(mus, pluck_c(notes[arp[i]], 0.9), tt, 0.22, pan=-0.3 if i % 2 else 0.3)
        if i % 4 == 0: add(mus, pluck_c(c[0] - 12, 1.2), tt, 0.25)
        if i % 2 == 1: add(mus, tick(), tt, 0.05, 0.4)
    t += BEAT * 4; bar += 1
# comic hit + silence for the scare; light "panic" pizz after impact
for i, m in enumerate([74, 73, 72, 71, 70, 69, 68, 67, 66, 65, 64, 63]):
    add(mus, pluck_c(m, 0.4), 9.25 + i * 0.13, 0.16, pan=0.4 * np.sin(i))
for i in range(6): add(mus, pluck_c(62 + (i % 2) * 3, 0.3), 10.9 + i * 0.27, 0.13)
# S4-S5 wonder: pad + bells (from 17.8)
t = 17.8; k = 0
wonder = [[50, 57, 62, 65], [46, 53, 58, 62], [55, 59, 62, 67], [52, 57, 61, 64]]
while t < 41.4:
    c = wonder[k % 4]; d = BEAT * 8
    add(mus, pad([midi(m) for m in c], d + 1.5, 1.5, 1.6), t, 0.2)
    for i in range(4):
        add(mus, bell(midi(c[(i + k) % 4] + 24), 2.2), t + i * BEAT * 2 + 0.05, 0.05, pan=(-0.5 + i / 3))
    if t > 22: add(mus, kick(), t, 0.12); add(mus, kick(), t + BEAT * 4, 0.1)
    t += d; k += 1
# S6 warm resolution
add(mus, pad([midi(m) for m in [50, 57, 62, 66, 69]], 9.0, 0.8, 2.5), 41.9, 0.22)
t = 42.0
for i in range(16):
    notes = [62, 66, 69, 74, 69, 66, 62, 66]
    add(mus, pluck_c(notes[i % 8], 0.9), t + i * BEAT / 2, 0.17, pan=0.3 if i % 2 else -0.3)
for i, m in enumerate([62, 66, 69, 74, 78]):
    add(mus, bell(midi(m + 12), 3.0), 50.35 + i * 0.06, 0.08, pan=-0.4 + i * 0.2)
add(mus, pad([midi(m) for m in [38, 50, 57, 62, 66]], 3.0, 0.02, 1.8), 50.35, 0.3)
add(mus, kick(0.8), 50.35, 0.22)
mus = reverb(mus, 2.6, 0.32)
# rewind section: tape-stop of music at 13.0, reversed snippet during rewind
fr = int(13.0 * SR); seg = mus[:, int(9.5 * SR):fr].copy()
mus[:, fr:int(15.3 * SR)] = 0
rev = seg[:, ::-1]; idx = np.linspace(0, rev.shape[1] - 1, int(1.8 * SR)).astype(int)
add_rev = rev[:, idx] * np.linspace(0.3, 0.8, len(idx))
mus[:, int(13.5 * SR):int(13.5 * SR) + add_rev.shape[1]] += add_rev * 0.9
# fade out
mus[:, int(51.2 * SR):] *= np.linspace(1, 0, N - int(51.2 * SR))

# ---------------- SFX ----------------
sfx = np.zeros((2, N))
# room tone in room scenes
room = lp(rng.standard_normal(N), 400) * 0.02
mask = np.zeros(N); mask[:int(21.9 * SR)] = 1; mask[int(41.6 * SR):] = 1
mask = np.convolve(mask, np.ones(4800) / 4800, 'same')
sfx += room * mask
# slip: tiny peel squeak at 8.0
tq = t_arr(0.25); add(sfx, np.sin(2 * np.pi * (2400 + 800 * tq) * tq) * np.exp(-tq * 18) * 0.5, 7.95, 0.25, 0.2)
# fall: slide whistle down 8.25 -> 8.82
td = t_arr(0.6); f = 1700 * (380 / 1700) ** (td / 0.6) * (1 + 0.02 * np.sin(2 * np.pi * 7 * td))
add(sfx, np.sin(2 * np.pi * np.cumsum(f) / SR) * env_adsr(len(td), 0.02, 0.1, 0.9, 0.08), 8.24, 0.28, 0.1)
# impact bonk + boing
tb = t_arr(0.5); bonk = np.sin(2 * np.pi * 180 * tb * (1 - 0.3 * tb)) * np.exp(-tb * 14) + 0.5 * bp(rng.standard_normal(len(tb)), 600, 2400) * np.exp(-tb * 40)
add(sfx, bonk, 8.82, 0.6)
tg = t_arr(0.9); fg = 260 * (1 + 0.35 * np.sin(2 * np.pi * 9 * tg) * np.exp(-tg * 3))
add(sfx, np.sin(2 * np.pi * np.cumsum(fg) / SR) * np.exp(-tg * 3.5), 8.86, 0.32, -0.1)
# cartoon yelp (formant synth "aaah!") 8.9-9.6
ty = t_arr(0.75); f0 = 240 + 220 * np.minimum(ty / 0.12, 1) - 60 * np.maximum(ty - 0.4, 0)
saw = 2 * ((np.cumsum(f0) / SR) % 1) - 1
yelp = sum(g * bp(saw, fc * 0.85, fc * 1.15) for fc, g in ((800, 1.0), (1200, 0.6), (2600, 0.25)))
yelp *= env_adsr(len(ty), 0.02, 0.1, 0.8, 0.25)
add(sfx, yelp / np.max(np.abs(yelp)), 8.92, 0.38, 0.0)
# frantic flailing whooshes
for i in range(6):
    tw = t_arr(0.3); w = bp(rng.standard_normal(len(tw)), 300, 1800) * np.sin(np.pi * tw / 0.3)
    add(sfx, w, 9.4 + i * 0.55, 0.12, (-1) ** i * 0.5)
# freeze: record scratch at 13.0
ts = t_arr(0.45); fsc = 300 + 900 * np.sin(np.pi * ts / 0.45)
scr = bp(rng.standard_normal(len(ts)), 500, 3000) * 0.6 + 0.4 * np.sin(2 * np.pi * np.cumsum(fsc) / SR)
add(sfx, scr * env_adsr(len(ts), 0.005, 0.05, 0.8, 0.15), 12.98, 0.35)
# tape rewind 13.5-15.3: warbling chirps + hiss
tr = t_arr(1.85); fr_ = 1800 + 1300 * np.sin(2 * np.pi * 11 * tr) * np.sin(2 * np.pi * 0.6 * tr) + 600 * np.sin(2 * np.pi * 37 * tr)
rw = 0.5 * np.sin(2 * np.pi * np.cumsum(fr_) / SR) + 0.5 * bp(rng.standard_normal(len(tr)), 2000, 7000)
add(sfx, rw * env_adsr(len(tr), 0.08, 0.1, 1, 0.2), 13.48, 0.22)
tc = t_arr(0.12); add(sfx, hp(rng.standard_normal(len(tc)), 2000) * np.exp(-tc * 40), 15.3, 0.4)  # tape click
# zoom into micro world 21.4-22.4 (rising whoosh + shimmer), and transitions
def whoosh(d=1.0, f1=200, f2=4000, up=True):
    tt = t_arr(d); n = rng.standard_normal(len(tt)); out = np.zeros(len(tt)); blk = 1200
    for s in range(0, len(tt), blk):
        u = s / len(tt); fc = f1 * (f2 / f1) ** (u if up else 1 - u)
        out[s:s + blk] = bp(n[max(0, s - 2400):s + blk], fc * 0.7, min(fc * 1.4, 20000))[-len(out[s:s + blk]):]
    return out * np.sin(np.pi * tt / d) ** 1.5
add(sfx, whoosh(1.0, 150, 5000), 21.3, 0.5, 0.0)
for i in range(10): add(sfx, bell(midi(84 + (i * 5) % 12), 1.2), 21.9 + i * 0.05, 0.03, -0.6 + i * 0.12)
# micro ambience 22-29 & 36.6-41.6: airy drone
amb = lp(hp(rng.standard_normal(N), 600), 3000) * 0.025
am = np.zeros(N); am[int(22 * SR):int(41.6 * SR)] = 1; am = np.convolve(am, np.ones(9600) / 9600, 'same')
sfx[0] += amb * am; sfx[1] += np.roll(amb, 911) * am
# gentle sparkles while flying over setae
for i in range(18): add(sfx, bell(midi(88 + int(rng.integers(0, 7))), 0.8), 22.5 + i * 0.37, 0.018, rng.uniform(-0.8, 0.8))
for tt in (28.7, 31.8, 36.1, 41.1): add(sfx, whoosh(0.9, 200, 6000), tt, 0.4)
# contact plinks when spatulae touch glass (31.0-31.6)
for i in range(9): add(sfx, bell(midi(91 + (i % 3) * 2), 0.6), 31.0 + i * 0.07, 0.035, rng.uniform(-0.7, 0.7))
# molecular hum and pulses 32.3-36.6
th = t_arr(4.3); hum = (np.sin(2 * np.pi * 110 * th) + 0.5 * np.sin(2 * np.pi * 165 * th)) * (0.5 + 0.5 * np.sin(2 * np.pi * 5 * th)) * env_adsr(len(th), 0.6, 0.2, 1, 0.8)
add(sfx, lp(hum, 800), 32.3, 0.06)
for i in range(14): add(sfx, bell(midi(79 + (i * 7) % 12), 0.5), 33.2 + i * 0.22, 0.02, rng.uniform(-0.6, 0.6))
# contact glow shimmer 37-41
for i in range(20): add(sfx, bell(midi(86 + int(rng.integers(0, 9))), 0.9), 37.0 + i * 0.2, 0.015, rng.uniform(-0.9, 0.9))
# return to room whoosh down + tiny step taps
add(sfx, whoosh(0.8, 5000, 200, up=False), 41.5, 0.35)
for i in range(10):
    tp = t_arr(0.06); add(sfx, bp(rng.standard_normal(len(tp)), 1500, 5000) * np.exp(-tp * 80), 42.3 + i * 0.6, 0.05, 0.2)
# eye lick "slurp" ~ 48.85
tl = t_arr(0.35); fl = 500 + 900 * tl / 0.35
add(sfx, bp(np.sin(2 * np.pi * np.cumsum(fl) / SR) + 0.3 * rng.standard_normal(len(tl)), 400, 2500) * np.sin(np.pi * tl / 0.35), 48.85, 0.18)
sfx = reverb(sfx, 1.2, 0.15, 6000)

# ---------------- NARRATION placement ----------------
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f'{OUT}/raw/narracion_raw.ogg', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
nar_raw = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
LINES = [(0.0, 4.60, 1.20), (5.10, 6.95, 5.22), (7.50, 12.10, 5.64), (12.65, 22.55, 5.48), (23.20, 34.80, 6.32), (35.50, 43.95, 6.44)]
nar = np.zeros(N)
for a, b, off in LINES:
    seg = nar_raw[int(a * SR):int(b * SR)].copy(); fd = int(0.02 * SR); seg[:fd] *= np.linspace(0, 1, fd); seg[-fd:] *= np.linspace(1, 0, fd)
    i = int((a + off) * SR); nar[i:i + len(seg)] += seg
# light voice polish: highpass, gentle presence
nar = hp(nar, 80); nar = nar / (np.max(np.abs(nar)) + 1e-9) * 0.7
json.dump([[a + off, b + off] for a, b, off in LINES], open(f'{OUT}/narration_lines.json', 'w'))

# ---------------- DUCKING + MIX ----------------
envv = np.convolve(np.abs(nar), np.ones(4800) / 4800, 'same'); envv = envv / (envv.max() + 1e-9)
envv = np.convolve(np.clip(envv * 4, 0, 1), np.ones(9600) / 9600, 'same')
duck = 1 - 0.55 * envv
music = mus / (np.max(np.abs(mus)) + 1e-9) * 0.42 * duck
sfx = sfx / (np.max(np.abs(sfx)) + 1e-9) * 0.5
voice = np.vstack([nar, nar])
mix = music + sfx * (1 - 0.3 * envv) + voice
peak = np.max(np.abs(mix)); mix = mix / peak * 0.89 if peak > 0.89 else mix
def wav(path, x):
    import wave
    x = np.clip(x, -1, 1); xx = (x.T * 32767).astype('<i2')
    with wave.open(path, 'wb') as w: w.setnchannels(x.shape[0] if x.ndim > 1 else 1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(xx.tobytes())
wav(f'{OUT}/audio/musica.wav', music); wav(f'{OUT}/audio/sfx.wav', sfx); wav(f'{OUT}/audio/narracion_sincronizada.wav', voice); wav(f'{OUT}/audio/mezcla_final.wav', mix)
print('ok', peak)
