import type { Language } from "@/i18n/types";

export const precioConocido = (precio: unknown): precio is number =>
  typeof precio === "number" && Number.isFinite(precio) && precio > 0;

export const CONSULTAR_PRECIO: Record<Language, string> = {
  es: "Consultar precio", en: "Ask for price", fr: "Prix sur demande",
};

export const mostrarPrecio = (precio: unknown, idioma: Language): string =>
  precioConocido(precio) ? `${precio}€` : CONSULTAR_PRECIO[idioma];
