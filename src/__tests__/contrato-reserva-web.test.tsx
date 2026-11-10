/**
 * CONTRATO web <-> backend de POST /reservas-web/crear (lado WEB).
 *
 * `contratos/reserva-web-crear.contrato.json` vive duplicado, byte a byte
 * igual, en adminpanelct
 * (supabase/functions/reservas-web/__tests__/contrato/reserva-web-crear.contrato.json),
 * donde otro test comprueba que la Edge Function ACEPTA esos cuerpos (201,
 * `consentimiento_newsletter` y `condiciones_aceptadas_at`). Aquí se comprueba
 * que el formulario ENVÍA exactamente esos cuerpos: mismos campos, mismos
 * nombres, mismos tipos y mismos valores (salvo `fecha`, que sale del
 * calendario y se compara solo por formato).
 *
 * Si cambias el formulario y este test se rompe, NO ajustes el fixture solo
 * aquí: cámbialo en los dos repos y comprueba que la función sigue
 * aceptándolo (ver `_LEEME` del JSON).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { ReservationForm } from "@/components/ReservationForm";
import esPack from "@/i18n/languages/es";
import { RESERVAS_WEB_CREAR_URL, RESERVAS_WEB_DISPONIBILIDAD_URL } from "@/lib/supabase-functions";
import type { DisponibilidadHueco } from "@/lib/reservas-web";

vi.setConfig({ testTimeout: 20_000 });

type Cuerpo = Record<string, unknown>;
interface Contrato {
  _LEEME: string[];
  version: number;
  endpoint: string;
  tipos: Record<string, "string" | "number" | "boolean">;
  casos: Record<"con_newsletter" | "sin_newsletter", { descripcion: string; cuerpo: Cuerpo }>;
}

// Los tests se lanzan desde la raíz del repo (como el resto de la suite).
const CONTRATO = JSON.parse(
  readFileSync(path.resolve(process.cwd(), "src/__tests__/contratos/reserva-web-crear.contrato.json"), "utf8"),
) as Contrato;

const EXITO = esPack.translations.reservationForm.successTitle;

/**
 * "Ahora" FIJO de la prueba (miércoles 14-oct-2026, 12:00 hora local).
 *
 * `ReservationForm` deshabilita las fechas anteriores a `new Date()` y el
 * calendario abre en el mes en curso. Con la fecha real, el último día de un
 * mes que cae en domingo (31-ene-2027, 28-feb-2027, 31-oct-2027, 30-abr-2028,
 * 31-dic-2028…) deja a `es` (semana desde el lunes) sin ningún día
 * seleccionable en la cuadrícula. Esta prueba comprueba que el cuerpo enviado
 * es el del contrato, no el calendario: se fija solo `Date` (sin falsear
 * temporizadores, que romperían `waitFor`, `userEvent` y los toasts) a mitad
 * de mes. Hora LOCAL para que el día sea el mismo en cualquier zona horaria;
 * no la cambies por un fin de mes. Mismo patrón que
 * `reservas-idiomas.test.tsx`.
 */
const AHORA = new Date(2026, 9, 14, 12);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(AHORA);
  vi.stubGlobal("fetch", vi.fn());
  vi.stubGlobal(
    "ResizeObserver",
    vi.fn(() => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() })),
  );
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function hueco(hora: string, fecha: string): DisponibilidadHueco {
  return {
    kind: "hueco",
    fecha,
    hora,
    turno: "comida",
    nivel: 0,
    minutos_nivel: 60,
    etiqueta_nivel: "hora en punto",
    umbral_nivel: 0,
    estado: "libre",
    ofrecido: true,
    motivo: null,
    periodo: "Comida",
    abierto_por: null,
    abierto_con_porcentaje: null,
    promovido: false,
    comensales_hora: 0,
    reservas_hora: 0,
    porcentaje_hora: 0,
    porcentaje_para_umbral: 0,
    capacidad_maxima: 80,
    capacidad_disponible: 80,
    porcentaje_ocupacion: 0,
  };
}

/** `/disponibilidad` con un único hueco libre a la hora del contrato; `/crear` responde 201. */
function mockFuncion(cuerpo: Cuerpo) {
  const fecha = String(cuerpo.fecha);
  vi.mocked(fetch).mockImplementation((url) => {
    const destino = String(url);
    if (destino === RESERVAS_WEB_DISPONIBILIDAD_URL) {
      return Promise.resolve(
        new Response(
          JSON.stringify([
            { kind: "meta", fecha, cerrado: false, aforo_turno: {}, total_periodos: 1, total_ocupacion: 0 },
            {
              kind: "periodo",
              fecha,
              nombre_periodo: "Comida",
              hora_inicio: "13:00",
              hora_fin: "16:00",
              intervalo_base_minutos: 60,
              umbral_apertura_secundario: 0,
              dias_semana: [],
              ocultar_primario_si_secundario: false,
            },
            hueco(String(cuerpo.hora), fecha),
          ]),
          { status: 200 },
        ),
      );
    }
    if (destino === RESERVAS_WEB_CREAR_URL) {
      return Promise.resolve(new Response(JSON.stringify({ ok: true, reserva_id: "r-contrato", estado: "pendiente" }), { status: 201 }));
    }
    return Promise.reject(new Error(`URL inesperada en el test: ${destino}`));
  });
}

