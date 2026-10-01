import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import CartaVinos from "@/components/carta/CartaVinos";

const vinos = [
  {
    id: "v1",
    nombre: "Ribera del Duero Reserva",
    precio_eur: 24.5,
    categoria: "Tintos",
    imagen_url: null,
    denominacion_origen: "D.O. Ribera del Duero",
    alergenos_oficiales: ["sulfitos"],
    alergenos_inferidos: [],
    alergenos_notas: null,
  },
  {
    id: "v2",
    nombre: "Albariño Rías Baixas",
    precio_eur: 19,
    categoria: "Blancos",
    imagen_url: null,
    alergenos_oficiales: [],
    alergenos_inferidos: ["sulfitos"],
    alergenos_notas: "Contiene trazas de frutos de cáscara.",
  },
  {
    id: "v3",
    nombre: "Cava Brut Nature",
    precio_eur: 15,
    categoria: "Espumosos",
    imagen_url: null,
    alergenos_oficiales: [],
    alergenos_inferidos: [],
    alergenos_notas: null,
  },
];

// `CartaVinos` refresca contra Supabase al montarse (import perezoso del
// cliente). Sin este mock los tests hacían la petición DE VERDAD contra el
// proyecto del `.env`, y según cuánto tardara la red la respuesta llegaba a
// mitad de test: el refresco reescribe `vinosByCategory` (incluido el
// `expanded` de cada vino), así que deshacía el clic que el test acababa de
// hacer y los `waitFor` de «Ocultar …» fallaban de forma intermitente.
// El mock devuelve los mismos vinos sembrados y cuenta cuántas consultas han
// terminado, para que `confirmarEdad` espere a que el refresco acabe antes de
// que el test toque nada.
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

/** La carta de vinos vive detrás del diálogo de edad; hay que confirmarlo antes de tocar nada. */
const confirmarEdad = async (user: ReturnType<typeof userEvent.setup>) => {
  const boton = await screen.findByRole("button", { name: /tengo 18\+/i });
  await user.click(boton);
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  // El refresco del montaje (vinos de la categoría; el del mapa no se lanza
  // porque `initialMapVinos` ya lo siembra) ha vuelto: a partir de aquí
  // ningún refresco puede pisar un clic del test.
  await waitFor(() => expect(supabaseMock.terminadas).toBeGreaterThanOrEqual(1));
};

// Los botones de la tarjeta se pulsan con `fireEvent.click` y no con
// `user.click`: el primer clic tras cerrar el diálogo de edad (Radix, modal) a
// veces se lo traga la capa del diálogo que se está desmontando — la secuencia
// pointerdown/pointerup de user-event llega antes de que esa capa suelte el
// documento, y el `onClick` de la tarjeta no se dispara. Dependía de la carga
// de la máquina: 1-3 de estos tests fallaban de forma intermitente. Lo que se
// prueba aquí es el estado de la tarjeta, no la interacción con el diálogo
// (esa sí sigue con `user.click`, en `confirmarEdad`).
//
// Cada tarjeta pinta DOS caras a la vez en el DOM (frontal y trasera, giradas
// con CSS 3D) — mismo patrón que `CartaPlatos`. Por eso el nombre y el botón
// "i" aparecen duplicados; se coge el primero (la cara frontal, que es la que
// se pinta antes en el JSX) para interactuar.
describe("CartaVinos — botón de info (i) que gira la tarjeta", () => {
  beforeEach(() => {
    sessionStorage.clear();
    supabaseMock.terminadas = 0;
  });

  it("muestra el nombre de los vinos sembrados sin esperar a Supabase", async () => {
    const user = userEvent.setup();
    render(<Wrapped />);
    await confirmarEdad(user);
    await waitFor(() => expect(screen.getAllByText("Ribera del Duero Reserva").length).toBeGreaterThan(0));
    expect(screen.getAllByText("Albariño Rías Baixas").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cava Brut Nature").length).toBeGreaterThan(0);
  });

  it("el botón del ojo (foto) es único por tarjeta; el 'i' (alérgenos) existe en ambas caras", async () => {
    const user = userEvent.setup();
    render(<Wrapped />);
    await confirmarEdad(user);
    await waitFor(() => expect(screen.getAllByText("Ribera del Duero Reserva").length).toBeGreaterThan(0));

    // El ojo solo vive en la cara frontal: uno por vino.
    expect(screen.getAllByRole("button", { name: /ver foto/i }).length).toBe(3);
    // La "i" vive en las dos caras (para poder cerrarla desde la trasera
    // también): dos por vino mientras ninguna está girada.
    expect(screen.getAllByRole("button", { name: /ver alérgenos/i }).length).toBe(6);
  });

  it("pulsar 'i' en un vino con alérgeno DECLARADO gira la tarjeta y lo muestra", async () => {
    const user = userEvent.setup();
    render(<Wrapped />);
    await confirmarEdad(user);
    await waitFor(() => expect(screen.getAllByText("Ribera del Duero Reserva").length).toBeGreaterThan(0));

    const [infoBtn] = screen.getAllByRole("button", { name: /ver alérgenos.*ribera del duero/i });
    fireEvent.click(infoBtn);

    // Tras girar, la cara frontal pasa a "Ocultar alérgenos" y el alérgeno
    // declarado aparece (con su propio badge, distinto del de un inferido).
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: /ocultar alérgenos.*ribera del duero/i }).length).toBeGreaterThan(0),
    );
    // "Sulfitos" también sale en el vino v2 (inferido): basta con que aparezca.
    expect(screen.getAllByText("Sulfitos").length).toBeGreaterThan(0);
  });

  it("un vino con alérgeno solo INFERIDO muestra también la nota de alérgenos", async () => {
    const user = userEvent.setup();
    render(<Wrapped />);
    await confirmarEdad(user);
    await waitFor(() => expect(screen.getAllByText("Albariño Rías Baixas").length).toBeGreaterThan(0));

    const [infoBtn] = screen.getAllByRole("button", { name: /ver alérgenos.*albariño/i });
    fireEvent.click(infoBtn);

    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: /ocultar alérgenos.*albariño/i }).length).toBeGreaterThan(0),
    );
    expect(screen.getAllByText("Sulfitos").length).toBeGreaterThan(0);
    expect(screen.getByText(/contiene trazas de frutos de cáscara/i)).toBeInTheDocument();
  });

  it("un vino SIN datos de alérgenos muestra el aviso de 'no consta', no una lista vacía", async () => {
    const user = userEvent.setup();
    render(<Wrapped />);
    await confirmarEdad(user);
    await waitFor(() => expect(screen.getAllByText("Cava Brut Nature").length).toBeGreaterThan(0));

    const [infoBtn] = screen.getAllByRole("button", { name: /ver alérgenos.*cava brut/i });
    fireEvent.click(infoBtn);

    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: /ocultar alérgenos.*cava brut/i }).length).toBeGreaterThan(0),
    );
    expect(screen.getAllByText(/sin información de alérgenos/i).length).toBeGreaterThan(0);
  });

  it("el botón del ojo sigue funcionando igual (expandir/colapsar foto) tras el cambio", async () => {
    const user = userEvent.setup();
    render(<Wrapped />);
    await confirmarEdad(user);
    await waitFor(() => expect(screen.getAllByText("Ribera del Duero Reserva").length).toBeGreaterThan(0));

    const eyeBtn = screen.getByRole("button", { name: /ver foto.*ribera del duero/i });
    fireEvent.click(eyeBtn);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /ocultar foto.*ribera del duero/i })).toBeInTheDocument(),
    );
  });
});
