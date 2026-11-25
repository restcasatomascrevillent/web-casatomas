/**
 * Datos verificados del negocio, SIN dependencias ni `import.meta.env`.
 *
 * Viven aparte de `negocio.ts` para que también los pueda leer el build
 * (`vite.config.ts` → `scripts/generate-llms.mjs`, que escribe `/llms.txt` y
 * `/llms-full.txt` para los asistentes de IA) sin arrastrar los módulos
 * virtuales de la carta ni los alias `@/`. `negocio.ts` los reexporta: el
 * JSON-LD, la página de contacto y los `llms*.txt` salen de la misma fuente.
 */

export const NEGOCIO = {
  nombre: "Casa Tomás Restaurante",
  /** Nombre de la ficha de Google. Cubre además la grafía castellana del topónimo. */
  nombreAlternativo: "Casa Tomás Restaurante Crevillente",
  telefono: "+34966107887",
  email: "casatomascrevillent@gmail.com",
  calle: "Carrer Santa Maria de la Cabeza, 2",
  localidad: "Crevillent",
  region: "Alicante",
  cp: "03330",
  pais: "ES",
} as const;

/**
 * Año de apertura: «En 1998, Tomás Vázquez González dejó su pueblo natal de
 * A Touza (Ourense) rumbo a Crevillente…» (historia de `/el-restaurante`,
 * `i18n/languages/es.ts` → `nosotros.intro`).
 */
export const ANO_FUNDACION = "1998";

/**
 * Perfiles oficiales (JSON-LD `sameAs`, `llms.txt`). Solo los que enlaza la
 * propia web o que el restaurante gestiona: la ficha de TripAdvisor
 * `d6437147` es la del restaurante (descripción y respuestas escritas por
 * Casa Tomás; comprobado el 25/11/2026). Hay una segunda ficha duplicada como
 * «atracción» (`d5906852`) que NO se enlaza: hay que pedir a TripAdvisor que
 * la fusione.
 */
export const PERFILES = {
  instagram: "https://www.instagram.com/casatomascrevillent/",
  facebook: "https://www.facebook.com/barracasatomas/",
  tripadvisor:
    "https://www.tripadvisor.es/Restaurant_Review-g1064247-d6437147-Reviews-Restaurante_Casa_Tomas-Crevillente_Province_of_Alicante_Valencian_Community.html",
} as const;


/**
 * Descripción del restaurante (JSON-LD `description` y cita de `llms.txt`). Solo hechos que la web ya cuenta
 * (historia de `/el-restaurante`, carta): es el texto que un buscador o un
 * asistente de IA puede citar tal cual.
 */
export const DESCRIPCION_RESTAURANTE =
  `Restaurante familiar de cocina gallega y mediterránea en ${NEGOCIO.localidad} (${NEGOCIO.region}) desde ${ANO_FUNDACION}: ` +
  "marisco gallego, pescado, carnes a la brasa, arroces melosos y carta de vinos.";

/**
 * Horario de apertura.
 *
 * ⚠️ En el repo conviven CUATRO fuentes que se contradicen:
 *   1. El JSON-LD anterior (`Index.tsx`): L-V 13:00-16:00 y S-D 13:00-16:30 —
 *      el único que decía que abre los LUNES.
 *   2. El horario visible de la web (`i18n/languages/{es,en,fr}.ts`), idéntico
 *      en los tres idiomas: lunes cerrado, Ma-J 09:30-23:00, V 09:00-23:30,
 *      S 10:30-23:30, D 11:00-16:00.
 *   3. `configuracion_turnos` en Supabase: comida 13:00-16:00 y cena 20:00-23:00
 *      — son los TURNOS DE RESERVA, no el horario de apertura del local.
 *   4. La ficha de Google (no accesible desde aquí).
 *
 * Se publica la fuente 2 porque es la única que el propio sitio muestra al
 * visitante: un JSON-LD que contradice la página que lo contiene es precisamente
 * lo que Google penaliza. PENDIENTE DE CONFIRMAR POR EL DUEÑO.
 */
export const HORARIOS = [
  { dias: ["Tuesday", "Wednesday", "Thursday"], abre: "09:30", cierra: "23:00" },
  { dias: ["Friday"], abre: "09:00", cierra: "23:30" },
  { dias: ["Saturday"], abre: "10:30", cierra: "23:30" },
  { dias: ["Sunday"], abre: "11:00", cierra: "16:00" },
] as const;

/** Lo que ofrece el local (JSON-LD `servesCuisine`, `priceRange`… y `llms.txt`). */
export const OFERTA = {
  cocina: ["Gallega", "Marisco", "Mediterránea", "Arroces"],
  rangoPrecio: "€€", // nunca "$$": el replace() de helmet lo corrompe a "$"
  pago: "Efectivo, Tarjeta de crédito",
  mascotas: false,
} as const;

/**
 * Place ID de la ficha de Google por defecto (`negocio.ts` deja sobrescribirlo
 * con `VITE_GOOGLE_PLACE_ID`; ahí está la explicación completa).
 */
export const GOOGLE_PLACE_ID_POR_DEFECTO = "ChIJsS3PCWq5Yw0RL0gH6hiZvu0";

/** Web de Touza Cocktail Bar por defecto (`VITE_TOUZA_URL` la sobrescribe; ver `negocio.ts`). */
export const TOUZA_URL_POR_DEFECTO = "https://touza.restaurantecasatomascrevillente.es";

/** Dirección de Touza Cocktail Bar, la coctelería de al lado (n.º 4), del mismo dueño. */
export const TOUZA_CALLE = "Carrer Santa Maria de la Cabeza, 4";
