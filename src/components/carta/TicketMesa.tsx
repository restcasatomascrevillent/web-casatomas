import { forwardRef } from "react";
import { LOGO_HEIGHT, LOGO_WIDTH, logoTicket } from "@/assets/logo";
import { NEGOCIO } from "@/lib/negocio";
import {
  formatearCantidadLinea,
  formatearEuros,
  importeLinea,
  nombrePersona,
  porPersona,
  sufijoPrecio,
  totalMesa,
  type LineaMesa,
  type ModoReparto,
  type RepartoCadaUno,
} from "@/lib/mi-mesa";
import { pathDeMatrizQr } from "@/lib/qr";
import type { Language } from "@/i18n/types";
import type { Translations } from "@/i18n/languages/es";

/** Ancho fijo del ticket: a `pixelRatio: 2` sale una imagen de 760 px, nítida en cualquier móvil. */
export const ANCHO_TICKET = 380;

/** "+34966107887" → "+34 966 10 78 87" (formato de fijo español). */
const telefonoLegible = (tel: string) => tel.replace(/^\+34(\d{3})(\d{2})(\d{2})(\d{2})$/, "+34 $1 $2 $3 $4");

// Colores fijos (no tokens CSS): la imagen debe salir igual con tema claro u oscuro.
const TINTA = "#3a4148"; // --dark-slate
const TINTA_SUAVE = "#6a6360"; // --mid-gray
const ORO = "#b7862f"; // --gold
const PAPEL = "#fbf8f3";
const SERIF = '"Libre Baskerville", "Bodoni MT", Georgia, serif';

type LineaTicket = LineaMesa & { clave: string };

type TicketMesaProps = {
  lineas: LineaTicket[];
  comensales: number;
  modo: ModoReparto;
  reparto: RepartoCadaUno;
  nombres: string[];
  idioma: Language;
  t: Translations["preview"];
  qr: boolean[][] | null;
  urlQr: string;
  fecha: string;
};

const Separador = () => (
  <div aria-hidden="true" style={{ borderTop: `1px dashed ${TINTA_SUAVE}`, opacity: 0.5, margin: "14px 0" }} />
);

/**
 * El ticket que se comparte como imagen: un recibo sobrio con el logo,
 * las líneas en columnas alineadas (cifras tabulares), el total, lo que toca
 * a cada uno, el aviso de "precios orientativos", los datos del restaurante
 * y un QR a la carta. Solo se pinta fuera de pantalla para capturarlo.
 */
