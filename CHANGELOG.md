# Changelog

Publicaciones en producción de web-casatomas. Cada entrada la escribe `scripts/release.mjs` al preparar la release y recoge solo los cambios incluidos en ella. La numeración 1.x empieza en 1.0.0; las versiones 0.N anteriores están en las Releases de GitHub.

## [1.1.1] - 2026-11-09

Objetivo: Texto SEO de la portada y de /carta/carnes en un desplegable al pie, y un solo h2 por plato en la carta

### Cambiado
- Seo: el texto SEO de la portada y el H2 de /carta/carnes pasan a un desplegable cerrado al pie ([#37](https://github.com/restcasatomascrevillent/web-casatomas/pull/37))
- Carta: un solo h2 por plato en las tarjetas que giran ([#38](https://github.com/restcasatomascrevillent/web-casatomas/pull/38))

## [1.1.0] - 2026-11-09

Objetivo: Todo lo de staging a producción (SEO, carta, actividad…)

### Añadido
- Seo: recuperar «dónde comer en Crevillente», Touza, menú del día y chuleta ([#33](https://github.com/restcasatomascrevillent/web-casatomas/pull/33))

### Cambiado
- Carta-vinos: el título de la carta de vinos vuelve a ser «Carta de vinos» ([#34](https://github.com/restcasatomascrevillent/web-casatomas/pull/34))

### Otros
- Proceso: nunca desplegar ni promocionar en Vercel a mano ([#30](https://github.com/restcasatomascrevillent/web-casatomas/pull/30))

## [1.0.0] - 2026-11-09

Objetivo: Super Admin › Logs: actividad y errores de la web, y el nuevo sistema de releases

Primera versión de la serie 1.x. Producción estaba en v0.137.

### Añadido
- Releases: publicar solo los cambios elegidos, con versiones 1.x ([#26](https://github.com/restcasatomascrevillent/web-casatomas/pull/26))
- Actividad y errores de la web para Super Admin › Logs (con consentimiento «Estadísticas de uso») ([#27](https://github.com/restcasatomascrevillent/web-casatomas/pull/27))
