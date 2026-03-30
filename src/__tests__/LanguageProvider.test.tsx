/**
 * Tests for LanguageProvider and useTranslations hook
 *
 * Covers:
 * - Default language detection from localStorage
 * - Default language detection from browser navigator.language
 * - Language switching updates the value
 * - useTranslations throws when used outside provider
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageProvider, useTranslations } from "@/i18n/LanguageProvider";

// Increase default timeout for async language pack loading
const WAIT_OPTIONS = { timeout: 5000 };

// ---------------------------------------------------------------------------
// Helper component to read translations context
// ---------------------------------------------------------------------------
function LanguageDisplay() {
  const { language, t } = useTranslations();
  return (
    <div>
      <span data-testid="lang">{language}</span>
      <span data-testid="header-cta">{t.header.cta}</span>
    </div>
  );
}

function LanguageSwitcher() {
  const { language, setLanguage, languages } = useTranslations();
  return (
    <div>
      <span data-testid="lang">{language}</span>
      {languages.map((l) => (
        <button key={l.value} onClick={() => setLanguage(l.value)}>
          {l.value}
        </button>
      ))}
    </div>
  );
}

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  cleanup();
});

describe("LanguageProvider — initial language detection", () => {
  it("defaults to 'es' when nothing is stored in localStorage", async () => {
    render(
      <LanguageProvider>
        <LanguageDisplay />
      </LanguageProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId("lang").textContent).toBe("es");
    }, WAIT_OPTIONS);
  });

  it("uses the language stored in localStorage ('en')", async () => {
    localStorage.setItem("language", "en");
    render(
      <LanguageProvider>
        <LanguageDisplay />
      </LanguageProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId("lang").textContent).toBe("en");
    }, WAIT_OPTIONS);
  });

  it("uses the language stored in localStorage ('fr')", async () => {
    localStorage.setItem("language", "fr");
    render(
      <LanguageProvider>
        <LanguageDisplay />
      </LanguageProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId("lang").textContent).toBe("fr");
    }, WAIT_OPTIONS);
  });

  it("ignores an invalid localStorage value and falls back to 'es'", async () => {
    localStorage.setItem("language", "de"); // not supported
    render(
      <LanguageProvider>
        <LanguageDisplay />
      </LanguageProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId("lang").textContent).toBe("es");
    }, WAIT_OPTIONS);
  });

  it("detects French from navigator.language when localStorage is empty", async () => {
    Object.defineProperty(window.navigator, "language", {
      value: "fr-FR",
      writable: true,
      configurable: true,
    });
    render(
      <LanguageProvider>
        <LanguageDisplay />
      </LanguageProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId("lang").textContent).toBe("fr");
    }, WAIT_OPTIONS);
    // Restore
    Object.defineProperty(window.navigator, "language", {
      value: "es",
      writable: true,
      configurable: true,
    });
  });
});

describe("LanguageProvider — translation values", () => {
  it("provides the Spanish header CTA text", async () => {
    localStorage.setItem("language", "es");
    render(
      <LanguageProvider>
        <LanguageDisplay />
      </LanguageProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId("header-cta").textContent).toBe("Reservar mesa");
    }, WAIT_OPTIONS);
  });

  it("persists the selected language in localStorage", async () => {
    const user = userEvent.setup();
    localStorage.setItem("language", "es");

    render(
      <LanguageProvider>
        <LanguageSwitcher />
      </LanguageProvider>
    );
    await waitFor(() => screen.getByText("en"));

    await user.click(screen.getByText("en"));

    await waitFor(() => {
      expect(localStorage.getItem("language")).toBe("en");
    });
  });

  it("updates the lang attribute on <html> when language changes", async () => {
    localStorage.setItem("language", "es");
    render(
      <LanguageProvider>
        <LanguageDisplay />
      </LanguageProvider>
    );
    await waitFor(() => {
      expect(document.documentElement.lang).toBe("es");
    });
  });
});

describe("useTranslations — error boundary", () => {
  it("throws an error when used outside LanguageProvider", () => {
    // Suppress the React error boundary console output
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function BadComponent() {
      useTranslations(); // should throw
      return null;
    }
    expect(() => render(<BadComponent />)).toThrow(
      "useTranslations must be used within a LanguageProvider"
    );
    spy.mockRestore();
  });
});
