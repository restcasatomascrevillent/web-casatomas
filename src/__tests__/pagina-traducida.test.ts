/**
 * Errores de hidratación con la página traducida por el navegador (CAS-18/19/20):
 * se reconocen y salen hacia Super Admin › Logs con `accion: "pagina_traducida"`
 * (el panel los clasifica como «Navegador o extensión»); sin traductor siguen
 * siendo un fallo de la web.
 */
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { esErrorDeHidratacion, esHidratacionDePaginaTraducida, traductorDeLaPagina } from "@/lib/pagina-traducida";
import { ACCION_PAGINA_TRADUCIDA, _reiniciarRegistro, capturarErroresTempranos, conectarEmisor, type DatosActividad } from "@/lib/actividad/registro";

// Los mensajes tal cual llegaron a producción el 19/11/2026 (incidencias 294, 295 y 296).
const minificado = (n: number) =>
  `Uncaught Error: Minified React error #${n}; visit https://reactjs.org/docs/error-decoder.html for the full message or use the non-minified dev environment for full errors and additional helpful warnings.`;

/** Lo que hace el traductor de Chrome: clase en `<html>` y cada texto dentro de `<font><font>`. */
function traducirComoChrome() {
  document.documentElement.classList.add("translated-ltr");
  const texto = document.querySelector("#root p")!.firstChild!;
  const exterior = document.createElement("font");
  const interior = document.createElement("font");
  interior.textContent = "Neuigkeiten";
  exterior.appendChild(interior);
  texto.parentNode!.replaceChild(exterior, texto);
}

function montarPagina() {
  document.body.innerHTML = `<div id="root"><section id="novedades"><p>Novedades</p></section></div>`;
}

afterEach(() => {
  document.documentElement.className = "";
  document.body.innerHTML = "";
  _reiniciarRegistro();
});

describe("esErrorDeHidratacion", () => {
  it("reconoce los errores de hidratación de React (producción y desarrollo)", () => {
    for (const n of [418, 421, 422, 423, 425]) expect(esErrorDeHidratacion(minificado(n))).toBe(true);
    expect(esErrorDeHidratacion("Error: Hydration failed because the initial UI does not match what was rendered on the server.")).toBe(true);
    expect(esErrorDeHidratacion("Error: There was an error while hydrating this Suspense boundary. Switched to client rendering.")).toBe(true);
    expect(esErrorDeHidratacion("Error: Text content does not match server-rendered HTML.")).toBe(true);
  });

  it("no confunde otros errores con la hidratación", () => {
    expect(esErrorDeHidratacion(minificado(185))).toBe(false); // demasiadas actualizaciones: fallo nuestro
    expect(esErrorDeHidratacion(minificado(4180))).toBe(false);
    expect(esErrorDeHidratacion("TypeError: Cannot read properties of undefined (reading 'precio')")).toBe(false);
    expect(esErrorDeHidratacion("NotFoundError: Failed to execute 'removeChild' on 'Node'")).toBe(false);
    expect(esErrorDeHidratacion(null)).toBe(false);
  });
});

describe("traductorDeLaPagina", () => {
  it("sin traductor: null", () => {
    montarPagina();
    expect(traductorDeLaPagina()).toBeNull();
  });

  it("Chrome / Google Translate: por la clase de <html> o por los <font> dentro de la app", () => {
    montarPagina();
    document.documentElement.classList.add("translated-ltr");
    expect(traductorDeLaPagina()).toBe("google");
    document.documentElement.classList.remove("translated-ltr");
    document.documentElement.classList.add("translated-rtl");
    expect(traductorDeLaPagina()).toBe("google");
    document.documentElement.classList.remove("translated-rtl");
    // Solo los <font> (la clase se pierde, o la pone otro traductor que usa la misma técnica).
    traducirComoChrome();
    document.documentElement.classList.remove("translated-ltr");
    expect(traductorDeLaPagina()).toBe("google");
  });

  it("Edge (Microsoft Translator): por sus atributos", () => {
    montarPagina();
    document.querySelector("#root p")!.setAttribute("_msttexthash", "12345");
    expect(traductorDeLaPagina()).toBe("microsoft");
  });

  it("un <font> fuera de la app (p. ej. de una extensión en otro sitio del documento) no cuenta", () => {
    montarPagina();
    document.body.appendChild(document.createElement("font"));
    expect(traductorDeLaPagina()).toBeNull();
  });

  it("solo es «página traducida» si además es un error de hidratación", () => {
    montarPagina();
    traducirComoChrome();
    expect(esHidratacionDePaginaTraducida(minificado(425))).toBe(true);
    expect(esHidratacionDePaginaTraducida("TypeError: vino.precio is null")).toBe(false);
  });
});

describe("captura de errores desde el arranque", () => {
  beforeAll(() => capturarErroresTempranos());

  const capturar = () => {
    const recibidos: Array<[string, DatosActividad]> = [];
    conectarEmisor((tipo, datos) => recibidos.push([tipo, datos]));
    return recibidos;
  };
  const lanzar = (mensaje: string) => window.dispatchEvent(new ErrorEvent("error", { message: mensaje, error: new Error(mensaje) }));

  it("la tanda del 19/11 con la página traducida: los nueve errores salen marcados", () => {
    montarPagina();
    traducirComoChrome();
    const recibidos = capturar();
    for (const n of [425, 425, 418, 422, 425, 418, 418, 422, 422]) lanzar(minificado(n));
    expect(recibidos).toHaveLength(9);
    for (const [tipo, datos] of recibidos) {
      expect(tipo).toBe("error_js");
      expect(datos.accion).toBe(ACCION_PAGINA_TRADUCIDA);
      expect(datos.error?.mensaje).toMatch(/Minified React error #4\d\d/);
    }
  });

  it("los mismos errores SIN traductor siguen siendo un fallo de la web (sin accion)", () => {
    montarPagina();
    const recibidos = capturar();
    lanzar(minificado(418));
    expect(recibidos).toEqual([["error_js", expect.not.objectContaining({ accion: expect.anything() })]]);
  });

  it("con la página traducida, un error que no es de hidratación sigue siendo nuestro", () => {
    montarPagina();
    traducirComoChrome();
    const recibidos = capturar();
    lanzar("TypeError: Cannot read properties of undefined (reading 'precio')");
    expect(recibidos[0][1].accion).toBeUndefined();
  });
});
