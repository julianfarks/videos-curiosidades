"""Builds Spanish subtitles (SRT + styled ASS) synced to the narration word timings."""
import json, re, sys
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
words = json.load(open(f'{OUT}/raw/words.json'))  # [start, end, word] in raw narration time
LINES = [(0.0, 4.60, 1.20), (5.10, 6.95, 5.22), (7.50, 12.10, 5.64), (12.65, 22.55, 5.48), (23.20, 34.80, 6.32), (35.50, 43.95, 6.44)]
SCRIPT = [
    "¿Te has preguntado alguna vez por qué los geckos nunca se caen de las paredes o del techo?",
    "¡Bueno! Imagina que esto te pasara...",
    "¡Pero espera! Esto no es algo que ocurra habitualmente. ¿Quieres saber por qué?",
    "El secreto está en sus patas. Sus dedos están cubiertos de millones de estructuras microscópicas llamadas setas, tan diminutas que no podemos verlas a simple vista.",
    "Estas estructuras generan unas fuerzas de atracción molecular llamadas fuerzas de Van der Waals. Gracias a ellas, el gecko puede adherirse a superficies lisas sin necesidad de pegamento ni ventosas.",
    "Y lo más impresionante es que puede despegar sus dedos de forma controlada para dar cada paso. ¡La naturaleza tiene soluciones increíbles!",
]
KEY = {'geckos', 'gecko', 'techo', 'patas', 'dedos', 'millones', 'microscópicas', 'setas', 'diminutas', 'atracción', 'molecular', 'van', 'der', 'waals', 'pegamento', 'ventosas', 'despegar', 'controlada', 'naturaleza', 'increíbles', 'secreto', 'paredes'}
sw = [w for line in SCRIPT for w in line.split()]
assert len(sw) == len(words), (len(sw), len(words))
# map each word to final timeline time
timed = []
for (s, e, _), tok in zip(words, sw):
    off = next(o for a, b, o in LINES if a - 0.3 <= s <= b + 0.3)
    timed.append([s + off, e + off, tok])
# group into captions: break on punctuation, max 4 words / 22 chars
caps, cur = [], []
for w in timed:
    cur.append(w)
    txt = ' '.join(x[2] for x in cur)
    if re.search(r'[.!?,…]$', w[2]) or len(cur) >= 4 or len(txt) > 20:
        caps.append(cur); cur = []
if cur: caps.append(cur)
def ts_srt(t): h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60; return f"{h:02d}:{m:02d}:{int(s):02d},{int(round((s - int(s)) * 1000)) % 1000:03d}"
def ts_ass(t): h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60; return f"{h}:{m:02d}:{s:05.2f}"
srt, ev = [], []
for i, c in enumerate(caps):
    st = c[0][0] - 0.05; en = c[-1][1] + 0.12
    if i + 1 < len(caps): en = min(en + 0.25, caps[i + 1][0][0] - 0.06)
    srt.append(f"{i + 1}\n{ts_srt(st)} --> {ts_srt(en)}\n{' '.join(x[2] for x in c)}\n")
    parts = []
    for x in c:
        bare = re.sub(r'[^\wáéíóúñü]', '', x[2].lower())
        parts.append('{\\c&H2BD7FF&}' + x[2] + '{\\c&HFFFFFF&}' if bare in KEY else x[2])
    ev.append(f"Dialogue: 0,{ts_ass(st)},{ts_ass(en)},Sub,,0,0,0,,{{\\fad(70,60)\\fscx86\\fscy86\\t(0,110,\\fscx100\\fscy100)}}{' '.join(parts)}")
callouts = [(24.30, 26.90, 'SETAS', 470), (25.30, 26.90, '≈ 0,1 mm', 560), (27.30, 28.90, 'ESPÁTULAS', 470), (33.45, 36.40, 'FUERZAS DE', 430), (33.45, 36.40, 'VAN DER WAALS', 520),
            (39.60, 41.30, 'SIN PEGAMENTO', 470), (39.90, 41.30, 'SIN VENTOSAS', 560)]
for st, en, txt, y in callouts:
    ev.append(f"Dialogue: 1,{ts_ass(st)},{ts_ass(en)},Callout,,0,0,0,,{{\\pos(540,{y})\\fad(120,120)\\fscx80\\fscy80\\t(0,160,\\fscx100\\fscy100)}}{txt}")
ev.append(f"Dialogue: 1,{ts_ass(50.55)},{ts_ass(51.95)},Brand,,0,0,0,,{{\\pos(540,930)\\fad(250,300)}}Curiosidades\\N{{\\c&H2BD7FF&}}FarKs")
ass = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Inter ExtraBold,76,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,-1,0,0,0,100,100,0,0,1,6,3,2,70,70,400,1
Style: Callout,Inter ExtraBold,58,&H00FFFFFF,&H00FFFFFF,&H00141414,&H64000000,-1,0,0,0,100,100,3,0,1,5,2,5,40,40,40,1
Style: Brand,Inter ExtraBold,72,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,6,0,1,4,0,5,40,40,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" + '\n'.join(ev) + '\n'
open(f'{OUT}/subtitulos/subtitulos.ass', 'w').write(ass)
open(f'{OUT}/subtitulos/subtitulos.srt', 'w').write('\n'.join(srt))
print(len(caps), 'captions')
