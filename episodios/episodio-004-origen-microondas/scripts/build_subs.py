"""Subtítulos del Episodio 004 (SRT + ASS con estilo), sincronizados palabra a palabra con la narración."""
import json, re
words = json.load(open('raw/words.json'))  # [[inicio, fin, palabra]] tiempos en el audio TTS original
LINES = [(0.0, 7.21, 0.4), (7.21, 17.31, 0.69), (17.31, 27.71, 0.43), (27.71, 39.26, 0.53), (39.26, 47.29, 1.47)]
SCRIPT = [  # texto exacto del guion (la transcripción automática solo aporta los tiempos)
    "¡Un hombre descubrió accidentalmente cómo cocinar alimentos usando ondas invisibles... por culpa de una chocolatina!",
    "En 1945, el ingeniero Percy Spencer trabajaba con un dispositivo de radar cuando notó que una chocolatina que llevaba en el bolsillo se había derretido.",
    "Decidió investigar qué estaba pasando. Probó con granos de maíz y descubrió que podían convertirse en palomitas gracias a aquellas ondas electromagnéticas.",
    "Así nació la idea del microondas. Estas ondas hacen que las moléculas polares, como las del agua, respondan al campo electromagnético y generen calor dentro del alimento.",
    "Y pensar que uno de los electrodomésticos más utilizados del mundo comenzó con un ingeniero, un radar y una chocolatina derretida.",
]
KEY = {'accidentalmente', 'cocinar', 'ondas', 'invisibles', 'chocolatina', '1945', 'percy', 'spencer', 'radar', 'bolsillo', 'derretido',
       'investigar', 'maíz', 'palomitas', 'electromagnéticas', 'microondas', 'moléculas', 'polares', 'agua', 'campo', 'electromagnético',
       'calor', 'alimento', 'electrodomésticos', 'derretida'}
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
# rótulos (zona superior)
callouts = [
    (7.85, 10.1, '1945 · RAYTHEON (EE. UU.)', 300),
    (10.5, 12.3, 'PERCY SPENCER', 300), (10.9, 12.3, '{\\fs40}INGENIERO', 368),
    (12.6, 14.6, 'MAGNETRÓN', 300), (13.0, 14.6, '{\\fs40}GENERA MICROONDAS PARA EL RADAR', 368),
    (20.9, 22.4, 'GRANOS DE MAÍZ', 300),
    (24.0, 25.5, '¡PALOMITAS!', 300),
    (32.2, 34.1, 'MOLÉCULA DE AGUA', 300), (32.6, 34.1, '{\\fs40}POLAR: δ− Y δ+', 368),
    (34.3, 37.3, 'CAMPO ELECTROMAGNÉTICO', 300), (34.8, 37.3, '{\\fs38}OSCILA ≈ 2.450 MILLONES DE VECES/S', 368),
    (37.6, 40.4, 'LAS MOLÉCULAS GIRAN Y CHOCAN', 300), (38.1, 40.4, '{\\fs46}→ CALOR', 368),
    (41.2, 44.4, 'RADARANGE (1947)', 300), (41.7, 44.4, '{\\fs40}≈ 1,8 m · ≈ 340 kg', 368),
]
for st, en, txt, y in callouts:
    txt2 = ('{\\fs48}' + txt) if (len(txt) > 18 and not txt.startswith('{')) else txt
    ev.append(f"Dialogue: 1,{ts_ass(st)},{ts_ass(en)},Callout,,0,0,0,,{{\\pos(540,{y})\\fad(120,120)\\fscx80\\fscy80\\t(0,160,\\fscx100\\fscy100)}}{txt2}")
ev.append(f"Dialogue: 1,{ts_ass(7.7)},{ts_ass(28.3)},Note,,0,0,0,,{{\\pos(540,150)\\fad(200,200)}}Reconstrucción animada")
ev.append(f"Dialogue: 1,{ts_ass(40.7)},{ts_ass(44.8)},Note,,0,0,0,,{{\\pos(540,150)\\fad(200,200)}}Reconstrucción animada")
ev.append(f"Dialogue: 1,{ts_ass(50.75)},{ts_ass(52.2)},Brand,,0,0,0,,{{\\pos(540,930)\\fad(250,200)}}Curiosidades\\N{{\\c&H2BD7FF&}}FarKs")
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
Style: Note,Inter ExtraBold,34,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,-1,0,0,0,100,100,2,0,1,3,0,5,40,40,40,1
Style: Brand,Inter ExtraBold,72,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,6,0,1,4,0,5,40,40,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" + '\n'.join(ev) + '\n'
open('subtitulos/subtitulos.ass', 'w').write(ass)
open('subtitulos/subtitulos.srt', 'w').write('\n'.join(srt))
print(len(caps), 'captions')
