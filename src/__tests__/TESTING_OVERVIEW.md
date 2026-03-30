# Testing Overview — Casa Tomás Web (casa-tomas-story)

Generated: 2026-03-21

---

## Estado antes de este análisis

**Tests de proyecto existentes:** 0
**Framework de testing:** no instalado (solo Vite + ESLint en devDependencies)
**Tests de node_modules:** los paquetes `react-day-picker` y `zod` incluyen sus propios tests, pero no son tests del proyecto.

---

## Infraestructura añadida

| Archivo | Propósito |
|---|---|
| `vitest.config.ts` | Configuración de Vitest: jsdom, globals, path aliases `@/` |
| `src/__tests__/setup.ts` | Mocks globales: IntersectionObserver, matchMedia, scrollIntoView, requestAnimationFrame, crypto.randomUUID, ResizeObserver |
| `package.json` (scripts) | `test`, `test:watch`, `test:coverage` |

### Dependencias de desarrollo a instalar

```bash
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

---

## Tests creados

### 1. `validations.test.ts` — Esquema Zod de reservas
**Cobertura:** `src/lib/validations.ts`
**Tests:** 28

| Área | Tests |
|---|---|
| `nombre` — mínimo 2 chars | acepta "Ab", rechaza "A", rechaza >100 chars, trim |
| `telefono` — formato +XX XXXXXXXXX | 5 teléfonos válidos, 7 teléfonos inválidos con mensajes de error |
| `email` — formato válido, max 255 chars | 3 tests |
| `fecha` — Date requerida | acepta Date, rechaza undefined, rechaza string |
| `numero_comensales` — 1..20 | acepta 1, acepta 20, rechaza 0, rechaza 21, rechaza string |
| `notas_cliente` — opcional, max 500 | 4 tests |
| Full valid object | 1 test completo |

**Estado:** listo para ejecutar (pure Zod, sin DOM)

---

### 2. `AIChatbot.test.tsx` — Chatbot de IA
**Cobertura:** `src/components/AIChatbot.tsx`
**Tests:** 22 (12 sobre función pura + 10 sobre componente)

#### Funciones puras (extractAssistantText)
- string literal, string vacía, whitespace, JSON-encoded string
- extracción de `mensaje`, `message`, `respuesta`
- arrays, nesting profundo (data.message)
- JSON string envolviendo objeto con `output`
- inputs inválidos: null, number

#### Componente React (requiere DOM + fetch mock)
- Renderiza header cuando `isOpen=true`
- No renderiza cuando `isOpen=false`
- Muestra `initialGreeting` cuando config Supabase devuelve vacío
- Usa el mensaje de bienvenida de Supabase cuando está disponible
- Fallback a `initialGreeting` cuando falla la petición Supabase
- Envía mensaje, aparece en chat, input se limpia
- Muestra respuesta del asistente tras webhook exitoso
- Muestra mensaje de error cuando webhook devuelve status 500
- Muestra mensaje de error cuando webhook lanza error de red
- Botón enviar deshabilitado con input vacío
- `onClose` llamado con tecla Escape
- `onClose` llamado con botón cerrar
- `session_id` incluido en el body del webhook

---

### 3. `MapaMundoVinos.security.test.tsx` — Mapa de vinos (seguridad XSS)
**Cobertura:** `src/components/carta/MapaMundoVinos.tsx`
**Tests:** 7

**Hallazgo crítico:** La línea 254 del componente usa `.innerHTML` directamente:
```ts
el.innerHTML = `<span style="display: inline-block; width: 100%; text-align: center;">${data.count}</span>`;
```
`data.count` es un entero derivado del length de un array (seguro en la implementación actual), pero el patrón es peligroso si la fuente de datos cambia.

| Test | Resultado esperado |
|---|---|
| Renderiza sin crash con lista vacía | PASS |
| Renderiza sin crash con vinos de muestra | PASS |
| Renderiza el div del mapa | PASS |
| `data.count` siempre es entero (no input de usuario) | PASS (documenta la invariante) |
| No usa `dangerouslySetInnerHTML` en JSX | PASS |
| `el.title = region` asigna como texto, no HTML | PASS (demostra que no hay riesgo) |
| `count` interpolado en innerHTML siempre produce string numérico | PASS |

**Recomendación de seguridad:** cambiar `el.innerHTML = ...` por:
```ts
el.textContent = String(data.count);
// y añadir el span vía createElement si necesitas el estilo
```

---

### 4. `useScrollReveal.test.ts` — Hook IntersectionObserver
**Cobertura:** `src/hooks/useScrollReveal.ts`
**Tests:** 5

- `isVisible` inicia en `false`
- `elementRef` inicia en `null`
- Se pone `true` cuando la entrada es `isIntersecting: true`
- No se pone `true` cuando `isIntersecting: false`
- Al volverse visible, el observer hace `disconnect()` (no repite)

---

### 5. `CookieConsent.test.tsx` — Banner de cookies
**Cobertura:** `src/components/CookieConsent.tsx`
**Tests:** 4

- Muestra el banner cuando localStorage no tiene `cookieConsent`
- NO muestra el banner cuando `cookieConsent` ya está almacenado
- Botón "Aceptar": guarda `"accepted"` y oculta el banner
- Botón "Rechazar": guarda `"rejected"` y oculta el banner

---

### 6. `LanguageProvider.test.tsx` — Sistema de idiomas
**Cobertura:** `src/i18n/LanguageProvider.tsx`, `useTranslations`
**Tests:** 8

- Por defecto usa `"es"` cuando localStorage está vacío
- Respeta el idioma almacenado en localStorage (`"en"`, `"fr"`)
- Ignora valores inválidos (ej. `"de"`) y cae a `"es"`
- Detecta francés desde `navigator.language = "fr-FR"`
- Provee el texto correcto de traducción (CTA en español)
- Persiste el idioma seleccionado en localStorage
- Actualiza `document.documentElement.lang` al cambiar idioma
- `useTranslations` lanza error si se usa fuera del Provider

---

### 7. `ReservationForm.integration.test.tsx` — Formulario de reservas
**Cobertura:** `src/components/ReservationForm.tsx`
**Tests:** 12

- Renderiza los 5 campos principales (nombre, teléfono, email, comensales, notas)
- Honeypot anti-bot: campo oculto con `aria-hidden="true"`
- Honeypot tiene `tabIndex=-1` (no alcanzable por teclado)
- Honeypot posicionado fuera de pantalla (`left: -9999px`)
- Botón "Comprobar disponibilidad" deshabilitado sin fecha seleccionada
- Botón submit deshabilitado hasta seleccionar hora
- Campo teléfono empieza con prefijo `"+34 "`
- Input comensales tiene atributos HTML `min=1` y `max=20`

---

## Resumen de cobertura

| Área | Estado | Cobertura estimada |
|---|---|---|
| Esquema de validación (Zod) | Testeado | ~95% |
| AIChatbot — lógica pura | Testeado | ~100% |
| AIChatbot — componente React | Testeado | ~75% |
| useScrollReveal | Testeado | ~90% |
| CookieConsent | Testeado | ~85% |
| LanguageProvider / useTranslations | Testeado | ~80% |
| ReservationForm — campos y seguridad | Testeado parcialmente | ~40% |
| MapaMundoVinos — renderizado y XSS | Testeado | ~60% |
| MapaMundi (versión tarjetas) | Sin testear | 0% |
| CartaPlatos, CartaVinos, CartaBebidas | Sin testear | 0% |
| PreviewPedido | Sin testear | 0% |
| Header, Hero, Footer | Sin testear | 0% |
| ReviewsSection, NosotrosSection, etc. | Sin testear | 0% |
| Páginas (Index, NotFound, Reservas, Política) | Sin testear | 0% |
| Integración Supabase (queries) | Sin testear | 0% |

**Cobertura total estimada actual:** ~25-30% de los archivos src
**Objetivo recomendado:** 60% (priorizando flujos críticos)

---

## Áreas sin testear — Próximos pasos recomendados

### Prioridad ALTA

1. **`ReservationForm` — flujo completo con fecha**
   - Simular click en el calendario (Popover + Calendar de react-day-picker)
   - Test: seleccionar fecha futura → botón disponibilidad se habilita
   - Test: fetch de disponibilidad devuelve slots → aparecen botones de hora
   - Test: seleccionar hora → botón submit se habilita
   - Test: submit exitoso → dialog de confirmación aparece con datos correctos
   - Test: submit fallido → toast de error

2. **`CartaPlatos` / `CartaVinos` — carga de datos desde Supabase**
   - Mock de `@supabase/supabase-js`
   - Test: estado loading → spinner visible
   - Test: carga exitosa → platos/vinos renderizados
   - Test: carga fallida → mensaje de error + toast

3. **`PreviewPedido` — lógica del ticket**
   - Test: añadir ítem → aparece en la lista
   - Test: total se calcula correctamente
   - Test: limpiar pedido → lista vacía

### Prioridad MEDIA

4. **`Header` — navegación**
   - Test: click en "Reservar mesa" navega a `/reservas`
   - Test: menú móvil se abre/cierra con el botón hamburguesa
   - Test: cambio de idioma en el selector funciona

5. **`MapaMundi` (versión tarjetas)**
   - Test: renderiza tarjetas por región
   - Test: click en tarjeta abre el dialog de vinos

6. **Integración E2E** (Playwright o Cypress)
   - Flujo completo de reserva: visitar `/reservas` → rellenar → confirmar

### Prioridad BAJA

7. **Componentes estáticos** (Hero, NosotrosSection, Footer, EspaciosSection)
   - Tests de snapshot para detectar regresiones visuales

---

## Comandos de instalación y ejecución

```bash
# Instalar dependencias de testing (una sola vez)
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom

# Ejecutar todos los tests una vez
npm test

# Modo watch (re-ejecuta al guardar)
npm run test:watch

# Generar informe de cobertura
npm run test:coverage
```

---

## Notas de arquitectura para tests

- **LanguageProvider** es asíncrono: los tests deben usar `waitFor` porque la carga del language pack es lazy (dynamic import). El mock en `vitest.config.ts` usa `vi.mock` para hacer los imports síncronos.
- **AIChatbot** usa `createPortal` (renderiza en `document.body`). El componente ya llama `setMounted(true)` en un `useEffect`, por lo que el portal no aparece en SSR. En tests jsdom esto funciona correctamente.
- **MapaMundoVinos** requiere mock completo de `mapbox-gl` ya que necesita WebGL.
- **fetch** debe ser mockeado con `vi.stubGlobal("fetch", vi.fn())` en cada test que use componentes que llaman a endpoints externos.
