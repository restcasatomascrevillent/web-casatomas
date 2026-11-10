/**
 * Vocabulario ÚNICO de alérgenos de la carta.
 *
 * Por qué existe: el mismo alérgeno llega escrito de tres maneras distintas y
 * hasta ahora cada componente lo interpretaba a su aire.
 *
 *  - El panel de administración (`adminpanelct`) guarda IDs en snake_case:
 *    `frutos_cascara`, `crustaceos`, `lacteos`.
 *  - En la base de datos hay filas antiguas con la etiqueta humana y acentos:
 *    `frutos de cáscara`, `crustáceos`, `lácteos`.
 *  - Y hay valores sueltos que no son alérgenos oficiales de la UE pero que el
 *    restaurante usa igualmente: `alcohol`, `carne`, `marisco`.
 *  - Las traducciones (`alergenos_en`, `alergenos_fr`) son texto libre separado
 *    por comas: "Gluten, Milk, Sulphites".
 *
 * Aquí se normaliza todo a una CLAVE canónica y se traduce a etiqueta legible.
 * Cualquier comparación de alérgenos del repositorio debe pasar por este
 * módulo: comparar cadenas con `includes()` es justo lo que hacía que un
 * alérgeno personalizado escrito como "sin gluten" excluyera el plato del
 * filtro de celiaquía.
 */
import type { Language } from "@/i18n/types";

/** Los 14 alérgenos de declaración obligatoria (Reglamento UE 1169/2011). */
export const ALERGENOS_UE = [
  "gluten",
  "crustaceos",
  "huevo",
  "pescado",
  "cacahuetes",
  "soja",
  "lacteos",
  "frutos_cascara",
  "apio",
  "mostaza",
  "sesamo",
  "sulfitos",
  "altramuces",
  "moluscos",
] as const;

/** Valores que no son alérgenos oficiales pero sí están en la BD. */
export const ALERGENOS_EXTRA = ["alcohol", "carne", "marisco"] as const;

export type ClaveAlergeno = (typeof ALERGENOS_UE)[number] | (typeof ALERGENOS_EXTRA)[number];

/**
 * Minúsculas, sin acentos, sin guiones bajos y con los espacios colapsados.
 * `Frutos de cáscara` y `frutos_cascara` acaban en la misma forma comparable.
 */
export const normalizarTexto = (valor: string): string =>
  valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Formas conocidas → clave canónica.
 *
 * Se comparan ELEMENTOS COMPLETOS, nunca subcadenas: "sin gluten" no está en
 * esta tabla, así que se queda como token desconocido y NO cuenta como gluten.
 */
const SINONIMOS: Record<string, ClaveAlergeno> = {};
const registrar = (clave: ClaveAlergeno, ...formas: string[]) => {
  for (const forma of [clave, ...formas]) SINONIMOS[normalizarTexto(forma)] = clave;
};

