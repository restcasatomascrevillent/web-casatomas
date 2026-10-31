# Seguimiento en Notion

Los becarios usan cualquier conexión de Notion disponible: el servidor MCP del plugin o el conector de Notion del usuario en Claude. Si no hay herramientas de Notion o piden autorización, el becario para con resultado BLOQUEADO e indica que hay que conectar Notion.

Todo lo específico de cada espacio de Notion está en `.claude/becarios.yaml` → `notion`:

- `historias` y `registro`: URL de las dos bases de datos.
- `propiedades.proyecto`: nombre de la columna de proyecto (p. ej. `Proyecto relacionado`).
- `estados`: el valor de la columna `Estado` que corresponde a cada situación (p. ej. `sin_empezar: Por hacer`).
- `valor_proyecto`: qué se escribe en la columna de proyecto para este repositorio.
- `extra`: valores fijos al crear historias (p. ej. `Área: Producto`).

Usa siempre esos nombres y valores. En este documento, `Sin empezar`, `En progreso`, `En espera` y `Hecha` significan «el valor configurado en `notion.estados`».

## Base de datos de historias (la del usuario)

Columnas que los becarios leen y actualizan. `/becarios-notion` añade las que falten sin tocar las existentes.

| Columna | Tipo | Valores / uso |
| --- | --- | --- |
| Título (el de la base) | Título | Título de la historia |
| Estado | Estado o selección | Según `notion.estados` |
| Fase | Selección | `Preparación`, `Desarrollo y unitarias`, `Despliegue DEMO`, `QA DEMO`, `PR y revisión`, `Despliegue PROD`, `QA PROD`, `Cerrada` |
| Becario | Selección | `cto`, `delivery`, `frontend`, `backend-datos`, `backend-servicios`, `qa-funcional`, `qa-tecnico` |
| Versión | Texto | SHA corto del commit candidato o publicado |
| PR | URL | PR de promoción |
| Bloqueo | Texto | Motivo cuando el Estado es `En espera` |
| Proyecto (`propiedades.proyecto`) | Texto, selección o relación | `valor_proyecto` |
| Registro de entrega | Relación | Entradas del registro de esa historia (se rellena sola) |

Las columnas que use la persona (por ejemplo `Encargado`, `Prioridad`, `Fecha límite`) no se tocan.

Los criterios de aceptación, dependencias y diseño se leen del cuerpo de la página.

## Base de datos «Registro de entrega»

Una entrada por cada resultado de fase, defecto, bloqueo o cierre.

| Columna | Tipo | Valores / uso |
| --- | --- | --- |
| Título | Título | `<Fase> · <Resultado> · <becario>` |
| Tarea | Relación | Página de la historia |
| Fase | Selección | Mismos valores que en historias |
| Tipo | Selección | `Validación`, `Despliegue`, `Revisión`, `Defecto`, `Bloqueo`, `Cierre` |
| Resultado | Selección | `Superado`, `Fallido`, `Bloqueado` |
| Becario | Selección | Nombre del becario |
| Versión | Texto | SHA corto |
| PR | URL | Si aplica |
| Ejecución CI/CD | URL | Si aplica |
| Evidencias | Texto | Enlaces a artefactos del CI, informes, capturas |
| Severidad | Selección | `Bloqueante`, `Alta`, `Media`, `Baja` (solo defectos) |
| Fecha | Fecha de creación | Automática |

El cuerpo de la entrada contiene el **Informe de fase** completo (ver `reference/proceso.md`).

Si la base de registro no está configurada, añade el informe al final de la página de la historia bajo `## Registro de entrega` y avisa en tu informe de que falta la base.

## Historias creadas por los becarios

Cuando el usuario cuenta una tarea con sus palabras, el CTO redacta la historia y el coordinador la crea **solo tras el «sí» del usuario**, en `notion.historias`:

- **Título**: el propuesto.
- **Columnas**: `Estado = Sin empezar`, la columna de proyecto con `valor_proyecto`, y los valores de `extra`. El resto vacías.
- **Cuerpo**, en este orden:
  1. La historia («Como… quiero… para…»).
  2. `## Criterios de aceptación` como lista de casillas, una por criterio.
  3. `## Fuera de alcance`.
  4. `## Dependencias y notas técnicas`.
  5. `## Origen`: «Creada por los becarios a partir de:» y el texto exacto del usuario, con la fecha.

Si se completa una historia existente que no tenía criterios, se añaden las secciones que faltan a esa misma página sin borrar lo que ya tenía.

## Reglas de actualización

1. **Antes de trabajar**: lee la historia y la última entrada de registro para saber en qué fase está y qué quedó pendiente.
2. **Al empezar una fase**: el coordinador pone `Fase`, `Becario` y `Estado = En progreso`.
3. **Al terminar**: el becario crea su entrada de registro y actualiza `Versión` y `PR` si cambian.
4. **Bloqueo**: `Estado = En espera`, rellena `Bloqueo` y crea una entrada de tipo `Bloqueo`.
5. **Defecto**: una entrada de tipo `Defecto` por incidencia, con severidad, pasos, esperado y obtenido. Al corregirse se crea una nueva entrada de validación que la referencia; no se borran entradas.
6. **Cierre**: solo cuando QA en PROD está superado y existen entradas de unitarias, despliegue DEMO, QA DEMO, revisión del CTO, despliegue PROD y QA PROD. Entonces `Fase = Cerrada` y `Estado = Hecha`.

## Qué no se escribe en Notion

Secretos, tokens, cadenas de conexión, datos personales de usuarios reales ni volcados de datos de PROD.

## Configuración del becario (panel OficiosOsIA)

Cada becario tiene una fila en la base «Becarios» de Notion (data source `7d90c32f-ede0-42ca-8732-2c80134f885b`, en la página «Panel OficiosOsIA»). Se edita desde la pestaña «Becarios» del panel de OficiosOsIA. Tu fila es la que tiene tu nombre de agente (`cto`, `frontend`, `backend-datos`, `backend-servicios`, `qa-funcional`, `qa-tecnico` o `delivery`) en la columna `Id`.

Antes de empezar cualquier tarea, léela:

- Si `Pausado` está marcado, no trabajes: termina con resultado BLOQUEADO y el motivo «Becario pausado en el panel».
- Si hay `Instrucciones`, síguelas en toda la tarea, salvo que contradigan `reference/proceso.md` o las reglas del repositorio (`CLAUDE.md`). En ese caso mandan esas, y lo dices en tu informe.
- Si no encuentras la base o tu fila, sigue como siempre.

`Modelo` y `Esfuerzo` no son para ti: los aplica el coordinador al lanzarte (ver el skill `becarios`).
