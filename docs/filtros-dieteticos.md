# Filtros de la carta

Los cuatro controles funcionan en portada, índice y categorías. Se combinan con AND y se pueden compartir con `?dietas=celiaquia,lactosa`. No añaden peticiones a Supabase al pulsar; usan el snapshot del despliegue. La portada y el índice conservan las categorías y sus recuentos filtrados; solo se muestran los platos correspondientes al entrar en una categoría. Los enlaces de navegación y de vuelta mantienen el filtro en la URL.

- Celíaco: excluye gluten oficial, inferido, avisos relacionados y datos desconocidos. Es un filtro de alérgenos declarados; no certifica preparación sin contaminación cruzada. La interfaz indica que debe consultarse al personal.
- Sin lactosa: excluye todos los lácteos, oficiales/inferidos y avisos relacionados. Es conservador: también oculta productos lácteos que pudieran no contener lactosa.
- Vegano / vegetariano: requieren confirmación positiva de la receta. No basta con no tener alérgenos animales. Los datos contradictorios se excluyen.

## Confirmar recetas

La revisión de los 128 platos activos no encontró etiquetas dietéticas ni ingredientes completos. No se ha inventado ninguna confirmación. Por ahora los filtros vegano/vegetariano muestran el estado vacío y explican la falta de confirmación.

Tras validar ingredientes, salsas, caldos y preparación con cocina, editar `src/data/dietas-confirmadas.json`, usando el UUID real del plato como clave y `["vegano"]` o `["vegetariano"]` como valor. Vegano incluye vegetariano automáticamente. Quitar la confirmación si cambia la receta. Una etiqueta dietética no certifica ausencia de alérgenos.

También se admite una futura columna `etiquetas_dieteticas` de Platos: el build ya preserva sus valores. No es necesaria una migración para usar el archivo de confirmaciones, ni se han modificado datos de producción.

## Presentación

Cuatro controles en una sola fila, sin caja exterior. Dentro de las categorías se pliegan en «Filtros», arriba a la izquierda, con selección resumida y posición sticky bajo la cabecera. El panel se abre para modificar o quitar las opciones. La rejilla original de productos filtra sus datos antes de renderizar: no se monta una segunda lista global.
