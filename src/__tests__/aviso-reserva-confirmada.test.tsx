/**
 * Aviso de la carta tras confirmar la reserva desde el correo
 * (`AvisoReservaConfirmada`): `RespuestaReserva` navega a `/carta` con
 * `state.reservaConfirmada` y el aviso sale encima de la carta.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation, useNavigate, type Location } from "react-router-dom";
import AvisoReservaConfirmada, { type ReservaConfirmada } from "@/components/carta/AvisoReservaConfirmada";
import CartaIndice from "@/pages/carta/Indice";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import type { Language } from "@/i18n/types";
import { formatearFecha } from "@/lib/respuesta-reserva";

// `Seo` usa `Head` de vite-react-ssg, que necesita su provider.
vi.mock("@/components/Seo", () => ({ Seo: () => null }));

const ANA: ReservaConfirmada = { estado: "hecho", nombre: "Ana", fecha: "2026-10-03", hora: "21:30", comensales: 4 };
const conReserva = (reserva: Partial<ReservaConfirmada> = {}, pathname = "/carta") => ({
  pathname,
  state: { reservaConfirmada: { ...ANA, ...reserva } },
});

/** Última ubicación vista por la sonda (ruta, `state`...). */
let ultima: Location | null = null;

const Navegacion = () => {
  const navigate = useNavigate();
  ultima = useLocation();
  return (
    <>
      <button type="button" onClick={() => navigate("/carta/arroces")}>
        Ir a arroces
      </button>
      <button type="button" onClick={() => navigate(-1)}>
        Atrás
      </button>
    </>
  );
};

const PaginaCarta = () => (
  <>
    <AvisoReservaConfirmada />
    <Navegacion />
  </>
);

/** Historial `["/", entrada]`, como quien llega a la carta desde otra página. */
const montar = (entrada: string | Partial<Location>, idioma: Language = "es") =>
  render(
    <MemoryRouter initialEntries={["/", entrada]}>
      <LanguageProvider initialLanguage={idioma}>
        <Routes>
          {["/carta", "/en/carta", "/fr/carta"].map((ruta) => (
            <Route key={ruta} path={ruta} element={<PaginaCarta />} />
          ))}
          <Route path="*" element={<Navegacion />} />
        </Routes>
      </LanguageProvider>
    </MemoryRouter>,
  );

