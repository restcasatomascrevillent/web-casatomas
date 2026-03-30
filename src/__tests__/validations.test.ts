/**
 * Tests for src/lib/validations.ts — createReservationSchema
 *
 * These tests run against the Zod schema directly, without rendering any React
 * component. They are fast, pure, and cover all field constraints.
 */

import { describe, it, expect } from "vitest";
import { createReservationSchema } from "@/lib/validations";

// ---------------------------------------------------------------------------
// Validation messages (Spanish)
// ---------------------------------------------------------------------------
const messages = {
  nameMin: "El nombre debe tener al menos 2 caracteres",
  nameMax: "El nombre no puede superar los 100 caracteres",
  phoneInvalid: "Introduce un teléfono válido con prefijo (p. ej. +34 612345678)",
  emailInvalid: "Introduce un email válido",
  emailMax: "El email no puede superar los 255 caracteres",
  dateRequired: "Selecciona una fecha",
  guestsMin: "Mínimo 1 comensal",
  guestsMax: "Máximo 20 comensales",
  notesMax: "Las notas no pueden superar los 500 caracteres",
};

const schema = createReservationSchema(messages);

// Helper: build a valid base object so individual tests only override one field.
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

const VALID_BASE = {
  nombre: "Ana García",
  telefono: "+34 612345678",
  email: "ana@example.com",
  fecha: tomorrow,
  numero_comensales: 2,
  notas_cliente: "",
};

const parse = (data: object) => schema.safeParse(data);

// ---------------------------------------------------------------------------
// nombre
// ---------------------------------------------------------------------------

describe("Validation — nombre", () => {
  it("accepts a name with 2 characters (minimum)", () => {
    const result = parse({ ...VALID_BASE, nombre: "Ab" });
    expect(result.success).toBe(true);
  });

  it("accepts a name with 100 characters (maximum)", () => {
    const result = parse({ ...VALID_BASE, nombre: "A".repeat(100) });
    expect(result.success).toBe(true);
  });

  it("rejects a name shorter than 2 characters", () => {
    const result = parse({ ...VALID_BASE, nombre: "A" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues[0].message;
      expect(msg).toBe(messages.nameMin);
    }
  });

  it("rejects a name longer than 100 characters", () => {
    const result = parse({ ...VALID_BASE, nombre: "A".repeat(101) });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues[0].message;
      expect(msg).toBe(messages.nameMax);
    }
  });

  it("trims surrounding whitespace before validation (2 real chars pass)", () => {
    const result = parse({ ...VALID_BASE, nombre: "  AB  " });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// telefono
// ---------------------------------------------------------------------------

describe("Validation — telefono (formato español)", () => {
  const validNumbers = [
    "+34 612345678",
    "+34612345678",
    "+1 2025551234",
    "+44 7700900123",
    "+33 123456789",
  ];

  validNumbers.forEach((phone) => {
    it(`accepts valid phone: ${phone}`, () => {
      const result = parse({ ...VALID_BASE, telefono: phone });
      expect(result.success).toBe(true);
    });
  });

  const invalidNumbers = [
    "612345678",          // without international prefix
    "0034 612345678",     // 00 prefix instead of +
    "+34",                // prefix only, no number
    "+34 123",            // too short local part (< 6 digits)
    "phone number",       // non-numeric
    "",                   // empty
    "+34 61 23 45 67 8",  // with spaces in local part (not matching the regex)
  ];

  invalidNumbers.forEach((phone) => {
    it(`rejects invalid phone: "${phone}"`, () => {
      const result = parse({ ...VALID_BASE, telefono: phone });
      expect(result.success).toBe(false);
      if (!result.success) {
        const msg = result.error.issues[0].message;
        expect(msg).toBe(messages.phoneInvalid);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// email
// ---------------------------------------------------------------------------

describe("Validation — email", () => {
  it("accepts a valid email address", () => {
    expect(parse({ ...VALID_BASE, email: "user@domain.com" }).success).toBe(true);
  });

  it("rejects an email without @ symbol", () => {
    const result = parse({ ...VALID_BASE, email: "notanemail" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(messages.emailInvalid);
    }
  });

  it("rejects an email longer than 255 characters", () => {
    const longEmail = `${"a".repeat(250)}@b.com`;
    const result = parse({ ...VALID_BASE, email: longEmail });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(messages.emailMax);
    }
  });
});

// ---------------------------------------------------------------------------
// fecha
// ---------------------------------------------------------------------------

describe("Validation — fecha", () => {
  it("accepts a future date", () => {
    expect(parse({ ...VALID_BASE, fecha: tomorrow }).success).toBe(true);
  });

  it("rejects when fecha is missing", () => {
    const { fecha: _omit, ...withoutFecha } = VALID_BASE;
    const result = parse(withoutFecha);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(messages.dateRequired);
    }
  });

  it("rejects a non-Date value in fecha", () => {
    const result = parse({ ...VALID_BASE, fecha: "2026-01-01" });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// numero_comensales
// ---------------------------------------------------------------------------

describe("Validation — numero_comensales", () => {
  it("accepts 1 (minimum)", () => {
    expect(parse({ ...VALID_BASE, numero_comensales: 1 }).success).toBe(true);
  });

  it("accepts 20 (maximum)", () => {
    expect(parse({ ...VALID_BASE, numero_comensales: 20 }).success).toBe(true);
  });

  it("rejects 0 (below minimum)", () => {
    const result = parse({ ...VALID_BASE, numero_comensales: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(messages.guestsMin);
    }
  });

  it("rejects 21 (above maximum)", () => {
    const result = parse({ ...VALID_BASE, numero_comensales: 21 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(messages.guestsMax);
    }
  });

  it("rejects a string value", () => {
    const result = parse({ ...VALID_BASE, numero_comensales: "dos" });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// notas_cliente (optional)
// ---------------------------------------------------------------------------

describe("Validation — notas_cliente (optional)", () => {
  it("accepts undefined (optional field)", () => {
    const { notas_cliente: _omit, ...withoutNotes } = { ...VALID_BASE, notas_cliente: undefined };
    expect(parse(withoutNotes).success).toBe(true);
  });

  it("accepts an empty string", () => {
    expect(parse({ ...VALID_BASE, notas_cliente: "" }).success).toBe(true);
  });

  it("accepts text up to 500 characters", () => {
    expect(parse({ ...VALID_BASE, notas_cliente: "A".repeat(500) }).success).toBe(true);
  });

  it("rejects notes longer than 500 characters", () => {
    const result = parse({ ...VALID_BASE, notas_cliente: "A".repeat(501) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(messages.notesMax);
    }
  });
});

// ---------------------------------------------------------------------------
// Full valid object
// ---------------------------------------------------------------------------

describe("Validation — full valid reservation", () => {
  it("parses a complete valid object successfully", () => {
    const result = parse(VALID_BASE);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nombre).toBe("Ana García");
      expect(result.data.numero_comensales).toBe(2);
    }
  });
});
