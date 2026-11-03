"""Subtítulos del Episodio 003 (SRT + ASS con estilo), sincronizados palabra a palabra con la narración."""
import json, re
words = json.load(open('raw/words.json'))  # [[inicio, fin, palabra]] tiempos en el audio TTS original
LINES = [(0.0, 3.0, 0.6), (3.0, 5.07, 1.0), (5.07, 8.1, 1.1), (8.1, 15.18, 1.4),
         (15.18, 26.8, 1.7), (26.8, 38.2, 2.3), (38.2, 43.58, 3.0)]
SCRIPT = [  # texto exacto del guion (la transcripción automática solo aporta los tiempos)
    "¡Este animal puede sobrevivir en el espacio exterior! Y no, no es un extraterrestre... ¡es un animal real que cabe en la punta de una aguja!",
    "Se llama tardígrado, también conocido como oso de agua. Es tan pequeño que normalmente necesitas un microscopio para observarlo.",
    "Cuando las condiciones se vuelven extremas, algunos tardígrados pueden entrar en un estado llamado criptobiosis. Su metabolismo se reduce hasta niveles casi indetectables y su cuerpo adopta una forma compacta.",
    "En experimentos científicos, algunos tardígrados han conseguido sobrevivir a la exposición al vacío espacial durante un tiempo limitado. ¡Es una resistencia extraordinaria para un animal tan diminuto!",
    "Y tú preocupándote por llegar vivo al lunes... ¡este pequeñín ya tiene experiencia fuera de la Tierra!",
]
KEY = {'espacio', 'exterior', 'sobrevivir', 'extraterrestre', 'real', 'aguja', 'tardígrado', 'tardígrados', 'oso', 'agua', 'pequeño', 'microscopio',
       'extremas', 'criptobiosis', 'metabolismo', 'indetectables', 'compacta', 'científicos', 'vacío', 'espacial', 'limitado',
       'extraordinaria', 'diminuto', 'lunes', 'pequeñín', 'tierra'}
sw = [w for line in SCRIPT for w in line.split()]
assert len(sw) == len(words), (len(sw), len(words))
timed = []
for (s, e, _), tok in zip(words, sw):
    off = next(o for a, b, o in LINES if a - 0.3 <= s < b)
    timed.append([s + off, e + off, tok])
caps, cur = [], []
for w in timed:
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
    ev.append(f"Dialogue: 0,{ts_ass(st)},{ts_ass(en)},Sub,,0,0,0,,{{\\fad(70,60)\\fscx86\\fscy86\\t(0,110,\\fscx100\\fscy100)}}{' '.join(parts)}")
# rótulos científicos (zona superior)
callouts = [
    (7.00, 9.00, 'PUNTA DE AGUJA', 300),
    (10.80, 12.40, 'OSO DE AGUA', 300), (11.40, 12.70, '8 PATAS', 380),
    (14.00, 16.40, '≈ 0,5 mm', 300),
    (20.40, 23.00, 'CRIPTOBIOSIS', 300),
    (23.40, 26.00, 'METABOLISMO CASI DETENIDO', 300),
    (26.10, 28.60, 'FORMA COMPACTA («TONEL»)', 300),
    (29.40, 32.30, 'MISIÓN FOTON-M3 · 2007', 300), (30.20, 32.30, '10 DÍAS EN ÓRBITA', 375),
    (32.60, 36.40, 'SOLO EN ESTADO DESHIDRATADO', 300), (34.40, 36.40, 'NO TODOS SOBREVIVIERON', 375),
    (37.60, 40.30, 'REHIDRATACIÓN', 300),
]
POS = []
for st, en, txt, y in callouts:
    style = 'Callout'; txt = ('{\\fs48}' + txt) if len(txt) > 18 else txt
    ev.append(f"Dialogue: 1,{ts_ass(st)},{ts_ass(en)},{style},,0,0,0,,{{\\pos(540,{y})\\fad(120,120)\\fscx80\\fscy80\\t(0,160,\\fscx100\\fscy100)}}{txt}")
ev.append(f"Dialogue: 1,{ts_ass(48.30)},{ts_ass(49.60)},Brand,,0,0,0,,{{\\pos(540,930)\\fad(250,200)}}Curiosidades\\N{{\\c&H2BD7FF&}}FarKs")
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
