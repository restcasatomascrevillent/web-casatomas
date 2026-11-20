/**
 * Vigilancia del DOM ajeno (CAS-6): distingue lo que cambia el navegador (un
 * traductor, una extensión) en el HTML que React aún no ha reclamado de lo que
 * hace el propio React.
 */
import { afterEach, describe, expect, it } from "vitest";
import { _reiniciarDomAjeno, cambioAjeno, domAjeno, pararVigilancia, vigilarDomAjeno } from "@/lib/dom-ajeno";
import { ACCION_DOM_AJENO, ACCION_PAGINA_TRADUCIDA, contextoDeHidratacion } from "@/lib/actividad/registro";

/** Lo que hace React con cada nodo que reclama o crea. */
const deReact = <T extends Node>(nodo: T): T => Object.assign(nodo, { __reactFiber$abc123: {} });

function pagina() {
  document.body.innerHTML = `<div id="root"><header><a href="/">Inicio</a></header><section id="novedades"><h2>Novedades</h2><p>Menú del día</p></section></div>`;
  const raiz = document.getElementById("root")!;
  // La cabecera ya está hidratada; la sección de novedades, todavía no (se hidrata cuando el navegador está ocioso).
  deReact(raiz.querySelector("header")!);
  deReact(raiz.querySelector("header a")!);
  deReact(raiz.querySelector("header a")!.firstChild!);
  return raiz;
}
const esperarObservador = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => {
  _reiniciarDomAjeno();
  document.body.innerHTML = "";
  document.documentElement.className = "";
});

describe("cambioAjeno", () => {
  it("texto sin reclamar que cambia en su sitio (traductor sin rastro): ajeno", () => {
    const raiz = pagina();
    const texto = raiz.querySelector("h2")!.firstChild!;
    expect(cambioAjeno({ type: "characterData", target: texto, addedNodes: [] as unknown as NodeList, oldValue: "Novedades" }, raiz)).toBe("texto «Novedades» → «Novedades»");
  });

  it("un texto que actualiza React (con su marca) no cuenta", () => {
    const raiz = pagina();
    const texto = raiz.querySelector("header a")!.firstChild!;
    expect(cambioAjeno({ type: "characterData", target: texto, addedNodes: [] as unknown as NodeList, oldValue: "x" }, raiz)).toBeNull();
  });

  it("un nodo nuevo sin marca de React (el <font> del traductor) es ajeno; uno creado por React, no", () => {
    const raiz = pagina();
    const a = raiz.querySelector("header a")!;
    const font = document.createElement("font");
    expect(cambioAjeno({ type: "childList", target: a, addedNodes: [font] as unknown as NodeList, oldValue: null }, raiz)).toBe("<font> añadido en <a>");
    expect(cambioAjeno({ type: "childList", target: a, addedNodes: [deReact(document.createElement("span"))] as unknown as NodeList, oldValue: null }, raiz)).toBeNull();
  });

  it("cualquier cambio dentro de una sección aún sin hidratar es ajeno (React no la toca)", () => {
    const raiz = pagina();
    const seccion = raiz.querySelector("#novedades")!;
    expect(cambioAjeno({ type: "childList", target: seccion, addedNodes: [] as unknown as NodeList, oldValue: null }, raiz)).toMatch(/sin hidratar/);
  });

  it("React vuelve a pintar una sección entera (en #root, con nodos suyos): no cuenta", () => {
    const raiz = pagina();
    expect(cambioAjeno({ type: "childList", target: raiz, addedNodes: [deReact(document.createElement("section"))] as unknown as NodeList, oldValue: null }, raiz)).toBeNull();
  });

  it("las zonas que llena una librería (el mapa de vinos) no cuentan", () => {
    const raiz = pagina();
    const mapa = deReact(document.createElement("div"));
    mapa.setAttribute("data-dom-ajeno", "permitido");
    raiz.appendChild(mapa);
    expect(cambioAjeno({ type: "childList", target: mapa, addedNodes: [document.createElement("canvas")] as unknown as NodeList, oldValue: null }, raiz)).toBeNull();
  });
});

describe("vigilarDomAjeno", () => {
  it("ve el cambio del navegador antes de hidratar y lo cuenta una vez por cambio", async () => {
    const raiz = pagina();
    vigilarDomAjeno(raiz, 10_000);
    raiz.querySelector("h2")!.firstChild!.nodeValue = "Nouveautés";
    await esperarObservador();
    expect(domAjeno(raiz)).toMatchObject({ cambios: 1, muestra: "texto «Novedades» → «Nouveautés»", activo: true });
  });

  it("recoge lo que aún no se ha entregado al preguntar (el error llega en mitad de un commit)", () => {
    const raiz = pagina();
    vigilarDomAjeno(raiz, 10_000);
    raiz.querySelector("p")!.appendChild(document.createElement("font"));
    expect(domAjeno(raiz).cambios).toBe(1); // sin esperar al observador
  });

  it("lo que hace React no cuenta", async () => {
    const raiz = pagina();
    vigilarDomAjeno(raiz, 10_000);
    raiz.querySelector("header")!.appendChild(deReact(document.createElement("nav")));
    raiz.querySelector("header a")!.firstChild!.nodeValue = "Home";
    await esperarObservador();
    expect(domAjeno(raiz)).toMatchObject({ cambios: 0, muestra: null, activo: true });
  });

  it("se para sola: fuera de la vigilancia, «sin cambios» no prueba nada (activo: false)", async () => {
    const raiz = pagina();
    vigilarDomAjeno(raiz, 10_000);
    pararVigilancia();
    raiz.querySelector("h2")!.firstChild!.nodeValue = "Otra cosa";
    await esperarObservador();
    expect(domAjeno(raiz)).toMatchObject({ cambios: 0, activo: false });
  });
});

describe("contextoDeHidratacion", () => {
  it("con el rastro del traductor de Chrome: pagina_traducida y qué cambió", () => {
    const raiz = pagina();
    vigilarDomAjeno(raiz, 10_000);
    document.documentElement.classList.add("translated-ltr");
    raiz.querySelector("header a")!.appendChild(document.createElement("font")); // en una parte ya hidratada
    expect(contextoDeHidratacion()).toEqual({ accion: ACCION_PAGINA_TRADUCIDA, props: { componente: "cambio ajeno: <font> añadido en <a>" } });
  });

  it("cambio sin rastro de traductor conocido: dom_ajeno", () => {
    const raiz = pagina();
    vigilarDomAjeno(raiz, 10_000);
    raiz.querySelector("h2")!.firstChild!.nodeValue = "Neuigkeiten";
    expect(contextoDeHidratacion()).toEqual({ accion: ACCION_DOM_AJENO, props: { componente: "cambio ajeno: texto «Novedades» → «Neuigkeiten»" } });
  });

  it("página intacta mientras se vigilaba: sin accion (es un fallo nuestro) y lo dice", () => {
    vigilarDomAjeno(pagina(), 10_000);
    expect(contextoDeHidratacion()).toEqual({ props: { componente: "página intacta antes de hidratar" } });
  });

  it("sin vigilancia (fuera de los 20 s): sin accion ni conclusión", () => {
    pagina();
    expect(contextoDeHidratacion()).toEqual({});
  });
});
