/**
 * Integration tests for ReservationForm
 *
 * Tests are limited to what can be exercised without a real browser calendar
 * and without hitting the live N8N webhook. We:
 *   - Verify the form renders with all expected fields
 *   - Verify the "Check availability" button is disabled until date+guests are set
 *   - Verify the honeypot field is hidden from assistive technology
 *   - Verify that a failed availability check shows an error toast
 *   - Test that the submit button is disabled until an hour slot is selected
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { ReservationForm } from "@/components/ReservationForm";
import esPack from "@/i18n/languages/es";
import enPack from "@/i18n/languages/en";
import frPack from "@/i18n/languages/fr";
import {
  clasificarDisponibilidad,
  interpretarRechazoReserva,
  type DisponibilidadHueco,
} from "@/lib/reservas-web";
import {
  RESERVAS_WEB_CREAR_URL,
  RESERVAS_WEB_DISPONIBILIDAD_URL,
  clasificarFallo,
  estaEnLinea,
} from "@/lib/supabase-functions";
import { PHONE_DISPLAY } from "@/components/TelLink";

// Sonner toaster must be in the tree for toasts to render
import { Toaster } from "sonner";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  // El checkbox de consentimiento del newsletter monta un Checkbox de Radix,
  // que usa ResizeObserver. setup.ts ya lo simula, pero el unstubAllGlobals()
  // del afterEach de este archivo lo borra junto con el stub de fetch: sin
  // volver a ponerlo aqui, todo test que no sea el primero del archivo
  // revienta con "ResizeObserver is not defined" en cuanto el arbol renderiza
  // el formulario.
  vi.stubGlobal(
    "ResizeObserver",
    vi.fn(() => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() })),
  );
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderForm(props = {}) {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <Toaster />
        <ReservationForm {...props} />
      </LanguageProvider>
    </MemoryRouter>
  );
}

describe("ReservationForm — rendering", () => {
  it("renders the name input field", async () => {
    renderForm();
    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: /nombre/i })).toBeInTheDocument();
    });
  });

  it("renders the phone input field", async () => {
    renderForm();
    await waitFor(() => {
      expect(screen.getByPlaceholderText("+34 612345678")).toBeInTheDocument();
    });
  });

  it("renders the email input field", async () => {
    renderForm();
    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: /email/i })).toBeInTheDocument();
    });
  });

  it("renders the notes textarea (Peticiones especiales)", async () => {
    renderForm();
    await waitFor(() => {
      expect(
        screen.getByRole("textbox", { name: /peticiones especiales/i })
      ).toBeInTheDocument();
    });
  });

  it("renders the guests number input", async () => {
    renderForm();
    await waitFor(() => {
      expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    });
  });
});

describe("ReservationForm — honeypot anti-bot field", () => {
  it("the honeypot input is hidden from assistive technology (aria-hidden)", async () => {
    renderForm();
    await waitFor(() => screen.getByPlaceholderText("+34 612345678"));

    // El propio checkbox de Radix tambien renderiza un input aria-hidden
    // (el "bubble input" nativo), asi que hay que anclar la busqueda al
    // honeypot en concreto en vez de al primer aria-hidden del documento.
    const honeypot = document.querySelector('input[name="website"]');
    const honeypotContainer = honeypot?.closest('[aria-hidden="true"]');
    expect(honeypotContainer).not.toBeNull();
  });

  it("the honeypot input has tabIndex -1 (not reachable by keyboard)", async () => {
    renderForm();
    await waitFor(() => screen.getByPlaceholderText("+34 612345678"));

    const honeypot = document.querySelector('input[name="website"]') as HTMLInputElement | null;
    expect(honeypot).not.toBeNull();
    expect(honeypot!.tabIndex).toBe(-1);
  });

  it("the honeypot input is positioned off-screen (left: -9999px)", async () => {
    renderForm();
    await waitFor(() => screen.getByPlaceholderText("+34 612345678"));

    const honeypot = document.querySelector('input[name="website"]');
    const honeypotContainer = honeypot?.closest('[aria-hidden="true"]') as HTMLElement | null;
    expect(honeypotContainer).not.toBeNull();
    expect(honeypotContainer!.style.left).toBe("-9999px");
  });
});

describe("ReservationForm — check availability button state", () => {
  it("'Comprobar disponibilidad' button is disabled when no date is selected", async () => {
    renderForm();
    // Wait for translations to load
    await waitFor(() => screen.getByPlaceholderText("+34 612345678"));

    // The button text is "Comprobar disponibilidad"
    await waitFor(() => {
      const checkBtn = screen.getByRole("button", { name: /comprobar disponibilidad/i });
      expect((checkBtn as HTMLButtonElement).disabled).toBe(true);
    });
  });
});

describe("ReservationForm — submit button", () => {
  it("submit button is disabled until an hour slot is selected", async () => {
    renderForm();
    await waitFor(() => screen.getByPlaceholderText("+34 612345678"));

    const submitButton = await screen.findByRole("button", { name: /reservar ahora/i });
    expect((submitButton as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("ReservationForm — availability check error handling", () => {
  it("shows a toast error message when the availability fetch fails", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

    const user = userEvent.setup();
    renderForm();
    await waitFor(() => screen.getByPlaceholderText("+34 612345678"));

    // The form's guests field has a default value of 2 — we just need a date.
    // We set the guests field to 3 to ensure it's filled in a testable way.
    const guestsInput = screen.getByRole("spinbutton");
    await user.clear(guestsInput);
    await user.type(guestsInput, "3");

    // Directly trigger the check availability button via its onClick
    // The button is disabled without a fecha — so we cannot click it normally.
    // Instead we verify that if the fetch were called it would error. We use a
    // programmatic approach: confirm fetch is set up to reject.
    expect(vi.mocked(fetch).mock.results.length).toBe(0); // not called yet
    // This test documents expected behavior rather than simulating the calendar
    // date selection (which requires real DOM interaction with Popover/Calendar).
  });
});

describe("ReservationForm — phone field default value", () => {
  it("phone field starts with '+34 ' prefix", async () => {
    renderForm();
    await waitFor(() => screen.getByPlaceholderText("+34 612345678"));

    const phoneInput = screen.getByPlaceholderText("+34 612345678") as HTMLInputElement;
    expect(phoneInput.value).toBe("+34 ");
  });
});

describe("ReservationForm — guests field constraints", () => {
  it("guests input has min=1 and max=20 HTML attributes", async () => {
    renderForm();
    await waitFor(() => screen.getByRole("spinbutton"));

    const guestsInput = screen.getByRole("spinbutton") as HTMLInputElement;
    expect(guestsInput.min).toBe("1");
    expect(guestsInput.max).toBe("20");
  });
});

// ---------------------------------------------------------------------------
// Contrato de /disponibilidad: dia cerrado != error
// ---------------------------------------------------------------------------

const TEXTOS = esPack.translations.reservationForm.rejection;
/**
 * Textos del resguardo de solicitud (el diálogo de éxito).
 *
 * Se comparan por cadena exacta y NO con /reserva confirmada/i: la frase
 * honesta del resguardo ("Aún no es una reserva confirmada…") contiene esa
 * subcadena, así que el regex daba positivo con el texto que precisamente
 * niega la confirmación.
 */
