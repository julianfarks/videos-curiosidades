# Curiosidades Extraordinarias 🎬

Serie de vídeos verticales (TikTok · YouTube Shorts · Instagram Reels) de animación 3D que explican curiosidades de la ciencia, la naturaleza, la tecnología y el universo.

## Episodios

| # | Tema | Vídeo | Duración | Proyecto |
|---|---|---|---|---|
| 001 | ¿Por qué los geckos no se caen? | [`videos/episodio-001-geckos.mp4`](videos/episodio-001-geckos.mp4) | 52 s | [`episodios/episodio-001-geckos`](episodios/episodio-001-geckos) |
| 002 | ¿Por qué este animal hace cubos con su caca? (wombat) | [`videos/episodio-002-wombat-cubos.mp4`](videos/episodio-002-wombat-cubos.mp4) | 49,5 s | [`episodios/episodio-002-wombat-cubos`](episodios/episodio-002-wombat-cubos) |
| 003 | El animal que puede sobrevivir en el espacio (tardígrado) | [`videos/episodio-003-tardigrado-espacio.mp4`](videos/episodio-003-tardigrado-espacio.mp4) | 49,7 s | [`episodios/episodio-003-tardigrado-espacio`](episodios/episodio-003-tardigrado-espacio) |
| 004 | El chocolate que inventó el microondas (Percy Spencer) | [`videos/episodio-004-origen-microondas.mp4`](videos/episodio-004-origen-microondas.mp4) | 52,3 s | [`episodios/episodio-004-origen-microondas`](episodios/episodio-004-origen-microondas) |

## Estructura del repositorio

```
videos/                         ← vídeos finales (uno por episodio, nunca se sobrescriben)
episodios/episodio-NNN-tema/    ← guion, audios, subtítulos, scripts y previews de cada episodio
motor-render/                   ← motor de animación 3D compartido (three.js + Playwright)
BIBLIA_VISUAL_CURIOSIDADES.md   ← identidad visual permanente de la serie
```

## Reglas de la serie

1. Cada curiosidad nueva = un vídeo nuevo `videos/episodio-NNN-tema.mp4` y su carpeta en `episodios/`.
2. Modificar un episodio solo toca sus propios archivos; el historial de versiones queda en Git.
3. Nunca se borran ni sobrescriben episodios anteriores.
4. Todo episodio sigue la [Biblia Visual](BIBLIA_VISUAL_CURIOSIDADES.md).
