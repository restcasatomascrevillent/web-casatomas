/**
 * `?comensales=N` en /reservas (lo manda "Reservar mesa para N" desde Mi mesa):
 * 1–7 rellena el campo; 8 o más no lo toca y enseña el aviso de grupos grandes.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { ReservationForm } from "@/components/ReservationForm";

const renderConUrl = (search: string) => {
  window.history.pushState({}, "", `/reservas${search}`);
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <ReservationForm />
      </LanguageProvider>
    </MemoryRouter>,
  );
};

const campoComensales = () => screen.getByLabelText(/Número de comensales/i) as HTMLInputElement;

describe("ReservationForm — ?comensales= desde Mi mesa", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    window.history.pushState({}, "", "/");
    vi.restoreAllMocks();
  });

  it("rellena el número de comensales si está entre 1 y 7", async () => {
    renderConUrl("?comensales=6");
    await waitFor(() => expect(campoComensales().value).toBe("6"));
    expect(screen.queryByText(/8 o más personas se reservan solo por teléfono/i)).not.toBeInTheDocument();
  });

  it("con 8 o más deja el valor por defecto y muestra el aviso de grupos grandes", async () => {
    renderConUrl("?comensales=8");
    expect(await screen.findByText(/8 o más personas se reservan solo por teléfono/i)).toBeInTheDocument();
    expect(campoComensales().value).toBe("2");
  });

  it("sin parámetro deja el valor por defecto", async () => {
    renderConUrl("");
    await waitFor(() => expect(campoComensales().value).toBe("2"));
    expect(screen.queryByText(/8 o más personas se reservan solo por teléfono/i)).not.toBeInTheDocument();
  });

  it("si se escriben 8 o más comensales muestra el aviso con el teléfono pulsable", async () => {
    renderConUrl("");
    const campo = campoComensales();
    fireEvent.change(campo, { target: { value: "9" } });
    expect(await screen.findByText(/8 o más personas se reservan solo por teléfono/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link").some((a) => a.getAttribute("href") === "tel:+34966107887")).toBe(true);
    expect(campo.max).toBe("7");
  });

  it("avisa de que no se admiten mascotas antes de confirmar", () => {
    renderConUrl("");
    expect(screen.getByText(/No se admiten mascotas/i)).toBeInTheDocument();
  });
});
