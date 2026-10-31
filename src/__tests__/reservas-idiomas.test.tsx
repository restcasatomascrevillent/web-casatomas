/**
 * El formulario de reserva en inglés y francés (`/en/reservas`, `/fr/reservas`).
 *
 * Es el MISMO formulario que `/reservas`: aquí se comprueba que, en cada
 * idioma, (1) envía exactamente el mismo cuerpo que fija el contrato con
 * `reservas-web`, (2) enlaza a las condiciones y a la política de SU idioma,
 * (3) no deja textos en español (validaciones, rechazos del servidor,
 * resguardo) y (4) al terminar vuelve a la portada de su idioma.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { ReservationForm } from "@/components/ReservationForm";
import Reservas from "@/pages/Reservas";
import { translations as es } from "@/i18n/languages/es";
import { translations as en } from "@/i18n/languages/en";
import { translations as fr } from "@/i18n/languages/fr";
import type { Language } from "@/i18n/types";
import { interpretarRechazoReserva, type DisponibilidadHueco } from "@/lib/reservas-web";
import { RESERVAS_WEB_CREAR_URL, RESERVAS_WEB_DISPONIBILIDAD_URL } from "@/lib/supabase-functions";
import { SITE_URL } from "@/lib/negocio";

// Seo usa `Head` de vite-react-ssg (necesita su provider): se sustituye por un
// espía que guarda los props, para comprobar canonical/hreflang/lang.
const seoProps = vi.hoisted(() => ({ ultimo: null as Record<string, unknown> | null }));
vi.mock("@/components/Seo", () => ({
  Seo: (props: Record<string, unknown>) => {
    seoProps.ultimo = props;
    return null;
  },
}));
vi.mock("@/components/JsonLd", () => ({ JsonLd: () => null }));

vi.setConfig({ testTimeout: 20_000 });

type Cuerpo = Record<string, unknown>;
const CONTRATO = JSON.parse(
  readFileSync(path.resolve(process.cwd(), "src/__tests__/contratos/reserva-web-crear.contrato.json"), "utf8"),
) as { casos: Record<"con_newsletter" | "sin_newsletter", { cuerpo: Cuerpo }> };

const IDIOMAS = [
  { lang: "es", prefijo: "", t: es },
  { lang: "en", prefijo: "/en", t: en },
  { lang: "fr", prefijo: "/fr", t: fr },
] as unknown as ReadonlyArray<{ lang: Language; prefijo: string; t: typeof es }>;
const TRADUCIDOS = IDIOMAS.filter((i) => i.lang !== "es");

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * "Ahora" FIJO de la prueba (miércoles 14-oct-2026, 12:00 hora local).
 *
 * `ReservationForm` deshabilita las fechas anteriores a `new Date()` y el
 * calendario abre en el mes en curso. Con la fecha real, el último día de un
 * mes que cae en sábado (31-oct-2026, 31-jul-2027, 30-sep-2028…) deja `en`
 * (semana desde el domingo) sin ningún día seleccionable en la cuadrícula, y
 * lo mismo les pasa a `es` y `fr` (semana desde el lunes) el último día del
 * mes cuando es domingo. La prueba comprueba idiomas y contrato, no el
 * calendario: se fija solo `Date` (sin falsear temporizadores, que romperían
 * `waitFor`, `userEvent` y los toasts) a mitad de mes, y el resultado deja de
 * depender del día en que se ejecute. Se construye con la hora LOCAL para que
 * el día sea el mismo en cualquier zona horaria. Lo que la hace estable es
 * caer a mitad de mes: no la cambies por un fin de mes (sábado ni domingo).
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
  vi.stubGlobal(
    "IntersectionObserver",
    vi.fn(() => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(), takeRecords: vi.fn(() => []) })),
  );
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  seoProps.ultimo = null;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function hueco(hora: string, fecha: string): DisponibilidadHueco {
  return {
    kind: "hueco", fecha, hora, turno: "comida", nivel: 0, minutos_nivel: 60, etiqueta_nivel: "hora en punto",
    umbral_nivel: 0, estado: "libre", ofrecido: true, motivo: null, periodo: "Comida", abierto_por: null,
    abierto_con_porcentaje: null, promovido: false, comensales_hora: 0, reservas_hora: 0, porcentaje_hora: 0,
    porcentaje_para_umbral: 0, capacidad_maxima: 80, capacidad_disponible: 80, porcentaje_ocupacion: 0,
  };
}

/** `/disponibilidad` con un hueco libre; `/crear` responde lo que se le pase (201 por defecto). */
function mockFuncion(respuestaCrear?: () => Response) {
  vi.mocked(fetch).mockImplementation((url, init) => {
    const destino = String(url);
    if (destino === RESERVAS_WEB_DISPONIBILIDAD_URL) {
      const { fecha } = JSON.parse(String((init as RequestInit).body)) as { fecha: string };
      return Promise.resolve(
        new Response(
          JSON.stringify([
            { kind: "meta", fecha, cerrado: false, aforo_turno: {}, total_periodos: 1, total_ocupacion: 0 },
            {
              kind: "periodo", fecha, nombre_periodo: "Comida", hora_inicio: "13:00", hora_fin: "16:00",
              intervalo_base_minutos: 60, umbral_apertura_secundario: 0, dias_semana: [], ocultar_primario_si_secundario: false,
            },
            hueco("13:00", fecha),
          ]),
          { status: 200 },
        ),
      );
    }
    if (destino === RESERVAS_WEB_CREAR_URL) {
      return Promise.resolve(
        respuestaCrear?.() ??
          new Response(JSON.stringify({ ok: true, reserva_id: "r-1", estado: "pendiente" }), { status: 201 }),
      );
    }
    return Promise.reject(new Error(`URL inesperada en el test: ${destino}`));
  });
}

