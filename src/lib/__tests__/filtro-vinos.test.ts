import { describe, expect, it } from "vitest";
import { cumpleCategoria, filtrarVinos, hayFiltroVinos, nombreVinoVisible } from "../filtro-vinos";

const VINOS = [
  { nombre: "Ribera Crianza", nombre_en: "Ribera Aged", nombre_fr: "Ribera Élevé", categoria: "VINOS TINTOS — RIBERA DEL DUERO" },
  { nombre: "Rioja Reserva", nombre_en: null, nombre_fr: "", categoria: "VINOS TINTOS — RIOJA" },
  { nombre: "Rioja Blanco", categoria: "VINOS BLANCOS — RIOJA" },
  { nombre: "Albariño", categoria: "VINOS BLANCOS — ALBARIÑO (Rías Baixas)" },
  { nombre: "Champagne Brut", categoria: "CHAMPAGNES" },
  { nombre: "Sin categoría" },
] as Parameters<typeof filtrarVinos>[0];

const nombres = (vinos: { nombre: string }[]) => vinos.map(vino => vino.nombre);
const filtro = (categoria: string, busqueda = "", language: "es" | "en" | "fr" = "es") => ({ categoria, busqueda, language });

describe("filtrarVinos", () => {
  it("sin filtros devuelve la misma lista, sin copiarla", () => {
    expect(filtrarVinos(VINOS, filtro("Todos"))).toBe(VINOS);
    expect(hayFiltroVinos("Todos", "")).toBe(false);
  });

  it("filtra por tipo, agrupando todas las denominaciones del tipo", () => {
    expect(nombres(filtrarVinos(VINOS, filtro("tipo:tinto")))).toEqual(["Ribera Crianza", "Rioja Reserva"]);
    expect(nombres(filtrarVinos(VINOS, filtro("tipo:blanco")))).toEqual(["Rioja Blanco", "Albariño"]);
    expect(nombres(filtrarVinos(VINOS, filtro("tipo:espumoso")))).toEqual(["Champagne Brut"]);
    expect(nombres(filtrarVinos(VINOS, filtro("tipo:otro")))).toEqual(["Sin categoría"]);
    expect(hayFiltroVinos("tipo:tinto", "")).toBe(true);
  });

  it("filtra por denominación: la categoría exacta, no el tipo", () => {
    expect(nombres(filtrarVinos(VINOS, filtro("VINOS TINTOS — RIOJA")))).toEqual(["Rioja Reserva"]);
    expect(nombres(filtrarVinos(VINOS, filtro("VINOS BLANCOS — RIOJA")))).toEqual(["Rioja Blanco"]);
  });

  it("busca por nombre sin distinguir mayúsculas", () => {
    expect(nombres(filtrarVinos(VINOS, filtro("Todos", "RIOJA")))).toEqual(["Rioja Reserva", "Rioja Blanco"]);
    expect(hayFiltroVinos("Todos", "rioja")).toBe(true);
  });

  it("combina tipo, denominación y búsqueda", () => {
    expect(nombres(filtrarVinos(VINOS, filtro("tipo:tinto", "rioja")))).toEqual(["Rioja Reserva"]);
    expect(nombres(filtrarVinos(VINOS, filtro("VINOS TINTOS — RIOJA", "ribera")))).toEqual([]);
  });

  it("busca por el nombre del idioma de la página y cae al español si no hay traducción", () => {
    expect(nombres(filtrarVinos(VINOS, filtro("Todos", "aged", "en")))).toEqual(["Ribera Crianza"]);
    expect(nombres(filtrarVinos(VINOS, filtro("Todos", "élevé", "fr")))).toEqual(["Ribera Crianza"]);
    // Sin `nombre_en` (null) ni `nombre_fr` (vacío) vale el nombre en español.
    expect(nombres(filtrarVinos(VINOS, filtro("Todos", "reserva", "en")))).toEqual(["Rioja Reserva"]);
    expect(nombres(filtrarVinos(VINOS, filtro("Todos", "reserva", "fr")))).toEqual(["Rioja Reserva"]);
    // En inglés ya no se busca por el nombre español traducido.
    expect(nombres(filtrarVinos(VINOS, filtro("Todos", "crianza", "en")))).toEqual([]);
  });

  it("conserva el orden y no modifica la lista de entrada", () => {
    const copia = [...VINOS];
    filtrarVinos(VINOS, filtro("tipo:blanco"));
    expect(VINOS).toEqual(copia);
  });
});

describe("nombreVinoVisible y cumpleCategoria", () => {
  it("nombreVinoVisible usa la traducción solo si existe", () => {
    expect(nombreVinoVisible(VINOS[0], "es")).toBe("Ribera Crianza");
    expect(nombreVinoVisible(VINOS[0], "en")).toBe("Ribera Aged");
    expect(nombreVinoVisible(VINOS[1], "fr")).toBe("Rioja Reserva");
  });

  it("«tipo:todos» no excluye a nadie", () => {
    expect(VINOS.every(vino => cumpleCategoria(vino, "tipo:todos"))).toBe(true);
  });
});
