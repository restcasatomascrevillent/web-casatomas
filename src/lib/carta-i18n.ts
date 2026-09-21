/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Resolución de idioma y normalización de la carta.
 *
 * Es una extracción de lo que vivía dentro de `CartaPlatos.tsx`
 * (`normalizeIngredientes`, `parseTraducciones` y el `useMemo` de
 * `translatedPlatos`), para que la use también el prerenderizado de build
 * (`carta-ssg.ts`) y no existan dos implementaciones que puedan divergir. El
 * vocabulario de alérgenos (normalizar, traducir etiquetas, filtrar) vive en
 * `@/lib/alergenos`; aquí solo se resuelve QUÉ columna se lee.
 *
 * Precedencia, de mayor a menor:
 *   1. columna dedicada `campo_{idioma}` (p. ej. `nombre_en`, `alergenos_en`)
 *   2. `traducciones[idioma][campo]` (mecanismo antiguo, vivo en 8 filas)
 *   3. el valor base en castellano
 */
import type { Language } from "@/i18n/types";
import { normalizeAlergenos } from "./alergenos";

export const parseTraducciones = (value: unknown) => {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (typeof value === "object") return value;
  return null;
};

export const normalizeIngredientes = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    const cleaned = trimmed
      .replace(/^ingredients?\s*:\s*/i, "")
      .replace(/^ingr[eé]dients?\s*:\s*/i, "")
      .replace(/^ingredientes?\s*:\s*/i, "");

    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      // Si no es JSON, se interpreta como lista separada por comas.
    }

    return cleaned
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

export type ItemTraducido<T> = T & {
  displayNombre: string;
  displayCategoria?: string;
  displayDescripcion?: string;
  displayIngredientes: string[];
  displayAlergenosOficiales?: string[];
  displayAlergenosInferidos?: string[];
  displayAlergenosNotas?: string | null;
  translatedCategoria: string | null;
};

/**
 * Resuelve un producto de la carta al idioma activo.
 * Cuerpo idéntico al `useMemo` original de `CartaPlatos.tsx:238-293`.
 */
export function resolveTranslatedItem<T extends Record<string, any>>(
  item: T,
  language: Language,
): ItemTraducido<T> {
  const columnName = (item as any)[`nombre_${language}`];
  const columnCategoria = (item as any)[`categoria_${language}`];
  const columnDescripcion = (item as any)[`descripcion_${language}`];
  const columnIngredientes = (item as any)[`ingredientes_${language}`];
  /**
   * La columna traducida de alérgenos es `alergenos_en` / `alergenos_fr`: UNA
   * sola, de texto libre separado por comas ("Gluten, Milk, Sulphites"). Antes
   * se pedían `alergenos_oficiales_${lang}` y `alergenos_notas_${lang}`, que no
   * existen en ninguna tabla, así que en inglés y francés los alérgenos se
   * pintaban siempre en castellano.
   */
  const columnAlergenos = (item as any)[`alergenos_${language}`];

  if (language === "es") {
    return {
      ...item,
      displayNombre: item.nombre,
      displayCategoria: item.categoria,
      displayDescripcion: item.descripcion,
      displayIngredientes: normalizeIngredientes((item as any).ingredientes),
      displayAlergenosOficiales: normalizeAlergenos(item.alergenos_oficiales),
      displayAlergenosInferidos: normalizeAlergenos(item.alergenos_inferidos),
      displayAlergenosNotas: item.alergenos_notas,
      translatedCategoria: null,
    };
  }

  const traducciones = parseTraducciones((item as any).traducciones);
  const translation = traducciones?.[language] ?? {};
  const translationAlergenosOficiales =
    translation?.alergenos_oficiales ?? translation?.alergenos?.oficiales;
  const translationAlergenosInferidos =
    translation?.alergenos_inferidos ?? translation?.alergenos?.inferidos;
  const translationAlergenosNotas =
    translation?.alergenos_notas ?? translation?.alergenos?.notas;
  const translationIngredientes = translation?.ingredientes;

  /**
   * `alergenos_en` / `alergenos_fr` es una lista ÚNICA: no separa oficiales de
   * inferidos. Cuando existe se usa como lista de oficiales y se deja la de
   * inferidos vacía, porque si no los mismos alérgenos aparecerían dos veces
   * (una traducidos y otra en castellano). Si está vacía se cae al castellano:
   * más vale enseñarlos en otro idioma que no enseñarlos.
   */
  const traducidos = normalizeAlergenos(columnAlergenos);
  const oficiales = traducidos.length
    ? traducidos
    : normalizeAlergenos(translationAlergenosOficiales ?? item.alergenos_oficiales);
  const inferidos = traducidos.length
    ? []
    : normalizeAlergenos(translationAlergenosInferidos ?? item.alergenos_inferidos);

  return {
    ...item,
    displayNombre: columnName || translation?.nombre || item.nombre,
    displayCategoria: columnCategoria || translation?.categoria || item.categoria,
    displayDescripcion: columnDescripcion ?? translation?.descripcion ?? item.descripcion,
    displayIngredientes: normalizeIngredientes(
      columnIngredientes ?? translationIngredientes ?? (item as any).ingredientes,
    ),
    displayAlergenosOficiales: oficiales,
    displayAlergenosInferidos: inferidos,
    // No hay columna traducida para las notas; se usa `traducciones` si la trae.
    displayAlergenosNotas: translationAlergenosNotas ?? item.alergenos_notas,
    translatedCategoria: columnCategoria || translation?.categoria || null,
  };
}
