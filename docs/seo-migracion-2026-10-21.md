# SEO y conexión del dominio de Casa Tomás

Ámbito: `oficiososia/casa-tomas-story`, web actual `casa-tomas-story.vercel.app`.
Dominio canónico previsto: `https://restaurantecasatomascrevillente.es`.
Estos cambios no modifican DNS, cuentas, pagos ni datos del restaurante.

## Cambios

- Títulos, descripciones y H1 visibles/localizados; H1 de reservas.
- Enlaces de navegación válidos desde páginas interiores y enlaces internos del pie.
- Páginas `/el-restaurante`, `/contacto`, `/regala` y `/touza`, en español, inglés y francés. Se incorporan automáticamente al sitemap generado.
- Redirecciones 301 de la antigua carta, privacidad, cookies e índices de sitemap.
- Listado completo de vinos en HTML dentro de un desplegable nativo accesible sin JavaScript. Se conservan filtros, tarjetas y paginación interactiva.
- Precios ausentes, cero, negativos o no finitos: «Consultar precio», sin oferta monetaria en JSON-LD y sin añadir una línea de coste cero al pedido.
- Cocina gallega y mediterránea y perfiles sociales verificados en el marcado del restaurante.
- Las promociones dependientes del día empiezan con el mismo estado en servidor y cliente; después se actualizan con la fecha de Madrid. Evita desajustes cuando se visita un build de otro día.
- `X-Robots-Tag: noindex, follow` condicionado exclusivamente a hosts `*.vercel.app`. El dominio propio no coincide con esa regla.

## Conectar el dominio más adelante

1. Mantener la web anterior hasta tener autorización y acceso DNS. Conservar los registros de correo.
2. Conectar el dominio y su variante `www` al proyecto adecuado de Vercel, definir una sola variante canónica y redirigir la otra. Si se migra al repositorio corporativo, trasladar también este commit y revisar allí la configuración.
3. Comprobar HTTPS, ausencia de `noindex` en el dominio propio, canonicals y alternates, imágenes sociales, sitemap, reservas y cheques.
4. Verificar que las cinco URL del sitemap de páginas anterior resuelven a su contenido equivalente: `/regala/`, `/el-restaurante/`, `/touza/`, `/carta-casa-tomas-restaurante/` y `/contacto/`.
5. Preservar la verificación de Search Console existente o verificar la propiedad DNS y enviar `/sitemap.xml`. El dominio es el mismo: se sustituye la web, no se utiliza «Cambio de dirección» solo por cambiar de alojamiento.
6. Actualizar los enlaces de carta/reservas en el Perfil de Empresa y comprobar sus datos y horarios con el propietario.
7. Revisar indexación, 404, clics, consultas y reservas tras el cambio. No se han medido ni garantizado posiciones de Google.

## Pendientes de información o acceso externo

- Confirmar los precios reales de los vinos pendientes desde administración; no se han inventado importes.
- Revisar/migrar el contenido vigente de `/aviso-legal/`; no se ha fabricado un aviso legal ni se ha redirigido a una página de finalidad distinta.
- Confirmar el dominio definitivo de Touza si sustituye su URL actual.
- Search Console, Perfil de Empresa y métricas reales requieren acceso a sus cuentas.
- La imagen Open Graph del nuevo sitio existe en `/og-image.jpg`; la URL del dominio canónico no quedará servida por esta web hasta conectar el dominio.