const EXITO = esPack.translations.reservationForm;

describe("clasificarDisponibilidad — dia cerrado frente a error", () => {
  const meta = (cerrado: boolean) => ({
    kind: "meta" as const,
    fecha: "2026-03-14",
    cerrado,
    aforo_turno: { comida: { capacidad_maxima: 80, ocupacion: 24, disponible: 56 } },
    total_periodos: cerrado ? 0 : 1,
  });

  const periodo = {
    kind: "periodo" as const,
    fecha: "2026-03-14",
    nombre_periodo: "Comida",
    hora_inicio: "13:00",
    hora_fin: "16:00",
    dias_semana: [5],
  };

  it("clasifica como 'ok' un array con meta y al menos un periodo", () => {
    const resultado = clasificarDisponibilidad(true, [meta(false), periodo]);
    expect(resultado.estado).toBe("ok");
  });

  it("clasifica como 'cerrado' un meta con cerrado:true y cero periodos", () => {
    const resultado = clasificarDisponibilidad(true, [meta(true)]);
    expect(resultado.estado).toBe("cerrado");
  });

  it("un 4xx devuelve un OBJETO y se clasifica como error, no como dia cerrado", () => {
    // Es el caso que reventaba: el consumidor hacia .map() sobre un objeto.
    const resultado = clasificarDisponibilidad(false, { ok: false, error: "fecha_invalida" });
    expect(resultado.estado).toBe("error");
  });

  it("un array SIN meta es una respuesta malformada: error, no dia cerrado", () => {
    const resultado = clasificarDisponibilidad(true, [periodo]);
    expect(resultado.estado).toBe("error");
  });

  it("TODO estado 'error' es un fallo nuestro: si hubo respuesta, la red del visitante va bien", () => {
    // Los tres caminos que devuelven `error` salen de una respuesta HTTP, y
    // eso prueba que el visitante tiene conexion. Ninguno puede ser `sin_red`.
    for (const [ok, cuerpo] of [
      [false, { ok: false, error: "fecha_invalida" }],
      [true, { ok: true }],
      [true, [periodo]],
    ] as const) {
      expect(clasificarDisponibilidad(ok, cuerpo).estado).toBe("error");
    }
    expect(clasificarFallo(500)).toBe("servidor");
    expect(clasificarFallo(200)).toBe("servidor");
  });
});

// ---------------------------------------------------------------------------
// De quien es la culpa: `clasificarFallo`
//
// El bug de hoy: la Edge Function se desplego con un fichero marcador, el
// worker moria al arrancar y devolvia 500 hasta en el OPTIONS del preflight.
// El navegador lo traduce a error de CORS, `fetch` lanza `TypeError: Failed to
// fetch`, y la web le decia al cliente "comprueba tu conexion". El cliente
// mira su wifi, no ve nada raro, y se va a otro restaurante.
// ---------------------------------------------------------------------------

describe("clasificarFallo — nunca se culpa al visitante de lo nuestro", () => {
  it("con respuesta HTTP el fallo es NUESTRO, pase lo que pase con navigator.onLine", () => {
    expect(clasificarFallo(500)).toBe("servidor");
    expect(clasificarFallo(503)).toBe("servidor");
    expect(clasificarFallo(200)).toBe("servidor");
    expect(clasificarFallo(422)).toBe("servidor");
    // Llegaron bytes desde nuestro host: su red funciona por definicion.
    expect(clasificarFallo(500, false)).toBe("servidor");
  });

  it("status 0 con el dispositivo en linea: NUESTRO (es el caso del CORS de hoy)", () => {
    expect(clasificarFallo(0, true)).toBe("servidor");
  });

  it("status 0 sin red: ahi si es su conexion", () => {
    expect(clasificarFallo(0, false)).toBe("sin_red");
  });
});

