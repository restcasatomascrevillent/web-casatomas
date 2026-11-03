/**
 * Piezas de la estética de Navidad (solo en la demo, ver `src/lib/navidad.ts`).
 * Quien las usa las pinta tras `NAVIDAD && …`: en producción esa rama se
 * elimina al compilar y este módulo no llega al bundle. Los estilos viven en
 * `src/styles/navidad.css` (cargado por `virtual:navidad.css`).
 *
 * Todo lo decorativo es `aria-hidden` y no recibe clics; la nevada es solo CSS
 * (sin JS ni medidas: el HTML del SSG y la hidratación coinciden) y se apaga con
 * `prefers-reduced-motion`.
 */
import { Link } from "react-router-dom";
import { construirRutaIdioma } from "@/i18n/routing";
import { RESERVAS_PATH } from "@/lib/condiciones";
import type { Language } from "@/i18n/types";

/**
 * Copos fijos (posición, tamaño, duración, retraso negativo, deriva y opacidad):
 * deterministas para que el SSG y el cliente pinten lo mismo, y con retraso
 * negativo para que ya estén repartidos en el primer pintado.
 */
const COPOS: ReadonlyArray<readonly [x: number, tam: number, dur: number, ret: number, der: number, op: number]> = [
  [4, 5, 19, -3, 18, 0.55], [11, 3, 23, -14, -12, 0.45], [17, 6, 21, -8, 24, 0.5], [24, 4, 26, -19, -16, 0.4],
  [31, 3, 18, -5, 10, 0.5], [38, 5, 24, -12, -22, 0.45], [45, 4, 20, -2, 14, 0.55], [52, 6, 27, -21, -10, 0.4],
  [58, 3, 22, -9, 20, 0.5], [64, 5, 19, -16, -18, 0.45], [70, 4, 25, -6, 12, 0.5], [76, 6, 21, -11, -24, 0.4],
  [82, 3, 23, -18, 16, 0.55], [88, 5, 20, -4, -12, 0.45], [93, 4, 26, -13, 22, 0.5], [97, 3, 22, -20, -8, 0.4],
];

/** Nevada muy suave sobre el fondo del hero, por detrás del texto y los botones. */
export const NevadaHero = () => (
  <div aria-hidden="true" className="navidad-nevada">
    {COPOS.map(([x, tam, dur, ret, der, op]) => (
      <span
        key={x}
        className="navidad-copo"
        style={
          {
            "--x": `${x}%`,
            "--tam": `${tam}px`,
            "--dur": `${dur}s`,
            "--ret": `${ret}s`,
            "--der": `${der}px`,
            "--op": op,
          } as React.CSSProperties
        }
      />
    ))}
  </div>
);

/** Filete dorado con estrella y dos hojas de acebo, bajo el lema del hero. */
export const OrnamentoHero = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    className="navidad-ornamento"
    viewBox="0 0 240 24"
    width="240"
    height="24"
  >
    {/* `userSpaceOnUse`: con el degradado por defecto (caja del trazo) una línea
        horizontal tiene alto 0 y el navegador no la pinta. */}
    <defs>
      <linearGradient id="navidad-filete-izq" gradientUnits="userSpaceOnUse" x1="8" x2="96" y1="12" y2="12">
        <stop offset="0" stopColor="currentColor" stopOpacity="0" />
        <stop offset="1" stopColor="currentColor" stopOpacity="0.9" />
      </linearGradient>
      <linearGradient id="navidad-filete-der" gradientUnits="userSpaceOnUse" x1="232" x2="144" y1="12" y2="12">
        <stop offset="0" stopColor="currentColor" stopOpacity="0" />
        <stop offset="1" stopColor="currentColor" stopOpacity="0.9" />
      </linearGradient>
    </defs>
    <path d="M8 12H96" stroke="url(#navidad-filete-izq)" strokeWidth="1" />
    <path d="M144 12H232" stroke="url(#navidad-filete-der)" strokeWidth="1" />
    {/* Hojas de abeto/acebo, muy contenidas. */}
    <path className="navidad-ornamento-hoja" d="M104 12c-3-4-7-5-10-4 1 3 5 5 10 4Z" />
    <path className="navidad-ornamento-hoja" d="M136 12c3-4 7-5 10-4-1 3-5 5-10 4Z" />
    {/* Bayas burdeos. */}
    <circle className="navidad-ornamento-baya" cx="108.5" cy="14.5" r="1.8" />
    <circle className="navidad-ornamento-baya" cx="131.5" cy="14.5" r="1.8" />
    {/* Estrella de ocho puntas, fina. */}
    <path
      fill="currentColor"
      d="M120 2l1.6 7.2L128 6l-3.2 6.4L132 12l-7.2 1.6L128 18l-6.4-3.2L120 22l-1.6-7.2L112 18l3.2-6.4L108 12l7.2-1.6L112 6l6.4 3.2Z"
      transform="translate(120 12) scale(0.72) translate(-120 -12)"
    />
  </svg>
);

