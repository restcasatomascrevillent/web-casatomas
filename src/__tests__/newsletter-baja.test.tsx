/**
 * Página /newsletter/baja y su contrato con la Edge Function newsletter-baja
 * en modo JSON (src/lib/newsletter-baja.ts).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { leerParametrosBaja, urlFuncionBaja, normalizarRespuestaBaja, llamarBaja, ErrorConexionBaja } from "@/lib/newsletter-baja";

vi.mock("@/components/Seo", () => ({ Seo: () => null }));

const SID = "11111111-2222-3333-4444-555555555555";
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

describe("lib newsletter-baja", () => {
  it("lee los parámetros firmados", () => {
    expect(leerParametrosBaja(`?sid=${SID}&via=body&sig=abc`)).toEqual({ sid: SID, via: "body", sig: "abc" });
    expect(leerParametrosBaja(`?sid=${SID}&via=header&sig=abc`)?.via).toBe("header");
    expect(leerParametrosBaja(`?sid=no-uuid&sig=abc`)).toBeNull();
    expect(leerParametrosBaja(`?sid=${SID}`)).toBeNull();
  });

  it("llama a la función en modo JSON", () => {
    const url = urlFuncionBaja({ sid: SID, via: "body", sig: "a_b-c" });
    expect(url).toMatch(/\/functions\/v1\/newsletter-baja\?/);
    expect(url).toContain("formato=json");
    expect(url).toContain(`sid=${SID}`);
  });

  it("valida la respuesta", () => {
    expect(normalizarRespuestaBaja({ estado: "confirmar", email: "a@b.c" })).toEqual({ estado: "confirmar", email: "a@b.c", fechaBaja: null });
    expect(normalizarRespuestaBaja("<html>")).toBeNull();
  });

  it("GET para consultar, POST para confirmar; ErrorConexionBaja sin red", async () => {
    const f = vi.fn().mockImplementation(async () => json({ estado: "confirmar", email: "a@b.c" }));
    await llamarBaja("consultar", { sid: SID, via: "body", sig: "s" }, f);
    expect(f.mock.calls[0][1].method).toBe("GET");
    await llamarBaja("confirmar", { sid: SID, via: "body", sig: "s" }, f);
    expect(f.mock.calls[1][1].method).toBe("POST");
    await expect(llamarBaja("consultar", { sid: SID, via: "body", sig: "s" }, vi.fn().mockRejectedValue(new Error()))).rejects.toBeInstanceOf(
      ErrorConexionBaja,
    );
  });
});

describe("<NewsletterBaja />", () => {
  const original = window.location;
  beforeEach(() => {
    Object.defineProperty(window, "location", { configurable: true, value: { ...original, search: `?sid=${SID}&via=body&sig=abc` } });
  });
  afterEach(() => {
    Object.defineProperty(window, "location", { configurable: true, value: original });
    vi.unstubAllGlobals();
  });

  it("pide confirmación y solo da de baja tras el clic", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(json({ estado: "confirmar", email: "ana@example.com" }))
      .mockResolvedValueOnce(json({ estado: "baja_hecha", email: "ana@example.com", fecha_baja: "2026-09-24T10:00:00Z" }));
    vi.stubGlobal("fetch", f);
    const { default: NewsletterBaja } = await import("@/pages/NewsletterBaja");
    render(
      <MemoryRouter>
        <NewsletterBaja />
      </MemoryRouter>,
    );
    expect(await screen.findByRole("heading", { name: "¿Seguro que quieres darte de baja?" })).toBeInTheDocument();
    expect(f).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "Confirmar baja" }));
    expect(await screen.findByRole("heading", { name: "Te echaremos de menos" })).toBeInTheDocument();
    expect(f.mock.calls[1][1].method).toBe("POST");
  });
});
