# Contraste de la web

Objetivo: WCAG AA, 4,5:1 para texto normal y 3:1 para texto grande (≥ 24 px, o ≥ 18,66 px en negrita), en reposo, con el ratón encima (hover) y con el foco del teclado.

## Cómo se comprueba

Dos pruebas dentro de `npm run test:e2e`. `e2e/contraste.e2e.ts` mide portada, carta y vinos en reposo, y `src/__tests__/contraste-tokens.test.ts` comprueba los pares de tokens. `e2e/contraste-estados.e2e.ts` pasa axe (`@axe-core/playwright`, regla `color-contrast`, la misma que usa la auditoría de accesibilidad de Lighthouse) por las 7 páginas, a 390 y a 1440 px:

portada · carta · vinos · reservas · regala · novedades (sección de la portada y diálogo «Ver menú») · legales (aviso legal, privacidad y condiciones). También reservas en inglés y regala en francés.

Hace tres pasadas por página: en reposo, con `:hover` forzado en todos los enlaces y botones, y con `:focus` y `:focus-visible` forzados. Los estados se fuerzan por CDP (`CSS.forcePseudoState`), que es lo mismo que hace el panel «:hov» de DevTools.

## Reglas para los colores de hover y foco

- **El hover oscurece, no aclara.** Los botones dorados y los grises usan `hover:bg-accent-hover` y `hover:bg-secondary-hover`, que son el mismo tono más oscuro. Antes eran `accent/90` y `secondary/80`: al ser semitransparentes sobre blanco, aclaraban el fondo y bajaban el contraste del texto blanco justo al pasar el ratón.
- **Sobre `--dark-slate` (pie, cabecera y pie de los legales) no se usan `text-stone` ni `hover:text-accent`.** El texto va en `text-stone-light` (5,2:1) y el hover en `hover:text-gold-light` (5:1). El dorado normal da unos 2:1 sobre ese fondo.
- **Si el texto de un botón `outline` es oscuro, su hover tiene que ponerlo también.** La variante `outline` cambia el texto a blanco en hover. Si el fondo de hover es claro (`hover:bg-muted`), hace falta `hover:text-foreground`.

## Lo que axe no mide (se revisa a mano)

axe no sabe calcular el fondo de un degradado ni de una imagen, y lo da como «incompleto», no como fallo. Revisión a mano del 2026-11-01:

| Dónde | Texto | Fondo en el peor punto | Contraste | Estado |
|---|---|---|---|---|
| Hero de la portada, antetítulo (`h1`, 11–14 px) | `muted-foreground` | centro del degradado, `muted` (25 13% 85%) | 4,28:1 → 4,99:1 | Corregido: `--muted-foreground` pasa de 15 4% 39% a 35% |
| Hero, subtítulo (24–30 px, cursiva negrita) | `foreground/80` | `muted` | 4,58:1 | Cumple |
| Hero, botón «Ver carta» | `foreground` | `background/50` sobre `muted` | 8,8:1 | Cumple |
| Hero, flecha de desplazamiento | `foreground/60` | `muted` | 2,9:1 | Decorativa (no es texto) |

## Cajas crema con texto dorado

El dorado (`--accent`, 38 59% 35%) da 4,45:1 sobre `bg-muted/40` y no llega a 4,5:1. Las cajas de contacto de privacidad y condiciones, que llevan enlaces dorados, usan `bg-muted/20`, sobre el que da unos 4,8:1. Si una caja nueva lleva texto dorado, que su fondo no pase de `muted/20`.
