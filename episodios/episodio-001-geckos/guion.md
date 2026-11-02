# Episodio 001 — ¿Por qué los geckos no se caen?

**Vídeo final:** [`videos/episodio-001-geckos.mp4`](../../videos/episodio-001-geckos.mp4) · 52 s · 1080×1920 · 30 fps

## Guion utilizado (narración exacta) y montaje

| Tiempo | Escena | Narración | Visual |
|---|---|---|---|
| 0:00–0:08 | 1 · La pregunta | «¿Te has preguntado alguna vez por qué los geckos nunca se caen de las paredes o del techo?» | Sala acogedora al atardecer; el hombre mira el móvil en el sofá. La cámara sube en grúa hasta el techo, encuentra al gecko caminando boca abajo y hace *push-in*. |
| 0:08–0:13 | 2 · La caída inesperada | «¡Bueno! Imagina que esto te pasara...» | Un dedo pierde agarre, el gecko cae girando (silbato), aterriza sobre la cabeza del hombre (*bonk + boing*), él salta con los brazos arriba y grita; el gecko queda agarrado a su pelo. |
| 0:13–0:17.8 | 3 · Rebobinado | «¡Pero espera! Esto no es algo que ocurra habitualmente. ¿Quieres saber por qué?» | Congelado + desaturado (rayado de disco), rebobinado VHS hasta el gecko caminando tranquilo en el techo. |
| 0:17.8–0:29.2 | 4 · El secreto de sus patas | «El secreto está en sus patas. Sus dedos están cubiertos de millones de estructuras microscópicas llamadas setas, tan diminutas que no podemos verlas a simple vista.» | Macro de la pata despegando los dedos; zoom radial + destello hacia un bosque de **setas** sobre las lamelas; descenso entre ellas hasta las puntas ramificadas (**espátulas**). Rótulos: SETAS · ≈ 0,1 mm · ESPÁTULAS. |
| 0:29.2–0:41.6 | 5 · La explicación científica | «Estas estructuras generan unas fuerzas de atracción molecular llamadas fuerzas de Van der Waals. Gracias a ellas, el gecko puede adherirse a superficies lisas sin necesidad de pegamento ni ventosas.» | Las espátulas bajan hasta el cristal; zoom a escala atómica: nubes electrónicas fluctuantes que se correlacionan (dipolos δ−/δ+) y aparecen enlaces de atracción débil; vuelta atrás: millones de puntos de contacto brillando bajo el cristal. Rótulos: FUERZAS DE VAN DER WAALS · SIN PEGAMENTO · SIN VENTOSAS. |
| 0:41.6–0:52 | 6 · Final | «Y lo más impresionante es que puede despegar sus dedos de forma controlada para dar cada paso. ¡La naturaleza tiene soluciones increíbles!» | Plano bajo de la pata: los dedos se despegan de la punta hacia la base en cada paso. Primer plano de la cara: el gecko gira la cabeza, mira a cámara y se limpia el ojo con la lengua; sigue caminando. Acorde final, pausa musical y fundido a negro con la firma de la serie. |

## Notas científicas (verificadas)

- Las setas miden del orden de 0,1 mm (≈ 30–130 µm) y cada pie tiene cientos de miles; en total, millones.
- Cada seta se ramifica en cientos de **espátulas** de ~0,2 µm.
- La adhesión se debe principalmente a **fuerzas de Van der Waals** (dipolos inducidos/fluctuantes), aditivas sobre millones de contactos; no hay pegamento ni succión.
- El despegue es por **hiperextensión digital** (los dedos se enrollan de la punta hacia la base), lo que cambia el ángulo de las setas y libera el contacto sin esfuerzo.
- Se modeló un gecko diurno verde (tipo *Phelsuma*): pupila redonda y sin párpados móviles — por eso se limpia el ojo con la lengua.

## Archivos

- `audio/narracion_ia_original.ogg` — narración IA tal como salió del generador (44 s, Opus).
- `audio/narracion_sincronizada.flac` — narración colocada en la línea de tiempo final.
- `audio/musica.flac`, `audio/sfx.flac`, `audio/mezcla_final.flac` — pistas separadas y mezcla.
- `subtitulos/subtitulos.srt` (estándar) y `subtitulos/subtitulos.ass` (estilo de la serie, quemado en el vídeo).
- `datos/words.json` — tiempos palabra a palabra (faster-whisper) usados para sincronizar subtítulos.
- `scripts/build_audio.py`, `scripts/build_subs.py`, `scripts/montaje.sh` — reconstrucción de audio, subtítulos y montaje.
- `previews/` — fotogramas de referencia.
- La animación se renderiza con el motor compartido en [`/motor-render`](../../motor-render).
