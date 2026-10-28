---
name: becarios-notion
description: "Prepara Notion para los becarios. Añade a la base de datos de historias las propiedades de seguimiento (Fase, Becario, Versión, PR, Bloqueo) y crea la base de datos «Registro de entrega» relacionada con ella."
argument-hint: "[URL de la base de datos de historias]"
disable-model-invocation: true
---

# Preparar Notion para los becarios

Base de datos de historias: $ARGUMENTS (si está vacío, usa `notion.historias` de `.claude/becarios.yaml`; si tampoco existe, pídela).

El esquema objetivo está en `.claude/becarios/reference/notion.md`.

## Pasos

1. Comprueba que las herramientas de Notion responden. Si piden autorización, indica al usuario que conecte Notion (conector de Claude o `/mcp` en la terminal) y para.
2. Lee el esquema actual de la base de datos de historias.
3. Compara con el esquema objetivo y prepara un plan de cambios:
   - Propiedades que faltan y se crearán.
   - Propiedades que existen con otro nombre o tipo: **no las renombres ni cambies**; propón usar la existente y anótalo.
   - Opciones de selección que faltan en `Estado` y `Fase`.
4. Busca si ya existe una base de datos «Registro de entrega» (o una columna de relación «Registro de entrega» en la base de historias). Si no, plantea crearla con la relación de dos sentidos `Tarea` ↔ `Registro de entrega`.
5. Deduce la correspondencia con lo que ya existe: qué valor de `Estado` equivale a sin empezar, en progreso, en espera y hecha (p. ej. «Por hacer»), y qué columna es la de proyecto (p. ej. «Proyecto relacionado»).
6. **Muestra el plan al usuario y espera su confirmación** antes de modificar nada: son cambios en un espacio compartido.
7. Aplica los cambios confirmados. No borres propiedades, opciones ni páginas.
8. Si existe `.claude/becarios.yaml`, guarda en `notion` las URL (`historias`, `registro`), `propiedades.proyecto` y `estados`.

Termina con una sola línea: `[Becarios] Notion listo: <n> propiedades añadidas · registro <URL> ✅`.
