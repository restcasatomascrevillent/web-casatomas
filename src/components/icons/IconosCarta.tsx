import type { SVGProps } from "react";
import { UtensilsCrossed } from "lucide-react";

/**
 * Iconos de las secciones de la carta (sistema de diseño «Carta»).
 *
 * Misma rejilla de 24×24 y trazo de 1,6 px en todos, para que se puedan mezclar
 * sin que ninguno destaque. Van con `currentColor`: el color lo pone quien los
 * usa (en la carta, el dorado `text-accent` sobre un disco crema). Siempre
 * acompañan al nombre de la sección, así que son decorativos (`aria-hidden`).
 *
 * Las claves de `ICONO_POR_CATEGORIA` son las de `CATEGORIAS_PLATOS`
 * (`@/lib/carta-ssg`). Una categoría nueva creada desde el panel que no esté
 * aquí cae en los cubiertos genéricos en vez de quedarse sin icono.
 */
type PropsIcono = SVGProps<SVGSVGElement>;

const Base = ({ children, ...props }: PropsIcono) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    {children}
  </svg>
);

export const IconoNovedades = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M10 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7z" />
    <path d="M18.5 15.5c.2 1.2.8 1.8 2 2-1.2.2-1.8.8-2 2-.2-1.2-.8-1.8-2-2 1.2-.2 1.8-.8 2-2z" />
  </Base>
);

export const IconoSnack = (p: PropsIcono) => (
  <Base {...p}>
    <ellipse cx="8.6" cy="15.4" rx="4" ry="3.1" transform="rotate(-45 8.6 15.4)" />
    <ellipse cx="15.4" cy="8.6" rx="4" ry="3.1" transform="rotate(-45 15.4 8.6)" />
    <path d="M2.5 21.5l3.3-3.3M11.4 12.6l1.2-1.2M18.2 5.8l3.3-3.3" />
    <path d="M8.6 15.4h.01M15.4 8.6h.01" strokeWidth={2.4} />
  </Base>
);

export const IconoEntrantesFrios = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M12 12V3.5M12 6.6l1.9-1.9M12 6.6l-1.9-1.9M12 12L4.64 7.75M7.32 9.3l-.69-2.6M7.32 9.3l-2.59.7M12 12l-7.36 4.25M7.32 14.7l-2.59-.7M7.32 14.7l-.69 2.6M12 12v8.5M12 17.4l-1.9 1.9M12 17.4l1.9 1.9M12 12l7.36 4.25M16.68 14.7l.69 2.6M16.68 14.7l2.59-.7M12 12l7.36-4.25M16.68 9.3l2.59.7M16.68 9.3l.69-2.6" />
  </Base>
);

export const IconoEntrantesCalientes = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M3.5 12.5h17a8.5 7.5 0 0 1-17 0z" />
    <path d="M9 21h6" />
    <path d="M8 9.5c-.8-1 .8-2 0-3s.8-2 0-3M12 9.5c-.8-1 .8-2 0-3s.8-2 0-3M16 9.5c-.8-1 .8-2 0-3s.8-2 0-3" />
  </Base>
);

export const IconoEnsaladas = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M5 19c0-8.5 5-14 15-14 0 9.5-6 14-15 14z" />
    <path d="M5 19l9.5-9.5M10 14v-3.5M13 11.5h3" />
  </Base>
);

export const IconoSalazones = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M8 8V6.5a4 3 0 0 1 8 0V8" />
    <path d="M7.5 8h9l1.2 11.8a1 1 0 0 1-1 1.2H7.3a1 1 0 0 1-1-1.2z" />
    <path d="M7.2 12h9.6" />
    <path d="M10.6 5.3h.01M13.4 5.3h.01M12 4.2h.01" strokeWidth={1.9} />
  </Base>
);

export const IconoMariscos = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M9 20h6l5-9.5a8.5 8.5 0 0 0-16 0z" />
    <path d="M12 19.5V5.4M10.8 19.5L7.8 6.4M13.2 19.5l3-13.1" />
    <path d="M8 21.5h8" />
  </Base>
);

export const IconoPescados = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M2.5 12c2.5-3.8 5.8-5.5 9-5.5s5.8 1.7 7 3.8l3-2.8v9l-3-2.8c-1.2 2.1-3.8 3.8-7 3.8s-6.5-1.7-9-5.5z" />
    <path d="M10 8.3c1 2.3 1 5.1 0 7.4" />
    <path d="M6.5 11h.01" strokeWidth={2.2} />
  </Base>
);

export const IconoCarnes = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M7 5c4-1.5 11 0 12.5 4.5 1.4 4.3-1.3 9.5-7 10.3C7.5 20.5 3.8 18 4 13.8 4.2 10.5 4.8 5.8 7 5z" />
    <circle cx="9.5" cy="11" r="2" />
    <path d="M14.5 8.5c2 .8 3 2.3 2.7 4.4" />
  </Base>
);

export const IconoArroces = (p: PropsIcono) => (
  <Base {...p}>
    <ellipse cx="12" cy="11.5" rx="8" ry="4" />
    <path d="M4 11.5V13c0 2.2 3.6 4 8 4s8-1.8 8-4v-1.5" />
    <path d="M4.2 10.8C2.5 10.5 1.5 11 1.5 11.8s1 1.3 2.7 1M19.8 10.8c1.7-.3 2.7.2 2.7 1s-1 1.3-2.7 1" />
    <path d="M9.5 12.3c.9-1 2.5-1 3 .3M14.5 10.2l1.5 1.8h-2.5z" />
    <path d="M8.2 10.5h.01M12.3 9.8h.01M15.8 13h.01" strokeWidth={2} />
  </Base>
);

export const IconoPostres = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M3 12L17.5 5.5 21 12z" />
    <path d="M3 12h18v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
    <path d="M3 15.8h18" />
    <circle cx="17.5" cy="3.8" r="1.5" />
  </Base>
);

export const ICONO_POR_CATEGORIA: Record<string, (p: PropsIcono) => JSX.Element> = {
  "NOVEDADES DEL DÍA": IconoNovedades,
  SNACK: IconoSnack,
  "ENTRANTES FRÍOS": IconoEntrantesFrios,
  "ENTRANTES CALIENTES": IconoEntrantesCalientes,
  ENSALADAS: IconoEnsaladas,
  SALAZONES: IconoSalazones,
  MARISCOS: IconoMariscos,
  PESCADOS: IconoPescados,
  CARNES: IconoCarnes,
  ARROCES: IconoArroces,
  POSTRES: IconoPostres,
};

/** Icono de una sección de platos por su clave de la BD; cubiertos si es una sección nueva. */
export function IconoCategoria({ clave, ...props }: PropsIcono & { clave: string }) {
  const Icono = ICONO_POR_CATEGORIA[clave];
  if (Icono) return <Icono {...props} />;
  return <UtensilsCrossed aria-hidden="true" focusable="false" strokeWidth={1.6} {...(props as object)} />;
}
