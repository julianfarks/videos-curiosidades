# Episodio 003 — El animal que puede sobrevivir en el espacio

Serie **Curiosidades FarKs** · 9:16 · 1080×1920 · 30 fps · 49,7 s · `videos/episodio-003-tardigrado-espacio.mp4`

## Historial de versiones

| Versión | Fecha | Cambios |
|---|---|---|
| v1 | 2026-11-03 | Primera versión publicada. |

## Escaleta final (tiempos del vídeo)

| Tiempo | Escena | Imagen | Narración |
|---|---|---|---|
| 0–6,1 s | S1 Gancho en el espacio | Espacio exterior con la Tierra. La cámara se acerca a un punto diminuto que flota y, con un impacto cinematográfico y un destello, revela al tardígrado. Abre los ojos y mira a cámara. | «¡Este animal puede sobrevivir en el espacio exterior! Y no, no es un extraterrestre...» |
| 6,1–9,3 s | S1b Punta de aguja | El tardígrado sobre la punta de una aguja de acero; la cámara se aleja para mostrar la escala. Rótulo «Punta de aguja». | «...¡es un animal real que cabe en la punta de una aguja!» |
| 9,3–16,6 s | S2 Sobre la hoja | El tardígrado camina con sus 8 patas sobre una hoja de musgo con gotas de agua. Primer plano de las patas y sus uñas. Llega la yema de un dedo con su huella dactilar y la cámara se aleja: el tardígrado queda como un punto dentro de un aro amarillo. Rótulos «Oso de agua», «8 patas», «≈ 0,5 mm». | «Se llama tardígrado, también conocido como oso de agua. Es tan pequeño que normalmente necesitas un microscopio para observarlo.» |
| 16,6–29 s | S3 Criptobiosis | Laboratorio microscópico. Sube el calor, el agua se evapora y el musgo se seca. El tardígrado cierra los ojos, retrae las patas y la cabeza, y se contrae en un «tonel» compacto. Las partículas de actividad se apagan y el latido sonoro se hace cada vez más lento. Rótulos «Criptobiosis», «Metabolismo casi detenido» y «Forma compacta («tonel»)». | «Cuando las condiciones se vuelven extremas, algunos tardígrados pueden entrar en un estado llamado criptobiosis. Su metabolismo se reduce hasta niveles casi indetectables y su cuerpo adopta una forma compacta.» |
| 29–36,6 s | S4 Experimento en órbita | Bandeja de experimento en órbita con la Tierra al fondo y polvo espacial. Los tardígrados están en sus pocillos, todos en estado de tonel. Música épica. Rótulos «Misión FOTON-M3 · 2007», «10 días en órbita», «Solo en estado deshidratado» y «No todos sobrevivieron». | «En experimentos científicos, algunos tardígrados han conseguido sobrevivir a la exposición al vacío espacial durante un tiempo limitado. ¡Es una resistencia extraordinaria…» |
| 36,6–40,9 s | S4b Rehidratación | De vuelta en condiciones adecuadas: cae una gota, el agua regresa, el tonel se hincha, salen las patas y la cabeza, abre los ojos y mira a cámara. Rótulo «Rehidratación». | «…para un animal tan diminuto!» |
| 40,9–49,7 s | S5 Remate | El tardígrado camina tranquilo por la hoja. Primer plano de su cara y de sus patitas. Saluda con una pata y guiña un ojo (efectos cómicos) y se aleja caminando. Firma «Curiosidades FarKs» y fundido a negro. | «Y tú preocupándote por llegar vivo al lunes... ¡este pequeñín ya tiene experiencia fuera de la Tierra!» |

## Rigor científico

Fuente principal: Jönsson, K. I., Rabbow, E., Schill, R. O., Harms-Ringdahl, M. & Rettberg, P. (2008). «Tardigrades survive exposure to space in low Earth orbit». *Current Biology* 18(17), R729–R731. DOI 10.1016/j.cub.2008.06.048.

- **Experimento TARDIS**, a bordo de la cápsula **FOTON-M3** (septiembre de 2007): unos **10 días** en órbita baja.
- Solo se expusieron tardígrados **deshidratados**, en estado de tonel (anhidrobiosis, un tipo de criptobiosis). En la animación, todos los ejemplares del experimento aparecen en forma de tonel, nunca activos en el vacío.
- **No todos sobrevivieron.** La supervivencia bajó mucho con la radiación ultravioleta solar completa. El guion dice «algunos tardígrados» y «durante un tiempo limitado». El vídeo no afirma que todos los tardígrados resistan cualquier condición ni que puedan vivir indefinidamente en el espacio.
- **Criptobiosis**: al deshidratarse, el tardígrado retrae la cabeza y las patas y forma un «tonel». Su metabolismo baja a niveles casi indetectables. Al rehidratarse puede reactivarse en minutos u horas; en el vídeo el proceso está acelerado.
- **Tamaño**: los tardígrados adultos miden unos 0,1–1,5 mm; el rótulo usa «≈ 0,5 mm» como tamaño típico. En el espacio y en la aguja se muestran agrandados para poder verlos; la comparación con el dedo da la escala real aproximada.
- **Anatomía**: cuerpo segmentado y rechoncho, **4 pares de patas** con uñas (el cuarto par apunta hacia atrás) y boca tubular. El diseño es estilizado y expresivo (ojos más grandes que en la realidad), pero reconocible. No es un extraterrestre ni un monstruo.
- La «aguja» y la bandeja del experimento están simplificadas.

## Producción

- Animación 3D procedural con three.js (motor propio en `scripts/motor/`), render por fotogramas en Chromium sin interfaz; todos los planos están animados (cámara, personaje, partículas, agua). No se usaron generadores de vídeo por IA: la cuenta de Higgsfield está en plan gratuito y no permite generar vídeo.
- Voz: Higgsfield Seed Audio 1.0, preset «Alden» (la misma voz de los episodios anteriores), español latino neutro.
- Música y efectos sintetizados con `scripts/build_audio.py`:
  - Música misteriosa en el espacio, juguetona en la hoja, tensa en la criptobiosis, épica en el experimento orbital y divertida en el remate.
  - Impacto cinematográfico en la revelación, latido que se ralentiza (metabolismo) y se acelera al rehidratarse, «plink» de la gota y efectos cómicos en el saludo.
  - La música baja automáticamente bajo la voz (ducking ≈ 60 %).
- Subtítulos: tiempos por palabra con reconocimiento de voz (faster-whisper) sobre el texto exacto del guion. Inter ExtraBold blanco con contorno negro, abajo y centrados, con palabras clave en amarillo.

## Archivos

- `audio/`: `mezcla_final.flac`, `musica.flac`, `sfx.flac`, `narracion_sincronizada.flac` y `narracion_ia_original.ogg` (voz IA original sin montar).
- `subtitulos/`: `subtitulos.srt` y `subtitulos.ass` (estilo quemado en el vídeo).
- `datos/`: `words.json` (tiempos por palabra en el audio original) y `narration_lines.json` (colocación de cada frase en el vídeo).
- `scripts/`: `build_audio.py`, `synth_lib.py`, `build_subs.py`, `montaje.sh` y `motor/` (escenas 3D).
- `previews/`: fotogramas de control del vídeo final.
