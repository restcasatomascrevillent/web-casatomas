# Ubicaciones del mapa — revisión del 8 de octubre de 2026

Se revisaron los campos geográficos de las 244 filas de Vinos (incluidas las
inactivas). Se contrastaron los casos inconsistentes o incompletos con fuentes
de las bodegas. Esto no certifica individualmente las 244 etiquetas o añadas.

Se corrigieron y verificaron mediante lectura posterior 11 fichas en Supabase,
incluyendo las traducciones inglesa y francesa de país y región. Los valores
anteriores y posteriores están en `auditoria-origenes-vinos-2026-10-08.json`.
Las escrituras exigieron que los campos anteriores no hubieran cambiado.

| Fichas | Corrección | Fuente primaria |
| --- | --- | --- |
| Molitor Haus Klosterberg | Mosela, Alemania; eliminar Baden | https://markusmolitor.com/en/contact-details |
| Ou Steen | Stellenbosch, Sudáfrica; eliminar Elgin | https://longridge.co.za/product/ou-steen-chenin-blanc/ |
| Pazo la Cuesta (2 fichas) | Ribeira Sacra, Lugo; eliminar Ribeiro/Valdeorras | https://pazodelacuesta.com/wp-content/uploads/2024/06/GODELLO-ES.pdf y https://pazodelacuesta.com/ |
| Edoné Cuvée de María, Grand Cuvée y Gran Cuvée Magnum | Alpera, Albacete | https://vinedosbalmoral.com/es/coleccion/?verify_token=1 |
| Torelló, Rosé y Rosé Magnum | Penedès, Barcelona | https://torello.com/es/la-finca-can-marti/ |
| Crémant de Chanceny Brut Rosé | Saumur, Loira, Francia | https://www.allianceloire.com/SZ76XE |

## Criterio cartográfico

Los marcadores representan zonas vinícolas con coordenadas aproximadas, no
la ubicación exacta de cada viñedo. Se prioriza una subzona explícita y después
la denominación sobre una comunidad autónoma genérica. Ribera del Duero,
Rueda y Toro tienen puntos y grupos distintos. Cava no se asigna automáticamente
a Cataluña porque la denominación abarca varias comunidades.

Referencias de territorio: https://riberadelduero.es/mx/la-do-ribera-del-duero/altitud
y https://dorueda.com/quienes-somos/.

Después de las correcciones, 241 fichas resuelven sin peticiones de geocodificación.
Las nuevas regiones necesitan país reconocido, resultado del mismo país,
topónimo exacto, tipo geográfico admisible y coordenadas válidas. No se acepta
un centro de país como sustituto de una región. Los resultados de Mapbox son
temporales y no se guardan: https://docs.mapbox.com/api/search/geocoding/.

## Pendientes de identificación

- **Bobal Rosado Dulce:** falta bodega/etiqueta; Utiel-Requena figura como estimación.
- **Mikado Road Nº8:** faltan datos fiables de país, región y productor.
- **Clos du Ciel:** Borgoña era una estimación. Existen vinos homónimos de
  Longridge (Chardonnay, Stellenbosch) y Peter Michael (Pinot Noir, California).
  La categoría blanca sugiere Longridge, pero hace falta confirmar la etiqueta
  antes de cambiar el país. Fuentes: https://longridge.co.za/product/clos-du-ciel/
  y https://petermichaelwinery.com/wines/clos-du-ciel.

Estas tres fichas siguen en la carta, pero no reciben una chincheta basada en
datos inciertos. No se han modificado precios, categorías ni disponibilidad.