describe("AvisoReservaConfirmada", () => {
  it("sin state no abre nada: la carta de siempre", () => {
    montar("/carta");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(ultima?.pathname).toBe("/carta");
  });

  it("con state: título, nombre, fecha, hora y comensales; foco dentro del aviso", async () => {
    montar(conReserva());

    const aviso = await screen.findByRole("dialog", { name: "¡Reserva confirmada!" });
    expect(aviso).toHaveAccessibleDescription(
      "Gracias, Ana. Te esperamos el sábado, 3 de octubre de 2026 a las 21:30 · 4 personas. " +
        "Mientras tanto, aquí tienes nuestra carta para que vayas abriendo boca.",
    );
    // El foco entra en el aviso, en su botón principal; la X tiene nombre.
    expect(screen.getByRole("button", { name: "Ver la carta" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
  });

  it("«Ver la carta» lo cierra, deja al cliente en la carta y borra el state", async () => {
    montar(conReserva());
    await userEvent.click(await screen.findByRole("button", { name: "Ver la carta" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(ultima?.pathname).toBe("/carta");
    expect(ultima?.state).toBeNull();
  });

  it.each([
    ["la X", () => userEvent.click(screen.getByRole("button", { name: "Cerrar" }))],
    ["Escape", () => userEvent.keyboard("{Escape}")],
  ])("también se cierra con %s, y también borra el state", async (_, cerrar) => {
    montar(conReserva());
    await screen.findByRole("dialog");
    await cerrar();

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(ultima?.state).toBeNull();
  });

  it("no reaparece al recargar: la entrada del historial se queda sin state", async () => {
    const primera = montar(conReserva());
    await userEvent.click(await screen.findByRole("button", { name: "Ver la carta" }));
    const tras = ultima!;
    primera.unmount();

    // Recargar = volver a montar la app con esa MISMA entrada del historial.
    montar({ pathname: tras.pathname, search: tras.search, hash: tras.hash, state: tras.state });
    expect(ultima?.pathname).toBe("/carta");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("no reaparece al volver atrás: se cerró con replace, sin dejar otra entrada con el aviso", async () => {
    montar(conReserva());
    await userEvent.click(await screen.findByRole("button", { name: "Ver la carta" }));
    await userEvent.click(screen.getByRole("button", { name: "Atrás" }));

    expect(ultima?.pathname).toBe("/");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("ni al volver a la carta desde otra página", async () => {
    montar(conReserva());
    await userEvent.click(await screen.findByRole("button", { name: "Ver la carta" }));
    await userEvent.click(screen.getByRole("button", { name: "Ir a arroces" }));
    expect(ultima?.pathname).toBe("/carta/arroces");
    await userEvent.click(screen.getByRole("button", { name: "Atrás" }));

    expect(ultima?.pathname).toBe("/carta");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("ya estaba confirmada: su propio título y texto", async () => {
    montar(conReserva({ estado: "ya_hecho" }));

    const aviso = await screen.findByRole("dialog", { name: "Tu reserva ya estaba confirmada" });
    expect(aviso).toHaveAccessibleDescription(
      "No tienes que hacer nada más. Mientras tanto, ve abriendo boca con nuestra carta.",
    );
    expect(screen.getByRole("button", { name: "Ver la carta" })).toBeInTheDocument();
  });

  it("sin nombre: saludo genérico, sin huecos", async () => {
    montar(conReserva({ nombre: "" }));

    expect(await screen.findByRole("dialog", { name: "¡Reserva confirmada!" })).toHaveAccessibleDescription(
      "¡Gracias! Te esperamos el sábado, 3 de octubre de 2026 a las 21:30 · 4 personas. " +
        "Mientras tanto, aquí tienes nuestra carta para que vayas abriendo boca.",
    );
  });

  it("una persona en singular; sin comensales no se nombran", async () => {
    const una = montar(conReserva({ comensales: 1 }));
    expect(await screen.findByRole("dialog")).toHaveAccessibleDescription(/a las 21:30 · 1 persona\. Mientras/);
    una.unmount();

    montar(conReserva({ comensales: 0 }));
    expect(await screen.findByRole("dialog")).toHaveAccessibleDescription(/a las 21:30\. Mientras/);
  });

  // La carta no importa `formatearFecha` (arrastraría todo respuesta-reserva.ts
  // a su JS), pero el cliente debe leer la MISMA fecha que en la página de
  // respuesta, también con una fecha imposible.
  it.each(["2026-10-03", "2026-01-01", "2026-12-31", "2028-02-29", "2027-06-14", "2026-02-30"])(
    "en español la fecha sale igual que en la página de respuesta (%s)",
    async (fecha) => {
      montar(conReserva({ fecha }));
      expect(await screen.findByRole("dialog")).toHaveAccessibleDescription(
        new RegExp(`Te esperamos el ${formatearFecha(fecha)} a las 21:30 ·`),
      );
    },
  );

  it.each([
    {
      idioma: "en" as const,
      titulo: "Booking confirmed!",
      cuerpo:
        /^Thank you, Ana\. We look forward to seeing you on Saturday,? 3 October 2026 at 21:30 · 4 people\. In the meantime, here is our menu to whet your appetite\.$/,
      yaTitulo: "Your booking was already confirmed",
      boton: "View the menu",
      cerrar: "Close",
    },
    {
      idioma: "fr" as const,
      titulo: "Réservation confirmée !",
      cuerpo:
        /^Merci, Ana\. Nous vous attendons le samedi 3 octobre 2026 à 21:30 · 4 personnes\. En attendant, voici notre carte pour vous mettre en appétit\.$/,
      yaTitulo: "Votre réservation était déjà confirmée",
      boton: "Voir la carte",
      cerrar: "Fermer",
    },
  ])("en $idioma: textos, fecha y botones en su idioma", async ({ idioma, titulo, cuerpo, yaTitulo, boton, cerrar }) => {
    const confirmada = montar(conReserva({}, `/${idioma}/carta`), idioma);
    expect(await screen.findByRole("dialog", { name: titulo })).toHaveAccessibleDescription(cuerpo);
    expect(screen.getByRole("button", { name: boton })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: cerrar })).toBeInTheDocument();
    confirmada.unmount();

    montar(conReserva({ estado: "ya_hecho" }, `/${idioma}/carta`), idioma);
    expect(await screen.findByRole("dialog", { name: yaTitulo })).toBeInTheDocument();
  });
});

describe("/carta (página de verdad)", () => {
  const pintarCarta = (entrada: string | Partial<Location>) =>
    render(
      <MemoryRouter initialEntries={[entrada]}>
        <LanguageProvider initialLanguage="es">
          <Routes>
            <Route
              path="/carta"
              element={
                <>
                  <CartaIndice />
                  <Navegacion />
                </>
              }
            />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>,
    );

  it("sin state: la carta y ningún pop-up", () => {
    pintarCarta("/carta");
    expect(screen.getByRole("heading", { level: 1, name: "Carta de Casa Tomás: marisco, carnes y arroces" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("con state: el aviso sale encima de la carta y al cerrarlo queda la carta", async () => {
    pintarCarta(conReserva());
    expect(await screen.findByRole("dialog", { name: "¡Reserva confirmada!" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Ver la carta" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: "Carta de Casa Tomás: marisco, carnes y arroces" })).toBeInTheDocument();
    expect(ultima?.state).toBeNull();
  });
});
