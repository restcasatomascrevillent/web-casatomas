import { forwardRef, type ReactNode } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { LOGO_HEIGHT, LOGO_WIDTH, logoTicket } from "@/assets/logo";
import { NEGOCIO } from "@/lib/negocio";
import {
  COMENSALES_MAX,
  COMENSALES_MIN,
  cantidadDeLinea,
  configUnidad,
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

/**
 * Ancho del ticket CAPTURADO como imagen: a `pixelRatio: 2` sale 760 px,
 * nítida en cualquier móvil. En vivo (con `edicion`) el ancho es fluido
 * (100% del panel, con este valor de tope) — ver el `style` del `div` raíz.
 */
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

/**
 * Handlers de edición. Presentes → el ticket sale EN VIVO, con los controles
 * tejidos en el propio recibo (cantidades, comensales, reparto). Ausentes →
 * el ticket sale exactamente igual que antes de que existiera esta prop: ni
 * un botón, listo tal cual para `html-to-image`.
 */
export type EdicionTicketMesa = {
  onCambiarCantidad: (indice: number, direccion: 1 | -1) => void;
  onQuitarLinea: (indice: number) => void;
  onComensalesChange: (siguiente: number) => void;
  onModoChange: (modo: ModoReparto) => void;
  onAsignar: (clave: string, persona: number | null) => void;
  onNombreChange: (indice: number, valor: string) => void;
  asignaciones: Record<string, number | null | undefined>;
};

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
  /** Solo para el ticket en vivo (panel). Omitido en el que se captura como imagen. */
  edicion?: EdicionTicketMesa;
};

const Separador = () => (
  <div aria-hidden="true" style={{ borderTop: `1px dashed ${TINTA_SUAVE}`, opacity: 0.5, margin: "14px 0" }} />
);

