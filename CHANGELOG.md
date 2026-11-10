# Changelog

Publicaciones en producción de web-casatomas. Cada entrada la escribe `scripts/release.mjs` al preparar la release y recoge solo los cambios incluidos en ella. La numeración 1.x empieza en 1.0.0; las versiones 0.N anteriores están en las Releases de GitHub.

## [1.5.0] - 2026-11-10

Objetivo: Touza: página rediseñada con fotos y animaciones, sin reservas, y enlace a su subdominio

### Añadido
- Rama feature/touza-pagina-diseno ([#52](https://github.com/restcasatomascrevillent/web-casatomas/pull/52))

### Cambiado
- Touza: enlace a touza.restaurantecasatomascrevillente.es ([#51](https://github.com/restcasatomascrevillent/web-casatomas/pull/51))

## [1.4.1] - 2026-11-10

Objetivo: Documentación: el interruptor de la tienda está en Panel › Tienda

### Otros
- Tienda: el interruptor de la tienda está en Panel › Tienda ([#49](https://github.com/restcasatomascrevillent/web-casatomas/pull/49))

## [1.4.0] - 2026-11-10

Objetivo: Tienda oculta en la web cuando se apaga en el panel y recarga automática con versiones antiguas

### Añadido
- Tienda: quitar «Tienda» de la web cuando se apaga en el panel ([#46](https://github.com/restcasatomascrevillent/web-casatomas/pull/46))
- Web: recargar sola una vez cuando la pestaña tiene una versión antigua ([#47](https://github.com/restcasatomascrevillent/web-casatomas/pull/47))

## [1.3.0] - 2026-11-10

Objetivo: Seguridad: cabeceras CSP más estrictas

### Añadido
- Seguridad: endurecer la CSP (frame-ancestors, form-action, upgrade-insecure-requests) ([#44](https://github.com/restcasatomascrevillent/web-casatomas/pull/44))

## [1.2.1] - 2026-11-10

Objetivo: Novedades: un fallo al refrescar ya no borra las tarjetas

### Cambiado
- Novedades: un fallo al refrescar ya no borra las tarjetas ([#41](https://github.com/restcasatomascrevillent/web-casatomas/pull/41))

## [1.2.0] - 2026-11-09

Objetivo: Revisión legal: condiciones de compra de cheques regalo, bases del sorteo del vino y ajustes de privacidad y cookies

### Añadido
- Legal: condiciones de compra de cheques regalo, bases del sorteo y ajustes de privacidad ([4585bd4](https://github.com/restcasatomascrevillent/web-casatomas/commit/4585bd4ea22eb6660eaf168efdc03062d4f6313a))

### Otros
- E2e: la votación del vino lleva premio y último día, y enlaza las bases ([ea838ff](https://github.com/restcasatomascrevillent/web-casatomas/commit/ea838ff2c9accad8dc1d2cb568b6d365bc69921d))

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