const Ruta = () => <output data-testid="ruta">{useLocation().pathname}</output>;

function renderFormulario(lang: Language, prefijo: string) {
  return render(
    <MemoryRouter initialEntries={[`${prefijo}/reservas`]}>
      <LanguageProvider initialLanguage={lang}>
        <Toaster />
        <ReservationForm />
        <Ruta />
      </LanguageProvider>
    </MemoryRouter>,
  );
}

/** Pasos 1-3 rellenos (como el contrato), en el idioma pedido. NO toca las casillas. */
async function rellenar(user: ReturnType<typeof userEvent.setup>, t: typeof es) {
  const f = t.reservationForm;
  const cuerpo = CONTRATO.casos.con_newsletter.cuerpo;
  await waitFor(() => screen.getByPlaceholderText("+34 612345678"));

  const comensales = screen.getByRole("spinbutton");
  await user.clear(comensales);
  await user.type(comensales, String(cuerpo.numero_comensales));

  await user.click(screen.getByText(f.datePlaceholder).closest("button")!);
  const dias = await waitFor(() => {
    const d = Array.from(document.querySelectorAll<HTMLButtonElement>('button[name="day"]:not([disabled])'));
    if (d.length === 0) throw new Error("el calendario no ofrece días seleccionables");
    return d;
  });
  await user.click(dias[dias.length - 1]);
  await user.click(screen.getByRole("button", { name: f.checkAvailability }));
  await user.click(await screen.findByRole("button", { name: "13:00" }));

  await user.type(screen.getByRole("textbox", { name: new RegExp(`^${escapar(f.nameLabel)}`) }), String(cuerpo.nombre));
  const telefono = screen.getByPlaceholderText("+34 612345678");
  await user.clear(telefono);
  await user.type(telefono, String(cuerpo.telefono));
  await user.type(screen.getByRole("textbox", { name: new RegExp(`^${escapar(f.emailLabel)}`) }), String(cuerpo.email));
}

const casillaCondiciones = (t: typeof es) =>
  screen.getByRole("checkbox", { name: new RegExp(escapar(t.reservationForm.termsLink), "i") });
