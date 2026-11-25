import { describe, expect, it } from "vitest";
import { conFondoDePrueba, elegirVariante, esDominioDemo, urlFotoPrueba } from "@/lib/fondo-prueba";
import { esFotoCarta, resolverImagen } from "@/lib/carta-ssg";

const ID = "0621b106-3b12-4d0c-96e0-8a5f06ef444f";
const ORIGEN = "https://web-casatomas-git-staging-casa-tomas.vercel.app";

describe("fondo de prueba (solo demo)", () => {
  it("solo se activa en el dominio de la rama staging de Vercel", () => {
    expect(esDominioDemo("web-casatomas-git-staging-casa-tomas.vercel.app")).toBe(true);
    expect(esDominioDemo("web-casatomas.vercel.app")).toBe(false);
    expect(esDominioDemo("restaurantecasatomascrevillente.es")).toBe(false);
    expect(esDominioDemo("web-casatomas-git-release-1150-casa-tomas.vercel.app")).toBe(false);
    expect(esDominioDemo("evil.com/-git-staging-x.vercel.app")).toBe(false);
  });

  it("elige la variante del parámetro, `no` la quita y, sin parámetro, la recordada", () => {
    expect(elegirVariante("?fondo=a", null)).toBe("a");
    expect(elegirVariante("?fondo=C", "a")).toBe("c");
    expect(elegirVariante("?fondo=no", "b")).toBeNull();
    expect(elegirVariante("?fondo=zzz", "b")).toBeNull();
    expect(elegirVariante("", "b")).toBe("b");
    expect(elegirVariante("", "otra")).toBeNull();
    expect(elegirVariante("?otro=1", null)).toBeNull();
  });

  it("cambia la foto solo de los platos con versión de prueba", () => {
    const platos = [
      { id: ID, imagen_url: "https://x.supabase.co/storage/v1/object/public/platos/a-carta-webp.webp" },
      { id: "sin-version", imagen_url: "https://x.supabase.co/storage/v1/object/public/platos/b-carta-webp.webp" },
      { id: ID.replace("0621", "9999") },
    ];
    const ids = new Set([ID]);
    const r = conFondoDePrueba(platos, "b", ids, ORIGEN);
    expect(r[0].imagen_url).toBe(`${ORIGEN}/previews-fondos/img/b/${ID}-carta-webp.webp`);
    expect(r[1]).toBe(platos[1]);
    expect(r[2]).toBe(platos[2]);
  });

  it("sin variante o sin lista de ids devuelve los mismos platos", () => {
    const platos = [{ id: ID, imagen_url: "https://x/y.webp" }];
    expect(conFondoDePrueba(platos, null, new Set([ID]), ORIGEN)).toBe(platos);
    expect(conFondoDePrueba(platos, "a", null, ORIGEN)).toBe(platos);
    expect(conFondoDePrueba(platos, "a", new Set(), ORIGEN)).toBe(platos);
  });

  it("la URL de prueba cuenta como foto de carta (sticker) y la web la deja tal cual", () => {
    const url = urlFotoPrueba(ID, "c", ORIGEN);
    expect(esFotoCarta(url)).toBe(true);
    expect(resolverImagen(url, "https://x.supabase.co")).toBe(url);
  });
});
