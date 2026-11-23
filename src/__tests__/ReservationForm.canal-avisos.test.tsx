/**
 * Avisos por WhatsApp (prueba de concepto, 21/11/2026): si `reservas-web`
 * anuncia `avisos_whatsapp: true` en la disponibilidad, el formulario deja
 * elegir «Por email» o «Por WhatsApp» (email por defecto) y, con WhatsApp,
 * manda `canal_avisos: "whatsapp"`. Sin el anuncio (producción hoy) el
 * selector no aparece y no viaja nada nuevo.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { ReservationForm } from "@/components/ReservationForm";
import esPack from "@/i18n/languages/es";
import enPack from "@/i18n/languages/en";
import frPack from "@/i18n/languages/fr";
import type { DisponibilidadHueco } from "@/lib/reservas-web";
import { RESERVAS_WEB_CREAR_URL, RESERVAS_WEB_DISPONIBILIDAD_URL } from "@/lib/supabase-functions";
import { Toaster } from "sonner";

vi.setConfig({ testTimeout: 15_000 });

/** Miércoles 14-oct-2026 a mediodía (hora local), igual que el resto de pruebas del formulario. */
const AHORA = new Date(2026, 9, 14, 12);
/** Martes 20-oct-2026: día de menú del día. */
const MARTES = "20";
/** Viernes 23-oct-2026: sin menú del día. */
const VIERNES = "23";

const TEXTOS = esPack.translations.reservationForm;

function hueco(hora: string, turno: "comida" | "cena"): DisponibilidadHueco {
  return {
    kind: "hueco",
    fecha: "2026-10-20",
    hora,
    turno,
    nivel: 0,
    minutos_nivel: 60,
    etiqueta_nivel: "hora en punto",
    umbral_nivel: 0,
    estado: "libre",
    ofrecido: true,
    motivo: null,
    periodo: turno === "comida" ? "Comida" : "Cena",
    abierto_por: null,
    abierto_con_porcentaje: null,
    promovido: false,
    comensales_hora: 0,
    reservas_hora: 0,
    porcentaje_hora: 0,
    porcentaje_para_umbral: 0,
    capacidad_maxima: 80,
    capacidad_disponible: 72,
    porcentaje_ocupacion: 10,
  };
}

/** `/disponibilidad`: meta + periodo (si no, se clasifica como cerrado) + huecos de comida y cena. */
let avisosWhatsApp = false;
const respuestaDisponibilidad = () =>
  new Response(
    JSON.stringify([
      {
        kind: "meta",
        ...(avisosWhatsApp ? { avisos_whatsapp: true } : {}),
        fecha: "2026-10-20",
        cerrado: false,
        aforo_turno: {
          comida: { capacidad_maxima: 80, ocupacion: 0, disponible: 80 },
          cena: { capacidad_maxima: 80, ocupacion: 0, disponible: 80 },
        },
        total_periodos: 1,
        total_ocupacion: 0,
      },
      {
        kind: "periodo",
        fecha: "2026-10-20",
        nombre_periodo: "Comida",
        hora_inicio: "13:00",
        hora_fin: "23:30",
        intervalo_base_minutos: 60,
        umbral_apertura_secundario: 0,
        dias_semana: [],
        ocultar_primario_si_secundario: false,
      },
      hueco("13:00", "comida"),
      hueco("21:00", "cena"),
    ]),
    { status: 200 },
  );

function mockReservas() {
  vi.mocked(fetch).mockImplementation((url) => {
    const destino = String(url);
    if (destino === RESERVAS_WEB_DISPONIBILIDAD_URL) return Promise.resolve(respuestaDisponibilidad());
    if (destino === RESERVAS_WEB_CREAR_URL) {
      return Promise.resolve(
        new Response(JSON.stringify({ ok: true, reserva_id: "r1", estado: "pendiente" }), { status: 201 }),
      );
    }
    // Cierres y demás: sin respuesta útil, el formulario usa su regla por defecto.
    return Promise.resolve(new Response("{}", { status: 500 }));
  });
}

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
  avisosWhatsApp = false;
  mockReservas();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

function renderForm() {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <Toaster />
        <ReservationForm />
      </LanguageProvider>
    </MemoryRouter>,
  );
}

type Usuario = ReturnType<typeof userEvent.setup>;

