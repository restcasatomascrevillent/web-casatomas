/**
 * Auditoría móvil: «atrás» del móvil cierra las capas abiertas (W-20), los avisos
 * (toasts) no usan <ol>/<li> y su botón de cerrar tiene nombre (W-07).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { useCerrarConAtras } from "@/hooks/useCerrarConAtras";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

function Capa({ clave }: { clave: string }) {
  const [abierta, setAbierta] = useState(true);
  useCerrarConAtras(abierta, () => setAbierta(false), clave);
  return abierta ? <p>capa {clave}</p> : null;
}

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("useCerrarConAtras", () => {
  it("añade una entrada al historial y «atrás» cierra la capa", async () => {
    const antes = window.history.length;
    render(<Capa clave="capaA" />);
    expect(window.history.length).toBe(antes + 1);
    expect(window.history.state?.capaA).toBeTruthy();
    act(() => window.history.back());
    await waitFor(() => expect(screen.queryByText("capa capaA")).toBeNull());
  });

  it("con dos capas apiladas, «atrás» cierra solo la de encima", async () => {
    render(
      <>
        <Capa clave="capaDeAbajo" />
        <Capa clave="capaDeArriba" />
      </>,
    );
    act(() => window.history.back());
    await waitFor(() => expect(screen.queryByText("capa capaDeArriba")).toBeNull());
    expect(screen.getByText("capa capaDeAbajo")).toBeTruthy();
  });
});

describe("Toast accesible", () => {
  it("el visor y el aviso no son <ol>/<li>, y el botón de cerrar tiene nombre", () => {
    const { container } = render(
      <ToastProvider>
        <Toast open>
          <ToastTitle>Añadido a Mi mesa</ToastTitle>
          <ToastDescription>Plato E2E</ToastDescription>
          <ToastClose />
        </Toast>
        <ToastViewport />
      </ToastProvider>,
    );
    expect(container.ownerDocument.querySelector("ol, li")).toBeNull();
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeTruthy();
    vi.restoreAllMocks();
  });
});
