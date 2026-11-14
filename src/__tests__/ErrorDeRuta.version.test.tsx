/**
 * Página que no carga al navegar (`errorElement` de las rutas, `ErrorDeRuta`).
 *
 * Bug que protege (13/11/2026): sin `errorElement`, react-router pintaba su
 * pantalla de desarrollador («Unexpected Application Error!») y el fallo no
 * llegaba a Super Admin › Logs. Si es por versión antigua y no se puede
 * recargar sola, el aviso «Hay una versión nueva de la web · Toca para
 * actualizar» (en el idioma de la URL); si no, «No se pudo cargar esta página».
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import ErrorDeRuta from "@/components/ErrorDeRuta";
import { CLAVE_MARCA, _reiniciarRecarga } from "@/lib/recarga-por-version";
import { _reiniciarRegistro, conectarEmisor, type DatosActividad } from "@/lib/actividad/registro";
import { quitarCargadores } from "@/lib/router-cliente";

const VERSION = new TypeError("Failed to fetch dynamically imported module: https://x/assets/Categoria-Crjz1JUy.js");

async function montar(destino: string, fallo: Error) {
  const router = createMemoryRouter(
    [
      { path: "/", element: <p>Portada</p>, errorElement: <ErrorDeRuta /> },
      { path: "/carta/carnes", lazy: () => Promise.reject(fallo), errorElement: <ErrorDeRuta /> },
      { path: "/en/carta/carnes", lazy: () => Promise.reject(fallo), errorElement: <ErrorDeRuta /> },
    ],
    { initialEntries: ["/"] },
  );
  render(<RouterProvider router={router} />);
  await act(() => router.navigate(destino));
  return router;
}

const publicada = (build: string) =>
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ version: "1.11.0", build }) })));

let recibidos: Array<[string, DatosActividad]>;
beforeEach(() => {
  (window as Window & { __VITE_REACT_SSG_HASH__?: string }).__VITE_REACT_SSG_HASH__ = "vieja";
  recibidos = [];
  conectarEmisor((tipo, datos) => recibidos.push([tipo, datos]));
});
afterEach(() => {
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
  delete (window as Window & { __VITE_REACT_SSG_HASH__?: string }).__VITE_REACT_SSG_HASH__;
  _reiniciarRecarga();
  _reiniciarRegistro();
});

describe("ErrorDeRuta", () => {
  it("versión antigua que ya se intentó recargar: aviso de versión nueva, sin el flotante, y a Logs con su marca", async () => {
    window.sessionStorage.setItem(CLAVE_MARCA, "nueva");
    publicada("nueva");
    await montar("/carta/carnes", VERSION);
    expect(await screen.findByText("Hay una versión nueva de la web")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Toca para actualizar" })).toBeTruthy();
    expect(screen.queryByText(/Unexpected Application Error/)).toBeNull();
    expect(document.getElementById("aviso-version-nueva")).toBeNull();
    await waitFor(() => expect(recibidos).toHaveLength(1));
    expect(recibidos[0][0]).toBe("error_react");
    expect(recibidos[0][1]).toMatchObject({ accion: "aviso_version_nueva", props: { componente: "ruta" } });
  });

  it("en inglés en /en", async () => {
    window.sessionStorage.setItem(CLAVE_MARCA, "nueva");
    publicada("nueva");
    await montar("/en/carta/carnes", VERSION);
    expect(await screen.findByText("There's a new version of the website")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tap to update" })).toBeTruthy();
  });

  it("sin versión nueva publicada: «No se pudo cargar esta página» y no recarga sola", async () => {
    publicada("vieja");
    await montar("/carta/carnes", VERSION);
    expect(await screen.findByText("No se pudo cargar esta página.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Recargar página" })).toBeTruthy();
    await waitFor(() => expect(recibidos[0]?.[1]).toMatchObject({ accion: "sin_version_nueva" }));
  });

  it("otro error: el mensaje normal y a Logs al momento, sin preguntar por la versión", async () => {
    const pedir = vi.fn();
    vi.stubGlobal("fetch", pedir);
    await montar("/carta/carnes", new Error("x is undefined"));
    expect(await screen.findByText("No se pudo cargar esta página.")).toBeTruthy();
    await waitFor(() => expect(recibidos).toHaveLength(1));
    expect(recibidos[0][1]).toMatchObject({ props: { componente: "ruta" }, error: { mensaje: "Error: x is undefined" } });
    expect(recibidos[0][1]).not.toHaveProperty("accion");
    expect(pedir).not.toHaveBeenCalled();
  });
});

describe("router del navegador sin los cargadores estáticos de vite-react-ssg", () => {
  it("quita `loader` de todas las rutas (anidadas incluidas) y deja lo demás", () => {
    const cargar = async () => null;
    const rutas = quitarCargadores([
      { id: "0", path: "/", loader: cargar, children: [{ id: "0-0", index: true, loader: cargar }, { id: "0-1", path: "carta", loader: cargar, children: [{ id: "0-1-0", path: ":c", loader: cargar }] }] },
    ]);
    const conCargador = (rs: typeof rutas): boolean => rs.some((r) => "loader" in r || (r.children ? conCargador(r.children) : false));
    expect(conCargador(rutas)).toBe(false);
    expect(rutas[0].children?.[1].children?.[0]).toEqual({ id: "0-1-0", path: ":c" });
    expect(rutas[0].children?.[0]).toEqual({ id: "0-0", index: true });
  });
});