registrar(
  "gluten",
  "cereales con gluten",
  "cereales que contienen gluten",
  "cereales",
  "trigo",
  "wheat",
  "cereals containing gluten",
  "cereals",
  "ble",
  "blé",
  "gluten (cereales)",
);
registrar("crustaceos", "crustáceos", "crustaceo", "crustaceans", "crustacea", "crustacés");
registrar("huevo", "huevos", "egg", "eggs", "oeuf", "oeufs", "œufs");
registrar("pescado", "pescados", "fish", "poisson", "poissons");
registrar("cacahuetes", "cacahuete", "peanut", "peanuts", "arachide", "arachides", "mani", "maní");
registrar("soja", "soya", "soy", "soybeans", "soybean");
registrar(
  "lacteos",
  "lácteos",
  "lacteo",
  "lácteo",
  "lactosa",
  "leche",
  "productos lacteos",
  "milk",
  "dairy",
  "lactose",
  "lait",
  "produits laitiers",
);
registrar(
  "frutos_cascara",
  "frutos de cascara",
  "frutos de cáscara",
  "frutos secos",
  "nueces",
  "nuts",
  "tree nuts",
  "fruits a coque",
  "fruits à coque",
);
registrar("apio", "celery", "celeri", "céleri");
registrar("mostaza", "mustard", "moutarde");
registrar(
  "sesamo",
  "sésamo",
  "semillas de sesamo",
  "granos de sesamo",
  "sesame",
  "sesame seeds",
  "graines de sesame",
);
registrar(
  "sulfitos",
  "sulfito",
  "sulfites",
  "sulphites",
  "dioxido de azufre",
  "anhidrido sulfuroso",
  "sulfur dioxide",
  "sulfur dioxide and sulphites",
  "dioxyde de soufre",
);
registrar("altramuces", "altramuz", "lupin", "lupins", "lupine");
registrar("moluscos", "molusco", "molluscs", "mollusks", "mollusques");
// Sin equivalencia oficial: "marisco" y "shellfish" no distinguen entre
// crustáceos y moluscos, así que se quedan en su propia clave en vez de
// asumir una de las dos.
registrar("marisco", "mariscos", "shellfish", "fruits de mer");
registrar("alcohol", "alcool");
registrar("carne", "meat", "viande");

/** Etiquetas para mostrar. Un token desconocido se capitaliza tal cual. */
const ETIQUETAS: Record<ClaveAlergeno, Record<Language, string>> = {
  gluten: { es: "Gluten", en: "Gluten", fr: "Gluten" },
  crustaceos: { es: "Crustáceos", en: "Crustaceans", fr: "Crustacés" },
  huevo: { es: "Huevo", en: "Egg", fr: "Œuf" },
  pescado: { es: "Pescado", en: "Fish", fr: "Poisson" },
  cacahuetes: { es: "Cacahuetes", en: "Peanuts", fr: "Arachides" },
  soja: { es: "Soja", en: "Soy", fr: "Soja" },
  lacteos: { es: "Lácteos", en: "Dairy", fr: "Produits laitiers" },
  frutos_cascara: { es: "Frutos de cáscara", en: "Tree nuts", fr: "Fruits à coque" },
  apio: { es: "Apio", en: "Celery", fr: "Céleri" },
  mostaza: { es: "Mostaza", en: "Mustard", fr: "Moutarde" },
  sesamo: { es: "Sésamo", en: "Sesame", fr: "Sésame" },
  sulfitos: { es: "Sulfitos", en: "Sulphites", fr: "Sulfites" },
  altramuces: { es: "Altramuces", en: "Lupin", fr: "Lupin" },
  moluscos: { es: "Moluscos", en: "Molluscs", fr: "Mollusques" },
  alcohol: { es: "Alcohol", en: "Alcohol", fr: "Alcool" },
  carne: { es: "Carne", en: "Meat", fr: "Viande" },
  marisco: { es: "Marisco", en: "Shellfish", fr: "Fruits de mer" },
};

const capitalizar = (valor: string) => {
  const limpio = valor.trim();
  return limpio ? limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase() : "";
};

/**
 * Convierte lo que venga de la BD en una lista de cadenas.
 *
 * Acepta las tres formas que existen hoy:
 *  - array de PostgREST: `["gluten", "lacteos"]`
 *  - JSON serializado:   `'["gluten","lacteos"]'`
 *  - texto separado por comas (`alergenos_en` / `alergenos_fr`): `"Gluten, Milk"`
 *
 * También tolera el literal de array de Postgres (`{gluten,lacteos}`) por si
 * alguna fila llega sin convertir.
 */
