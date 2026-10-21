import { afterEach, expect, it, vi } from "vitest";
import { act } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MenuDiarioCards from "@/components/espacios/MenuDiarioCards";
import { LanguageProvider } from "@/i18n/LanguageProvider";

vi.mock("@/hooks/useVisibilidadMenuTapas", () => ({ useVisibilidadMenuTapas: () => ({ menu: true, tapas: true }) }));
afterEach(() => vi.useRealTimers());

it("un build del domingo se hidrata el jueves sin reemplazar el HTML", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  client.setQueryData(["menus_diarios", "es"], []);
  client.setQueryData(["tapas", "es"], []);
  const app = <QueryClientProvider client={client}><LanguageProvider initialLanguage="es"><MenuDiarioCards /></LanguageProvider></QueryClientProvider>;
  vi.setSystemTime(new Date("2026-10-18T12:00:00Z"));
  const html = renderToString(app);
  vi.setSystemTime(new Date("2026-10-21T22:30:00Z")); // Ya es jueves en Madrid.
  expect(renderToString(app)).toBe(html);
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.append(container);
  const errores: unknown[] = [];
  let root: ReturnType<typeof hydrateRoot>;
  await act(async () => { root = hydrateRoot(container, app, { onRecoverableError: e => errores.push(e) }); });
  expect(errores).toEqual([]);
  expect(container.textContent).toMatch(/tapas/i);
  await act(async () => root.unmount());
  container.remove();
  client.clear();
});
