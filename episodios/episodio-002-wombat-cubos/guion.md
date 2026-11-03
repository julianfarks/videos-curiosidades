# Episodio 002 — ¿Por qué este animal hace cubos con su caca?

Serie **Curiosidades FarKs** · 9:16 · 1080×1920 · 30 fps · 49,5 s · `videos/episodio-002-wombat-cubos.mp4`

## Historial de versiones

| Versión | Fecha | Cambios |
|---|---|---|
| v1 | 2026-11-02 | Primera versión publicada. |

## Escaleta final (tiempos del vídeo)

| Tiempo | Escena | Imagen | Narración |
|---|---|---|---|
| 0–8 s | S1 Bosque australiano | Bosque de eucaliptos al atardecer. El wombat camina hacia cámara; la cámara baja y descubre los cubos sobre una roca plana (los wombats marcan su territorio dejándolos en rocas y troncos). Zoom dramático a un cubo con golpe musical; el wombat mira a cámara con cara de inocente. | «¡Este animal hace caca en forma de cubo! Sí, has escuchado bien... ¡CUBOS!» |
| 8–15 s | S2 Observación | El wombat olfatea los cubos; la cámara orbita y se acerca a su cara; inclina la cabeza, confundido. Pausa cómica con grillos. | «Pero ¿cómo puede un animal fabricar algo así? ¿Tiene un intestino cuadrado?» |
| 15–19,6 s | S3a Rayos X | Anillo de escaneo y transición a una vista de rayos X: aparato digestivo simplificado (esófago, estómago, intestino delgado, ciego e intestino grueso). Rótulo «Intestino: sección redonda». El último 17 % del intestino se ilumina y la cámara entra en él. | «¡Pues no! Su intestino no es cuadrado. El secreto está…» |
| 19,6–27,6 s | S3b Intestino grueso | Corte 3D del tramo final del intestino. Las paredes se codifican por color: zonas rígidas (azul) y flexibles (coral). Comienzan las ondas de contracción; el contenido pasa de una masa redonda y húmeda a bloques de sección cuadrada. | «…en las diferentes elasticidades de las paredes de su intestino y en las contracciones que moldean las heces». |
| 27,6–32,6 s | S4a Sección transversal | Anillo intestinal con 2 zonas rígidas (más gruesas) y 2 flexibles. Ciclos de contracción: las zonas rígidas se contraen más rápido (flechas grandes) y las flexibles más despacio; la sección pasa de círculo a cuadrado con las esquinas en las uniones. | «Los científicos descubrieron que algunas zonas del intestino son más rígidas que otras». |
| 32,6–36,6 s | S4b Formación del cubo | Vuelta al corte 3D: al final del tubo salen cubos ya formados. | «Sus contracciones ayudan a formar esas características esquinas». |
| 36,6–39,5 s | S4c Comparación | Pedestales: heces redondeadas (otros animales) frente a cubo de wombat, con cota «≈ 2 cm». | — (música) |
| 39,5–49,5 s | S5 Remate | De vuelta en el bosque junto a los cubos. Plano del trasero, redondo y peludo, mientras menea la colita. El wombat se da la vuelta, mira a cámara y se queda congelado (scratch de disco). Golpe cómico y se va caminando. Firma «Curiosidades FarKs» y fundido a negro. | «Y lo más increíble es que no necesita tener un trasero cuadrado. ¡Su propio intestino hace todo el trabajo!» |

## Rigor científico

Fuente principal: Yang, P. J. *et al.* (2021). «Intestines of non-uniform stiffness mold the corners of wombat feces». *Soft Matter* 17, 475–488. DOI 10.1039/D0SM01230K.

- Los cubos se forman **dentro del intestino**, en el último ~17 % del intestino, donde las heces se secan. El vídeo **no** muestra ni afirma que el ano sea cuadrado (es redondo, como en otros animales).
- Alrededor de la circunferencia del intestino hay **2 zonas rígidas y 2 flexibles** (rígida-flexible-rígida-flexible). Las rígidas tienen unas **2 veces más grosor** y son unas **4 veces más rígidas**. En la animación, las paredes rígidas son más gruesas.
- Las esquinas aparecen porque las zonas rígidas se contraen más rápido y el centro de las flexibles se mueve más despacio. Las esquinas se representan en las uniones entre zonas.
- El aparato digestivo y el intestino están simplificados, sin detalle gráfico; proporciones estilizadas.
- Los cubos miden unos 2 cm de lado (en el bosque están ligeramente agrandados para que se lean bien en móvil).
- Se muestran sobre una roca plana porque los wombats usan las heces como marcas en lugares elevados (rocas, troncos); las caras planas evitan que rueden.

## Producción

- Animación 3D procedural con three.js (motor propio en `scripts/motor/`), render por fotogramas en Chromium sin interfaz. No se usaron generadores de vídeo por IA: la cuenta de Higgsfield está en plan gratuito y no permite generar vídeo ni imagen.
- Voz: Higgsfield Seed Audio 1.0, preset «Alden» (la misma voz del episodio 001), español latino neutro.
- Música y efectos sintetizados con `scripts/build_audio.py`. La música baja automáticamente bajo la voz (ducking ≈ 60 %).
- Subtítulos: tiempos por palabra con reconocimiento de voz (faster-whisper). El texto se toma del guion exacto, así que se corrige la transcripción «eses» → «heces». Inter ExtraBold blanco con contorno negro y palabras clave en amarillo.
