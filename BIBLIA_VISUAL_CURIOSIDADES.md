# BIBLIA VISUAL — CURIOSIDADES EXTRAORDINARIAS

Guía de identidad permanente de la serie. Cada episodio puede cambiar de protagonistas, escenarios y tema (animales, megaconstrucciones, tecnología, universo…), pero **todo lo que está en este documento se mantiene igual** para que todos los episodios parezcan del mismo universo cinematográfico.

Referencia de producción: Episodio 001 — *¿Por qué los geckos no se caen?* (`episodios/episodio-001-geckos/`).

---

## 0. Formato fijo

| Parámetro | Valor |
|---|---|
| Relación de aspecto | 9:16 vertical |
| Resolución de entrega | 1080 × 1920 |
| Frecuencia | 30 fps |
| Duración objetivo | 45–60 s |
| Códec | H.264 (yuv420p, CRF 17–18) + AAC 192 kbps, `+faststart` |
| Nombre de archivo | `videos/episodio-NNN-tema.mp4` (minúsculas, guiones, sin tildes) |

## 1. Estilo de animación 3D

- **Look:** animación 3D cinematográfica estilizada, a medio camino entre realismo y caricatura (referencia de calidad: largometrajes de animación modernos, con acabado propio).
- **Personajes:** formas suaves y redondeadas, proporciones ligeramente exageradas (cabezas grandes, ojos grandes y brillantes), pero con materiales naturales; nunca aspecto de juguete de plástico liso.
- **Ojos:** siempre grandes, con iris texturizado, córnea brillante con reflejo especular y mirada dirigida (los personajes miran a cosas concretas y, en el remate, a cámara).
- **Animales:** anatomía reconocible y correcta (ej. el gecko diurno verde: pupila redonda, sin párpados móviles, se limpia el ojo con la lengua, almohadillas con lamelas, despegue de dedos distal → proximal).
- **Humanos:** ropa casual, expresiones faciales exageradas y legibles (cejas, apertura de ojos y boca), poses claras de silueta.
- **Mundo microscópico / científico:** misma dirección artística (iluminación de contraluz cálido, niebla atmosférica, partículas suspendidas), **nunca** infografía plana. La ciencia se representa simplificada pero correcta (nada de imanes, pegamento o ventosas si no es lo que ocurre).
- **Continuidad:** un personaje no cambia de diseño, colores ni proporciones entre planos.

## 2. Iluminación

- Esquema **cálido / frío**: luz principal cálida (ámbar 2700–3200 K: lámpara, atardecer) + relleno frío (ventana, cielo, azul-verdoso).
- Siempre un **contraluz** que recorte las siluetas (rim light).
- Sombras suaves (PCF), nunca negras puras; luz hemisférica de rebote.
- Escenas científicas: fondo azul petróleo oscuro (`#0B1D24`), contraluz dorado (`#FFD89A`), brillo cian (`#8FF0FF`) para interacciones/energía.
- Exposición: tonemapping ACES Filmic, exposición ~0.95; evitar quemar blancos (los techos/paredes claros se controlan bajando luces, no la exposición).

## 3. Cámara

- Lente equivalente 30–42° de FOV vertical (más cerrado = 22–30° en macros y primeros planos emocionales).
- Movimientos **siempre motivados y suavizados** (curvas *smootherstep*): grúa ascendente para revelar, *push-in* lento para tensión, *whip* rápido para la acción cómica, órbita lenta en escenas científicas.
- Profundidad de campo en planos cercanos (bokeh suave, apertura alta solo en macros).
- Sacudida breve y amortiguada en impactos.
- Composición vertical: sujeto principal en el tercio central/superior; el tercio inferior queda libre para subtítulos.

## 4. Texturas y materiales

- Materiales físicos (PBR): rugosidad media, *sheen* en tejidos y piel, *clearcoat* suave en piel de reptiles, ojos y superficies barnizadas.
- Piel animal con micro-relieve procedural (escamas granulares más finas en la cabeza), gradiente dorsal-ventral natural.
- Tejidos: grano fino (nunca manchas grandes de ruido), sofá de terciopelo mostaza, camiseta gris jaspeado, vaqueros índigo.
- Estructuras biológicas microscópicas: queratina ámbar translúcida (`#B89A64` → `#E0C890`) con brillo de borde.

## 5. Tratamiento de color