/** Botón redondo de paso (−/+), reutilizado por comensales y cantidades. Solo existe en el ticket en vivo. */
const BotonPaso = ({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
    style={{ color: TINTA }}
  >
    {children}
  </button>
);

/**
 * El ticket de "Mi mesa": un recibo sobrio con el logo, las líneas en
 * columnas alineadas (cifras tabulares), el total, lo que toca a cada uno,
 * el aviso de "precios orientativos", los datos del restaurante y un QR a
 * la carta.
 *
 * Un único layout para DOS usos:
 *  1. Sin `edicion`, pintado fuera de pantalla: lo que captura
 *     `html-to-image` para compartir/descargar. Un `<div>` puro, sin un
 *     solo evento — el comportamiento de siempre.
 *  2. Con `edicion`, pintado dentro del panel: lo que el visitante ve y
 *     toca de verdad. Mismos datos, con botones de cantidad, comensales y
 *     reparto tejidos en el propio recibo — nunca hay una segunda vista
 *     del ticket (un panel de app aparte) que pueda desincronizarse de la
 *     imagen que se comparte.
 */
const TicketMesa = forwardRef<HTMLDivElement, TicketMesaProps>(
  ({ lineas, comensales, modo, reparto, nombres, idioma, t, qr, urlQr, fecha, edicion }, ref) => {
    const total = totalMesa(lineas);
    const eur = (v: number) => formatearEuros(v, idioma);
    const comensalesTexto = comensales === 1 ? t.guestsCountOne : t.guestsCount.replace("{n}", String(comensales));
    const cadaUno = modo === "cadaUno" && comensales > 1;

    return (
      <div
        ref={ref}
        style={{
          width: edicion ? "100%" : ANCHO_TICKET,
          maxWidth: ANCHO_TICKET,
          marginInline: edicion ? "auto" : undefined,
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

        {/* Comensales y reparto: solo en el ticket en vivo. */}
        {edicion && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: comensales > 1 ? 10 : 14,
              }}
            >
              <span style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: TINTA_SUAVE }}>
                {t.guestsLabel}
              </span>
              <div className="inline-flex items-center rounded-full border" style={{ borderColor: `${TINTA_SUAVE}55` }}>
                <BotonPaso
                  onClick={() => edicion.onComensalesChange(comensales - 1)}
                  disabled={comensales <= COMENSALES_MIN}
                  label={t.guestsDecrease}
                >
                  <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                </BotonPaso>
                <output
                  aria-label={comensalesTexto}
                  className="min-w-[1.75rem] text-center text-sm font-semibold tabular-nums"
                  style={{ color: TINTA }}
                >
                  {comensales}
                </output>
                <BotonPaso
                  onClick={() => edicion.onComensalesChange(comensales + 1)}
                  disabled={comensales >= COMENSALES_MAX}
                  label={t.guestsIncrease}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                </BotonPaso>
              </div>
            </div>

            {comensales > 1 && (
              <div
                role="radiogroup"
                aria-label={t.splitLabel}
                className="mb-3.5 grid grid-cols-2 gap-1 rounded-full p-1"
                style={{ background: `${TINTA_SUAVE}14` }}
              >
                {(["igual", "cadaUno"] as const).map((opcion) => (
                  <button
                    key={opcion}
                    type="button"
                    role="radio"
                    aria-checked={modo === opcion}
                    onClick={() => edicion.onModoChange(opcion)}
                    className="rounded-full px-3 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ background: modo === opcion ? TINTA : "transparent", color: modo === opcion ? PAPEL : TINTA }}
                  >
                    {opcion === "igual" ? t.splitEqual : t.splitEach}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Líneas */}
        <div>
          {lineas.map((linea, indice) => {
            const precio = `${eur(linea.precio_eur)}${sufijoPrecio(linea.unidad)}`;
            const cfg = edicion ? configUnidad(linea.unidad) : null;
            const cantidad = edicion ? cantidadDeLinea(linea) : null;
            const persona = edicion?.asignaciones[linea.clave];
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

                {edicion && cfg && cantidad !== null && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center rounded-full border" style={{ borderColor: `${TINTA_SUAVE}55` }}>
                      <BotonPaso
                        onClick={() => edicion.onCambiarCantidad(indice, -1)}
                        disabled={cantidad - cfg.paso < cfg.minimo - 1e-9}
                        label={t.lineDecrease.replace("{name}", linea.nombre)}
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                      </BotonPaso>
                      <span className="min-w-[2.75rem] text-center text-xs tabular-nums" aria-live="polite" style={{ color: TINTA }}>
                        {formatearCantidadLinea(linea, idioma)}
                      </span>
                      <BotonPaso onClick={() => edicion.onCambiarCantidad(indice, 1)} label={t.lineIncrease.replace("{name}", linea.nombre)}>
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      </BotonPaso>
                    </div>

                    {cadaUno && (
                      <select
                        value={typeof persona === "number" && persona < comensales ? String(persona) : ""}
                        onChange={(e) => edicion.onAsignar(linea.clave, e.target.value === "" ? null : Number(e.target.value))}
                        aria-label={t.assignAria.replace("{name}", linea.nombre)}
                        className="h-7 max-w-[9rem] rounded-full border bg-transparent px-2 text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        style={{ borderColor: `${TINTA_SUAVE}55`, color: TINTA }}
                      >
                        <option value="">{t.shared}</option>
                        {Array.from({ length: comensales }, (_, i) => (
                          <option key={i} value={i}>
                            {nombrePersona(nombres, i, t.personDefault)}
                          </option>
                        ))}
                      </select>
                    )}

                    <button
                      type="button"
                      onClick={() => edicion.onQuitarLinea(indice)}
                      aria-label={t.lineRemove.replace("{name}", linea.nombre)}
                      className="ml-auto flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      style={{ color: TINTA_SUAVE }}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                )}
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
              <div
                key={i}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: edicion ? 4 : 0 }}
              >
                {edicion ? (
                  <input
                    type="text"
                    value={nombres[i] ?? ""}
                    placeholder={t.personDefault.replace("{n}", String(i + 1))}
                    onChange={(e) => edicion.onNombreChange(i, e.target.value)}
                    maxLength={40}
                    autoComplete="off"
                    spellCheck={false}
                    aria-label={t.personNameAria.replace("{n}", String(i + 1))}
                    className="h-7 min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ color: TINTA }}
                  />
                ) : (
                  <span style={{ overflowWrap: "anywhere" }}>{nombrePersona(nombres, i, t.personDefault)}</span>
                )}
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
