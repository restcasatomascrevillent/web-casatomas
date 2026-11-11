# Changelog

Publicaciones en producción de web-casatomas. Cada entrada la escribe `scripts/release.mjs` al preparar la release y recoge solo los cambios incluidos en ella. La numeración 1.x empieza en 1.0.0; las versiones 0.N anteriores están en las Releases de GitHub.

## [1.9.0] - 2026-11-11

Objetivo: Fase 1: la carta de Bebidas solo sale si se enciende en el panel (apagada por defecto)

### Añadido
- Carta: la carta de Bebidas solo sale si el panel la enciende ([#63](https://github.com/restcasatomascrevillent/web-casatomas/pull/63))

### Cambiado
- Carta: la web vuelve a publicarse con la carta de Bebidas apagada ([#64](https://github.com/restcasatomascrevillent/web-casatomas/pull/64))

## [1.8.0] - 2026-11-10

Objetivo: Elegir menú del día o carta al reservar de martes a jueves a mediodía

### Añadido
- Reservas: elección obligatoria «Menú del día» | «A la carta» de martes a jueves en la comida, en español, inglés y francés ([#59](https://github.com/restcasatomascrevillent/web-casatomas/pull/59))

Nota: montada igualando producción con staging; entrada escrita a mano, no por scripts/release.mjs.

## [1.7.0] - 2026-11-10

Objetivo: Reservas para hoy y menú del día, filtros de dietas del panel, logs con más contexto y arreglos de la release

### Añadido
- Reservas: menú del día y mismo día por teléfono en el formulario ([78133f0](https://github.com/restcasatomascrevillent/web-casatomas/commit/78133f001fa049f2260476bbe1c3b599a30c4136))
- Reservas: se puede elegir hoy en el calendario ([ebd1bcc](https://github.com/restcasatomascrevillent/web-casatomas/commit/ebd1bcc5aea532bd4a461bbbea2522050a04b9c8))
- Carta: los filtros «Sin gluten» y «Sin lactosa» respetan lo decidido a mano en el panel [skip ci] ([#55](https://github.com/restcasatomascrevillent/web-casatomas/pull/55))
- Logs: la web manda más contexto en sus eventos (recarga única, sin e2e, versión, peticiones canceladas) ([#56](https://github.com/restcasatomascrevillent/web-casatomas/pull/56))
- Reservas: el formulario manda «origen» (cómo se hizo la reserva) ([d40d691](https://github.com/restcasatomascrevillent/web-casatomas/commit/d40d69125f55668c6148af9fd1b32128674e9299))

### Cambiado
- Release: la rama capturas-release lleva siempre su vercel.json sin despliegue ([#54](https://github.com/restcasatomascrevillent/web-casatomas/pull/54))

### Otros
- Reservas: el contrato de /crear admite «origen» como dato opcional ([abf5db5](https://github.com/restcasatomascrevillent/web-casatomas/commit/abf5db590860bc04842368a4dc3943bf43cb8b25))
- Tests solo de lo cambiado en staging; suite completa solo en release ([bc0f8be](https://github.com/restcasatomascrevillent/web-casatomas/commit/bc0f8be98e5ad9daa8fdb8b16533e6e977eb18d7))

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
