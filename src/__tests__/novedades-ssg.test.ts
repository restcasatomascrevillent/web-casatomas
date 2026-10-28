/**
 * `scripts/novedades-ssg.mjs`: lo que el build guarda de cada novedad para el
 * HTML prerenderizado de la portada.
 *
 * Bug que evita: sin `botones`, `menu` y `plato_id` en `CAMPOS_SALIDA`, el
 * HTML estático salía sin los botones y aparecían de golpe al refrescar en
 * vivo (criterio 6: «los botones salen ya en el HTML prerenderizado»).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchNovedadesSSG } from "../../scripts/novedades-ssg.mjs";

const MENU = { version: 1, incluye_bebidas: false, secciones: { primero: [{ id: "a", nombre: "Sopa" }] } };

describe("novedades-ssg — campos de los botones", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("conserva botones, menu y plato_id; un botones vacío se compacta (se lee «sin botones»)", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: "1", titulo: "Navidad", botones: ["ver_menu", "llamar"], menu: MENU, plato_id: null, created_by: "x" },
        { id: "2", titulo: "Plato", botones: ["ver_plato"], menu: null, plato_id: "12" },
        { id: "3", titulo: "De siempre", botones: [], menu: null, plato_id: null },
      ],
    });
    vi.stubGlobal("fetch", fetch);

    const { novedades } = await fetchNovedadesSSG({ url: "https://demo.supabase.co/", key: "anon" });

    expect(fetch.mock.calls[0][0]).toContain("/rest/v1/novedades?select=*");
    expect(novedades).toEqual([
      { id: "1", titulo: "Navidad", botones: ["ver_menu", "llamar"], menu: MENU },
      { id: "2", titulo: "Plato", botones: ["ver_plato"], plato_id: "12" },
      { id: "3", titulo: "De siempre" },
    ]);
  });
});