const TicketMesa = forwardRef<HTMLDivElement, TicketMesaProps>(
  ({ lineas, comensales, modo, reparto, nombres, idioma, t, qr, urlQr, fecha }, ref) => {
    const total = totalMesa(lineas);
    const eur = (v: number) => formatearEuros(v, idioma);
    const comensalesTexto = comensales === 1 ? t.guestsCountOne : t.guestsCount.replace("{n}", String(comensales));

    return (
      <div
        ref={ref}
        style={{
          width: ANCHO_TICKET,
          background: PAPEL,
          color: TINTA,
          padding: "28px 26px 22px",
          fontFamily: SERIF,
          fontSize: 12,
          lineHeight: 1.45,
          fontVariantNumeric: "tabular-nums",
          boxSizing: "border-box",
        }}
      >
        {/* Cabecera */}
        <div style={{ textAlign: "center" }}>
          {/* Sin srcset: html-to-image lo vacía y captura `src` a pixelRatio 2. */}
          <img
            src={logoTicket}
            alt=""
            width={LOGO_WIDTH}
            height={LOGO_HEIGHT}
            style={{ height: 72, width: "auto", margin: "0 auto", display: "block" }}
          />
          <div style={{ fontFamily: SERIF, fontSize: 22, marginTop: 10, letterSpacing: "0.01em" }}>{t.title}</div>
          <div style={{ width: 28, height: 1, background: ORO, margin: "8px auto 8px" }} />
          <div style={{ fontSize: 11, color: TINTA_SUAVE, letterSpacing: "0.04em" }}>
            {fecha} · {comensalesTexto}
          </div>
        </div>

        <Separador />

        {/* Líneas */}
        <div>
          {lineas.map((linea) => {
            const precio = `${eur(linea.precio_eur)}${sufijoPrecio(linea.unidad)}`;
            return (
              <div key={linea.clave} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{formatearCantidadLinea(linea, idioma)} ×</span>
                  <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{linea.nombre}</span>
                  <span
                    aria-hidden="true"
                    style={{ flex: 1, minWidth: 12, borderBottom: `1px dotted ${TINTA_SUAVE}`, opacity: 0.6, transform: "translateY(-3px)" }}
                  />
                  <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{eur(importeLinea(linea))}</span>
                </div>
                <div style={{ fontSize: 10.5, color: TINTA_SUAVE }}>{precio}</div>
              </div>
            );
          })}
        </div>

        <Separador />

        {/* Total */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontFamily: SERIF, fontSize: 15 }}>{t.totalLabel}</span>
          <span style={{ fontSize: 20, fontWeight: 700 }}>{eur(total)}</span>
        </div>

        {modo === "igual" || comensales === 1 ? (
          <div style={{ textAlign: "right", color: ORO, fontWeight: 600, marginTop: 2 }}>
            {t.perPerson.replace("{amount}", eur(porPersona(total, comensales)))}
          </div>
        ) : (
          <div style={{ marginTop: 10 }}>
            <div
              style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: TINTA_SUAVE, marginBottom: 4 }}
            >
              {t.ticket.perPersonTitle}
            </div>
            {reparto.porPersona.map((importe, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ overflowWrap: "anywhere" }}>{nombrePersona(nombres, i, t.personDefault)}</span>
                <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{eur(importe)}</span>
              </div>
            ))}
            {reparto.compartido > 0 && (
              <div style={{ fontSize: 10.5, color: TINTA_SUAVE, marginTop: 4 }}>
                {t.sharedLine
                  .replace("{amount}", eur(reparto.compartido))
                  .replace("{each}", eur(reparto.compartidoPorPersona))}
              </div>
            )}
          </div>
        )}

        <div
          style={{
            marginTop: 14,
            textAlign: "center",
            fontSize: 10.5,
            color: TINTA_SUAVE,
            border: `1px solid ${TINTA_SUAVE}33`,
            borderRadius: 999,
            padding: "4px 10px",
          }}
        >
          {t.note}
        </div>

        <Separador />

        {/* Pie: QR + datos del restaurante */}
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          {qr && (
            <svg
              viewBox={`-2 -2 ${qr.length + 4} ${qr.length + 4}`}
              width={84}
              height={84}
              role="img"
              aria-label={urlQr}
              shapeRendering="crispEdges"
              style={{ flexShrink: 0, background: "#ffffff", borderRadius: 4 }}
            >
              <path d={pathDeMatrizQr(qr)} fill={TINTA} />
            </svg>
          )}
          <div style={{ fontSize: 11, lineHeight: 1.55 }}>
            <div style={{ fontFamily: SERIF, fontSize: 13 }}>Casa Tomás</div>
            <div>
              {NEGOCIO.calle} · {NEGOCIO.cp} {NEGOCIO.localidad}
            </div>
            <div>{telefonoLegible(NEGOCIO.telefono)}</div>
            <div style={{ color: ORO, marginTop: 2 }}>{t.ticket.qr}</div>
          </div>
        </div>

        <div style={{ textAlign: "center", fontFamily: SERIF, fontSize: 11.5, marginTop: 16, color: TINTA_SUAVE }}>
          {t.thanks}
        </div>
      </div>
    );
  },
);
TicketMesa.displayName = "TicketMesa";

export default TicketMesa;