- Paleta base: verde azulado (`#3F6F6A`), mostaza (`#C9902F`), terracota (`#A2573A`), crema (`#E9DCC8`), petróleo (`#0B1D24`), acento amarillo subtítulo (`#FFD72B`).
- Gradación final (shader de post): sombras ligeramente frías (×0.92/1.0/1.06), luces cálidas (×1.06/1.0/0.90), viñeta 0.32–0.50, grano fílmico 3 %, aberración cromática mínima (0.12 %).
- Bloom moderado (fuerza 0.3–0.6, umbral 0.8–0.9) solo en brillos reales.

## 6. Tipografía de subtítulos

- Fuente: **Inter ExtraBold**.
- Subtítulo: 76 px (sobre 1080×1920), blanco `#FFFFFF`, contorno negro 6 px, sombra 3 px, centrado abajo con margen inferior 400 px (fuera de la interfaz de TikTok/Reels y sin tapar personajes).
- Palabras clave en **amarillo `#FFD72B`**.
- Animación de aparición: *pop* 86 % → 100 % en 110 ms + fundido 70 ms.
- Máx. 4 palabras / ~20 caracteres por subtítulo; sincronizados palabra a palabra con la narración (timestamps por reconocimiento de voz).
- Rótulos científicos ("callouts"): Inter ExtraBold 58 px en MAYÚSCULAS, centrados en la zona superior, con *pop* y fundido.
- Firma final: "CURIOSIDADES / EXTRAORDINARIAS" (segunda línea en amarillo) sobre el fundido a negro.

## 7. Estilo de narración

- Voz masculina, español latino neutro, tono documental entretenido, curioso y expresivo.
- Motor usado: Higgsfield **Seed Audio 1.0** (ByteDance), voz preset **"Alden"** (`fec5acae-d801-5761-8d2c-4c2c75db3e2a`). Usar siempre la misma voz.
- Estructura de guion: **gancho-pregunta (0–8 s) → situación cómica → giro ("¡Pero espera!") → explicación visual en 2 niveles de zoom → remate con dato sorprendente + frase de cierre inspiradora.**
- Ritmo ~2,3 palabras/s; pausas de 0,5–0,8 s entre frases para que respiren los planos.

## 8. Música y efectos

- Música instrumental original (sintetizada): pizzicato juguetón en re menor para la curiosidad, *pads* + campanas cristalinas para el asombro científico, resolución mayor cálida al final con acorde y pausa musical.
- Ducking automático: la música baja ~55 % bajo la voz (envolvente de la narración).
- Efectos característicos de la serie: silbato descendente (caídas), *bonk + boing* (impactos cómicos), rayado de disco al congelar imagen, **rebobinado de cinta** (chirridos + siseo + clic), *whoosh* ascendente con brillo al entrar al mundo microscópico, campanitas al "tocar" superficies, zumbido suave molecular.
- Niveles: voz pico −3 dBFS; música −20 dB bajo voz; mezcla final con pico ≤ −1 dBFS.

## 9. Ritmo de edición

- Plano nuevo o evento visual cada 2–4 s; nunca un plano estático > 4 s.
- Transiciones de la serie: congelado + desaturado (pausa narrativa), rebobinado VHS, **zoom radial + destello blanco** para cambiar de escala (macro → micro → molecular y regreso).
- Remate: mirada del protagonista a cámara + gesto característico, pausa musical, fundido a negro de 1,2 s con firma.

## 10. Configuración de render

- Motor: `motor-render/` (three.js r187 en Chromium headless con Playwright, render determinista fotograma a fotograma).
- Render interno 720×1280, escalado Lanczos a 1080×1920 + `unsharp=5:5:0.35`; JPEG Q93 → x264 CRF 17 `veryfast`.
- Un archivo por escena (`segs/sN.mp4`), unión con concat demuxer `-c copy`, audio añadido con `-c:v copy`, subtítulos ASS quemados en la pasada final.
- Post: Bokeh (DOF) en planos cercanos, UnrealBloom, OutputPass (ACES + sRGB), shader de gradación propio (`src/post.js`).
- Si se dispone de un plan de vídeo IA (p. ej. Higgsfield Basic o superior), cualquier plano puede sustituirse por un clip generado manteniendo esta biblia como prompt de estilo; ver `episodios/episodio-001-geckos/prompts_ia.md`.

---

### Plantilla de prompt de estilo (para cualquier generador de imagen/vídeo)

> Cinematic stylized 3D animated film shot, feature-animation quality with its own look, balance between realism and caricature. Warm amber key light and cool teal fill with golden rim light, soft shadows, shallow depth of field, teal-and-amber grade, subtle film grain, smooth motivated camera move. Vertical 9:16. No text, no watermark.