export const normalizeAlergenos = (valor: unknown): string[] => {
  if (Array.isArray(valor)) {
    return valor.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof valor === "string") {
    const limpio = valor.trim();
    if (!limpio) return [];

    try {
      const parsed = JSON.parse(limpio);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
    } catch {
      // No era JSON: se trata como lista separada por comas.
    }

    return limpio
      .replace(/^[{[]/, "")
      .replace(/[}\]]$/, "")
      .split(/[,;]/)
      .map((item) => item.replace(/^["']|["']$/g, "").trim())
      .filter(Boolean);
  }

  return [];
};

/** Clave canónica de un alérgeno suelto, o su forma normalizada si no se conoce. */
export const claveAlergeno = (valor: string): string => {
  const normalizado = normalizarTexto(valor);
  return SINONIMOS[normalizado] ?? normalizado;
};

/** Lista de claves canónicas, sin repetidos y en el orden en que llegaron. */
export const clavesAlergenos = (valor: unknown): string[] => [
  ...new Set(normalizeAlergenos(valor).map(claveAlergeno).filter(Boolean)),
];

/** Etiqueta legible de una clave (o de un valor crudo) en el idioma activo. */
/**
 * El panel guarda «sin alérgenos declarados» DENTRO de `alergenos_oficiales`
 * cuando el restaurante declara que el plato no tiene ninguno. No es un
 * alérgeno (no tiene clave ni entra en los filtros), pero es texto que ve el
 * cliente, así que se pinta en su idioma.
 */
const SIN_ALERGENOS_DECLARADOS: Record<Language, string> = {
  es: "Sin alérgenos declarados",
  en: "No allergens declared",
  fr: "Aucun allergène déclaré",
};
const FORMAS_SIN_ALERGENOS = new Set(
  [
    "sin alérgenos declarados",
    "sin alergenos",
    "no allergens declared",
    "aucun allergène déclaré",
  ].map(normalizarTexto),
);

export const etiquetaAlergeno = (valor: string, idioma: Language = "es"): string => {
  if (FORMAS_SIN_ALERGENOS.has(normalizarTexto(valor))) return SIN_ALERGENOS_DECLARADOS[idioma];
  const clave = claveAlergeno(valor);
  const conocida = ETIQUETAS[clave as ClaveAlergeno];
  return conocida ? conocida[idioma] : capitalizar(valor);
};

/** Los tres campos de alérgenos de una fila, ya reunidos. */
export interface DatosAlergenos {
  /** Declarados por el restaurante (`alergenos_oficiales`). */
  oficiales: string[];
  /** Deducidos de los ingredientes (`alergenos_inferidos`). */
  inferidos: string[];
  /** Texto libre (`alergenos_notas`). Nunca certifica: solo puede advertir. */
  notas?: string | null;
}

/** Cualquier fila de la carta (plato, vino) con sus campos de alérgenos. */
export interface FilaConAlergenos {
  alergenos_oficiales?: unknown;
  alergenos_inferidos?: unknown;
  alergenos_notas?: unknown;
  displayAlergenosOficiales?: unknown;
  displayAlergenosInferidos?: unknown;
  displayAlergenosNotas?: unknown;
}

/**
 * Reúne los alérgenos de una fila mirando A LA VEZ las columnas en castellano
 * y las ya traducidas (`displayAlergenos*`, que en en/fr salen de
 * `alergenos_en` / `alergenos_fr`).
 *
 * Se juntan las dos fuentes a propósito: la traducción puede estar incompleta y
 * un filtro de seguridad no puede depender del idioma que tenga elegido el
 * visitante. Todo pasa por `claveAlergeno`, así que "Milk" y "lácteos" son el
 * mismo token y no se duplican.
 */
export function datosAlergenos(item: FilaConAlergenos): DatosAlergenos {
  const unir = (...valores: unknown[]) => [
    ...new Set(valores.flatMap((valor) => normalizeAlergenos(valor))),
  ];

  const notas = [item.alergenos_notas, item.displayAlergenosNotas]
    .filter((nota): nota is string => typeof nota === "string" && nota.trim() !== "")
    .filter((nota, indice, todas) => todas.indexOf(nota) === indice)
    .join(" · ");

  return {
    oficiales: unir(item.alergenos_oficiales, item.displayAlergenosOficiales),
    inferidos: unir(item.alergenos_inferidos, item.displayAlergenosInferidos),
    notas: notas || null,
  };
}

/**
 * ¿Hay información de alérgenos utilizable por una máquina?
 *
 * SOLO cuentan las listas (`alergenos_oficiales` / `alergenos_inferidos`). Una
 * nota en texto libre no certifica nada: "Para los alérgenos consultar al
 * personal" es precisamente la ausencia del dato.
 */
export const tieneInformacionAlergenos = (datos: DatosAlergenos): boolean =>
  datos.oficiales.length > 0 || datos.inferidos.length > 0;

export type ClaveFiltroDietetico = "celiaquia" | "lactosa" | "vegano" | "vegetariano";

interface DefinicionFiltro {
  /** Claves canónicas que descartan el plato. */
  excluye: readonly ClaveAlergeno[];
  /** Palabras que, si aparecen en la nota, obligan a leerla a una persona. */
  palabrasNota: readonly string[];
}

/** Filtros que hoy se pueden evaluar con datos reales. Son de EXCLUSIÓN. */
export const FILTROS_DIETETICOS: Record<"celiaquia" | "lactosa", DefinicionFiltro> = {
  celiaquia: {
    excluye: ["gluten"],
    palabrasNota: ["gluten", "trigo", "wheat", "cereales", "ble"],
  },
  lactosa: {
    excluye: ["lacteos"],
    palabrasNota: ["lactosa", "lactose", "lacteo", "lacteos", "leche", "milk", "dairy", "lait"],
  },
};

/**
 * TODO(dieta): "Vegano" y "Vegetariano" NO se pueden evaluar con los datos que
 * hay. Se buscaban dentro de la columna de alérgenos, que nunca contiene esas
 * palabras, así que el filtro devolvía cero platos SIEMPRE. Se retiran de la
 * interfaz (`CartaPlatos.tsx`) hasta que exista una columna propia de etiquetas
 * dietéticas en la tabla `Platos` —p. ej. `etiquetas_dieteticas text[]` con
 * valores `vegano` / `vegetariano`, editable desde `adminpanelct`—. Cuando
 * exista: añadir aquí un filtro de INCLUSIÓN (el plato aparece solo si lleva la
 * etiqueta) y volver a listarlos en `dietaryFilterOptions`. Deducirlos de los
 * ingredientes no vale: un plato sin "carne" en la lista puede llevar caldo.
 */
export const FILTROS_DIETETICOS_PENDIENTES: Record<
  "vegano" | "vegetariano",
  { etiquetas: readonly string[] }
> = {
  vegano: { etiquetas: ["vegano", "vegana", "vegan"] },
  vegetariano: {
    etiquetas: ["vegetariano", "vegetariana", "vegetarian", "vegano", "vegana", "vegan"],
  },
};

/** ¿La nota remite a una persona en vez de dar el dato? */
const notaRemiteAlPersonal = (nota: string): boolean =>
  /\b(consultar|consulte|consulta|preguntar|pregunte|consult|ask|demander|demandez)\b/.test(nota);

const notaMenciona = (nota: string, palabras: readonly string[]): boolean =>
  palabras.some((palabra) => new RegExp(`\\b${palabra}\\b`).test(nota));

/**
 * ¿El plato se puede ofrecer a alguien que evita este alérgeno?
 *
 * Criterio, por orden (deliberadamente conservador — un falso positivo aquí es
 * un problema de salud, un falso negativo solo es un plato que no se lista):
 *
 *  1. Sin listas de alérgenos NO es apto. "No lo sabemos" jamás es "sí".
 *  2. Si alguna lista contiene el alérgeno (comparando CLAVES canónicas
 *     completas, no subcadenas), no es apto.
 *  3. Si la nota menciona el alérgeno ("puede pedirse sin gluten") o remite al
 *     personal, no es apto: es una condición que tiene que confirmar alguien.
 *     La nota se sigue enseñando en la tarjeta, así que el visitante la
 *     encuentra navegando sin el filtro.
 */
export function cumpleFiltroDietetico(
  datos: DatosAlergenos,
  filtro: keyof typeof FILTROS_DIETETICOS,
): boolean {
  if (!tieneInformacionAlergenos(datos)) return false;

  const definicion = FILTROS_DIETETICOS[filtro];
  const presentes = new Set([
    ...datos.oficiales.map(claveAlergeno),
    ...datos.inferidos.map(claveAlergeno),
  ]);
  if (definicion.excluye.some((clave) => presentes.has(clave))) return false;

  const nota = datos.notas ? normalizarTexto(datos.notas) : "";
  if (nota && (notaMenciona(nota, definicion.palabrasNota) || notaRemiteAlPersonal(nota))) {
    return false;
  }

  return true;
}

/** Un plato con lo que hace falta para decidir si sirve a un celíaco o a quien evita la lactosa. */
export interface PlatoConAptitudes extends FilaConAlergenos {
  /** «Se puede hacer sin gluten»: el restaurante ofrece una preparación alternativa. */
  sin_gluten_disponible?: boolean | null;
  /**
   * Decidido a mano en el panel (Platos.apto_celiacos / apto_sin_lactosa, migración
   * 20261122093000 de admin-casatomas, 10/11/2026): true o false mandan; null o ausente =
   * automático, con las reglas de los alérgenos. En una BD sin esas columnas no vienen.
   */
  apto_celiacos?: boolean | null;
  apto_sin_lactosa?: boolean | null;
}

/** ¿El plato lleva gluten según sus listas de alérgenos (oficiales o inferidos)? */
export function llevaGluten(datos: DatosAlergenos): boolean {
  return [...datos.oficiales, ...datos.inferidos].some((alergeno) => claveAlergeno(alergeno) === "gluten");
}

/**
 * ¿Se muestra «se puede hacer sin gluten»? Solo si el plato lleva gluten: desde el 10/11/2026 el
 * panel deja marcar la casilla en cualquier plato, y en uno que ya no lleva gluten no aporta nada.
 */
export function ofreceOpcionSinGluten(plato: PlatoConAptitudes): boolean {
  return plato.sin_gluten_disponible === true && llevaGluten(datosAlergenos(plato));
}

/**
 * Filtro «Sin gluten» / «Sin lactosa» de un plato. Son las MISMAS reglas que el «Apto para» del
 * panel (admin-casatomas, src/lib/aptitudes-plato.ts), para que lo que dice el formulario sea lo
 * que hace el filtro:
 *  1. Lo decidido a mano en el panel manda (true o false).
 *  2. Celíacos: si el plato lleva gluten pero «se puede hacer sin gluten», es apto.
 *  3. Si no, `cumpleFiltroDietetico` (conservador: sin alérgenos no es apto).
 */
export function cumpleAptitudPlato(plato: PlatoConAptitudes, filtro: keyof typeof FILTROS_DIETETICOS): boolean {
  const aMano = filtro === "celiaquia" ? plato.apto_celiacos : plato.apto_sin_lactosa;
  if (typeof aMano === "boolean") return aMano;
  const datos = datosAlergenos(plato);
  if (filtro === "celiaquia" && plato.sin_gluten_disponible === true && llevaGluten(datos)) return true;
  return cumpleFiltroDietetico(datos, filtro);
}

/** Aviso para las tarjetas de un plato del que no consta ningún alérgeno. */
export const AVISO_SIN_ALERGENOS: Record<Language, string> = {
  es: "Sin información de alérgenos — consulte al personal",
  en: "No allergen information — please ask our staff",
  fr: "Pas d'information sur les allergènes — demandez au personnel",
};
