import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import CartaVinos from "@/components/carta/CartaVinos";
import { getUserPedido } from "@/utils/sessionManager";

// Copa y puntuación Parker en la tarjeta (04/11/2026, petición del dueño).
const vinos = [
  {
    id: "copa", nombre: "Pago de Carraovejas", precio_eur: 50, categoria: "VINOS TINTOS — RIBERA DEL DUERO",
    copeo: true, precio_copa_eur: 7.5, puntuacion_parker: 93, puntuacion_parker_anada: 2023,
    alergenos_oficiales: [], alergenos_inferidos: [], alergenos_notas: null,
  },
  {
    id: "botella", nombre: "Albariño Rías Baixas", precio_eur: 19, categoria: "VINOS BLANCOS — RÍAS BAIXAS",
    copeo: false, precio_copa_eur: 4, puntuacion_parker: null,
    alergenos_oficiales: [], alergenos_inferidos: [], alergenos_notas: null,
  },
  {
    // 08/11/2026: texto con «+» (verificada, de la añada que se sirve).
    id: "mas", nombre: "Mauro", precio_eur: 55, categoria: "VINOS TINTOS — IGP CASTILLA Y LEÓN",
    puntuacion_parker: 94, puntuacion_parker_anada: 2023, puntuacion_parker_texto: "94+",
    alergenos_oficiales: [], alergenos_inferidos: [], alergenos_notas: null,
  },
  {
    // Intervalo definitivo y NV (sin añada): «95–97», sin «(añada …)».
    id: "nv", nombre: "Krug Grande Cuvée", precio_eur: 330, categoria: "VINOS ESPUMOSOS — CHAMPAGNE",
    puntuacion_parker: 95, puntuacion_parker_anada: null, puntuacion_parker_texto: "95–97",
    alergenos_oficiales: [], alergenos_inferidos: [], alergenos_notas: null,
  },
  {
    // Datos raros (cero puntos o texto que no casa): nunca «0» ni un texto inventado.
    id: "cero", nombre: "Vino sin datos", precio_eur: 20, categoria: "VINOS TINTOS — RIOJA",
    puntuacion_parker: 0, puntuacion_parker_texto: "0",
    alergenos_oficiales: [], alergenos_inferidos: [], alergenos_notas: null,
  },
  {
    id: "texto-raro", nombre: "Vino texto raro", precio_eur: 20, categoria: "VINOS TINTOS — RIOJA",
    puntuacion_parker: 91, puntuacion_parker_anada: 2020, puntuacion_parker_texto: "99",
    alergenos_oficiales: [], alergenos_inferidos: [], alergenos_notas: null,
  },
  {
    // «copeo» sin precio de copa (no debería existir: la BD lo impide): sin botón.
    id: "sin-precio", nombre: "Cava Brut Nature", precio_eur: 15, categoria: "VINOS ESPUMOSOS — CAVA",
    copeo: true, precio_copa_eur: null, alergenos_oficiales: [], alergenos_inferidos: [], alergenos_notas: null,
  },
];

const supabaseMock = vi.hoisted(() => ({ terminadas: 0 }));
vi.mock("@/integrations/supabase/client", () => {
  const consulta: Record<string, unknown> = {};
  for (const metodo of ["select", "eq", "is", "order", "range", "in"]) consulta[metodo] = () => consulta;
  consulta.then = (resolver: (valor: unknown) => unknown, rechazar?: (motivo: unknown) => unknown) =>
    Promise.resolve({ data: vinos, error: null })
      .then((valor) => { supabaseMock.terminadas += 1; return valor; })
      .then(resolver, rechazar);
  return { supabase: { from: () => consulta } };
});

const pintar = () =>
  render(
    <LanguageProvider>
      <CartaVinos showAddButton initialVinos={{ Todos: vinos }} initialMapVinos={vinos} />
    </LanguageProvider>,
  );

