/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Resolución de idioma y normalización de la carta.
 *
 * Es una extracción literal de lo que vivía dentro de `CartaPlatos.tsx`
 * (`normalizeAlergenos`, `normalizeIngredientes`, `parseTraducciones` y el
 * `useMemo` de `translatedPlatos`). Se mueve aquí sin cambiar la lógica para
 * que la use también el prerenderizado de build (`carta-ssg.ts`) y no existan
 * dos implementaciones que puedan divergir.
 *
 * Precedencia, de mayor a menor:
 *   1. columna dedicada `campo_{idioma}` (p. ej. `nombre_en`)
 *   2. `traducciones[idioma][campo]` (mecanismo antiguo, vivo en 8 filas)
 *   3. el valor base en castellano
 */
import type { Language } from "@/i18n/types";

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

export const normalizeAlergenos = (value: unknown): string[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return value ? [value] : [];
    }
  }
  return [];
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
  const columnAlergenosOficiales = (item as any)[`alergenos_oficiales_${language}`];
  const columnAlergenosInferidos = (item as any)[`alergenos_inferidos_${language}`];
  const columnAlergenosNotas = (item as any)[`alergenos_notas_${language}`];

  if (language === "es") {
    return {
      ...item,
      displayNombre: item.nombre,
      displayCategoria: item.categoria,
      displayDescripcion: item.descripcion,
      displayIngredientes: normalizeIngredientes((item as any).ingredientes),
      displayAlergenosOficiales: item.alergenos_oficiales,
      displayAlergenosInferidos: item.alergenos_inferidos,
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

  return {
    ...item,
    displayNombre: columnName || translation?.nombre || item.nombre,
    displayCategoria: columnCategoria || translation?.categoria || item.categoria,
    displayDescripcion: columnDescripcion ?? translation?.descripcion ?? item.descripcion,
    displayIngredientes: normalizeIngredientes(
      columnIngredientes ?? translationIngredientes ?? (item as any).ingredientes,
    ),
    displayAlergenosOficiales: normalizeAlergenos(
      columnAlergenosOficiales ?? translationAlergenosOficiales ?? item.alergenos_oficiales,
    ),
    displayAlergenosInferidos: normalizeAlergenos(
      columnAlergenosInferidos ?? translationAlergenosInferidos ?? item.alergenos_inferidos,
    ),
    displayAlergenosNotas:
      columnAlergenosNotas ?? translationAlergenosNotas ?? item.alergenos_notas,
    translatedCategoria: columnCategoria || translation?.categoria || null,
  };
}
