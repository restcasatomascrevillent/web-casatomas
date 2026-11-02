/**
 * Tests for CookieConsent component
 *
 * Covers:
 * - Banner is shown when no consent is stored
 * - Banner is hidden when consent is already stored (new format and the
 *   legacy plain-string format, migrated transparently)
 * - "Aceptar todas" / "Rechazar" store a real preference and hide the banner
 * - "Configurar" opens a preferences dialog with a real, working toggle for
 *   the only optional cookie (the Mapbox map) and a disabled always-on
 *   toggle for necessary cookies
 * - The preferences dialog can be reopened later via the shared
 *   `openCookiePreferences()` call (what the footer link uses)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import CookieConsent from "@/components/CookieConsent";
import { openCookiePreferences } from "@/lib/cookie-consent";

const readStoredConsent = () => {
  const raw = localStorage.getItem("cookieConsent");
  return raw ? JSON.parse(raw) : null;
};

// Silence framer-motion animation warnings in jsdom
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  document.cookie = "cookie_consent=; Max-Age=0; Path=/";
});

function renderConsent() {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <CookieConsent />
      </LanguageProvider>
    </MemoryRouter>
  );
}

describe("CookieConsent", () => {
  it("shows the banner when there is no stored consent", async () => {
    renderConsent();
    await waitFor(() => {
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThanOrEqual(3); // Rechazar / Configurar / Aceptar todas
    });
  });

  it("does NOT show the banner when cookieConsent is already set (current format)", async () => {
    localStorage.setItem("cookieConsent", JSON.stringify({ maps: true, ts: new Date().toISOString() }));
    renderConsent();

    await waitFor(() => {
      expect(screen.queryAllByRole("button").length).toBe(0);
    });
  });

  it("migrates the old plain-string format ('accepted'/'rejected') without re-asking", async () => {
    localStorage.setItem("cookieConsent", "accepted");
    renderConsent();

    await waitFor(() => {
      expect(screen.queryAllByRole("button").length).toBe(0);
    });
  });

  it("hides the banner and stores maps:true when 'Aceptar todas' is clicked", async () => {
    const user = userEvent.setup();
    renderConsent();

    await waitFor(() => {
      expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(3);
    });

    const buttons = screen.getAllByRole("button");
    await user.click(buttons[buttons.length - 1]); // Aceptar todas: el último, a la derecha

    expect(readStoredConsent()).toMatchObject({ maps: true });
    // Respaldada también en una cookie real, no solo en localStorage.
    expect(document.cookie).toContain("cookie_consent=");

    await waitFor(() => {
      expect(screen.queryAllByRole("button").length).toBe(0);
    });
  });

  it("hides the banner and stores maps:false when 'Rechazar' is clicked", async () => {
    const user = userEvent.setup();
    renderConsent();

    await waitFor(() => {
      expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(3);
    });

    const buttons = screen.getAllByRole("button");
    await user.click(buttons[0]); // Rechazar: el primero, a la izquierda

    expect(readStoredConsent()).toMatchObject({ maps: false });

    await waitFor(() => {
      expect(screen.queryAllByRole("button").length).toBe(0);
    });
  });

  it("'Configurar' opens a real preferences dialog: necessary is locked on, maps is a working toggle", async () => {
    const user = userEvent.setup();
    renderConsent();

    await waitFor(() => {
      expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(3);
    });

    const buttons = screen.getAllByRole("button");
    await user.click(buttons[1]); // Configurar: el del medio

    const switches = await screen.findAllByRole("switch");
    expect(switches).toHaveLength(2);
    expect(switches[0]).toBeChecked();
    expect(switches[0]).toBeDisabled(); // Necesarias: siempre activas, no se puede apagar
    expect(switches[1]).not.toBeChecked(); // Mapa: no preseleccionado (opt-in real, no casilla premarcada)

    await user.click(switches[1]);
    expect(switches[1]).toBeChecked();

    await user.click(screen.getByRole("button", { name: /guardar preferencias/i }));

    expect(readStoredConsent()).toMatchObject({ maps: true });
    await waitFor(() => {
      expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    });
  });

  it("reopens the preferences dialog on openCookiePreferences(), even after consent was already given", async () => {
    localStorage.setItem("cookieConsent", JSON.stringify({ maps: true, ts: new Date().toISOString() }));
    renderConsent();

    // Sin el aviso inicial (ya hay consentimiento guardado).
    await waitFor(() => {
      expect(screen.queryAllByRole("button").length).toBe(0);
    });

    openCookiePreferences(); // lo mismo que dispara el enlace "Configurar cookies" del footer

    const switches = await screen.findAllByRole("switch");
    expect(switches[1]).toBeChecked(); // refleja la elección ya guardada (maps:true), no se resetea
  });

  it("Esc con el aviso a la vista rechaza las opcionales y lo cierra", async () => {
    const user = userEvent.setup();
    renderConsent();
    await waitFor(() => expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(3));

    await user.keyboard("{Escape}");

    expect(readStoredConsent()).toMatchObject({ maps: false });
    await waitFor(() => expect(screen.queryAllByRole("button").length).toBe(0));
  });

  it("Esc ya atendido por algo de más arriba (chat, menú) no toca el aviso", async () => {
    renderConsent();
    await waitFor(() => expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(3));

    // Así marca el Esc el chat (window, captura) antes de que llegue al aviso.
    const marcar = (e: KeyboardEvent) => e.preventDefault();
    window.addEventListener("keydown", marcar, true);
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    window.removeEventListener("keydown", marcar, true);

    expect(readStoredConsent()).toBeNull();
    expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(3);
  });
});
