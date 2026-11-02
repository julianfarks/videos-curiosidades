# Prompts de vídeo IA por plano (para sustituir planos si se usa un generador de vídeo)

El Episodio 001 se renderizó con el motor 3D propio (`/motor-render`) porque la cuenta de Higgsfield estaba en plan *free* (la generación de imagen/vídeo exige plan Basic o superior). Si más adelante se activa un plan de vídeo, estos prompts reproducen cada plano manteniendo la Biblia Visual. Duraciones pensadas para encajar en la misma línea de tiempo (la narración y la mezcla no cambian).

Prefijo común (pegar delante de cada prompt):
> Cinematic stylized 3D animated feature-film shot, balance between realism and caricature, warm amber key light, cool teal fill, golden rim light, soft shadows, shallow depth of field, teal-and-amber grade, subtle film grain. Vertical 9:16. No text, no watermark.

Personajes fijos:
- **Gecko:** natural bright-green day gecko, large glossy golden eyes with a turquoise ring and round pupils, wide toe pads with lamellae, fine granular scales, pale yellow-green belly, no clothes or accessories.
- **Hombre:** adult man in his 30s, short dark-brown hair, light stubble, heather-grey t-shirt, dark-blue jeans, white sneakers, exaggerated expressive face.
- **Sala:** cozy modern living room, teal accent wall with framed abstract art, mustard velvet sofa, warm floor lamp, window with sheer curtain and cool daylight, wooden floor, round rug, coffee table with mug.

| Plano | Tiempo | Duración | Prompt |
|---|---|---|---|
| 1 | 0:00–0:08 | 8 s | The man sits calmly on the sofa scrolling his phone; the camera cranes slowly up from him to the white ceiling, revealing the green gecko walking upside down, then a slow cinematic push-in on the gecko. |
| 2 | 0:08–0:13 | 5 s | The gecko's front toes slip off the ceiling; it tumbles down clearly visible and lands on the man's head; he jumps, throws his arms up and screams in exaggerated comic fright while the gecko clings to his hair. Fast whip-pan following the fall, small camera shake on impact. |
| 3 | 0:13–0:17.8 | 4.8 s | Freeze frame of the scream, desaturated; VHS rewind effect: everything rushes backwards until the gecko is calmly walking on the ceiling again. |
| 4a | 0:17.8–0:22.1 | 4.3 s | Macro shot near the ceiling: the gecko lifts a front foot, its toes peel off tip-first revealing the ridged toe pads (lamellae); extreme macro push into one pad. |
| 4b | 0:22.1–0:29.2 | 7 s | Microscopic world: rolling ridges covered by a dense forest of amber keratin hairs (setae) like a golden wheat field, floating particles, camera flies over and dives between them to a seta tip that splits into hundreds of tiny flat spatula-shaped branches. Not suction cups. |
| 5a | 0:29.2–0:32.3 | 3 s | The branched seta tip lowers its tiny spatulae onto a smooth glass surface; soft cyan glows appear at each point of contact. |
| 5b | 0:32.3–0:36.6 | 4.3 s | Atomic-scale scientific visualization: rows of amber molecules hover just above blue glass atoms; translucent electron clouds fluctuate, then synchronize, and faint cyan attraction threads with travelling light pulses appear between facing atoms (van der Waals forces). No magnets, no glue. |
| 5c | 0:36.6–0:41.6 | 5 s | Pull back: a whole forest of setae pressed against the underside of a glass sheet, millions of tiny glowing contact points. |
| 6a | 0:41.6–0:46.6 | 5 s | Low-angle close shot of the gecko walking on the ceiling: each step its toes peel off from the tip toward the base in a controlled way. |
| 6b | 0:46.6–0:52 | 5.4 s | Close-up of the gecko's face; it turns its head, looks straight into the camera, licks its eye with its tongue and keeps walking; the man in the soft background looks up suspiciously. End on a short pause and fade to black. |

Ajustes recomendados en Higgsfield: `seedance_2_5` (o `kling3_0` para mejor coherencia de personaje), 9:16, 1080p, `generate_audio: false` (la mezcla ya existe), y usar como `start_image` el fotograma correspondiente de `previews/`.
