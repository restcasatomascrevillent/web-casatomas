import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot, type Root } from "react-dom/client";
import { saveConsent, useMapsConsent } from "@/lib/cookie-consent";

/**
 * `useMapsConsent` y la hidratación: el SSG pinta sin consentimiento (Node no
 * tiene `localStorage`) y el primer render del navegador debe coincidir con ese
 * HTML aunque el visitante ya hubiera aceptado el mapa. El caso de verdad, con
 * el build real, está en `e2e/hidratacion-consentimiento.e2e.ts`.
 */

const Sonda = () => <p>{useMapsConsent() ? "mapa" : "aviso"}</p>;

const limpiar = () => {
  localStorage.clear();
  document.cookie = "cookie_consent=; Max-Age=0; Path=/";
};

const montados: { root: Root; contenedor: HTMLElement }[] = [];
afterEach(async () => {
  for (const { root, contenedor } of montados.splice(0)) {
    await act(async () => root.unmount());
    contenedor.remove();
  }
  vi.restoreAllMocks();
  saveConsent(false); // borra la elección que un test haya dejado solo en memoria
  limpiar();
});

/** Prerenderiza sin nada guardado (como el SSG) y luego hidrata con el almacén que haya en ese momento. */
async function hidratar() {
  limpiar();
  const html = renderToString(<Sonda />);
  const contenedor = document.createElement("div");
  contenedor.innerHTML = html;
  document.body.append(contenedor);
  return { html, contenedor };
}

async function conectar(contenedor: HTMLElement) {
  const errores: unknown[] = [];
  let root!: Root;
  await act(async () => {
    root = hydrateRoot(contenedor, <Sonda />, { onRecoverableError: (e) => errores.push(e) });
  });
  montados.push({ root, contenedor });
  return errores;
}

describe("useMapsConsent", () => {
  it("el prerender siempre es «sin mapa», aunque haya consentimiento guardado", () => {
    saveConsent(true);
    expect(renderToString(<Sonda />)).toContain("aviso");
  });

  it("con el consentimiento ya guardado, hidrata sin errores y pasa a «mapa» sin que nadie pulse nada", async () => {
    const { html, contenedor } = await hidratar();
    expect(html).toContain("aviso");
    localStorage.setItem("cookieConsent", JSON.stringify({ maps: true, ts: new Date().toISOString() }));
    const errores = await conectar(contenedor);
    expect(errores).toEqual([]);
    expect(contenedor.textContent).toBe("mapa");
  });

  it("con el consentimiento solo en la cookie también hidrata sin errores", async () => {
    const { contenedor } = await hidratar();
    document.cookie = `cookie_consent=${encodeURIComponent(JSON.stringify({ maps: true, ts: "2026-01-01T00:00:00.000Z" }))}; Path=/`;
    const errores = await conectar(contenedor);
    expect(errores).toEqual([]);
    expect(contenedor.textContent).toBe("mapa");
  });

  it("sin consentimiento hidrata sin errores y se mantiene en «aviso»", async () => {
    const { contenedor } = await hidratar();
    const errores = await conectar(contenedor);
    expect(errores).toEqual([]);
    expect(contenedor.textContent).toBe("aviso");
  });

  it("sigue los cambios hechos en la misma pestaña (aceptar y revocar)", async () => {
    const { contenedor } = await hidratar();
    await conectar(contenedor);
    await act(async () => saveConsent(true));
    expect(contenedor.textContent).toBe("mapa");
    await act(async () => saveConsent(false));
    expect(contenedor.textContent).toBe("aviso");
  });

  it("con localStorage y cookies bloqueados, aceptar enseña el mapa mientras no se recargue", async () => {
    const { contenedor } = await hidratar();
    await conectar(contenedor);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    vi.spyOn(document, "cookie", "set").mockImplementation(() => {});
    vi.spyOn(document, "cookie", "get").mockReturnValue("");
    await act(async () => saveConsent(true));
    expect(contenedor.textContent).toBe("mapa");
  });
});
