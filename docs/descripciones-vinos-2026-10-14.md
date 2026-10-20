# Descripciones de la carta de vinos — 14/10/2026

Se han preparado descripciones en español para los 244 registros del catálogo, incluidos los desactivados. Cada texto tiene 2–3 frases y 200–300 caracteres: perfil de elaboración cuando está comprobado, nariz/boca y un maridaje breve. No se modifican precios, nombres, categorías, añadas, uvas ni alérgenos.

El JSON adyacente conserva el texto anterior, la versión leída, las fuentes y el criterio de redacción. Cuando no hay etiqueta o ficha inequívoca se usa un perfil prudente del tipo/origen conocido, sin atribuir técnicas, dulzor o variedades no comprobados. Las variantes Magnum del mismo vino pueden compartir descripción.

La descripción se consulta con «Ver información» aunque no haya foto. Las fotografías se abren en un lateral, completas, sin recorte. La falta o el fallo de una foto bloquea únicamente su visualización.

## Aplicación y reversión

`node scripts/descripciones-vinos-sql.mjs` genera el SQL del lote; no se conecta ni escribe automáticamente. El SQL bloquea las filas y comprueba nombre, descripción anterior y fecha de actualización antes de escribir. Cualquier discrepancia aborta el lote completo. `--rollback` genera la reversión, que exige que las descripciones actuales sigan intactas. Solo se escriben `descripcion` y `updated_at`; el trigger existente registra los cambios en auditoría.

La comprobación del lote dentro de una transacción con ROLLBACK dio 244 textos y conservó el hash del resto de columnas: `e5c6307ff79b40556b45bdd6d7203cc2`.

## Fichas anteriores que requieren revisión independiente

Estas incidencias no se corrigen automáticamente con este lote:

| Vino | Incidencia observada | Evidencia |
| --- | --- | --- |
| Otazu Altar | Está entre blancos; la bodega lo identifica como tinto de cabernet sauvignon. | [Bodega Otazu](https://otazu.com/producto/vinos/altar/) y etiqueta de la foto actual. |
| Balbás La Retama | Está entre tintos; la bodega lo identifica como blanco de Albillo Mayor. | Ficha oficial recogida en el JSON. |
| Finca Dofí | Hay registros en los grupos Rioja y Ribera, con D.O.Q. Priorat en su ficha. | Catálogo y fuentes recogidas en el JSON. |
| Pepe Carrasca | Tiene Alicante estimado; el productor lo identifica como treixadura de su proyecto de Ribeiro. | [Casal de Armán](https://www.bodegascasaldearman.com/producto/pepe-carrasca-2020-caja-de-6-botellas/). |
| Pousada | Tiene Ribeiro; la foto dice Condado do Tea, albariño y treixadura. | Etiqueta del catálogo, inspeccionada. |
| Cerro del Buey | Tiene Valdepeñas; la etiqueta y el productor indican Almansa. | [Tintoralba](https://tintoralba.com/vinos/alqueria/cerro-del-buey/). |
| Unzu Rosé Garnacha | Tiene Navarra estimado; la ficha indica IGP 3 Riberas. | [Ficha oficial](https://www.unzuwines.com/wp-content/uploads/2026/01/Presentacion-Unzu-2026-4.pdf). |
| Clos du Ciel | Francia está sin confirmar y no hay foto; el nombre no identifica inequívocamente la botella. | Se conserva una descripción blanca prudente sin productor, uva ni país concretos. |
| José Manuel Corrales | Toro figura como estimado; la ficha consultada no acredita esa D.O. | [Productor](https://corralesespinosa.com/producto/jose-manuel-corrales-75cl/). |
