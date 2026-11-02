import { tipoDesdeCategoria, tipoVino } from "@/lib/tipos-vino";
import type { Language } from "@/i18n/types";

/**
 * Filtros de la carta de vinos (tipo, denominación y buscador), en un solo
 * sitio: los usan la cuadrícula de fichas y el mapa, y los dos tienen que
 * enseñar siempre los mismos vinos.
 */

export interface VinoFiltrable {
  nombre: string;
  categoria?: string;
  nombre_en?: string;
  nombre_fr?: string;
}

export interface FiltroVinos {
  /**
   * Lo que marcan las barras de la carta: `"Todos"`, un tipo (`"tipo:tinto"`)
   * o una denominación (la `categoria` real, p. ej. `"VINOS TINTOS — RIOJA"`).
   */
  categoria: string;
  /** Texto del buscador, ya con su retraso (`useDebouncedValue`). */
  busqueda: string;
  language: Language;
}

/** El nombre que ve el visitante: el del idioma de la página si existe. */
export function nombreVinoVisible(vino: VinoFiltrable, language: Language): string {
  const traducido = language === "es" ? undefined : vino[`nombre_${language}`];
  return (typeof traducido === "string" && traducido) || vino.nombre;
}

export function cumpleCategoria(vino: Pick<VinoFiltrable, "categoria">, categoria: string): boolean {
  const tipo = tipoDesdeCategoria(categoria);
  if (tipo) return tipo === "todos" || tipoVino(vino.categoria) === tipo;
  return categoria === "Todos" || vino.categoria === categoria;
}

export function cumpleBusqueda(vino: VinoFiltrable, busqueda: string, language: Language): boolean {
  return !busqueda || nombreVinoVisible(vino, language).toLowerCase().includes(busqueda.toLowerCase());
}

/** `false` en el estado inicial (Todos y buscador vacío): nada filtrado. */
export function hayFiltroVinos(categoria: string, busqueda: string): boolean {
  return categoria !== "Todos" || busqueda !== "";
}

/**
 * Los vinos que pasan los filtros, en su orden. Sin filtros devuelve la MISMA
 * lista (no una copia): quien dependa de su identidad —el mapa reconstruye sus
 * marcadores si cambia— no recalcula nada en el estado inicial.
 */
export function filtrarVinos<T extends VinoFiltrable>(vinos: T[], { categoria, busqueda, language }: FiltroVinos): T[] {
  if (!hayFiltroVinos(categoria, busqueda)) return vinos;
  return vinos.filter(vino => cumpleCategoria(vino, categoria) && cumpleBusqueda(vino, busqueda, language));
}
