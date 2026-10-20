/**
 * El calendario (react-day-picker) debe hablar el idioma de la página: meses,
 * días de la semana y aria-labels de los botones de mes. Sin `locale`/`labels`
 * salía todo en inglés, también en /reservas y /fr/reservas.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { Calendar } from "@/components/ui/calendar";
import type { Language } from "@/i18n/types";

const MES = new Date(2026, 9, 15); // octubre de 2026

function pintar(lang: Language) {
  return render(
    <LanguageProvider initialLanguage={lang}>
      <Calendar mode="single" month={MES} />
    </LanguageProvider>,
  );
}

describe("Calendar: idioma", () => {
  it("es: mes en español, semana desde el lunes y botones de mes en español", () => {
    const { container } = pintar("es");
    expect(screen.getByText(/octubre 2026/i)).toBeInTheDocument();
    const cabecera = [...container.querySelectorAll("thead th")].map((th) => th.textContent?.toLowerCase());
    expect(cabecera[0]).toMatch(/^lu/);
    expect(cabecera[6]).toMatch(/^do/);
    expect(screen.getByRole("button", { name: "Mes anterior" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mes siguiente" })).toBeInTheDocument();
    expect(screen.queryByText(/october/i)).toBeNull();
  });

  it("fr: mois en français, semaine desde el lunes y botones en francés", () => {
    const { container } = pintar("fr");
    expect(screen.getByText(/octobre 2026/i)).toBeInTheDocument();
    const cabecera = [...container.querySelectorAll("thead th")].map((th) => th.textContent?.toLowerCase());
    expect(cabecera[0]).toMatch(/^lu/);
    expect(cabecera[6]).toMatch(/^di/);
    expect(screen.getByRole("button", { name: "Mois précédent" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mois suivant" })).toBeInTheDocument();
  });

  it("en: mes en inglés y botones en inglés", () => {
    pintar("en");
    expect(screen.getByText(/october 2026/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous month" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next month" })).toBeInTheDocument();
  });

  it("un `locale` explícito de quien llama gana sobre el del idioma", async () => {
    const { fr } = await import("date-fns/locale");
    render(
      <LanguageProvider initialLanguage="es">
        <Calendar mode="single" month={MES} locale={fr} />
      </LanguageProvider>,
    );
    expect(screen.getByText(/octobre 2026/i)).toBeInTheDocument();
  });
});
