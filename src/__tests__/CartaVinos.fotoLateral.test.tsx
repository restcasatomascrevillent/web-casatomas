import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import CartaVinos from "@/components/carta/CartaVinos";

/**
 * La foto del vino va en el LATERAL de la tarjeta (no debajo): el marco es
 * hermano de la columna de texto dentro de una fila (después en el DOM,
 * `order-first` lo deja a la izquierda), con `width`/`height` para no mover la
 * página. Las fotos de carta (`-carta-<ext>.webp`, las que guarda el panel) van
 * en un marco 3:5 con `object-cover` sobre su cartulina; las antiguas, en un
 * marco 3:4 con `object-contain` sobre su fondo oscuro. La disposición real
 * (alturas, solapes) la miden los e2e (`e2e/carta-vinos-foto-lateral.e2e.ts`);
 * aquí, la estructura y los atributos.
 */
const vinos = [
  {
    id: "c1", nombre: "Capellanía Reserva", precio_eur: 86, categoria: "Blancos", expanded: true,
    imagen_url: "https://example.com/storage/v1/object/public/vinos/capellania-carta-webp.webp",
    descripcion: "Fermentado en barrica.", denominacion_origen: "D.O.Ca. Rioja",
    alergenos_oficiales: ["sulfitos"], alergenos_inferidos: [], alergenos_notas: null,
  },
  {
    id: "a1", nombre: "Viña Antigua", precio_eur: 22, categoria: "Tintos", expanded: true,
    imagen_url: "https://example.com/storage/v1/object/public/vinos/vina-antigua.jpg",
    alergenos_oficiales: [], alergenos_inferidos: [], alergenos_notas: null,
  },
  {
    id: "p1", nombre: "Vino Sin Precio", precio_eur: 0, categoria: "Tintos", imagen_url: null,
    alergenos_oficiales: [], alergenos_inferidos: [], alergenos_notas: null,
  },
  {
    id: "z1", nombre: "Albariño Cerrado", precio_eur: 19, categoria: "Blancos",
    imagen_url: "https://example.com/storage/v1/object/public/vinos/albarino-carta-jpg.webp",
    alergenos_oficiales: [], alergenos_inferidos: [], alergenos_notas: null,
  },
];

const supabaseMock = vi.hoisted(() => ({ terminadas: 0, datos: [] as unknown[] }));

vi.mock("@/integrations/supabase/client", () => {
  const consulta: Record<string, unknown> = {};
  for (const metodo of ["select", "eq", "is", "order", "range"]) consulta[metodo] = () => consulta;
  consulta.then = (resolver: (valor: unknown) => unknown, rechazar?: (motivo: unknown) => unknown) =>
    Promise.resolve({ data: supabaseMock.datos, error: null })
      .then((valor) => {
        supabaseMock.terminadas += 1;
        return valor;
      })
      .then(resolver, rechazar);
  return { supabase: { from: () => consulta } };
});

supabaseMock.datos = vinos;

const Wrapped = () => (
  <LanguageProvider>
    <CartaVinos showAddButton initialVinos={{ Todos: vinos }} initialMapVinos={vinos} />
  </LanguageProvider>
);

const confirmarEdad = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole("button", { name: /tengo 18\+/i }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  await waitFor(() => expect(supabaseMock.terminadas).toBeGreaterThanOrEqual(1));
};

const marcoDe = (alt: RegExp) => screen.getByAltText(alt).parentElement as HTMLElement;