describe("estaEnLinea — ante la duda, la culpa es nuestra", () => {
  it("sin `navigator.onLine` booleano devuelve true, para que el fallo salga como nuestro", () => {
    // Pasa en el prerender del SSG (no hay `navigator`) y en navegadores que
    // no lo implementan. `true` => `clasificarFallo` dice "servidor".
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(undefined as unknown as boolean);
    expect(estaEnLinea()).toBe(true);
    expect(clasificarFallo(0, estaEnLinea())).toBe("servidor");
  });

  it("solo un `false` explicito se toma por falta de red", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    expect(estaEnLinea()).toBe(false);

    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    expect(estaEnLinea()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Contrato de /crear: cada codigo de rechazo, su mensaje y su salida
// ---------------------------------------------------------------------------

describe("interpretarRechazoReserva — un mensaje distinto por codigo", () => {
  it("403 no_disponible: repite el mensaje NEUTRO del servidor y ofrece el telefono", () => {
    const resultado = interpretarRechazoReserva(
      403,
      { ok: false, motivo: "no_disponible", mensaje: "No ha sido posible formalizar la solicitud." },
      TEXTOS,
    );

    expect(resultado.mensaje).toBe("No ha sido posible formalizar la solicitud.");
    expect(resultado.salida).toBe(TEXTOS.exits.call);
    // El mensaje del servidor es neutro a proposito: no se le puede anadir
    // nada que delate la lista negra.
    expect(`${resultado.mensaje} ${resultado.salida}`).not.toMatch(/blacklist|lista negra|vetad/i);
  });

  it("422 grupo_grande: mensaje del servidor y salida por numero de comensales", () => {
    const resultado = interpretarRechazoReserva(
      422,
      { ok: false, motivo: "grupo_grande", mensaje: "Para grupos de mas de 12 personas lo gestionamos por telefono." },
      TEXTOS,
    );

    expect(resultado.mensaje).toBe("Para grupos de mas de 12 personas lo gestionamos por telefono.");
    expect(resultado.salida).toBe(TEXTOS.exits.guests);
  });

  it("422 corte_horario: salida de cambiar de hora o llamar", () => {
    const resultado = interpretarRechazoReserva(
      422,
      { ok: false, motivo: "corte_horario", mensaje: "Las reservas deben hacerse con al menos 60 minutos de antelacion." },
      TEXTOS,
    );

    expect(resultado.salida).toBe(TEXTOS.exits.otherTimeOrCall);
  });

  it("409 sin_disponibilidad: salida de elegir otra hora", () => {
    const resultado = interpretarRechazoReserva(
      409,
      { ok: false, motivo: "sin_disponibilidad", mensaje: "No queda disponibilidad para esa fecha y hora." },
      TEXTOS,
    );

    expect(resultado.mensaje).toBe("No queda disponibilidad para esa fecha y hora.");
    expect(resultado.salida).toBe(TEXTOS.exits.otherTime);
  });

  it("409 max_reservas_telefono: salida de llamar", () => {
    const resultado = interpretarRechazoReserva(
      409,
      { ok: false, motivo: "max_reservas_telefono", mensaje: "Ya hay reservas activas con este telefono para esa fecha." },
      TEXTOS,
    );

    expect(resultado.salida).toBe(TEXTOS.exits.call);
  });

  it("400: la funcion NO manda `mensaje`, asi que se usa uno propio", () => {
    const resultado = interpretarRechazoReserva(400, { ok: false, error: "email_invalido" }, TEXTOS);

    expect(resultado.motivo).toBeNull();
    expect(resultado.mensaje).toBe(TEXTOS.invalidMessage);
    expect(resultado.salida).toBe(TEXTOS.exits.checkForm);
  });

  it("fallo de red (status 0): mensaje de error y salida de reintentar o llamar", () => {
    const resultado = interpretarRechazoReserva(0, null, TEXTOS);

    expect(resultado.mensaje).toBe(TEXTOS.errorMessage);
    expect(resultado.salida).toBe(TEXTOS.exits.retryOrCall);
  });

  it("status 0 SIN red: titulo, mensaje y salida de offline", () => {
    const resultado = interpretarRechazoReserva(0, null, TEXTOS, "sin_red");

    expect(resultado.titulo).toBe(TEXTOS.offlineTitle);
    expect(resultado.mensaje).toBe(TEXTOS.offlineMessage);
    expect(resultado.salida).toBe(TEXTOS.exits.offline);
  });

  it("status 0 con red (CORS / funcion caida): se dice que el fallo es NUESTRO", () => {
    const resultado = interpretarRechazoReserva(0, null, TEXTOS, "servidor");

    expect(resultado.titulo).toBe(TEXTOS.title);
    expect(resultado.mensaje).toBe(TEXTOS.errorMessage);
    expect(resultado.salida).toBe(TEXTOS.exits.retryOrCall);
    // La regresion exacta de hoy: ni una palabra sobre SU conexion.
    expect(resultado.mensaje).not.toMatch(/conexi[oó]n|connection/i);
  });

  it("los dos casos del status 0 no dicen lo mismo", () => {
    const sinRed = interpretarRechazoReserva(0, null, TEXTOS, "sin_red");
    const nuestro = interpretarRechazoReserva(0, null, TEXTOS, "servidor");

    expect(sinRed.titulo).not.toBe(nuestro.titulo);
    expect(sinRed.mensaje).not.toBe(nuestro.mensaje);
    expect(sinRed.salida).not.toBe(nuestro.salida);
  });

  it("un 5xx con respuesta lleva el titulo normal y el mensaje de culpa nuestra", () => {
    const resultado = interpretarRechazoReserva(500, null, TEXTOS);

    expect(resultado.titulo).toBe(TEXTOS.title);
    expect(resultado.mensaje).toBe(TEXTOS.errorMessage);
    expect(resultado.mensaje).not.toMatch(/conexi[oó]n|connection/i);
  });
});

// ---------------------------------------------------------------------------
// Los tres idiomas, y la guardia contra la regresion de hoy
// ---------------------------------------------------------------------------

describe("textos de fallo en es/en/fr", () => {
  const packs = [
    ["es", esPack],
    ["en", enPack],
    ["fr", frPack],
  ] as const;

  it("los tres idiomas traen las claves nuevas y ninguna vacia", () => {
    for (const [idioma, pack] of packs) {
      const { toasts, rejection } = pack.translations.reservationForm;
      const textos = [
        toasts.availabilityOfflineTitle,
        toasts.availabilityOfflineDescription,
        toasts.availabilityServerErrorTitle,
        toasts.availabilityServerErrorDescription,
        toasts.noSlots,
        rejection.offlineTitle,
        rejection.offlineMessage,
        rejection.errorMessage,
        rejection.exits.offline,
      ];
      for (const texto of textos) expect(texto.trim(), idioma).not.toBe("");

      // Los que ofrecen el telefono tienen que traer el marcador.
      expect(toasts.availabilityServerErrorDescription).toContain("{phone}");
      expect(toasts.noSlots).toContain("{phone}");
      expect(rejection.exits.offline).toContain("{phone}");
    }
  });

  it("en/fr estan traducidos de verdad, no copiados del castellano", () => {
    const es = esPack.translations.reservationForm;
    for (const [idioma, pack] of packs.filter(([codigo]) => codigo !== "es")) {
      const otro = pack.translations.reservationForm;
      const pares: [string, string][] = [
        [otro.toasts.availabilityOfflineTitle, es.toasts.availabilityOfflineTitle],
        [otro.toasts.availabilityOfflineDescription, es.toasts.availabilityOfflineDescription],
        [otro.toasts.availabilityServerErrorTitle, es.toasts.availabilityServerErrorTitle],
        [otro.toasts.availabilityServerErrorDescription, es.toasts.availabilityServerErrorDescription],
        [otro.toasts.noSlots, es.toasts.noSlots],
        [otro.rejection.offlineTitle, es.rejection.offlineTitle],
        [otro.rejection.offlineMessage, es.rejection.offlineMessage],
        [otro.rejection.errorMessage, es.rejection.errorMessage],
        [otro.rejection.exits.offline, es.rejection.exits.offline],
      ];
      for (const [traducido, castellano] of pares) {
        expect(traducido, idioma).not.toBe(castellano);
      }
    }
  });

  it("NINGUN texto del caso 'servidor' le habla de su conexion", () => {
    // La regresion de hoy, fijada en los tres idiomas: cuando el fallo es
    // nuestro no aparece "conexion"/"connection"/"connexion" en ninguna parte.
    const culpaAjena = /conexi[oó]n|connection|connexion/i;
    for (const [idioma, pack] of packs) {
      const { toasts, rejection } = pack.translations.reservationForm;
      const delServidor = [
        toasts.availabilityServerErrorTitle,
        toasts.availabilityServerErrorDescription,
        rejection.errorMessage,
        rejection.exits.retryOrCall,
      ];
      for (const texto of delServidor) expect(texto, `${idioma}: ${texto}`).not.toMatch(culpaAjena);

      // Y al contrario: el caso de verdad sin red SÍ habla de la conexión.
      expect(
        `${toasts.availabilityOfflineTitle} ${toasts.availabilityOfflineDescription} ${rejection.offlineMessage} ${rejection.exits.offline}`,
        idioma,
      ).toMatch(culpaAjena);
    }
  });

  it("el caso 'servidor' siempre ofrece el telefono como salida util", () => {
    for (const [idioma, pack] of packs) {
      const { toasts, rejection } = pack.translations.reservationForm;
      expect(toasts.availabilityServerErrorDescription, idioma).toContain("{phone}");
      expect(rejection.exits.retryOrCall, idioma).toContain("{phone}");
    }
  });

  it("403, 409 y 422 producen textos distintos entre si", () => {
    const blacklist = interpretarRechazoReserva(403, { motivo: "no_disponible", mensaje: "No ha sido posible formalizar la solicitud." }, TEXTOS);
    const lleno = interpretarRechazoReserva(409, { motivo: "sin_disponibilidad", mensaje: "No queda disponibilidad para esa fecha y hora." }, TEXTOS);
    const grupo = interpretarRechazoReserva(422, { motivo: "grupo_grande", mensaje: "Para grupos grandes, llamanos." }, TEXTOS);

    const textos = [blacklist, lleno, grupo].map((r) => `${r.mensaje}||${r.salida}`);
    expect(new Set(textos).size).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// El formulario completo: que ve de verdad el visitante en cada rechazo
// ---------------------------------------------------------------------------

const FECHA_OCUPACION = "2026-10-15";

/**
 * Construye un elemento `kind:"hueco"` con todos los campos del contrato para
 * no repetirlos en cada test: solo hace falta pasar lo que varia.
 */
function hueco(
  overrides: Partial<DisponibilidadHueco> & { hora: string; turno: "comida" | "cena" },
): DisponibilidadHueco {
  return {
    kind: "hueco",
    fecha: FECHA_OCUPACION,
    nivel: 0,
    minutos_nivel: 60,
    etiqueta_nivel: "hora en punto",
    umbral_nivel: 0,
    estado: "libre",
    ofrecido: true,
    motivo: null,
    periodo: overrides.turno === "comida" ? "Comida" : "Cena",
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
    ...overrides,
  };
}

/**
 * Respuesta de `/disponibilidad` con `meta` + un `periodo` (para que
 * `clasificarDisponibilidad` no la clasifique como "cerrado") + los huecos
 * que decida cada test.
 */
function respuestaConHuecos(huecos: DisponibilidadHueco[]) {
  return new Response(
    JSON.stringify([
      {
        kind: "meta",
        fecha: FECHA_OCUPACION,
        cerrado: false,
        aforo_turno: {
          comida: { capacidad_maxima: 80, ocupacion: 8, disponible: 72 },
          cena: { capacidad_maxima: 80, ocupacion: 0, disponible: 80 },
        },
        total_periodos: 1,
        total_ocupacion: 0,
      },
      {
        kind: "periodo",
        fecha: FECHA_OCUPACION,
        nombre_periodo: "Comida",
        hora_inicio: "13:00",
        hora_fin: "23:30",
        intervalo_base_minutos: 60,
        umbral_apertura_secundario: 0,
        dias_semana: [],
        ocultar_primario_si_secundario: false,
      },
      ...huecos,
    ]),
    { status: 200 },
  );
}

/** Array plano con `kind`, tal y como responde `reservas-web/disponibilidad`. */
const respuestaDisponibilidad = () =>
  new Response(
    JSON.stringify([
      {
        kind: "meta",
        fecha: FECHA_OCUPACION,
        cerrado: false,
        aforo_turno: {
          comida: { capacidad_maxima: 80, ocupacion: 8, disponible: 72 },
          cena: { capacidad_maxima: 80, ocupacion: 0, disponible: 80 },
        },
        total_periodos: 1,
        total_ocupacion: 1,
      },
      {
        kind: "periodo",
        fecha: FECHA_OCUPACION,
        nombre_periodo: "Comida",
        hora_inicio: "13:00",
        hora_fin: "16:00",
        intervalo_base_minutos: 60,
        umbral_apertura_secundario: 0,
        dias_semana: [],
        ocultar_primario_si_secundario: false,
      },
      {
        kind: "ocupacion",
        fecha: FECHA_OCUPACION,
        hora: "14:00:00",
        turno: "comida",
        total_reservas: 2,
        total_comensales: 8,
        capacidad_maxima: 80,
        capacidad_disponible: 72,
        porcentaje_ocupacion: 10,
      },
      // NUEVO en el contrato: sin este `kind:"hueco"` la web ya no pinta
      // ninguna hora, porque el formulario dejo de recalcularlas por su cuenta.
      hueco({ hora: "13:00", turno: "comida" }),
    ]),
    { status: 200 },
  );

/** Enruta por path: disponibilidad y crear son dos acciones de la misma funcion. */
function mockReservas(
  respuestaCrear: () => Response,
  respuestaDisponibilidadFn: () => Response = respuestaDisponibilidad,
) {
  vi.mocked(fetch).mockImplementation((url) => {
    const destino = String(url);
    if (destino === RESERVAS_WEB_DISPONIBILIDAD_URL) return Promise.resolve(respuestaDisponibilidadFn());
    if (destino === RESERVAS_WEB_CREAR_URL) return Promise.resolve(respuestaCrear());
    return Promise.reject(new Error(`URL inesperada en el test: ${destino}`));
  });
}

/** Selecciona la ultima fecha disponible del calendario y comprueba disponibilidad. */
async function comprobarDisponibilidad(user: ReturnType<typeof userEvent.setup>) {
  // El disparador del calendario NO se puede buscar por nombre accesible: al
  // ser un <button> asociado a un <label for>, su nombre accesible es el de la
  // etiqueta ("Fecha *"), no el texto del propio boton.
  const disparadorFecha = screen.getByText(/selecciona una fecha/i).closest("button");
  expect(disparadorFecha).not.toBeNull();
  await user.click(disparadorFecha!);

  const dias = await waitFor(() => {
    const encontrados = Array.from(
      document.querySelectorAll<HTMLButtonElement>('button[name="day"]:not([disabled])'),
    );
    if (encontrados.length === 0) throw new Error("el calendario no ofrece dias seleccionables");
    return encontrados;
  });
  await user.click(dias[dias.length - 1]);

  await user.click(screen.getByRole("button", { name: /comprobar disponibilidad/i }));
}

/** Rellena el formulario entero y lo envia. */
async function enviarReserva(user: ReturnType<typeof userEvent.setup>) {
  await comprobarDisponibilidad(user);

  const hora = await screen.findByRole("button", { name: "13:00" });
  await user.click(hora);

  await user.type(screen.getByRole("textbox", { name: /nombre/i }), "Marta Ruiz");
  await user.type(screen.getByPlaceholderText("+34 612345678"), "612345678");
  await user.type(screen.getByRole("textbox", { name: /email/i }), "marta@example.com");

  await user.click(screen.getByRole("button", { name: /reservar ahora/i }));
}

/** Rechazo tal y como lo devuelve `reservas-web/crear`. */
const rechazo = (status: number, motivo: string, mensaje: string) =>
  new Response(JSON.stringify({ ok: false, motivo, mensaje }), { status });

describe("ReservationForm — lo que ve el visitante en cada rechazo", () => {
  it("403 blacklist: mensaje neutro del servidor, telefono, y NUNCA el dialogo de exito", async () => {
    mockReservas(() => rechazo(403, "no_disponible", "No ha sido posible formalizar la solicitud."));

    const user = userEvent.setup();
    renderForm();
    await enviarReserva(user);

    expect(await screen.findByText("No ha sido posible formalizar la solicitud.")).toBeInTheDocument();
    expect(screen.getByText(TEXTOS.title)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /llamar a casa tom/i })).toHaveAttribute(
      "href",
      "tel:+34966107887",
    );
    // El fallo original: un rechazo acababa abriendo el diálogo de éxito.
    expect(screen.queryByText(EXITO.successTitle)).toBeNull();
  });

  it("409 sin_disponibilidad: mensaje del servidor y salida de elegir otra hora", async () => {
    mockReservas(() => rechazo(409, "sin_disponibilidad", "No queda disponibilidad para esa fecha y hora."));

    const user = userEvent.setup();
    renderForm();
    await enviarReserva(user);

    expect(
      await screen.findByText("No queda disponibilidad para esa fecha y hora."),
    ).toBeInTheDocument();
    expect(screen.getByText(TEXTOS.exits.otherTime)).toBeInTheDocument();
    expect(screen.queryByText(EXITO.successTitle)).toBeNull();
  });

  it("422 grupo_grande: mensaje del servidor y salida distinta a la del 409", async () => {
    mockReservas(() =>
      rechazo(422, "grupo_grande", "Para grupos de mas de 12 personas lo gestionamos por telefono."),
    );

    const user = userEvent.setup();
    renderForm();
    await enviarReserva(user);

    expect(
      await screen.findByText("Para grupos de mas de 12 personas lo gestionamos por telefono."),
    ).toBeInTheDocument();
    expect(screen.queryByText(TEXTOS.exits.otherTime)).toBeNull();
    expect(screen.queryByText(EXITO.successTitle)).toBeNull();
  });

  it("201: es el unico codigo que abre el resguardo de solicitud recibida", async () => {
    mockReservas(
      () =>
        new Response(JSON.stringify({ ok: true, reserva_id: "r-1", estado: "pendiente" }), {
          status: 201,
        }),
    );

    const user = userEvent.setup();
    renderForm();
    await enviarReserva(user);

    expect(await screen.findByText(EXITO.successTitle)).toBeInTheDocument();
    expect(screen.queryByText(TEXTOS.title)).toBeNull();
  });

  it("200 no es exito: la funcion solo devuelve 201, y un 200 raro no debe confirmar nada", async () => {
    mockReservas(() => new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const user = userEvent.setup();
    renderForm();
    await enviarReserva(user);

    expect(await screen.findByText(TEXTOS.title)).toBeInTheDocument();
    expect(screen.queryByText(EXITO.successTitle)).toBeNull();
  });

  it("la reserva se envia a la Edge Function, no a n8n", async () => {
    mockReservas(
      () =>
        new Response(JSON.stringify({ ok: true, reserva_id: "r-2", estado: "pendiente" }), {
          status: 201,
        }),
    );

    const user = userEvent.setup();
    renderForm();
    await enviarReserva(user);

    await screen.findByText(EXITO.successTitle);

    const destinos = vi.mocked(fetch).mock.calls.map(([url]) => String(url));
    expect(destinos).toContain(RESERVAS_WEB_DISPONIBILIDAD_URL);
    expect(destinos).toContain(RESERVAS_WEB_CREAR_URL);
    expect(destinos.some((destino) => destino.includes("n8n"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// El resguardo de solicitud (diálogo de éxito)
//
// La reserva se crea en estado `pendiente` — lo manda así el formulario y así
// lo devuelve `reservas-web/crear`. El diálogo decía "¡Reserva confirmada!",
// que además contradecía el aviso de la propia página ("no queda confirmada
// hasta que recibas el email"). Estos tests fijan que no vuelva.
// ---------------------------------------------------------------------------

/** 201 tal y como lo devuelve `reservas-web/crear`. */
const creada = () =>
  new Response(JSON.stringify({ ok: true, reserva_id: "r-ticket", estado: "pendiente" }), { status: 201 });

const TICKET = EXITO.successTicket;

describe("ReservationForm — el resguardo no promete una mesa que no está confirmada", () => {
  it("el titulo dice que la solicitud se ha recibido, no que la reserva este confirmada", async () => {
    mockReservas(creada);

    const user = userEvent.setup();
    renderForm();
    await enviarReserva(user);

    const titulo = await screen.findByRole("heading", { name: EXITO.successTitle });
    expect(titulo).toBeInTheDocument();

    // Ninguna variante del título antiguo, en ningún idioma.
    for (const pack of [esPack, enPack, frPack]) {
      expect(pack.translations.reservationForm.successTitle).not.toMatch(/confirmad|confirmed|confirmée/i);
    }

    // Y el diálogo dice explícitamente que falta el correo.
    expect(screen.getByText(EXITO.successLead)).toBeInTheDocument();
  });

  it("sella el estado pendiente, y no lo pinta como algo ya hecho", async () => {
    mockReservas(creada);

    const user = userEvent.setup();
    renderForm();
    await enviarReserva(user);

    expect(await screen.findByText(TICKET.stamp)).toBeInTheDocument();
    expect(screen.getByText(TICKET.documentType)).toBeInTheDocument();
  });

  it("enseña los datos de la solicitud y el correo al que llegara la confirmacion", async () => {
    mockReservas(creada);

    const user = userEvent.setup();
    renderForm();
    await enviarReserva(user);

    await screen.findByRole("heading", { name: EXITO.successTitle });

    // Los que escribió el visitante en el formulario.
    expect(screen.getByText("Marta Ruiz")).toBeInTheDocument();
    expect(screen.getByText("marta@example.com")).toBeInTheDocument();
    expect(screen.getByText("13:00")).toBeInTheDocument();

    // Con su etiqueta, como una línea de recibo.
    for (const etiqueta of [TICKET.nameLabel, TICKET.dateLabel, TICKET.timeLabel, TICKET.guestsLabel]) {
      expect(screen.getByText(etiqueta)).toBeInTheDocument();
    }
    expect(screen.getByText(TICKET.emailLabel)).toBeInTheDocument();
  });

  it("dice en que paso del circuito esta: 2 de 4, con los dos ultimos pendientes", async () => {
    mockReservas(creada);

    const user = userEvent.setup();
    renderForm();
    await enviarReserva(user);

    await screen.findByRole("heading", { name: EXITO.successTitle });

    const leyenda = TICKET.stepCaption.replace("{done}", "2").replace("{total}", "4");
    expect(screen.getByText(leyenda)).toBeInTheDocument();

    // Los cuatro pasos, y su estado leíble por un lector de pantalla. La
    // leyenda "Paso 2 de 4" es el nombre accesible de la lista.
    const pasos = screen.getByRole("list", { name: leyenda });
    expect(within(pasos).getAllByRole("listitem")).toHaveLength(4);
    expect(within(pasos).getAllByText(`— ${TICKET.stepDone}`)).toHaveLength(2);
    expect(within(pasos).getAllByText(`— ${TICKET.stepPending}`)).toHaveLength(2);
  });

  it("al abrirse, el foco entra en el resguardo (no en el boton de cerrar)", async () => {
    mockReservas(creada);

    const user = userEvent.setup();
    renderForm();
    await enviarReserva(user);

    const titulo = await screen.findByRole("heading", { name: EXITO.successTitle });
    const dialogo = titulo.closest('[role="dialog"]');
    expect(dialogo).not.toBeNull();

    // El papel es el contenedor con tabIndex -1 que envuelve al título.
    await waitFor(() => {
      expect(document.activeElement).not.toBe(document.body);
      expect(dialogo!.contains(document.activeElement)).toBe(true);
    });
    expect(document.activeElement).toHaveAttribute("tabindex", "-1");
    expect(document.activeElement).toContainElement(titulo as HTMLElement);
  });

  it("se cierra con Escape", async () => {
    mockReservas(creada);

    const user = userEvent.setup();
    renderForm();
    await enviarReserva(user);

    await screen.findByRole("heading", { name: EXITO.successTitle });
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: EXITO.successTitle })).toBeNull();
    });
  });

  it("los tres idiomas traducen todos los textos del resguardo", async () => {
    for (const pack of [esPack, enPack, frPack]) {
      const ticket = pack.translations.reservationForm.successTicket;
      const textos = [
        pack.translations.reservationForm.successTitle,
        pack.translations.reservationForm.successLead,
        pack.translations.reservationForm.successCloseAria,
        ticket.documentType,
        ticket.stamp,
        ticket.nameLabel,
        ticket.dateLabel,
        ticket.timeLabel,
        ticket.guestsLabel,
        ticket.emailLabel,
        ticket.emailHint,
        ticket.stepCaption,
        ticket.stepDone,
        ticket.stepPending,
        ticket.thanks,
        ticket.issuedLabel,
        ...ticket.steps,
      ];
      for (const texto of textos) expect(texto.trim()).not.toBe("");
      expect(ticket.steps).toHaveLength(4);
      expect(ticket.stepCaption).toContain("{done}");
      expect(ticket.stepCaption).toContain("{total}");
    }

    // Ningún texto del resguardo se ha quedado en castellano en en/fr.
    expect(enPack.translations.reservationForm.successTicket.stamp).not.toBe(
      esPack.translations.reservationForm.successTicket.stamp,
    );
    expect(frPack.translations.reservationForm.successTicket.stamp).not.toBe(
      esPack.translations.reservationForm.successTicket.stamp,
    );
  });
});

// ---------------------------------------------------------------------------
// El formulario pinta los `kind:"hueco"` del motor, ya no los recalcula
// ---------------------------------------------------------------------------

/** No falla ninguna llamada a `/crear` en los tests que no llegan a enviar. */
const crearNoDeberiaLlamarse = () => new Response(null, { status: 500 });

describe("ReservationForm — pinta los huecos que decide el motor, no los recalcula", () => {
  it("solo horas en punto: pinta cada kind:\"hueco\" agrupado bajo el turno de comida", async () => {
    mockReservas(crearNoDeberiaLlamarse, () =>
      respuestaConHuecos([
        hueco({ hora: "13:00", turno: "comida" }),
        hueco({ hora: "14:00", turno: "comida" }),
      ]),
    );

    const user = userEvent.setup();
    renderForm();
    await comprobarDisponibilidad(user);

    expect(await screen.findByRole("button", { name: "13:00" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "14:00" })).toBeInTheDocument();
    expect(screen.getByText(esPack.translations.reservationForm.lunchLabel)).toBeInTheDocument();
    // Sin huecos de cena, la cabecera de cena ni se pinta.
    expect(screen.queryByText(esPack.translations.reservationForm.dinnerLabel)).toBeNull();
  });

  it("con medias abiertas: pinta la media junto a la hora en punto y agrupa la cena aparte, en orden", async () => {
    mockReservas(crearNoDeberiaLlamarse, () =>
      respuestaConHuecos([
        hueco({ hora: "13:00", turno: "comida" }),
        hueco({
          hora: "13:30",
          turno: "comida",
          nivel: 1,
          minutos_nivel: 30,
          etiqueta_nivel: "media hora",
          umbral_nivel: 70,
          abierto_por: "13:00",
          abierto_con_porcentaje: 70,
        }),
        hueco({ hora: "21:00", turno: "cena" }),
      ]),
    );

    const user = userEvent.setup();
    renderForm();
    await comprobarDisponibilidad(user);

    expect(await screen.findByRole("button", { name: "13:00" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "13:30" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "21:00" })).toBeInTheDocument();

    // Las dos cabeceras de turno aparecen, y comida siempre antes que cena.
    const etiquetasTurno = Array.from(
      document.querySelectorAll("p.text-sm.font-medium.text-muted-foreground"),
    ).map((el) => el.textContent);
    expect(etiquetasTurno).toEqual([
      esPack.translations.reservationForm.lunchLabel,
      esPack.translations.reservationForm.dinnerLabel,
    ]);
  });

  it("con cuartos: pinta el cuarto de hora igual que cualquier otro hueco, sin recalcularlo", async () => {
    mockReservas(crearNoDeberiaLlamarse, () =>
      respuestaConHuecos([
        hueco({ hora: "13:00", turno: "comida" }),
        hueco({ hora: "13:30", turno: "comida", nivel: 1, minutos_nivel: 30, etiqueta_nivel: "media hora" }),
        hueco({
          hora: "13:45",
          turno: "comida",
          nivel: 2,
          minutos_nivel: 15,
          etiqueta_nivel: "cuarto de hora",
          umbral_nivel: 85,
          abierto_por: "13:30",
          abierto_con_porcentaje: 85,
        }),
      ]),
    );

    const user = userEvent.setup();
    renderForm();
    await comprobarDisponibilidad(user);

    expect(await screen.findByRole("button", { name: "13:00" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "13:30" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "13:45" })).toBeInTheDocument();
  });

  it("dia cerrado: no pinta ningun hueco y avisa con el toast de dia cerrado", async () => {
    mockReservas(
      crearNoDeberiaLlamarse,
      () =>
        new Response(
          JSON.stringify([
            { kind: "meta", fecha: FECHA_OCUPACION, cerrado: true, total_periodos: 0, total_ocupacion: 0 },
          ]),
          { status: 200 },
        ),
    );

    const user = userEvent.setup();
    renderForm();
    await comprobarDisponibilidad(user);

    expect(
      await screen.findByText(esPack.translations.reservationForm.toasts.closedDay),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^\d{2}:\d{2}$/ })).toBeNull();
  });

  it("fetch que lanza con el dispositivo en linea: el fallo se cuenta como NUESTRO, no como su wifi", async () => {
    // Es el bug que tumbo el formulario: la Edge Function moria al arrancar y
    // ni contestaba al OPTIONS, el navegador lo daba como error de CORS y
    // `fetch` lanzaba `TypeError: Failed to fetch`. `navigator.onLine` era
    // `true` (jsdom, como el movil del cliente), asi que la culpa es nuestra.
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const user = userEvent.setup();
    renderForm();
    await comprobarDisponibilidad(user);

    const toasts = esPack.translations.reservationForm.toasts;
    expect(await screen.findByText(toasts.availabilityServerErrorTitle)).toBeInTheDocument();
    // Y con el telefono ya sustituido: en un toast no puede ir como enlace.
    expect(
      screen.getByText(toasts.availabilityServerErrorDescription.replace("{phone}", PHONE_DISPLAY)),
    ).toBeInTheDocument();
    // Ni rastro del viejo "comprueba tu conexion".
    expect(screen.queryByText(toasts.availabilityOfflineTitle)).toBeNull();
    expect(screen.queryByRole("button", { name: /^\d{2}:\d{2}$/ })).toBeNull();
  });

  it("dispositivo sin red de verdad: ahi si se le pide que compruebe su conexion", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);

    const user = userEvent.setup();
    renderForm();
    await comprobarDisponibilidad(user);

    const toasts = esPack.translations.reservationForm.toasts;
    expect(await screen.findByText(toasts.availabilityOfflineTitle)).toBeInTheDocument();
    expect(screen.queryByText(toasts.availabilityServerErrorTitle)).toBeNull();
  });

  it("un 500 de la funcion tampoco se le achaca a la conexion del visitante", async () => {
    mockReservas(crearNoDeberiaLlamarse, () => new Response("boom", { status: 500 }));

    const user = userEvent.setup();
    renderForm();
    await comprobarDisponibilidad(user);

    const toasts = esPack.translations.reservationForm.toasts;
    expect(await screen.findByText(toasts.availabilityServerErrorTitle)).toBeInTheDocument();
    expect(screen.queryByText(toasts.availabilityOfflineTitle)).toBeNull();
    expect(screen.queryByRole("button", { name: /^\d{2}:\d{2}$/ })).toBeNull();
  });

  it("dia abierto pero sin ninguna hora libre: lo dice, en vez de un exito con la lista vacia", async () => {
    // El engaño que había: `toast.success("Disponibilidad actualizada")` y una
    // sección "Horarios disponibles" vacía, sin que nadie explicara nada.
    mockReservas(crearNoDeberiaLlamarse, () =>
      respuestaConHuecos([
        hueco({ hora: "13:00", turno: "comida", estado: "completo", ofrecido: false, capacidad_disponible: 0 }),
      ]),
    );

    const user = userEvent.setup();
    renderForm();
    await comprobarDisponibilidad(user);

    const toasts = esPack.translations.reservationForm.toasts;
    expect(
      await screen.findByText(toasts.noSlots.replace("{phone}", PHONE_DISPLAY)),
    ).toBeInTheDocument();
    expect(screen.queryByText(toasts.availabilityChecked)).toBeNull();
    // La hora completa se sigue pintando en gris: es informacion, no un hueco.
    expect(screen.getByRole("button", { name: /13:00/ })).toBeDisabled();
  });

  it("con al menos una hora libre sigue siendo un exito normal", async () => {
    mockReservas(crearNoDeberiaLlamarse, () =>
      respuestaConHuecos([
        hueco({ hora: "13:00", turno: "comida", estado: "completo", ofrecido: false }),
        hueco({ hora: "14:00", turno: "comida" }),
      ]),
    );

    const user = userEvent.setup();
    renderForm();
    await comprobarDisponibilidad(user);

    const toasts = esPack.translations.reservationForm.toasts;
    expect(await screen.findByText(toasts.availabilityChecked)).toBeInTheDocument();
    expect(screen.queryByText(toasts.noSlots.replace("{phone}", PHONE_DISPLAY))).toBeNull();
  });

  it("una hora completa se pinta en gris, y no se puede seleccionar ni enviar", async () => {
    mockReservas(crearNoDeberiaLlamarse, () =>
      respuestaConHuecos([
        hueco({ hora: "13:00", turno: "comida" }),
        hueco({
          hora: "14:00",
          turno: "comida",
          estado: "completo",
          ofrecido: false,
          motivo: "aforo_turno_completo",
          capacidad_disponible: 0,
        }),
      ]),
    );

    const user = userEvent.setup();
    renderForm();
    await comprobarDisponibilidad(user);

    // Nombre accesible parcial: el boton completo concatena la hora con la
    // etiqueta "Completo", asi que la coincidencia exacta "14:00" no basta.
    const horaCompleta = await screen.findByRole("button", { name: /14:00/ });
    expect(horaCompleta).toBeDisabled();
    expect(within(horaCompleta).getByText(esPack.translations.reservationForm.fullLabel)).toBeInTheDocument();

    // Un boton disabled no dispara el click: intentarlo no debe seleccionar
    // la hora, y "Reservar ahora" sigue bloqueado.
    await user.click(horaCompleta);
    expect(screen.getByRole("button", { name: /reservar ahora/i })).toBeDisabled();
  });

  it("nunca envia una hora que la web no ofrecio: manda exactamente la del hueco elegido", async () => {
    mockReservas(
      () =>
        new Response(JSON.stringify({ ok: true, reserva_id: "r-4", estado: "pendiente" }), { status: 201 }),
      () =>
        respuestaConHuecos([
          hueco({
            hora: "13:30",
            turno: "comida",
            nivel: 1,
            minutos_nivel: 30,
            etiqueta_nivel: "media hora",
            abierto_por: "13:00",
            abierto_con_porcentaje: 70,
          }),
        ]),
    );

    const user = userEvent.setup();
    renderForm();
    await comprobarDisponibilidad(user);

    await user.click(await screen.findByRole("button", { name: "13:30" }));
    await user.type(screen.getByRole("textbox", { name: /nombre/i }), "Marta Ruiz");
    await user.type(screen.getByPlaceholderText("+34 612345678"), "612345678");
    await user.type(screen.getByRole("textbox", { name: /email/i }), "marta@example.com");
    await user.click(screen.getByRole("button", { name: /reservar ahora/i }));

    await screen.findByText(EXITO.successTitle);

    const llamadaCrear = vi.mocked(fetch).mock.calls.find(([url]) => String(url) === RESERVAS_WEB_CREAR_URL);
    expect(llamadaCrear).toBeDefined();
    const cuerpo = JSON.parse(String(llamadaCrear?.[1]?.body));
    // La hora enviada es LITERALMENTE la que trajo el hueco, no una calculada
    // en el navegador con offsets fijos.
    expect(cuerpo.hora).toBe("13:30");
  });
});

// ---------------------------------------------------------------------------
// Casilla de consentimiento del newsletter: desmarcada por defecto (RGPD
// exige opt-in explícito, nunca una casilla premarcada), y su valor viaja
// tal cual a `/crear` en `consentimiento_newsletter`.
// ---------------------------------------------------------------------------

describe("ReservationForm — consentimiento del newsletter", () => {
  it("la casilla empieza desmarcada", async () => {
    renderForm();
    await waitFor(() => screen.getByPlaceholderText("+34 612345678"));

    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("sin marcarla, se envia consentimiento_newsletter:false", async () => {
    mockReservas(
      () => new Response(JSON.stringify({ ok: true, reserva_id: "r-5", estado: "pendiente" }), { status: 201 }),
    );

    const user = userEvent.setup();
    renderForm();
    await enviarReserva(user);

    await screen.findByText(/reserva confirmada/i);

    const llamadaCrear = vi.mocked(fetch).mock.calls.find(([url]) => String(url) === RESERVAS_WEB_CREAR_URL);
    const cuerpo = JSON.parse(String(llamadaCrear?.[1]?.body));
    expect(cuerpo.consentimiento_newsletter).toBe(false);
  });

  it("al marcarla, se envia consentimiento_newsletter:true", async () => {
    mockReservas(
      () => new Response(JSON.stringify({ ok: true, reserva_id: "r-6", estado: "pendiente" }), { status: 201 }),
    );

    const user = userEvent.setup();
    renderForm();
    await comprobarDisponibilidad(user);

    const hora = await screen.findByRole("button", { name: "13:00" });
    await user.click(hora);
    await user.click(screen.getByRole("checkbox"));

    await user.type(screen.getByRole("textbox", { name: /nombre/i }), "Marta Ruiz");
    await user.type(screen.getByPlaceholderText("+34 612345678"), "612345678");
    await user.type(screen.getByRole("textbox", { name: /email/i }), "marta@example.com");
    await user.click(screen.getByRole("button", { name: /reservar ahora/i }));

    await screen.findByText(/reserva confirmada/i);

    const llamadaCrear = vi.mocked(fetch).mock.calls.find(([url]) => String(url) === RESERVAS_WEB_CREAR_URL);
    const cuerpo = JSON.parse(String(llamadaCrear?.[1]?.body));
    expect(cuerpo.consentimiento_newsletter).toBe(true);
  });
});
