/**
 * Martes a jueves en la comida, quien reserva en la web ELIGE «Menú del día» o
 * «A la carta» (obligatorio). Fuera de ese hueco la elección no aparece y no
 * viaja `menu_del_dia`. En el payload: true = menú, false = carta.
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
const respuestaDisponibilidad = () =>
  new Response(
    JSON.stringify([
      {
        kind: "meta",
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

const opcionMenu = () => screen.getByRole("radio", { name: TEXTOS.menuOCartaMenu });
const opcionCarta = () => screen.getByRole("radio", { name: TEXTOS.menuOCartaCarta });
const grupo = () => screen.queryByRole("group", { name: new RegExp(TEXTOS.menuOCartaLegend.replace("?", "\\?")) });

describe("ReservationForm — menú del día o carta (martes a jueves, comida)", () => {
  it("martes a mediodía: aparecen las dos opciones, sin ninguna marcada, con la nota de salas", async () => {
    const user = userEvent.setup();
    renderForm();
    await elegirDia(user, MARTES);
    await user.click(await screen.findByRole("button", { name: "13:00" }));

    expect(grupo()).not.toBeNull();
    expect(opcionMenu()).not.toBeChecked();
    expect(opcionCarta()).not.toBeChecked();
    expect(screen.getByText(TEXTOS.menuOCartaNote)).toBeInTheDocument();
  });

  it("martes por la noche y viernes a mediodía: la elección no aparece", async () => {
    const user = userEvent.setup();
    renderForm();
    await elegirDia(user, MARTES);
    await user.click(await screen.findByRole("button", { name: "21:00" }));
    expect(grupo()).toBeNull();

    await elegirDia(user, VIERNES);
    await user.click(await screen.findByRole("button", { name: "13:00" }));
    expect(grupo()).toBeNull();
  });

  it("es obligatoria: sin elegir no se envía y sale el error en el campo", async () => {
    const user = userEvent.setup();
    renderForm();
    await elegirDia(user, MARTES);
    await user.click(await screen.findByRole("button", { name: "13:00" }));
    await rellenarDatos(user);
    await user.click(screen.getByRole("button", { name: /reservar ahora/i }));

    const error = await screen.findByText(TEXTOS.menuOCartaError);
    expect(error).toHaveAttribute("role", "alert");
    expect(grupo()).toHaveAttribute("aria-invalid", "true");
    expect(grupo()!.getAttribute("aria-describedby")).toContain(error.id);
    expect(cuerpoCrear()).toBeUndefined();

    // Al elegir, el error se va y ya se envía.
    await user.click(opcionCarta());
    expect(screen.queryByText(TEXTOS.menuOCartaError)).toBeNull();
    await user.click(screen.getByRole("button", { name: /reservar ahora/i }));
    await waitFor(() => expect(cuerpoCrear()).toBeDefined());
  });

  it("menú del día: envía menu_del_dia:true", async () => {
    const user = userEvent.setup();
    renderForm();
    await elegirDia(user, MARTES);
    await user.click(await screen.findByRole("button", { name: "13:00" }));
    await rellenarDatos(user);
    await user.click(opcionMenu());
    await user.click(screen.getByRole("button", { name: /reservar ahora/i }));

    await waitFor(() => expect(cuerpoCrear()).toBeDefined());
    expect(cuerpoCrear()!.menu_del_dia).toBe(true);
  });

  it("a la carta: envía menu_del_dia:false", async () => {
    const user = userEvent.setup();
    renderForm();
    await elegirDia(user, MARTES);
    await user.click(await screen.findByRole("button", { name: "13:00" }));
    await rellenarDatos(user);
    await user.click(opcionCarta());
    await user.click(screen.getByRole("button", { name: /reservar ahora/i }));

    await waitFor(() => expect(cuerpoCrear()).toBeDefined());
    expect(cuerpoCrear()!.menu_del_dia).toBe(false);
  });

  it("fuera del hueco no viaja menu_del_dia, y la elección se borra al cambiar a la cena", async () => {
    const user = userEvent.setup();
    renderForm();
    await elegirDia(user, MARTES);
    await user.click(await screen.findByRole("button", { name: "13:00" }));
    await user.click(opcionMenu());
    await user.click(screen.getByRole("button", { name: "21:00" }));
    expect(grupo()).toBeNull();

    // Vuelve a la comida: la elección anterior no se conserva.
    await user.click(screen.getByRole("button", { name: "13:00" }));
    expect(opcionMenu()).not.toBeChecked();

    await user.click(screen.getByRole("button", { name: "21:00" }));
    await rellenarDatos(user);
    await user.click(screen.getByRole("button", { name: /reservar ahora/i }));
    await waitFor(() => expect(cuerpoCrear()).toBeDefined());
    expect(cuerpoCrear()).not.toHaveProperty("menu_del_dia");
  });
});

describe("textos de la elección en los tres idiomas", () => {
  it.each([
    ["es", esPack],
    ["en", enPack],
    ["fr", frPack],
  ])("%s tiene leyenda, opciones, nota y error", (_idioma, pack) => {
    const r = pack.translations.reservationForm;
    for (const texto of [r.menuOCartaLegend, r.menuOCartaMenu, r.menuOCartaCarta, r.menuOCartaNote, r.menuOCartaError]) {
      expect(typeof texto).toBe("string");
      expect(texto.length).toBeGreaterThan(0);
    }
  });
});