/** Elige un día del mes en curso (no los de fuera del mes) y comprueba la disponibilidad. */
async function elegirDia(user: Usuario, dia: string) {
  // El disparador se nombra por su etiqueta («Fecha *»), con o sin fecha ya elegida.
  await user.click(await screen.findByRole("button", { name: /^fecha/i }));
  const boton = await waitFor(() => {
    const encontrado = Array.from(
      document.querySelectorAll<HTMLButtonElement>('button[name="day"]:not([disabled])'),
    ).find((b) => b.textContent === dia && !b.className.includes("day-outside"));
    if (!encontrado) throw new Error(`el calendario no ofrece el día ${dia}`);
    return encontrado;
  });
  await user.click(boton);
  await user.click(screen.getByRole("button", { name: /comprobar disponibilidad/i }));
}

async function rellenarDatos(user: Usuario) {
  await user.type(screen.getByRole("textbox", { name: /nombre/i }), "Marta Ruiz");
  await user.type(screen.getByPlaceholderText("+34 612345678"), "612345678");
  await user.type(screen.getByRole("textbox", { name: /email/i }), "marta@example.com");
  await user.click(screen.getByRole("checkbox", { name: /acepto las condiciones de reserva/i }));
}

function cuerpoCrear(): Record<string, unknown> | undefined {
  const llamada = vi.mocked(fetch).mock.calls.find(([url]) => String(url) === RESERVAS_WEB_CREAR_URL);
  return llamada ? JSON.parse(String(llamada[1]?.body)) : undefined;
}


const grupo = () => screen.queryByRole("group", { name: new RegExp(TEXTOS.avisosLegend.replace("?", "\\?").replace("¿", "")) });

describe("ReservationForm — canal de los avisos (email o WhatsApp)", () => {
  it("sin el anuncio del servidor: ni selector ni canal_avisos", async () => {
    const user = userEvent.setup();
    renderForm();
    await elegirDia(user, VIERNES);
    await user.click(await screen.findByRole("button", { name: "21:00" }));
    expect(grupo()).toBeNull();

    await rellenarDatos(user);
    await user.click(screen.getByRole("button", { name: /reservar ahora/i }));
    await waitFor(() => expect(cuerpoCrear()).toBeDefined());
    expect(cuerpoCrear()).not.toHaveProperty("canal_avisos");
  });

  it("con el anuncio: email marcado por defecto y, así, no viaja canal_avisos", async () => {
    avisosWhatsApp = true;
    const user = userEvent.setup();
    renderForm();
    await elegirDia(user, VIERNES);
    await user.click(await screen.findByRole("button", { name: "21:00" }));

    expect(grupo()).not.toBeNull();
    expect(screen.getByRole("radio", { name: TEXTOS.avisosEmail })).toBeChecked();
    expect(screen.getByRole("radio", { name: TEXTOS.avisosWhatsApp })).not.toBeChecked();
    expect(screen.queryByText(TEXTOS.avisosWhatsAppNote)).toBeNull();

    await rellenarDatos(user);
    await user.click(screen.getByRole("button", { name: /reservar ahora/i }));
    await waitFor(() => expect(cuerpoCrear()).toBeDefined());
    expect(cuerpoCrear()).not.toHaveProperty("canal_avisos");
  });

  it("eligiendo WhatsApp: sale la nota y se manda canal_avisos «whatsapp»", async () => {
    avisosWhatsApp = true;
    const user = userEvent.setup();
    renderForm();
    await elegirDia(user, VIERNES);
    await user.click(await screen.findByRole("button", { name: "21:00" }));
    await user.click(screen.getByRole("radio", { name: TEXTOS.avisosWhatsApp }));
    expect(screen.getByText(TEXTOS.avisosWhatsAppNote)).toBeInTheDocument();

    await rellenarDatos(user);
    await user.click(screen.getByRole("button", { name: /reservar ahora/i }));
    await waitFor(() => expect(cuerpoCrear()).toBeDefined());
    expect(cuerpoCrear()!.canal_avisos).toBe("whatsapp");
  });
});

describe("textos del canal de avisos en los tres idiomas", () => {
  it("existen y no están vacíos", () => {
    for (const pack of [esPack, enPack, frPack]) {
      const t = pack.translations.reservationForm;
      for (const clave of ["avisosLegend", "avisosEmail", "avisosWhatsApp", "avisosWhatsAppNote"] as const) {
        expect(t[clave].trim().length, clave).toBeGreaterThan(3);
      }
    }
  });
});
