import type { MouseEvent } from "react";
import { useTranslations } from "@/i18n/LanguageProvider";

/**
 * `id` del único `<main>` de cada página: el destino del enlace «Saltar al
 * contenido». `scripts/verificar-html.mjs` hace fallar el build si una página
 * prerenderizada no tiene exactamente un `<main id="contenido">`.
 */
export const ID_CONTENIDO = "contenido";

const TEXTO = { es: "Saltar al contenido", en: "Skip to content", fr: "Aller au contenu" } as const;

/**
 * Primer elemento enfocable de todas las páginas (va el primero en el
 * `Layout` de `App.tsx`): invisible hasta que recibe el foco con el
 * teclado, y entonces aparece arriba a la izquierda por encima de la
 * cabecera fija. El `href` funciona sin JavaScript; con JavaScript se mueve
 * el foco al `<main>` (que lleva `tabIndex={-1}`) sin tocar la URL, para no
 * dejar `#contenido` en la barra de direcciones ni despertar a `ScrollToTop`.
 */
const SaltarAlContenido = () => {
  const { language } = useTranslations();

  const alPulsar = (evento: MouseEvent<HTMLAnchorElement>) => {
    const destino = document.getElementById(ID_CONTENIDO);
    if (!destino) return;
    evento.preventDefault();
    destino.focus({ preventScroll: true });
    destino.scrollIntoView({ block: "start" });
  };

  return (
    <a
      href={`#${ID_CONTENIDO}`}
      onClick={alPulsar}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-foreground focus:underline focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent"
    >
      {TEXTO[language]}
    </a>
  );
};

export default SaltarAlContenido;
