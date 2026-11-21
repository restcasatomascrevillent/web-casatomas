import { describe, expect, it, vi } from "vitest";
import type { RouteRecord } from "vite-react-ssg";
import { routes } from "@/App";
import { direccionCanonica, irADireccionCanonica } from "@/lib/direccion-canonica";

/**
 * `/Carta`, `/carta/Vinos`, `/carta//vinos`: Vercel sirve otro HTML del que
 * monta el router del navegador (que no distingue mayúsculas) y React rompe la
 * hidratación (#418/#422/#423). Visto apretando la web en producción el
 * 21/11/2026. La prueba de verdad, con el `404.html` del build, está en
 * `e2e/direccion-canonica.e2e.ts`.
 */

describe("direccionCanonica", () => {
  it.each([
    ["/Carta", "/carta"],
    ["/CARTA", "/carta"],
    ["/carta/Vinos", "/carta/vinos"],
    ["/En/carta", "/en/carta"],
    ["/carta//vinos", "/carta/vinos"],
    ["//carta", "/carta"],
    ["/carta/", "/carta"],
    ["/Reservas/", "/reservas"],
    ["/carta/%e2%9c%93", "/carta/%E2%9C%93"],
  ])("%s → %s", (entrada, esperada) => {
    expect(direccionCanonica(entrada)).toBe(esperada);
  });

  it.each(["/", "/carta", "/en/carta/vinos", "/fr", "/reserva/respuesta", "/carta/%E2%9C%93", "/404"])(
    "deja igual la que ya es canónica: %s",
    (canonica) => {
      expect(direccionCanonica(canonica)).toBe(canonica);
    },
  );

  it("es idempotente (sin bucles de redirección)", () => {
    for (const d of ["/Carta//Vinos/", "/EN//", "/carta/%c3%91ANDU", "///"]) {
      expect(direccionCanonica(direccionCanonica(d))).toBe(direccionCanonica(d));
    }
  });
});

describe("irADireccionCanonica", () => {
  const ubicacion = (pathname: string, search = "", hash = "") => ({ pathname, search, hash, replace: vi.fn() });
  const almacen = () => {
    const datos = new Map<string, string>();
    return { getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, v: string) => void datos.set(k, v) };
  };

  it("en una dirección canónica no hace nada", () => {
    const u = ubicacion("/carta/vinos");
    expect(irADireccionCanonica(u, almacen())).toBe(false);
    expect(u.replace).not.toHaveBeenCalled();
  });

  it("va a la canónica conservando la búsqueda y el ancla tal cual (con sus mayúsculas)", () => {
    const u = ubicacion("/Reserva/Respuesta", "?token=AbC123", "#Arriba");
    expect(irADireccionCanonica(u, almacen())).toBe(true);
    expect(u.replace).toHaveBeenCalledWith("/reserva/respuesta?token=AbC123#Arriba");
  });

  it("una sola vez por dirección y pestaña: si vuelve a la mala, se queda y monta", () => {
    const a = almacen();
    expect(irADireccionCanonica(ubicacion("/Carta"), a)).toBe(true);
    const otraVez = ubicacion("/Carta");
    expect(irADireccionCanonica(otraVez, a)).toBe(false);
    expect(otraVez.replace).not.toHaveBeenCalled();
    // Otra dirección distinta sí va.
    expect(irADireccionCanonica(ubicacion("/Contacto"), a)).toBe(true);
  });

  it("sin almacenamiento (o si falla) también va", () => {
    expect(irADireccionCanonica(ubicacion("/Carta"), null)).toBe(true);
    const roto = { getItem: () => { throw new Error("SecurityError"); }, setItem: () => { throw new Error("SecurityError"); } };
    const u = ubicacion("/Carta");
    expect(irADireccionCanonica(u, roto)).toBe(true);
    expect(u.replace).toHaveBeenCalledWith("/carta");
  });

  it("si el navegador no deja ir, devuelve false (se monta como siempre)", () => {
    const u = ubicacion("/Carta");
    u.replace.mockImplementation(() => { throw new Error("no"); });
    expect(irADireccionCanonica(u, almacen())).toBe(false);
  });
});

describe("las rutas de la web son canónicas", () => {
  // Si alguna llevara mayúsculas, la web la mandaría a su versión en minúsculas.
  const caminos = (rs: RouteRecord[], base = ""): string[] =>
    rs.flatMap((r) => {
      const propio = r.path ? (r.path.startsWith("/") ? r.path : `${base.replace(/\/$/, "")}/${r.path}`) : base;
      return [propio, ...(r.children ? caminos(r.children as RouteRecord[], propio) : [])];
    });

  it("ninguna ruta lleva mayúsculas ni barras dobles", () => {
    const todas = caminos(routes).filter((c) => c && !c.includes("*") && !c.includes(":"));
    expect(todas.length).toBeGreaterThan(20);
    for (const c of todas) expect(direccionCanonica(c)).toBe(c);
  });
});
