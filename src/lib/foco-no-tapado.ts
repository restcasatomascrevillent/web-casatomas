/**
 * Con teclado, el navegador desplaza el control enfocado lo justo para que se
 * vea, pero no sabe de la cabecera fija: si el control queda por encima, el
 * navegador lo pega al borde de arriba de la pantalla, debajo de la cabecera
 * (WCAG 2.4.11, «Foco no oculto»). Esto lo vuelve a bajar hasta dejarlo justo
 * debajo de ella.
 *
 * No se hace con `scroll-padding-top` porque ese margen también cuenta para
 * las anclas (`#carta`, `#plato-9`, `#cookies`) y las movería.
 */
const HOLGURA_PX = 8;

export function instalarFocoNoTapado(cabecera: () => Element | null = () => document.querySelector(".site-header")): () => void {
  if (typeof document === "undefined") return () => {};
  const alEnfocar = (evento: FocusEvent) => {
    const el = evento.target;
    if (!(el instanceof HTMLElement)) return;
    // Solo teclado (o lector de pantalla): con ratón o dedo no hace falta.
    if (!el.matches(":focus-visible")) return;
    const barra = cabecera();
    if (!barra || barra.contains(el)) return;
    const estilo = getComputedStyle(barra);
    if (estilo.position !== "fixed") return;
    const limite = barra.getBoundingClientRect().bottom;
    if (limite <= 0) return;
    const caja = el.getBoundingClientRect();
    if (caja.height === 0 && caja.width === 0) return;
    if (caja.top >= limite + HOLGURA_PX - 1 || caja.bottom <= 0) return;
    const sobra = caja.top - limite - HOLGURA_PX; // negativo: hay que bajar la página
    if (sobra < 0) window.scrollBy({ top: sobra, behavior: "instant" });
  };
  document.addEventListener("focusin", alEnfocar);
  return () => document.removeEventListener("focusin", alEnfocar);
}
