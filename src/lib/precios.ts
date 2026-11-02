import type { Language } from "@/i18n/types";

export const precioConocido = (precio: unknown): precio is number =>
  typeof precio === "number" && Number.isFinite(precio) && precio > 0;

export const CONSULTAR_PRECIO: Record<Language, string> = {
  es: "Consultar precio", en: "Ask for price", fr: "Prix sur demande",
};

/**
 * Un único formato de precio para es, en y fr: «24,50 €». La carta es de un
 * restaurante en España y cobra en euros; un inglés lee igual «24,50 €» en la
 * pizarra y en el ticket, así que la web no cambia a «€24.50» al traducir.
 * Siempre dos decimales; entre la cifra y el € va un espacio duro (U+00A0)
 * para que el símbolo no se quede solo en otra línea.
 */
const FORMATO_EUROS = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

export const formatearPrecio = (precio: number): string =>
  FORMATO_EUROS.format(Number.isFinite(precio) ? precio : 0);

export const mostrarPrecio = (precio: unknown, idioma: Language): string =>
  precioConocido(precio) ? formatearPrecio(precio) : CONSULTAR_PRECIO[idioma];
