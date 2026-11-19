/**
 * Página traducida por el navegador (CAS-13, `lib/proteger-dom-traductor`).
 *
 * Bug que protege (18/11/2026): el traductor de Chrome cambia cada texto por
 * `<font><font>…</font></font>` y deja el nodo original fuera del documento.
 * Cuando React quería quitar ese texto (al enviar la reserva, el formulario se
 * vacía), el navegador lanzaba «NotFoundError: Failed to execute 'removeChild'
 * on 'Node'», la ruta caía en «No se pudo cargar esta página» y el cliente
 * reservaba otra vez.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { useState } from "react";
import { instalarProteccionDomTraductor } from "@/lib/proteger-dom-traductor";

/** Lo que hace el traductor: el texto pasa a `<font><font>` y el nodo original sale del documento. */
function traducir(raiz: Node) {
  const it = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
  const textos: Text[] = [];
  while (it.nextNode()) textos.push(it.currentNode as Text);
  for (const texto of textos) {
    if (!texto.data.trim() || !texto.parentNode) continue;
    const exterior = document.createElement("font");
    const interior = document.createElement("font");
    interior.textContent = `[nl] ${texto.data}`;
    exterior.appendChild(interior);
    texto.parentNode.replaceChild(exterior, texto);
  }
}

let alternar: () => void = () => {};

/** Un texto suelto que desaparece y otro que aparece delante de un texto: los dos casos que rompen. */
function Formulario() {
  const [enviado, setEnviado] = useState(false);
  alternar = () => setEnviado((v) => !v);
  return (
    <p>
      {!enviado && "Elige una hora"}
      {enviado && <strong>Solicitud recibida</strong>}
      {" para reservar"}
    </p>
  );
}

let restaurar: (() => void) | null = null;
afterEach(() => {
  restaurar?.();
  restaurar = null;
  vi.restoreAllMocks();
});

describe("proteger-dom-traductor", () => {
  it("sin la protección, React rompe al quitar un texto traducido (lo que pasó en CAS-13)", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(<Formulario />);
    traducir(container);
    expect(() => act(() => alternar())).toThrow(/not a child|NotFoundError|removeChild|insertBefore/i);
  });

  it("con la protección, la página sigue: sale lo nuevo y no se lanza nada", () => {
    restaurar = instalarProteccionDomTraductor();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = render(<Formulario />);
    traducir(container);
    act(() => alternar());
    expect(screen.getByText("Solicitud recibida")).toBeTruthy();
    // Y se puede volver atrás (el `insertBefore` delante de un texto traducido tampoco rompe).
    act(() => alternar());
    expect(screen.queryByText("Solicitud recibida")).toBeNull();
    expect(container.textContent).toContain("[nl]");
  });

  it("sin traductor no cambia nada: quitar e insertar siguen igual", () => {
    restaurar = instalarProteccionDomTraductor();
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = render(<Formulario />);
    act(() => alternar());
    expect(container.textContent).toBe("Solicitud recibida para reservar");
    act(() => alternar());
    expect(container.textContent).toBe("Elige una hora para reservar");
    expect(aviso).not.toHaveBeenCalled();
  });

  it("removeChild de un nodo que no es hijo devuelve el nodo sin lanzar; uno que sí lo es se quita", () => {
    restaurar = instalarProteccionDomTraductor();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const padre = document.createElement("div");
    const ajeno = document.createTextNode("fuera");
    expect(padre.removeChild(ajeno)).toBe(ajeno);
    const hijo = padre.appendChild(document.createElement("span"));
    padre.removeChild(hijo);
    expect(padre.childNodes).toHaveLength(0);
  });

  it("instalarla dos veces no la encadena y restaurar deja Node.prototype como estaba", () => {
    const original = Node.prototype.removeChild;
    const r1 = instalarProteccionDomTraductor();
    const r2 = instalarProteccionDomTraductor();
    expect(r1).toBe(r2);
    expect(Node.prototype.removeChild).not.toBe(original);
    r1();
    expect(Node.prototype.removeChild).toBe(original);
  });
});
