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

## Tercer nivel: centro de la denominación (2 de noviembre de 2026)

Caso que lo motivó: el panel dio de alta «Terras Vellas Albariño Crianza sobre
Lías» con región «Galicia» y `D.O. Rías Baixas`. «España + Galicia» no era una
clave de `zonas-vino.json` (que solo tiene las combinaciones país + región que
ya usaban los vinos activos, casi todas con localidad), así que el vino salió
en «Vinos sin ubicación puntual verificada» aunque los demás Rías Baixas sí
tenían punto.

`coordenadasConocidas` busca ahora, por orden de precisión:

1. **Bodega verificada** (`bodegas-verificadas.json`, por id de vino).
2. **Zona de la región** (`zonas-vino.json`, `país|||región`), como antes.
3. **Centro de la denominación** (`denominaciones-vino.json`, `país|||D.O. sin
   prefijo`): `D.O. Rías Baixas`, `D.O.Ca. Rioja` o `AOC Champagne` se
   normalizan a `rias baixas`, `rioja` y `champagne`.

La D.O. pasa por delante de la región solo si la región no es una zona
conocida (p. ej. «Galicia», o una localidad nueva) o si es una comunidad
autónoma (`COMUNIDADES` en `src/lib/denominaciones-vino.ts`): «Castilla y León»
+ `D.O. Rueda` se sitúa en Rueda y no en el centro de Castilla y León. Una
subzona conocida («Val do Salnés, Pontevedra») sigue ganando a la D.O.

El grupo del marcador toma el `nombre` de la entrada de la D.O. (no el texto de
la región, que el vino no tiene por qué cumplir): `D.O. Rías Baixas` para un
vino de Meaño o de «Galicia». Cuando el nombre coincide con una zona que ya
existe (`Rioja`, `Ribera del Duero, Castilla y León`…) el vino cae en el mismo
grupo y el mismo punto que los demás de esa zona, de modo que no aparece un
marcador de un solo vino tapando a otro de 47. Un test lo exige: si el nombre de
una D.O. es una zona de `zonas-vino.json`, las coordenadas son idénticas.

### Qué D.O. hay y cuáles no

Están las denominaciones de la carta con un territorio único y un centro que no
engaña, más Monterrei (la quinta D.O. gallega). Cada punto es el municipio que
da nombre o es cabecera de la D.O. (Pontevedra para Rías Baixas, sede del
Consejo Regulador; Monforte de Lemos para Ribeira Sacra; Olite para Navarra…),
geocodificado con Nominatim y comprobado contra una caja geográfica del país,
o el punto ya revisado de una zona de `zonas-vino.json`. El campo `fuente` de
cada entrada dice cuál.

**No** están, a propósito: Cava (varias comunidades; ver
`AUDITORIA-ORIGENES-VINOS.md`), las IGP (`IGP Castilla y León`, `IGP Tres
Riberas`: una IGP abarca demasiado), D.O. Alicante (subzonas interior y Marina
Alta separadas ~90 km), Vinos de Madrid y Côtes du Rhône / Provence (sin un
centro defendible), ni los pagos con bodega (Abadía Retuerta, Pago de Otazu:
ya llevan la localidad en la región). Un vino de esas D.O. con una región
desconocida sigue en «Vinos sin ubicación puntual verificada» hasta que alguien
añada su zona a `zonas-vino.json` (nivel 2) o una bodega.

### Cómo añadir una denominación

Entrada en `denominaciones-vino.json`:
`"espana|||rias baixas": { "nombre": "D.O. Rías Baixas", "coordenadas": [lon, lat], "fuente": "…" }`.
La clave lleva el país y la D.O. normalizados (minúsculas, sin tildes, sin
prefijo `D.O.`/`D.O.Ca.`/`AOC`…). Geocodifica el municipio de referencia como en
«Método» y revisa el resultado a mano. `npm test` valida claves, nombre, fuente
y coordenadas.

### Sin distinción visual

El punto de una D.O. no se pinta distinto del de una zona: el aviso bajo el
título del mapa ya dice «el centro aproximado de su denominación» y el nombre
del grupo es la propia D.O. Si algún día hiciera falta distinguirlos, el nivel
(bodega / zona / denominación) sale de `porDenominacion` en `origenes-vino.ts`.

### Marcadores apilados (observación, sin tocar)

Ya antes de este cambio, varios grupos distintos comparten exactamente el mismo
punto (las cuatro variantes de Salnés en Cambados, Rioja y Finca Ygay,
Laguardia/Rioja Alavesa…): el marcador pintado el último tapa a los demás.
Agruparlos por coordenadas se haría en `MapaMundoVinos.tsx`, que este cambio no
toca.

