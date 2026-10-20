# Centros de zona para el mapa de vinos — 15 de octubre de 2026

Hasta ahora `MapaMundoVinos` solo colocaba un punto para un vino si su ficha
tenía una bodega verificada a mano en `src/lib/bodegas-verificadas.json`
(5 de 244 vinos). El resto aparecía como botón bajo el mapa, en "Vinos sin
ubicación puntual verificada".

Para que el mapa refleje toda la carta (y lo que se añada después, mientras
reutilice una denominación/región ya conocida) se añade un segundo nivel,
`src/lib/zonas-vino.json`: un punto aproximado por cada combinación de país +
región/denominación que aparece en vinos activos de la carta de Casa Tomás,
cuando no hay una bodega verificada más precisa para esa ficha.

## Qué es y qué no es

- Es el centro aproximado de una D.O., comarca o municipio — igual que el
  propio criterio cartográfico ya documentado en
  `docs/AUDITORIA-ORIGENES-VINOS.md` ("Los marcadores representan zonas
  vinícolas con coordenadas aproximadas, no la ubicación exacta de cada
  viñedo"). No sustituye ni reutiliza una bodega verificada: `coordenadasConocidas`
  sigue mirando primero `bodegaVerificada` (ver `src/lib/origenes-vino.ts`).
- No es una llamada en vivo a ningún geocodificador: es un fichero ya
  calculado y revisado, igual que `bodegas-verificadas.json`. El navegador
  del visitante nunca hace una petición de geocodificación.

## Método

Cada entrada de `src/lib/zonas-vino.json` se generó con la API pública de
Nominatim/OpenStreetMap (`https://nominatim.openstreetmap.org/search`,
`format=jsonv2`), una petición por zona, con 1 segundo de espera entre
peticiones (política de uso de Nominatim). La consulta no siempre es el
texto literal de `ubicacion_region`: para nombres compuestos ("X y Z,
Provincia") se geocodificó la primera localidad nombrada, y para comarcas
sin límite administrativo propio en OSM (p. ej. "Val do Salnés") se usó su
cabecera comarcal (Cambados) o el municipio principal de la D.O. (p. ej.
Aranda de Duero para "Ribera del Duero, Castilla y León", Haro para "Rioja
Alta"). El resultado completo (consulta, respuesta cruda de Nominatim,
notas) queda en el scratchpad de la sesión que lo generó, no en el repo.

Tras la primera pasada se revisaron a mano las 70 respuestas: se comprobó
que el país coincidiera y que las coordenadas cayeran dentro de una caja
geográfica razonable para ese país. Dos consultas devolvieron un resultado
equivocado o vacío y se corrigieron (ver `fuente`/notas en el propio
scratchpad): "Alsace, Francia" resolvía a un comercio en Roubaix — se
sustituyó por Colmar; "Val do Salnés, Pontevedra" no resolvía — las tres
variantes de texto de esa comarca reutilizan el punto de Cambados.

## Cómo añadir una zona nueva

`zonaConocida()` en `src/lib/origenes-vino.ts` busca por
`normalizarOrigen(país) + "|||" + normalizarOrigen(región o denominación o
país)`. Si un vino nuevo usa una región que no está en el fichero, vuelve a
caer en "sin ubicación puntual verificada" hasta que alguien añada su
entrada a `zonas-vino.json` (misma clave, `coordenadas: [lon, lat]`) — por
ejemplo geocodificando esa región igual que aquí y revisando el resultado a
mano antes de guardarlo.
