import { describe, expect, it } from "vitest";
import { resolverUrlSitio } from "../../supabase/functions/_shared/cheques-regalo/origen";
import { autorizarLlamada } from "../../supabase/functions/limpiar-fotos-novedades/auth";

const OFICIAL = "https://casa.example.es";

describe("cheques-regalo-web · resolverUrlSitio (CT-REM-FN-08)", () => {
  it("un Origin ajeno redirige al dominio oficial", () => {
    expect(resolverUrlSitio("https://evil.tld", undefined, OFICIAL)).toBe(OFICIAL);
    expect(resolverUrlSitio("https://evil.tld", "https://web.example.es", OFICIAL)).toBe(OFICIAL);
    expect(resolverUrlSitio("https://casa.example.es.evil.tld", undefined, OFICIAL)).toBe(OFICIAL);
  });
  it("el origen oficial se mantiene", () => {
    expect(resolverUrlSitio("https://casa.example.es", undefined, OFICIAL + "/")).toBe(OFICIAL);
  });
  it("un origen de la lista permitida (separada por comas) se respeta", () => {
    const lista = "https://web.example.es, https://staging.example.es/";
    expect(resolverUrlSitio("https://staging.example.es", lista, OFICIAL)).toBe("https://staging.example.es");
  });
  it("el comodín * no abre la redirección", () => {
    expect(resolverUrlSitio("https://evil.tld", "*", OFICIAL)).toBe(OFICIAL);
  });
  it("sin Origin o con Origin no válido usa el oficial", () => {
    expect(resolverUrlSitio(null, undefined, OFICIAL)).toBe(OFICIAL);
    expect(resolverUrlSitio("javascript:alert(1)", undefined, OFICIAL)).toBe(OFICIAL);
    expect(resolverUrlSitio("null", undefined, OFICIAL)).toBe(OFICIAL);
  });
});

describe("limpiar-fotos-novedades · autorizarLlamada (CT-REM-FN-11)", () => {
  it("sin secreto configurado responde 500 (fail-closed)", () => {
    expect(autorizarLlamada(undefined, "x")).toMatchObject({ ok: false, status: 500 });
    expect(autorizarLlamada("", null)).toMatchObject({ ok: false, status: 500 });
  });
  it("sin cabecera o con cabecera incorrecta responde 401", () => {
    expect(autorizarLlamada("secreto-1", null)).toMatchObject({ ok: false, status: 401 });
    expect(autorizarLlamada("secreto-1", "secreto-2")).toMatchObject({ ok: false, status: 401 });
  });
  it("con el secreto correcto pasa", () => {
    expect(autorizarLlamada("secreto-1", "secreto-1")).toEqual({ ok: true });
  });
});