const confirmarEdad = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole("button", { name: /tengo 18\+/i }));
  await waitFor(() => expect(supabaseMock.terminadas).toBeGreaterThanOrEqual(1));
};

const tarjeta = (nombre: string) => screen.getByRole("heading", { name: nombre }).closest(".overflow-hidden") as HTMLElement;

describe("CartaVinos — copa y puntuación Parker", () => {
  beforeEach(() => { sessionStorage.clear(); supabaseMock.terminadas = 0; });

  it("el icono Parker enseña los puntos y dice la añada", async () => {
    const user = userEvent.setup();
    pintar();
    await confirmarEdad(user);
    const icono = within(tarjeta("Pago de Carraovejas")).getByRole("img", { name: "Puntuación Parker: 93 puntos (añada 2023)" });
    expect(icono).toHaveTextContent("93RP");
    expect(within(tarjeta("Albariño Rías Baixas")).queryByRole("img", { name: /Parker/ })).not.toBeInTheDocument();
  });

  it("enseña la puntuación tal cual (94+, intervalo) y nunca cero puntos", async () => {
    const user = userEvent.setup();
    pintar();
    await confirmarEdad(user);
    expect(within(tarjeta("Mauro")).getByRole("img", { name: "Puntuación Parker: 94+ puntos (añada 2023)" })).toHaveTextContent("94+RP");
    expect(within(tarjeta("Krug Grande Cuvée")).getByRole("img", { name: "Puntuación Parker: 95–97 puntos" })).toHaveTextContent("95–97RP");
    expect(within(tarjeta("Vino sin datos")).queryByRole("img", { name: /Parker/ })).not.toBeInTheDocument();
    // Un texto que no casa con los puntos no se enseña: se usan los puntos.
    expect(within(tarjeta("Vino texto raro")).getByRole("img", { name: "Puntuación Parker: 91 puntos (añada 2020)" })).toBeInTheDocument();
  });

  it("solo los vinos por copas (con precio) tienen el botón de la copa", async () => {
    const user = userEvent.setup();
    pintar();
    await confirmarEdad(user);
    expect(screen.getAllByRole("button", { name: /Ver precio por copa/ })).toHaveLength(1);
    expect(within(tarjeta("Albariño Rías Baixas")).queryByRole("button", { name: /copa/ })).not.toBeInTheDocument();
    expect(within(tarjeta("Cava Brut Nature")).queryByRole("button", { name: /copa/ })).not.toBeInTheDocument();
  });

  it("la copa cambia el precio y «Añadir» añade la copa como otra línea", async () => {
    const user = userEvent.setup();
    pintar();
    await confirmarEdad(user);
    const ficha = tarjeta("Pago de Carraovejas");
    expect(ficha).toHaveTextContent(/50,00\s*€/);
    const boton = within(ficha).getByRole("button", { name: /Ver precio por copa/ });
    await user.click(boton);
    expect(boton).toHaveAttribute("aria-pressed", "true");
    expect(ficha).toHaveTextContent(/7,50\s*€\s*\/\s*copa/);
    await user.click(within(ficha).getByRole("button", { name: /Añadir — Pago de Carraovejas \(copa\)/ }));
    await user.click(within(ficha).getByRole("button", { name: /Ver precio de la botella/ }));
    expect(ficha).toHaveTextContent(/50,00\s*€/);
    await user.click(within(ficha).getByRole("button", { name: /^Añadir — Pago de Carraovejas$/ }));
    const pedido = getUserPedido() as { id: string; nombre: string; precio_eur: number }[];
    expect(pedido.map(({ id, nombre, precio_eur }) => ({ id, nombre, precio_eur }))).toEqual([
      { id: "copa:copa", nombre: "Pago de Carraovejas (copa)", precio_eur: 7.5 },
      { id: "copa", nombre: "Pago de Carraovejas", precio_eur: 50 },
    ]);
  });
});