const casillaNewsletter = (t: typeof es) =>
  screen.getByRole("checkbox", { name: new RegExp(`^${escapar(t.reservationForm.newsletterLabel.slice(0, 30))}`) });

function cuerpoEnviado(): Cuerpo {
  const llamada = vi.mocked(fetch).mock.calls.find(([url]) => String(url) === RESERVAS_WEB_CREAR_URL);
  expect(llamada, "el formulario no llamó a reservas-web/crear").toBeDefined();
  return JSON.parse(String((llamada![1] as RequestInit).body));
}

describe.each(TRADUCIDOS)("formulario de reserva en $lang", ({ lang, prefijo, t }) => {
  const f = t.reservationForm;

  it("las casillas enlazan a las condiciones y a la política de su idioma, en pestaña nueva y sin avisos en español", async () => {
    renderFormulario(lang, prefijo);
    await waitFor(() => screen.getByPlaceholderText("+34 612345678"));

    const condiciones = screen.getByRole("link", { name: new RegExp(escapar(f.termsLink), "i") });
    const privacidad = screen.getByRole("link", { name: new RegExp(escapar(f.privacyLink), "i") });
    const newsletter = screen.getByRole("link", { name: new RegExp(escapar(f.newsletterTermsLink), "i") });
    expect(condiciones).toHaveAttribute("href", `${prefijo}/condiciones#reservas`);
    expect(privacidad).toHaveAttribute("href", `${prefijo}/politica-privacidad`);
    expect(newsletter).toHaveAttribute("href", `${prefijo}/condiciones#newsletter`);
    for (const enlace of [condiciones, privacidad, newsletter]) {
      expect(enlace).toHaveAttribute("target", "_blank");
      expect(enlace).toHaveAttribute("rel", expect.stringContaining("noopener"));
    }
    expect(screen.queryByText(/in Spanish|en espagnol|en español/i)).toBeNull();
    // Las dos casillas empiezan desmarcadas.
    expect(casillaCondiciones(t)).not.toBeChecked();
    expect(casillaNewsletter(t)).not.toBeChecked();
  });

  it("todas las etiquetas están en su idioma (ninguna en español)", async () => {
    renderFormulario(lang, prefijo);
    await waitFor(() => screen.getByPlaceholderText("+34 612345678"));
    for (const texto of [f.stepOne, f.dateLabel, f.guestsLabel, f.checkAvailability, f.infoTitle, f.nameLabel, f.phoneLabel, f.emailLabel, f.notesLabel, f.submit, f.footer]) {
      expect(screen.getByText(texto)).toBeInTheDocument();
    }
    expect(screen.queryByText(es.reservationForm.stepOne)).toBeNull();
    expect(screen.queryByText(es.reservationForm.submit)).toBeNull();
  });

  it("sin aceptar las condiciones NO se envía nada y el error sale en su idioma", async () => {
    mockFuncion();
    const user = userEvent.setup();
    renderFormulario(lang, prefijo);
    await rellenar(user, t);
    await user.click(casillaNewsletter(t)); // la newsletter sola no basta
    await user.click(screen.getByRole("button", { name: f.submit }));

    expect(await screen.findByText(t.validation.termsRequired)).toBeInTheDocument();
    expect(screen.queryByText(es.validation.termsRequired)).toBeNull();
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url) === RESERVAS_WEB_CREAR_URL)).toBe(false);
  });

  it.each(Object.entries(CONTRATO.casos))("envía EXACTAMENTE el cuerpo del contrato (caso %s)", async (_nombre, caso) => {
    mockFuncion();
    const user = userEvent.setup();
    renderFormulario(lang, prefijo);
    await rellenar(user, t);
    await user.click(casillaCondiciones(t));
    if (caso.cuerpo.consentimiento_newsletter === true) await user.click(casillaNewsletter(t));

    await user.click(screen.getByRole("button", { name: f.submit }));
    // Resguardo: título y frase en su idioma.
    expect(await screen.findByText(f.successTitle)).toBeInTheDocument();
    expect(screen.getByText(f.successLead)).toBeInTheDocument();

    const enviado = cuerpoEnviado();
    expect(enviado.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Mismos campos y valores que en español; sin `idioma` ni nada de más.
    expect({ ...enviado, fecha: caso.cuerpo.fecha }).toEqual(caso.cuerpo);
    expect(Object.keys(enviado).sort()).toEqual(Object.keys(caso.cuerpo).sort());
  });

  it("cerrar el resguardo lleva a la portada de su idioma", async () => {
    mockFuncion();
    const user = userEvent.setup();
    renderFormulario(lang, prefijo);
    await rellenar(user, t);
    await user.click(casillaCondiciones(t));
    await user.click(screen.getByRole("button", { name: f.submit }));
    await screen.findByText(f.successTitle);

    await user.click(screen.getByRole("button", { name: f.successButton }));
    await waitFor(() => expect(screen.getByTestId("ruta")).toHaveTextContent(new RegExp(`^${prefijo}$`)));
  });

  it("un rechazo del servidor (que llega en español) se enseña en su idioma, con su salida", async () => {
    mockFuncion(() =>
      new Response(
        JSON.stringify({ ok: false, motivo: "reserva_hoy", mensaje: "Las reservas para hoy se gestionan por teléfono." }),
        { status: 422 },
      ),
    );
    const user = userEvent.setup();
    renderFormulario(lang, prefijo);
    await rellenar(user, t);
    await user.click(casillaCondiciones(t));
    await user.click(screen.getByRole("button", { name: f.submit }));

    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByText(f.rejection.title)).toBeInTheDocument();
    expect(within(dialogo).getByText(f.rejection.reasons.reserva_hoy)).toBeInTheDocument();
    expect(within(dialogo).queryByText(/Las reservas para hoy/)).toBeNull();
    expect(within(dialogo).getByText(f.rejection.exits.call.split("{phone}")[0].trim(), { exact: false })).toBeInTheDocument();
    // Hasta la "X" del diálogo tiene etiqueta en su idioma.
    expect(within(dialogo).getByRole("button", { name: f.rejection.closeAria })).toBeInTheDocument();
  });
});