describe("CartaVinos — foto en el lateral de la tarjeta", () => {
  beforeEach(() => {
    sessionStorage.clear();
    supabaseMock.terminadas = 0;
  });

  it("la foto es una columna hermana del texto (no va debajo), después en el DOM y a la izquierda con `order-first`", async () => {
    const user = userEvent.setup(); render(<Wrapped />); await confirmarEdad(user);
    const marco = marcoDe(/Capellanía Reserva/);
    const columnaTexto = screen.getByRole("heading", { name: "Capellanía Reserva" }).closest("div.min-w-0.flex-1.flex-col") as HTMLElement;
    // Misma fila: el marco y la columna del texto cuelgan del mismo contenedor.
    expect(marco.parentElement).toBe(columnaTexto.parentElement);
    // Orden de lectura: primero el texto (nombre, precio, «Añadir»), luego la foto; `order-first` la deja a la izquierda.
    expect(columnaTexto.nextElementSibling).toBe(marco);
    expect(marco).toHaveClass("order-first", "shrink-0");
    // El título, el precio y «Añadir» están en la columna de texto, no en el marco.
    expect(columnaTexto).toContainElement(screen.getByRole("button", { name: /añadir — capellanía reserva/i }));
    expect(marco).not.toContainElement(screen.getByRole("heading", { name: "Capellanía Reserva" }));
    // Marco de carta: 3:5 y estrecho (27 %, tope 6,5 rem), no a todo el ancho ni de alto fijo como antes.
    expect(marco).toHaveClass("aspect-[3/5]", "w-[27%]", "max-w-[6.5rem]");
    expect(marco.className).not.toMatch(/\bh-80\b|\bsm:h-96\b|\bw-full\b|aspect-\[3\/4\]/);
  });

  it("fotos de carta: object-cover (el marco es más estrecho que 3:4: solo recorta cartulina de los lados); width/height, lazy y async", async () => {
    const user = userEvent.setup(); render(<Wrapped />); await confirmarEdad(user);
    const foto = screen.getByAltText(/Capellanía Reserva — Blancos, Casa Tomás Restaurante/);
    expect(foto).toHaveClass("object-cover", "h-full", "w-full");
    expect(foto.className).not.toMatch(/object-contain/);
    expect(foto).toHaveAttribute("width", "900");
    expect(foto).toHaveAttribute("height", "1200");
    expect(foto).toHaveAttribute("loading", "lazy");
    expect(foto).toHaveAttribute("decoding", "async");
  });

  it("fotos antiguas (otras proporciones): marco 3:4 y object-contain, enteras, sobre su fondo oscuro", async () => {
    const user = userEvent.setup(); render(<Wrapped />); await confirmarEdad(user);
    const foto = screen.getByAltText(/Viña Antigua/);
    expect(foto).toHaveClass("object-contain", "h-full", "w-full");
    expect(foto.className).not.toMatch(/object-cover/);
    expect(marcoDe(/Viña Antigua/)).toHaveClass("aspect-[3/4]", "w-[36%]", "max-w-[8rem]", "order-first");
    expect(foto).toHaveAttribute("width", "900");
    expect(foto).toHaveAttribute("height", "1200");
  });

  it("el fondo del marco casa con la foto: cartulina para «-carta», el oscuro de siempre para las antiguas", async () => {
    const user = userEvent.setup(); render(<Wrapped />); await confirmarEdad(user);
    expect(marcoDe(/Capellanía Reserva/)).toHaveClass("bg-[#cdae77]");
    expect(marcoDe(/Capellanía Reserva/).className).not.toContain("bg-[#1a1612]");
    expect(marcoDe(/Viña Antigua/)).toHaveClass("bg-[#1a1612]");
  });

  it("el ojo apunta al marco (aria-controls = id) y lo muestra/oculta; sin `expanded` la foto arranca cerrada", async () => {
    const user = userEvent.setup(); render(<Wrapped />); await confirmarEdad(user);
    const ojo = screen.getByRole("button", { name: /ocultar foto.*capellanía reserva/i });
    expect(ojo).toHaveAttribute("aria-expanded", "true");
    expect(ojo).toHaveAttribute("aria-controls", marcoDe(/Capellanía Reserva/).id);
    fireEvent.click(ojo);
    expect(screen.queryByAltText(/Capellanía Reserva/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ver foto.*capellanía reserva/i })).toHaveAttribute("aria-expanded", "false");

    expect(screen.queryByAltText(/Albariño Cerrado/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /ver foto.*albariño cerrado/i }));
    expect(screen.getByAltText(/Albariño Cerrado/)).toBeInTheDocument();
  });

  it("una foto que falla se retira y deja la ficha a su ancho de siempre", async () => {
    const user = userEvent.setup(); render(<Wrapped />); await confirmarEdad(user);
    fireEvent.error(screen.getByAltText(/Capellanía Reserva/));
    await waitFor(() => expect(screen.queryByAltText(/Capellanía Reserva/)).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: /ver foto.*capellanía reserva/i })).toBeDisabled();
    expect(document.querySelector("[id='foto-vino-c1']")).toBeNull();
  });

  it("la información («i») sigue sustituyendo a la foto y ocupa toda la ficha", async () => {
    const user = userEvent.setup(); render(<Wrapped />); await confirmarEdad(user);
    fireEvent.click(screen.getByRole("button", { name: /ver información.*capellanía reserva/i }));
    expect(screen.queryByAltText(/Capellanía Reserva/)).not.toBeInTheDocument();
    expect(screen.getByText("Fermentado en barrica.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ocultar información.*capellanía reserva/i })).toHaveAttribute("aria-expanded", "true");
  });

  it("misma escala con y sin foto: título text-base sin salto a sm:text-lg, precio text-base y text-lg desde 360 px", async () => {
    const user = userEvent.setup(); render(<Wrapped />); await confirmarEdad(user);
    for (const nombre of ["Capellanía Reserva", "Albariño Cerrado"]) {
      const titulo = screen.getByRole("heading", { name: nombre });
      expect(titulo, nombre).toHaveClass("text-base");
      expect(titulo.className, nombre).not.toMatch(/sm:text-lg/);
    }
    for (const texto of ["86,00 €", "19,00 €"]) {
      expect(screen.getByText(texto), texto).toHaveClass("text-base", "min-[360px]:text-lg", "font-libre-baskerville", "text-accent");
    }
  });

  it("«Consultar precio» no es un precio: sans, pequeño, gris y sin el dorado serif del precio", async () => {
    const user = userEvent.setup(); render(<Wrapped />); await confirmarEdad(user);
    const aviso = screen.getByText("Consultar precio");
    expect(aviso).toHaveClass("font-sans", "text-sm", "font-medium", "text-muted-foreground");
    expect(aviso.className).not.toMatch(/font-libre-baskerville|text-accent|font-bold|text-lg|text-xl/);
    expect(screen.getByRole("button", { name: /añadir — vino sin precio/i })).toBeDisabled();
  });

  it("los botones ojo e «i» llevan ring-offset-2 al enfocar, como en ProductoCard", async () => {
    const user = userEvent.setup(); render(<Wrapped />); await confirmarEdad(user);
    for (const nombre of [/ocultar foto.*capellanía reserva/i, /ver información.*capellanía reserva/i]) {
      expect(screen.getByRole("button", { name: nombre })).toHaveClass("focus-visible:ring-2", "focus-visible:ring-offset-2");
    }
  });
});
