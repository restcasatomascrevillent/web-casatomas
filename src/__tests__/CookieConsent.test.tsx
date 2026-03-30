/**
 * Tests for CookieConsent component
 *
 * Covers:
 * - Banner is shown when no consent is stored in localStorage
 * - Banner is hidden when consent is already stored
 * - Accept button stores "accepted" and hides the banner
 * - Reject button stores "rejected" and hides the banner
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import CookieConsent from "@/components/CookieConsent";

// Silence framer-motion animation warnings in jsdom
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
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
  it("shows the banner when localStorage has no cookieConsent entry", async () => {
    renderConsent();
    // The banner title is translated — look for the Cookie icon or any text from the component
    // LanguageProvider may show a loading spinner briefly, so we wait.
    await waitFor(() => {
      // The component renders a Card with a title (t.cookie.title) and two buttons
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("does NOT show the banner when cookieConsent is already set", async () => {
    localStorage.setItem("cookieConsent", "accepted");
    renderConsent();

    // Wait a tick for the LanguageProvider to resolve, then check the DOM
    await waitFor(() => {
      // If there are no buttons the banner is not shown (only CookieConsent renders buttons)
      const buttons = screen.queryAllByRole("button");
      expect(buttons.length).toBe(0);
    });
  });

  it("hides the banner and stores 'accepted' when the accept button is clicked", async () => {
    const user = userEvent.setup();
    renderConsent();

    // Wait for the banner to appear — buttons must be present
    await waitFor(() => {
      expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(2);
    });

    // The accept button is the second button (after reject)
    const buttons = screen.getAllByRole("button");
    const acceptButton = buttons[buttons.length - 1]; // Accept is last (right side)
    await user.click(acceptButton);

    expect(localStorage.getItem("cookieConsent")).toBe("accepted");

    await waitFor(() => {
      expect(screen.queryAllByRole("button").length).toBe(0);
    });
  });

  it("hides the banner and stores 'rejected' when the reject button is clicked", async () => {
    const user = userEvent.setup();
    renderConsent();

    await waitFor(() => {
      expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(2);
    });

    const buttons = screen.getAllByRole("button");
    const rejectButton = buttons[0]; // Reject is first (left side)
    await user.click(rejectButton);

    expect(localStorage.getItem("cookieConsent")).toBe("rejected");

    await waitFor(() => {
      expect(screen.queryAllByRole("button").length).toBe(0);
    });
  });
});