describe("rechazos de reservas-web — texto por motivo", () => {
  // Los motivos que puede devolver `/crear` para el formulario de Casa Tomás.
  const MOTIVOS = [
    "no_disponible", "grupo_grande", "reserva_hoy", "corte_horario", "max_reservas_telefono",
    "max_reservas_email", "sin_disponibilidad", "numero_comensales_fuera_de_rango", "fecha_pasada",
    "fecha_demasiado_lejana",
    // 400 de la reservas-web nueva si `acepta_condiciones` no llega a `true`
    // (trae `error` + `mensaje` en español). El formulario no deja enviarlo
    // sin la casilla, pero si llegara no debe salir en español en /en y /fr.
    "condiciones_no_aceptadas",
  ];

  it("en y francés traducen todos los motivos; el español no sustituye nada (manda el servidor)", () => {
    expect(Object.keys(es.reservationForm.rejection.reasons)).toEqual([]);
    for (const idioma of [en, fr]) {
      expect(Object.keys(idioma.reservationForm.rejection.reasons).sort()).toEqual([...MOTIVOS].sort());
    }
  });

  it("el mensaje del servidor solo se sustituye si hay texto para ese motivo", () => {
    const textos = en.reservationForm.rejection;
    const traducido = interpretarRechazoReserva(409, { ok: false, motivo: "sin_disponibilidad", mensaje: "No queda disponibilidad." }, textos);
    expect(traducido.mensaje).toBe(textos.reasons.sin_disponibilidad);
    // Motivo desconocido (p. ej. uno nuevo del backend): se enseña lo que diga el servidor.
    const desconocido = interpretarRechazoReserva(409, { ok: false, motivo: "motivo_nuevo", mensaje: "Mensaje del servidor." }, textos);
    expect(desconocido.mensaje).toBe("Mensaje del servidor.");
    // Español: nada cambia.
    const enEspanol = interpretarRechazoReserva(422, { ok: false, motivo: "reserva_hoy", mensaje: "Para hoy, por teléfono." }, es.reservationForm.rejection);
    expect(enEspanol.mensaje).toBe("Para hoy, por teléfono.");
  });

  it("los 422 que traen `error` en vez de `motivo` también se traducen, con las cifras del cuerpo", () => {
    const textos = en.reservationForm.rejection;
    const rango = interpretarRechazoReserva(
      422,
      { ok: false, error: "numero_comensales_fuera_de_rango", mensaje: "Las reservas web son para…", min: 1, max: 12 },
      textos,
    );
    expect(rango.mensaje).toBe("Online bookings are for a minimum of 1 and a maximum of 12 guests.");
    const lejana = interpretarRechazoReserva(
      422,
      { ok: false, error: "fecha_demasiado_lejana", mensaje: "Solo se pueden reservar…", dias_max: 60 },
      fr.reservationForm.rejection,
    );
    expect(lejana.mensaje).toContain("60");
    expect(lejana.mensaje).not.toContain("{days}");
  });

  it("el 400 `condiciones_no_aceptadas` (con `error` y `mensaje` en español) se traduce y pide revisar el formulario", () => {
    const cuerpo = {
      ok: false,
      error: "condiciones_no_aceptadas",
      mensaje: "Para enviar la reserva tienes que aceptar la política de privacidad y las condiciones de la reserva.",
    };
    for (const idioma of [en, fr]) {
      const textos = idioma.reservationForm.rejection;
      const rechazo = interpretarRechazoReserva(400, cuerpo, textos);
      expect(rechazo.mensaje).toBe(textos.reasons.condiciones_no_aceptadas);
      expect(rechazo.mensaje).not.toMatch(/tienes que aceptar/);
      expect(rechazo.salida).toBe(textos.exits.checkForm);
    }
    // En español se enseña el del servidor, tal cual.
    expect(interpretarRechazoReserva(400, cuerpo, es.reservationForm.rejection).mensaje).toBe(cuerpo.mensaje);
  });

  it("los 422 de fecha (con `error`, sin `motivo`) proponen elegir otra fecha, y el de comensales ajustarlos, en los tres idiomas", () => {
    // Cuerpos tal cual los devuelve reservas-web/crear (index.ts, handleCrear).
    const pasada = { ok: false, error: "fecha_pasada", mensaje: "La fecha seleccionada ya ha pasado." };
    const lejana = {
      ok: false,
      error: "fecha_demasiado_lejana",
      mensaje: "Solo se pueden reservar fechas con un máximo de 60 días de antelación.",
      dias_max: 60,
    };
    const rango = {
      ok: false,
      error: "numero_comensales_fuera_de_rango",
      mensaje: "Las reservas web son para un mínimo de 1 y un máximo de 12 personas.",
      min: 1,
      max: 12,
    };
    for (const idioma of [es, en, fr]) {
      const textos = idioma.reservationForm.rejection;
      expect(interpretarRechazoReserva(422, pasada, textos).salida).toBe(textos.exits.otherDate);
      expect(interpretarRechazoReserva(422, lejana, textos).salida).toBe(textos.exits.otherDate);
      expect(interpretarRechazoReserva(422, rango, textos).salida).toBe(textos.exits.guests);
      // Un 422 sin código reconocible sigue pidiendo revisar el formulario.
      expect(interpretarRechazoReserva(422, { ok: false, error: "otro_codigo" }, textos).salida).toBe(textos.exits.checkForm);
    }
  });

  it("si el cuerpo no trae la cifra que pide el texto, no se inventa: vale el mensaje del servidor", () => {
    const sinCifras = interpretarRechazoReserva(
      422,
      { ok: false, error: "numero_comensales_fuera_de_rango", mensaje: "Mensaje del servidor." },
      en.reservationForm.rejection,
    );
    expect(sinCifras.mensaje).toBe("Mensaje del servidor.");
  });

  it("los 400 (sin `mensaje`) y los fallos de red siguen usando los textos propios del idioma", () => {
    const invalido = interpretarRechazoReserva(400, { ok: false, error: "email_invalido" }, fr.reservationForm.rejection);
    expect(invalido.mensaje).toBe(fr.reservationForm.rejection.invalidMessage);
    const caido = interpretarRechazoReserva(0, null, en.reservationForm.rejection);
    expect(caido.mensaje).toBe(en.reservationForm.rejection.errorMessage);
  });
});