/** Rellena el formulario con los valores del contrato, como lo haría un visitante. */
async function rellenarComoElContrato(user: ReturnType<typeof userEvent.setup>, cuerpo: Cuerpo) {
  render(
    <MemoryRouter>
      <LanguageProvider>
        <Toaster />
        <ReservationForm />
      </LanguageProvider>
    </MemoryRouter>,
  );
  await waitFor(() => screen.getByPlaceholderText("+34 612345678"));

  const comensales = screen.getByRole("spinbutton");
  await user.clear(comensales);
  await user.type(comensales, String(cuerpo.numero_comensales));

  // El calendario no deja elegir una fecha concreta del fixture: se coge el
  // último día seleccionable y la fecha se compara solo por formato.
  await user.click(screen.getByText(/selecciona una fecha/i).closest("button")!);
  const dias = await waitFor(() => {
    const d = Array.from(document.querySelectorAll<HTMLButtonElement>('button[name="day"]:not([disabled])'));
    if (d.length === 0) throw new Error("el calendario no ofrece días seleccionables");
    return d;
  });
  await user.click(dias[dias.length - 1]);
  await user.click(screen.getByRole("button", { name: /comprobar disponibilidad/i }));
  await user.click(await screen.findByRole("button", { name: String(cuerpo.hora) }));

  await user.type(screen.getByRole("textbox", { name: /nombre/i }), String(cuerpo.nombre));
  // El campo viene precargado con "+34 ": se escribe solo el resto.
  const telefono = screen.getByPlaceholderText("+34 612345678");
  await user.clear(telefono);
  await user.type(telefono, String(cuerpo.telefono));
  await user.type(screen.getByRole("textbox", { name: /email/i }), String(cuerpo.email));
  if (cuerpo.notas_cliente) {
    await user.type(screen.getByRole("textbox", { name: /peticiones/i }), String(cuerpo.notas_cliente));
  }

  if (cuerpo.acepta_condiciones === true) {
    await user.click(screen.getByRole("checkbox", { name: /acepto las condiciones de reserva/i }));
  }
  if (cuerpo.consentimiento_newsletter === true) {
    await user.click(screen.getByRole("checkbox", { name: /newsletter de casa tom/i }));
  }
}

function cuerpoEnviado(): Cuerpo {
  const llamada = vi.mocked(fetch).mock.calls.find(([url]) => String(url) === RESERVAS_WEB_CREAR_URL);
  expect(llamada, "el formulario no llamó a reservas-web/crear").toBeDefined();
  const init = llamada![1] as RequestInit;
  expect(init.method).toBe("POST");
  return JSON.parse(String(init.body));
}

describe("contrato reservas-web/crear — el fixture", () => {
  it("apunta a la acción de la Edge Function que usa el formulario", () => {
    expect(CONTRATO.endpoint).toBe("POST /functions/v1/reservas-web/crear");
    expect(RESERVAS_WEB_CREAR_URL.endsWith("/functions/v1/reservas-web/crear")).toBe(true);
  });

  it("el _LEEME señala la copia del otro repo donde vivirá tras fusionar (adminpanelct)", () => {
    const leeme = CONTRATO._LEEME.join(" ");
    expect(leeme).toContain("adminpanelct/supabase/functions/reservas-web/__tests__/contrato/reserva-web-crear.contrato.json");
    expect(leeme).toContain("src/__tests__/contratos/reserva-web-crear.contrato.json");
    // Nunca el nombre del worktree temporal: tras fusionar ya no existe.
    expect(leeme).not.toContain("adminpanelct-integracion");
  });

  it("cada caso tiene exactamente los campos de `tipos` y con esos tipos", () => {
    for (const caso of Object.values(CONTRATO.casos)) {
      expect(Object.keys(caso.cuerpo).sort()).toEqual(Object.keys(CONTRATO.tipos).sort());
      for (const [campo, tipo] of Object.entries(CONTRATO.tipos)) expect(typeof caso.cuerpo[campo], campo).toBe(tipo);
    }
  });
});

describe("contrato reservas-web/crear — el formulario envía EXACTAMENTE el cuerpo del contrato", () => {
  it.each(Object.entries(CONTRATO.casos))("caso %s", async (_nombre, caso) => {
    mockFuncion(caso.cuerpo);
    const user = userEvent.setup();
    await rellenarComoElContrato(user, caso.cuerpo);

    await user.click(screen.getByRole("button", { name: /reservar ahora/i }));
    await screen.findByText(EXITO);

    // `origen` (cómo se hizo la reserva) es telemetría opcional, fuera del contrato.
    const { origen, ...enviado } = cuerpoEnviado();
    expect(origen === undefined || typeof origen === "object").toBe(true);
    expect(enviado.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Mismas claves, mismos tipos y mismos valores; nada de más ni de menos.
    expect({ ...enviado, fecha: caso.cuerpo.fecha }).toEqual(caso.cuerpo);
    for (const [campo, tipo] of Object.entries(CONTRATO.tipos)) expect(typeof enviado[campo], campo).toBe(tipo);
  });
});
