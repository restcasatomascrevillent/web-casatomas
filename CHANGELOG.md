# Changelog

Publicaciones en producción de web-casatomas. Cada entrada la escribe `scripts/release.mjs` al preparar la release y recoge solo los cambios incluidos en ella. La numeración 1.x empieza en 1.0.0; las versiones 0.N anteriores están en las Releases de GitHub.

## [1.15.0] - 2026-11-23

Objetivo: Elegir email o WhatsApp para los avisos de la reserva (apagado en producción hasta activarlo)

### Añadido
- Reservas: elegir email o WhatsApp para los avisos y «Gestionar mi reserva» ([#100](https://github.com/restcasatomascrevillent/web-casatomas/pull/100))

## [1.14.0] - 2026-11-21

Objetivo: Menos errores y web más fiable: traductor, cortes de red, direcciones mal escritas y aviso de versión en inglés/francés; menú del día en reservas y mejoras de Touza

### Añadido
- Seo: unir Casa Tomás con Touza en el JSON-LD y enlazar a «Copas después de cenar» ([66caf82](https://github.com/restcasatomascrevillent/web-casatomas/commit/66caf82eae89405b7583086ac436e63a5b08e410))
- Carta: Mi mesa avisa arriba, a la vista, de que no es un pedido online (CAS-25) ([#93](https://github.com/restcasatomascrevillent/web-casatomas/pull/93))
- Web: a quien tiene el navegador en inglés o francés se le ofrece la misma página en su idioma, sin cambiarla sola ([#98](https://github.com/restcasatomascrevillent/web-casatomas/pull/98))

### Cambiado
- Carta: conservar el ?t= de la foto para que una foto cambiada no salga vieja ([7aae863](https://github.com/restcasatomascrevillent/web-casatomas/commit/7aae863b828c1989ad4f0f92ae157c6a01dda16a))
- Touza: la página Touza ya no enseña al camarero; en su lugar, un cóctel ante la «T» ([#84](https://github.com/restcasatomascrevillent/web-casatomas/pull/84))
- Touza: el enlace «Copas después de cenar en Touza» mide 24 px de alto para pulsarlo en el móvil ([#85](https://github.com/restcasatomascrevillent/web-casatomas/pull/85))
- Build: el build se para si un script nuestro acaba en la línea 1 del HTML (CAS-21, CAS-22, CAS-23, CAS-26, CAS-27, CAS-28) ([#92](https://github.com/restcasatomascrevillent/web-casatomas/pull/92))
- Web: una imagen que no carga por un corte de la conexión se reintenta y ya no cuenta como fallo de la web (CAS-17) ([#91](https://github.com/restcasatomascrevillent/web-casatomas/pull/91))
- Logs: las peticiones que corta una precarga o recarga del navegador ya no salen como «Sin respuesta» ([#95](https://github.com/restcasatomascrevillent/web-casatomas/pull/95))
- Logs: los errores de hidratación provocados por el navegador (traductor o extensión) ya no cuentan como fallo de la web, y los nuestros dicen qué cambió (CAS-6, CAS-18, CAS-19, CAS-20) ([#90](https://github.com/restcasatomascrevillent/web-casatomas/pull/90))
- Web: si la red se corta al cambiar de página, la página se carga sola en cuanto vuelve la red ([#96](https://github.com/restcasatomascrevillent/web-casatomas/pull/96))
- Web: una dirección con mayúsculas o barras dobles (/Carta, /carta//vinos) va a la buena sin romper la carga ([#97](https://github.com/restcasatomascrevillent/web-casatomas/pull/97))

### Otros
- E2e: «filtrar la carta no mueve la página» ya no falla la mitad de las veces por leer el scroll antes de tiempo ([#94](https://github.com/restcasatomascrevillent/web-casatomas/pull/94))

## [1.13.2] - 2026-11-19

Objetivo: La reserva no se rompe con la página traducida por el navegador (CAS-13)

### Cambiado
- Web: el traductor del navegador ya no tira la página al reservar (CAS-13) ([#87](https://github.com/restcasatomascrevillent/web-casatomas/pull/87))

## [1.13.1] - 2026-11-17

Objetivo: La web se recupera sola de los cortes de red al cargar (CAS-5 y CAS-8)

### Cambiado
- Web: un corte de red en la primera carga se reintenta recargando (CAS-5, CAS-8) ([#82](https://github.com/restcasatomascrevillent/web-casatomas/pull/82))

## [1.13.0] - 2026-11-17

Objetivo: Contar las cargas del mapa de vinos para controlar el gasto de Mapbox desde el panel

### Añadido
- Carta: la web cuenta cada carga del mapa de vinos (control de Mapbox) ([#80](https://github.com/restcasatomascrevillent/web-casatomas/pull/80))

## [1.12.2] - 2026-11-16

Objetivo: La carta de vinos carga en iPhone y una página que no carga por un corte de red se reintenta sola

### Cambiado
- Carta: en iPhone la carta de vinos ya no falla al cargar (cifras tomadas por teléfonos) ([#77](https://github.com/restcasatomascrevillent/web-casatomas/pull/77))
- Web: si una página no carga por un corte de red, se reintenta sola (una recarga) ([#78](https://github.com/restcasatomascrevillent/web-casatomas/pull/78))

## [1.12.1] - 2026-11-16

Objetivo: El check «Candidata en preview» de las releases encuentra la preview de Vercel

### Cambiado
- Release: la candidata encuentra la preview aunque Vercel no cree deployments en GitHub ([#75](https://github.com/restcasatomascrevillent/web-casatomas/pull/75))

## [1.12.0] - 2026-11-14

Objetivo: Vídeo del plato automático, versión antigua que se recupera sola y correos del cheque regalo

### Añadido
- Cheques regalo: el aviso al restaurante sale aunque falle el correo al cliente, y reenvío del correo desde el panel ([#70](https://github.com/restcasatomascrevillent/web-casatomas/pull/70))
- Cheques: el correo del cheque regalo lleva sus datos ([#73](https://github.com/restcasatomascrevillent/web-casatomas/pull/73))

### Cambiado
- Web: la pestaña con una versión antigua se recupera también tras los rebuilds del panel ([#72](https://github.com/restcasatomascrevillent/web-casatomas/pull/72))

### Otros
- El vídeo del plato arranca solo y en grande sigue siendo vídeo ([#71](https://github.com/restcasatomascrevillent/web-casatomas/pull/71))

## [1.11.0] - 2026-11-12

Objetivo: Carta nueva: tarjetas de plato con foto, «i» (círculo azul pizarra) que gira para ver la descripción y la cantidad en el botón

### Añadido
- Carta: tarjetas de plato con foto, «i» que gira y cantidad en el botón ([#66](https://github.com/restcasatomascrevillent/web-casatomas/pull/66))
- Carta: la «i» de los platos, círculo relleno en el azul pizarra de Casa Tomás ([#68](https://github.com/restcasatomascrevillent/web-casatomas/pull/68))

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