const FRANJA: Record<Language, { titulo: string; texto: string; enlace: string }> = {
  es: { titulo: "Felices fiestas", texto: "Reserva tu mesa para Nochebuena, Navidad y Nochevieja", enlace: "Reservar mesa" },
  en: { titulo: "Happy holidays", texto: "Book your table for Christmas Eve, Christmas Day and New Year’s Eve", enlace: "Book a table" },
  fr: {
    titulo: "Joyeuses fêtes",
    texto: "Réservez votre table pour le réveillon, le jour de Noël et la Saint-Sylvestre",
    enlace: "Réserver une table",
  },
};

/** Franja festiva justo bajo el hero, con enlace a reservas. */
export const FranjaNavidad = ({ language }: { language: Language }) => {
  const texto = FRANJA[language];
  return (
    <div className="navidad-franja">
      <div className="navidad-franja-contenido">
        <p className="navidad-franja-titulo">{texto.titulo}</p>
        <span aria-hidden="true" className="navidad-franja-estrella">✦</span>
        <p className="navidad-franja-texto">{texto.texto}</p>
        <Link to={construirRutaIdioma(RESERVAS_PATH, language)} className="navidad-franja-enlace">
          {texto.enlace}
          <span aria-hidden="true"> →</span>
        </Link>
      </div>
    </div>
  );
};

/** Filete de guirnalda (oro y burdeos) en el borde inferior de la cabecera. */
export const FileteCabecera = () => <span aria-hidden="true" className="navidad-filete-cabecera" />;

const LEMA_REGALO: Record<Language, string> = {
  es: "Regala Casa Tomás esta Navidad",
  en: "Give Casa Tomás this Christmas",
  fr: "Offrez Casa Tomás pour Noël",
};

/** Antetítulo de la tarjeta de cheques regalo. */
export const LemaRegalo = ({ language }: { language: Language }) => (
  <p className="navidad-lema-regalo">{LEMA_REGALO[language]}</p>
);

/** Lazo burdeos con cantos dorados en la esquina de la tarjeta de cheques. */
export const LazoRegalo = () => (
  <svg aria-hidden="true" focusable="false" className="navidad-lazo" viewBox="0 0 80 96" width="80" height="96">
    {/* Cinta vertical que cae desde el borde superior. */}
    <rect className="navidad-lazo-cinta" x="34" y="0" width="12" height="96" />
    <path className="navidad-lazo-canto" d="M34 0V96M46 0V96" />
    {/* Lazadas. */}
    <path className="navidad-lazo-cinta" d="M40 30C30 14 12 14 12 24s16 12 28 6Z" />
    <path className="navidad-lazo-cinta" d="M40 30C50 14 68 14 68 24S52 36 40 30Z" />
    <path className="navidad-lazo-canto" d="M40 30C30 14 12 14 12 24s16 12 28 6ZM40 30C50 14 68 14 68 24S52 36 40 30Z" />
    {/* Puntas. */}
    <path className="navidad-lazo-cinta" d="M38 32 26 54l7-2 3 7 6-25Z" />
    <path className="navidad-lazo-cinta" d="M42 32l12 22-7-2-3 7-6-25Z" />
    {/* Nudo. */}
    <rect className="navidad-lazo-nudo" x="35" y="25" width="10" height="10" rx="2.5" />
  </svg>
);
