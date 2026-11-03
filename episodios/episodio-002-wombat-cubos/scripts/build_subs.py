"""Subtítulos del Episodio 002 (SRT + ASS con estilo), sincronizados palabra a palabra con la narración."""
import json, re
words = json.load(open('raw/words.json'))  # [{'w','s','e'}] tiempos en el audio TTS original
LINES = [(0.20, 5.05, 0.30), (5.05, 6.40, 0.50), (6.40, 10.25, 1.58), (10.25, 12.90, 1.33),
         (12.90, 25.20, 1.91), (25.20, 35.00, 1.99), (35.00, 43.43, 4.54)]
SCRIPT = [  # texto exacto del guion (la transcripción automática solo aporta los tiempos)
    "¡Este animal hace caca en forma de cubo! Sí, has escuchado bien... ¡CUBOS!",
    "Pero ¿cómo puede un animal fabricar algo así? ¿Tiene un intestino cuadrado?",
    "¡Pues no! Su intestino no es cuadrado. El secreto está en las diferentes elasticidades de las paredes de su intestino y en las contracciones que moldean las heces.",
    "Los científicos descubrieron que algunas zonas del intestino son más rígidas que otras. Sus contracciones ayudan a formar esas características esquinas.",
    "Y lo más increíble es que no necesita tener un trasero cuadrado. ¡Su propio intestino hace todo el trabajo!",
]
KEY = {'cubo', 'cubos', 'caca', 'intestino', 'cuadrado', 'secreto', 'elasticidades', 'paredes', 'contracciones', 'moldean', 'heces',
       'científicos', 'rígidas', 'esquinas', 'increíble', 'trabajo'}
sw = [w for line in SCRIPT for w in line.split()]
assert len(sw) == len(words), (len(sw), len(words))
timed = []
for wd, tok in zip(words, sw):
    s, e = wd['s'], wd['e']
    off = next(o for a, b, o in LINES if a - 0.3 <= s < b)
    timed.append([s + off, e + off, tok])
# "¡CUBOS!" is its own caption; break on punctuation, max 4 words / ~20 chars
caps, cur = [], []
for w in timed:
    if w[2].startswith('¡CUBOS') and cur: caps.append(cur); cur = []
    cur.append(w)
    txt = ' '.join(x[2] for x in cur)
    if re.search(r'[.!?,…»]$', w[2]) or len(cur) >= 4 or len(txt) > 20:
        caps.append(cur); cur = []
if cur: caps.append(cur)
def ts_srt(t): h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60; ms = int(round((s - int(s)) * 1000)); return f"{h:02d}:{m:02d}:{int(s) + ms // 1000:02d},{ms % 1000:03d}"
def ts_ass(t): h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60; return f"{h}:{m:02d}:{s:05.2f}"
srt, ev = [], []
for i, c in enumerate(caps):
    st = c[0][0] - 0.05; en = c[-1][1] + 0.15
    if i + 1 < len(caps): en = min(en + 0.25, caps[i + 1][0][0] - 0.06)
    srt.append(f"{i + 1}\n{ts_srt(st)} --> {ts_srt(en)}\n{' '.join(x[2] for x in c)}\n")
    parts = []
    for x in c:
        bare = re.sub(r'[^\wáéíóúñü]', '', x[2].lower())
        parts.append('{\\c&H2BD7FF&}' + x[2] + '{\\c&HFFFFFF&}' if bare in KEY else x[2])
    big = '\\fs104' if c[0][2].startswith('¡CUBOS') else ''
    ev.append(f"Dialogue: 0,{ts_ass(st)},{ts_ass(en)},Sub,,0,0,0,,{{\\fad(70,60){big}\\fscx86\\fscy86\\t(0,110,\\fscx100\\fscy100)}}{' '.join(parts)}")
# science callouts (upper area)
callouts = [
    (17.00, 18.60, 'INTESTINO: SECCIÓN REDONDA', 300),
    (18.70, 19.55, 'ÚLTIMO 17 % DEL INTESTINO', 300),
    (20.40, 23.30, 'ZONAS RÍGIDAS', 260), (20.90, 23.30, 'ZONAS FLEXIBLES', 340),
    (24.00, 27.00, 'CONTRACCIONES', 300),
    (28.30, 32.40, 'ZONAS RÍGIDAS: MÁS GRUESAS', 230), (28.30, 32.40, 'Y 4 VECES MÁS RÍGIDAS', 305),
    (33.20, 36.40, 'SE FORMAN LAS ESQUINAS', 300),
]
POS = [(36.90, 39.30, '{\\fs46}REDONDA\\N{\\fs34}otros animales', 255, 1190), (36.90, 39.30, '{\\fs46}CÚBICA\\N{\\fs34}wombat', 825, 1190),
       (37.70, 39.30, '≈ 2 cm', 825, 790)]
for st, en, txt, y in callouts:
    style = 'Callout'; txt = ('{\\fs48}' + txt) if len(txt) > 18 else txt
    ev.append(f"Dialogue: 1,{ts_ass(st)},{ts_ass(en)},{style},,0,0,0,,{{\\pos(540,{y})\\fad(120,120)\\fscx80\\fscy80\\t(0,160,\\fscx100\\fscy100)}}{txt}")
for st, en, txt, x, y in POS:
    ev.append(f"Dialogue: 1,{ts_ass(st)},{ts_ass(en)},Callout,,0,0,0,,{{\\pos({x},{y})\\fad(120,120)}}{txt}")
ev.append(f"Dialogue: 1,{ts_ass(48.25)},{ts_ass(49.55)},Brand,,0,0,0,,{{\\pos(540,930)\\fad(250,200)}}Curiosidades\\N{{\\c&H2BD7FF&}}FarKs")
ass = """[Script Info]
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
open('subtitulos/subtitulos.ass', 'w').write(ass)
open('subtitulos/subtitulos.srt', 'w').write('\n'.join(srt))
print(len(caps), 'captions')
