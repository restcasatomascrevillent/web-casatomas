/**
 * Regresión del prefijo telefónico.
 *
 * El bug: `/^\+(\d{1,3})(\d{6,14})$/` es codicioso, así que "+34 612345678"
 * salía del formulario como "+346 12345678" y así se guardaba la reserva.
 */
import { describe, it, expect } from "vitest";
import { formatearTelefonoWebhook, partirTelefono } from "@/lib/phone";

describe("formatearTelefonoWebhook", () => {
  it("no se come un dígito del número español (el bug original)", () => {
    expect(formatearTelefonoWebhook("+34 612345678")).toBe("+34 612345678");
    expect(formatearTelefonoWebhook("+34 612345678")).not.toBe("+346 12345678");
  });

  it("acepta el número español escrito todo junto", () => {
    expect(formatearTelefonoWebhook("+34612345678")).toBe("+34 612345678");
  });

  it("acepta fijos españoles", () => {
    expect(formatearTelefonoWebhook("+34 966107887")).toBe("+34 966107887");
    expect(formatearTelefonoWebhook("+34966107887")).toBe("+34 966107887");
  });

  it("respeta espacios y guiones internos del número", () => {
    expect(formatearTelefonoWebhook("+34 612 34 56 78")).toBe("+34 612345678");
    expect(formatearTelefonoWebhook("+34-612-345-678")).toBe("+34 612345678");
  });

  it("respeta el prefijo que separó el visitante aunque no sea español", () => {
    expect(formatearTelefonoWebhook("+44 7911123456")).toBe("+44 7911123456");
    expect(formatearTelefonoWebhook("+33 612345678")).toBe("+33 612345678");
    expect(formatearTelefonoWebhook("+351 912345678")).toBe("+351 912345678");
  });

  it("reconoce prefijos de 1, 2 y 3 dígitos escritos sin separador", () => {
    expect(partirTelefono("+15551234567")).toEqual({ prefijo: "+1", numero: "5551234567" });
    expect(partirTelefono("+447911123456")).toEqual({ prefijo: "+44", numero: "7911123456" });
    expect(partirTelefono("+351912345678")).toEqual({ prefijo: "+351", numero: "912345678" });
  });

  it("devuelve el valor original cuando no puede partirlo, en vez de corromperlo", () => {
    expect(formatearTelefonoWebhook("612345678")).toBe("612345678");
    expect(formatearTelefonoWebhook("  no es un telefono ")).toBe("no es un telefono");
    expect(partirTelefono("")).toBeNull();
    expect(partirTelefono("+34 123")).toBeNull();
  });

  it("recorta espacios sobrantes", () => {
    expect(formatearTelefonoWebhook("  +34 612345678  ")).toBe("+34 612345678");
  });
});
