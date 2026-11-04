"""Builds music, SFX and final mix for Episode 001 (all synthesized procedurally).
Outputs: musica.wav, sfx.wav, narracion_sincronizada.wav, mezcla_final.wav (48 kHz stereo)."""
import numpy as np, subprocess, json, sys
from scipy.signal import fftconvolve, butter, sosfilt

SR = 48000; DUR = 52.3; N = int(SR * DUR)
rng = np.random.default_rng(7)
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
BEAT = 60 / 96

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