describe.each(IDIOMAS)("página de reservas en $lang", ({ lang, prefijo, t }) => {
  it("canonical propio, hreflang es/en/fr/x-default, indexable y con su idioma", () => {
    render(
      <MemoryRouter initialEntries={[`${prefijo}/reservas`]}>
        <LanguageProvider initialLanguage={lang}>
          <Reservas />
        </LanguageProvider>
      </MemoryRouter>,
    );
    expect(seoProps.ultimo).toMatchObject({
      title: t.reservasPage.seoTitle,
      description: t.reservasPage.seoDescription,
      canonical: `${SITE_URL}${prefijo}/reservas`,
      lang,
    });
    expect(seoProps.ultimo?.noindex).toBeFalsy();
    expect(seoProps.ultimo?.languageAlternates).toEqual([
      { hrefLang: "es", href: `${SITE_URL}/reservas` },
      { hrefLang: "en", href: `${SITE_URL}/en/reservas` },
      { hrefLang: "fr", href: `${SITE_URL}/fr/reservas` },
      { hrefLang: "x-default", href: `${SITE_URL}/reservas` },
    ]);
  });

  it("pinta el aviso y el formulario en su idioma, y «volver al sitio» va a su portada", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={[`${prefijo}/reservas`]}>
        <LanguageProvider initialLanguage={lang}>
          <Reservas />
          <Ruta />
        </LanguageProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: t.reservas.title })).toBeInTheDocument();
    expect(screen.getByText(t.reservas.disclaimer.note)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t.reservationForm.checkAvailability })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: t.reservas.backToSite }));
    await waitFor(() => expect(screen.getByTestId("ruta")).toHaveTextContent(new RegExp(`^${prefijo || "/"}$`)));
  });
});

