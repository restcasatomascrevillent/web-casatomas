/**
 * `?comensales=N` en /reservas (lo manda "Reservar mesa para N" desde Mi mesa):
 * 1–12 rellena el campo; >12 no lo toca y enseña el aviso de grupos grandes.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

  it("rellena el número de comensales si está entre 1 y 12", async () => {
    renderConUrl("?comensales=6");
    await waitFor(() => expect(campoComensales().value).toBe("6"));
    expect(screen.queryByText(/grupos de más de 12/i)).not.toBeInTheDocument();
  });

  it("con más de 12 deja el valor por defecto y muestra el aviso de grupos grandes", async () => {
    renderConUrl("?comensales=18");
    expect(await screen.findByText(/grupos de más de 12/i)).toBeInTheDocument();
    expect(campoComensales().value).toBe("2");
  });

  it("sin parámetro deja el valor por defecto", async () => {
    renderConUrl("");
    await waitFor(() => expect(campoComensales().value).toBe("2"));
    expect(screen.queryByText(/grupos de más de 12/i)).not.toBeInTheDocument();
  });
});
