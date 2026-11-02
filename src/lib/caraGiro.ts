import { flushSync } from "react-dom";

/**
 * Tarjetas que giran (la "i" de `ProductoCard` y `CartaPlatos`).
 *
 * `backface-visibility: hidden` solo esconde la cara a la vista: sus botones
 * seguían en el orden de tabulación y el lector de pantalla la leía. La cara
 * que no mira al cliente lleva `inert` (fuera del tabulador y de los clics) y
 * `aria-hidden` (fuera del árbol de accesibilidad, también en navegadores sin
 * `inert`). En el HTML del SSG la tarjeta sale sin girar: la trasera va
 * `inert`, pero su contenido sigue en el DOM para los buscadores.
 *
 * React 18 no conoce `inert` (llega en React 19), así que se pasa como
 * atributo desconocido con cadena vacía: React lo pinta tal cual (`inert=""`)
 * y el navegador solo mira si el atributo existe.
 */
export function propsCara(oculta: boolean): Record<string, unknown> {
  return oculta ? { inert: "", "aria-hidden": true } : {};
}

/** Marca del contenedor de la tarjeta, con un id único en la página; cada cara lleva `data-cara`. */
export const ATRIBUTO_TARJETA = "data-tarjeta-giro";
/** Marca de los botones que giran la tarjeta, uno por cara. */
export const ATRIBUTO_BOTON_GIRO = "data-boton-giro";

/**
 * Gira la tarjeta y lleva el foco al botón de giro de la cara que queda a la
 * vista. Sin esto, el botón pulsado pasa a la cara `inert` y el foco se pierde
 * (vuelve al `body` y el tabulador empieza otra vez desde arriba).
 *
 * La tarjeta se busca otra vez por su `data-tarjeta-giro` después del giro y
 * no se guarda el nodo de antes: en `CartaPlatos` la tarjeta puede volver a
 * montarse al cambiar el estado y el nodo viejo ya no está en la página.
 */
export function girarYEnfocar(boton: HTMLElement, girar: () => void) {
  const id = boton.closest(`[${ATRIBUTO_TARJETA}]`)?.getAttribute(ATRIBUTO_TARJETA);
  // `flushSync`: el DOM ya tiene la cara nueva sin `inert` al buscar el botón.
  flushSync(girar);
  if (!id) return;
  const selector = `[${ATRIBUTO_TARJETA}="${CSS.escape(id)}"] [data-cara]:not([inert]) [${ATRIBUTO_BOTON_GIRO}]`;
  boton.ownerDocument.querySelector<HTMLElement>(selector)?.focus();
}