describe("textos de confirmación — coherentes con el flujo real", () => {
  // El restaurante revisa la solicitud y manda un email con la propuesta; la
  // reserva queda confirmada cuando el cliente la confirma desde ese email.
  const FLUJO: Record<Language, RegExp> = {
    es: /propuesta[\s\S]*confirmas desde ese email|confirmes desde ese email/,
    en: /proposal[\s\S]*confirm it from that email/,
    fr: /proposition[\s\S]*confirmez depuis cet e-mail/,
  };
  const PROMESA_ANTIGUA = /cuando el restaurante la confirme|cuando el restaurante confirme|once the restaurant confirms|dès que le restaurant l'aura confirmée|dès que le restaurant confirmera|until you receive the confirmation email|tant que vous ne recevez pas l'email|hasta que recibas el email/;

  for (const { lang, t } of IDIOMAS) {
    it(`${lang}: successLead, successTicket.emailHint y disclaimer.note describen la propuesta por email y la confirmación del cliente`, () => {
      for (const texto of [t.reservationForm.successLead, t.reservationForm.successTicket.emailHint, t.reservas.disclaimer.note]) {
        expect(texto).toMatch(FLUJO[lang]);
        expect(texto).not.toMatch(PROMESA_ANTIGUA);
        // Sin plazos prometidos.
        expect(texto).not.toMatch(/\d+\s*(horas|hours|heures|minutos|minutes|días|days|jours)/i);
      }
    });
  }
});
