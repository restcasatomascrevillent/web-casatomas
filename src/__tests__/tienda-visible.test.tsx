/**
 * Tienda apagada en el panel («Visible en la web» de Panel › Tienda, petición
 * del dueño del 10/11/2026): la web quita «Tienda» del menú, del pie y de la
 * tarjeta de cheques regalo. Solo un `activa: false` explícito la quita; sin
 * dato se enseña como siempre. La semilla del build (`tiendaVisibleEnBuild`)
 * sigue las mismas reglas.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { tiendaVisibleEnBuild } from "../../scripts/carta-ssg.mjs";

/** Respuesta de PostgREST a `configuracion_tienda` (`null` = red caída). */
function supabaseConTienda(filas: unknown[] | null) {
  vi.stubEnv("VITE_SUPABASE_URL", "https://supabase.test");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "clave-publica");
  const fetch = vi.fn(async (url: string) => {
    if (filas === null) throw new TypeError("Failed to fetch");
    expect(url).toContain("/rest/v1/configuracion_tienda");
    return new Response(JSON.stringify(filas), { status: 200, headers: { "Content-Type": "application/json" } });
  });
  vi.stubGlobal("fetch", fetch);
  // El estado del hook vive en el módulo: cada test empieza con uno nuevo.
  vi.resetModules();
  return fetch;
}

async function pintarWeb(url = "/regala") {
  const Header = (await import("@/components/Header")).default;
  const Footer = (await import("@/components/Footer")).default;
  const ContactoSection = (await import("@/components/ContactoSection")).default;
  const { LanguageProvider } = await import("@/i18n/LanguageProvider");
  return render(
    <MemoryRouter initialEntries={[url]}>
      <LanguageProvider initialLanguage="es">
        <Header />
        <ContactoSection modo="regalo" />
        <Footer />
      </LanguageProvider>
    </MemoryRouter>,
  );
}

const enlacesTienda = (container: HTMLElement) => container.querySelectorAll('a[href="/tienda"]');

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("enlaces a la tienda según el panel", () => {
  it("apagada en el panel: sin «Tienda» en el menú, en el pie ni en la tarjeta de cheques regalo", async () => {
    const fetch = supabaseConTienda([{ id: true, activa: false }]);
    const { container } = await pintarWeb();
    await waitFor(() => expect(enlacesTienda(container)).toHaveLength(0));
    expect(container.querySelector("header nav")).not.toBeNull();
    expect(screen.queryByRole("heading", { name: "Tienda de vinos" })).not.toBeInTheDocument();
    // El resto del pie sigue igual.
    expect(container.querySelector('footer a[href="/carta"]')).not.toBeNull();
    // Una sola lectura para los tres sitios.
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("encendida: «Tienda» en el menú, en el pie y en la tarjeta de cheques regalo", async () => {
    supabaseConTienda([{ id: true, activa: true }]);
    const { container } = await pintarWeb();
    await waitFor(() => expect(container.querySelector('header a[href="/tienda"]')).not.toBeNull());
    expect(container.querySelector('footer a[href="/tienda"]')).not.toBeNull();
    expect(within(container).getByRole("link", { name: "Ver la tienda" })).toHaveAttribute("href", "/tienda");
  });

  it.each([
    ["sin fila", []],
    ["sin red", null],
  ] as const)("%s: se enseñan como siempre (solo un «apagada» explícito los quita)", async (_caso, filas) => {
    const fetch = supabaseConTienda(filas as unknown[] | null);
    const { container } = await pintarWeb();
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    // Sin red: el reintento también falla y se queda la semilla.
    if (filas === null) await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(container.querySelector('header a[href="/tienda"]')).not.toBeNull();
    expect(container.querySelector('footer a[href="/tienda"]')).not.toBeNull();
  });
});

describe("semilla del build (`virtual:carta-ssg/tienda-visible`)", () => {
  it("false solo con `activa: false`; true con `activa: true`; null si no se pudo leer", () => {
    expect(tiendaVisibleEnBuild({ activa: false, descuento_pct: 30 })).toBe(false);
    expect(tiendaVisibleEnBuild({ activa: true })).toBe(true);
    expect(tiendaVisibleEnBuild({})).toBeNull();
    expect(tiendaVisibleEnBuild(null)).toBeNull();
    expect(tiendaVisibleEnBuild(undefined)).toBeNull();
  });
});
