# Episodio 004 — El chocolate que inventó el microondas

Serie **Curiosidades FarKs** · 9:16 · 1080×1920 · 30 fps · 52,3 s · `videos/episodio-004-origen-microondas.mp4`

## Historial de versiones

| Versión | Fecha | Cambios |
|---|---|---|
| v1 | 2026-11-04 | Primera versión publicada. |

## Escaleta final (tiempos del vídeo)

| Tiempo | Escena | Imagen | Narración |
|---|---|---|---|
| 0–7,6 s | S1 Gancho | Laboratorio de los años 40 con armarios de equipos electrónicos, válvulas encendidas y un osciloscopio. El ingeniero gira un mando junto a un magnetrón con bocina. Nota algo raro, se mira el bolsillo y saca la chocolatina derretida. La mira confundido, mira la máquina y la cámara se lanza contra el chocolate con un impacto. | «¡Un hombre descubrió accidentalmente cómo cocinar alimentos usando ondas invisibles... por culpa de una chocolatina!» |
| 7,6–18 s | S2 El descubrimiento | Plano general del laboratorio con el rótulo «1945 · Raytheon (EE. UU.)». Presentación de Percy Spencer y primer plano del magnetrón («genera microondas para el radar»). Reconstrucción: frentes de onda salen de la bocina y llegan al bolsillo; la chocolatina se reblandece y aparece una mancha. Percy se da cuenta, sorprendido y curioso. | «En 1945, el ingeniero Percy Spencer trabajaba con un dispositivo de radar cuando notó que una chocolatina que llevaba en el bolsillo se había derretido.» |
| 18–28,4 s | S3 El experimento | Percy se queda pensando y coloca un plato con granos de maíz delante de la bocina. Primer plano de los granos: vibran y sueltan vapor. Estallan en palomitas a cámara lenta. Corte cómico: le llueven palomitas encima, una se le queda en el pelo y termina sonriendo. | «Decidió investigar qué estaba pasando. Probó con granos de maíz y descubrió que podían convertirse en palomitas gracias a aquellas ondas electromagnéticas.» |
| 28,4–40,6 s | S4 La ciencia | Microondas moderno con un cuenco de sopa girando. La cámara atraviesa la puerta y entra en el alimento. Vista molecular: molécula de agua con cargas parciales δ− y δ+. Aparecen las flechas del campo, que oscila, y las moléculas giran para seguirlo. Luego vibran, chocan y todo se calienta. | «Así nació la idea del microondas. Estas ondas hacen que las moléculas polares, como las del agua, respondan al campo electromagnético y generen calor dentro del alimento.» |
| 40,6–52,3 s | S5 Remate | De vuelta en 1945: Percy contempla el enorme Radarange («1947 · ≈1,8 m · ≈340 kg»). Salto al presente: una persona mete una bolsa de palomitas en un microondas, cierra la puerta y pulsa INICIO. La bolsa se hincha, suena el «¡ding!», la puerta se entreabre y una palomita sale disparada contra la cámara. Firma «Curiosidades FarKs». | «Y pensar que uno de los electrodomésticos más utilizados del mundo comenzó con un ingeniero, un radar y una chocolatina derretida.» |

## Rigor histórico y científico

Fuentes consultadas: biografía de Percy Spencer (Wikipedia), History.com («Who Invented the Microwave Oven?»), APS News (oct. 2015, «This Month in Physics History») y la patente US 2,495,429 («Method of Treating Foodstuffs»), presentada el 8 de octubre de 1945.

- Percy Spencer trabajaba en Raytheon con **magnetrones**, las válvulas que generan las microondas de los radares. Las fuentes sitúan el episodio de la chocolatina en **1945**; algunas relatos dicen que era una barrita de cacahuete y chocolate. El envoltorio del vídeo es inventado («CHOCO»), sin marcas reales.
- Lo primero que cocinó a propósito fueron **palomitas**; después probó con un huevo (no aparece en el vídeo).
- El primer microondas comercial, el **Radarange** (1947), medía cerca de **1,8 m**, pesaba unos **340 kg** (750 libras), se refrigeraba con agua y costaba unos 5.000 dólares. El modelo del vídeo está simplificado y no lleva logotipos.
- **Cómo calienta**: las microondas de un horno doméstico (~2,45 GHz) crean un campo eléctrico que oscila unos 2.450 millones de veces por segundo (rótulo «Oscila ≈ 2.450 millones de veces/s»). Las moléculas **polares**, como el agua (O con carga parcial δ−, H con δ+), intentan girar para alinearse con el campo. Al girar, chocan y rozan con sus vecinas, y esa energía se convierte en **calor** (calentamiento dieléctrico). No es una «resonancia» del agua. En la animación el campo oscila muy despacio para poder verlo.
- Las microondas penetran solo unos centímetros en el alimento; el resto se calienta por conducción. El vídeo dice «generen calor dentro del alimento», que es correcto.
- Todas las escenas de 1945 llevan el rótulo «Reconstrucción animada». No se usan fotografías históricas ni imágenes presentadas como reales.

## Producción

- Animación 3D procedural con three.js (motor propio en `scripts/motor/`), renderizada fotograma a fotograma en Chromium sin interfaz.
  - Percy Spencer es un único personaje estilizado (`human.js`) con brazos por cinemática inversa y cara paramétrica (cejas, párpados, boca, mirada). Es el mismo modelo en todas sus escenas.
  - La persona moderna usa el mismo esqueleto con otra ropa.
  - No se usaron generadores de vídeo por IA: la cuenta de Higgsfield está en plan gratuito y no permite generar vídeo.
- Voz: Higgsfield Seed Audio 1.0, preset «Alden» (la misma de toda la serie), español latino neutro, ritmo −10 %. El gancho se generó por separado y se unió al resto.
- Música y efectos sintetizados con `scripts/build_audio.py`:
  - Música: misterio, swing de época, ritmo dinámico en el experimento, asombro en la parte científica y cierre divertido.
  - Efectos: impacto en la revelación, zumbido del laboratorio, estallidos de palomitas, «¡ding!» y un «boing» cómico.
  - La música baja automáticamente bajo la voz.
- Subtítulos: tiempos por palabra con faster-whisper sobre el texto exacto del guion. Inter ExtraBold blanco con contorno negro, abajo y centrados, con palabras clave en amarillo.

## Archivos

- `audio/`: `mezcla_final.flac`, `musica.flac`, `sfx.flac`, `narracion_sincronizada.flac` y `narracion_ia_original.ogg`.
- `subtitulos/`: `subtitulos.srt` y `subtitulos.ass`.
- `datos/`: `words.json` (tiempos por palabra) y `narration_lines.json` (colocación de cada frase).
- `scripts/`: `build_audio.py`, `synth_lib.py`, `build_subs.py`, `montaje.sh` y `motor/` (escenas 3D).
- `previews/`: fotogramas de control del vídeo final.
