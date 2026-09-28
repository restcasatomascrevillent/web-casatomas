import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
};

// Cada tarjeta pinta DOS caras a la vez en el DOM (frontal y trasera, giradas
// con CSS 3D) — mismo patrón que `CartaPlatos`. Por eso el nombre y el botón
// "i" aparecen duplicados; se coge el primero (la cara frontal, que es la que
// se pinta antes en el JSX) para interactuar.
describe("CartaVinos — botón de info (i) que gira la tarjeta", () => {
  beforeEach(() => {
    sessionStorage.clear();
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
    await user.click(infoBtn);

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
    await user.click(infoBtn);

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
    await user.click(infoBtn);

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
    await user.click(eyeBtn);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /ocultar foto.*ribera del duero/i })).toBeInTheDocument(),
    );
  });
});
