import { forwardRef, type ReactNode } from "react";
import { Minus, Plus, Trash2, X } from "lucide-react";
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

// Colores fijos (no tokens CSS): la imagen debe salir igual con tema claro u
// oscuro. Gramática del ticket original (recibo de verdad, sin dorados ni
// filigranas): tinta casi negra, gris para lo secundario, borde discontinuo.
const TINTA = "#3a4148"; // --dark-slate
const TINTA_SUAVE = "#6a6360"; // --mid-gray
const BORDE = "#d1d5db"; // gray-300
const PAPEL = "#fbf8f3";
const SERIF = '"Libre Baskerville", "Bodoni MT", Georgia, serif';
const IGUALES = "================================";
const ASTERISCOS = "********************************";

type LineaTicket = LineaMesa & { clave: string; categoria?: string | null };

/**
 * Handlers de edición. Presentes → el ticket sale EN VIVO, con los controles
 * tejidos en el propio recibo (cantidades, comensales, reparto, vaciar).
 * Ausentes → el ticket sale exactamente igual que antes de que existiera esta
 * prop: ni un botón, listo tal cual para `html-to-image`.
 */
export type EdicionTicketMesa = {
  onCambiarCantidad: (indice: number, direccion: 1 | -1) => void;
  onQuitarLinea: (indice: number) => void;
  onComensalesChange: (siguiente: number) => void;
  onModoChange: (modo: ModoReparto) => void;
  /** Añade o quita a `persona` de quienes comparten la línea `clave`. */
  onAsignar: (clave: string, persona: number) => void;
  onNombreChange: (indice: number, valor: string) => void;
  /** Vacío o ausente = para compartir entre todos. */
  asignaciones: Record<string, number[] | undefined>;
  vaciar: {
    confirmando: boolean;
    onPedir: () => void;
    onConfirmar: () => void;
    onCancelar: () => void;
  };
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
  /**
   * Oculta el reparto (total por persona, a partes iguales o "cada uno lo
   * suyo") sin tocar nada más. Solo lo usa la copia oculta que se captura
   * para compartir en redes: cómo se divide la cuenta es un asunto entre
   * los comensales, no algo para publicar con la foto del ticket.
   */
  ocultarReparto?: boolean;
};

/** Línea de "=" o "*", igual que el ticket original — texto de verdad, no un `border`. */
const LineaAscii = ({ texto }: { texto: string }) => (
  <div aria-hidden="true" style={{ fontSize: 10, color: TINTA_SUAVE, letterSpacing: -0.5, textAlign: "center" }}>
    {texto}
  </div>
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
    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
    style={{ color: TINTA, borderColor: BORDE }}
  >
    {children}
  </button>
);

/**
 * El ticket de "Mi mesa": el recibo de siempre de esta web (papel con borde
 * discontinuo, líneas de "=", logo, reglas negras) — no una reinvención con
 * dorados ni troquel de imprenta.
 *
 * Un único layout para DOS usos:
 *  1. Sin `edicion`, pintado fuera de pantalla: lo que captura
 *     `html-to-image` para adjuntar al preguntar a Tomy. Un `<div>` puro,
 *     sin un solo evento — el comportamiento de siempre.
 *  2. Con `edicion`, pintado dentro del panel: lo que el visitante ve y
 *     toca de verdad. Mismos datos, con botones de cantidad, comensales,
 *     reparto y vaciar tejidos en el propio recibo. Nunca hay una segunda
 *     vista del ticket (un panel de app aparte) que pueda desincronizarse
 *     de la imagen capturada.
 */
const TicketMesa = forwardRef<HTMLDivElement, TicketMesaProps>(
  ({ lineas, comensales, modo, reparto, nombres, idioma, t, qr, urlQr, fecha, edicion, ocultarReparto }, ref) => {
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
          border: `2px dashed ${BORDE}`,
          borderRadius: 8,
          padding: "20px 20px 18px",
          fontFamily: SERIF,
          fontSize: 12,
          lineHeight: 1.45,
          fontVariantNumeric: "tabular-nums",
          boxSizing: "border-box",
        }}
      >
        {/* Cabecera */}
        <div style={{ textAlign: "center", borderBottom: `2px solid ${TINTA}`, paddingBottom: 12, marginBottom: 12 }}>
          {/* Sin srcset: html-to-image lo vacía y captura `src` a pixelRatio 2. */}
          <img
            src={logoTicket}
            alt=""
            width={LOGO_WIDTH}
            height={LOGO_HEIGHT}
            style={{ height: 88, width: "auto", margin: "0 auto", display: "block" }}
          />
          <div style={{ marginTop: 8 }}>
            <LineaAscii texto={IGUALES} />
          </div>
          <div style={{ fontSize: 11, color: TINTA_SUAVE, marginTop: 6 }}>
            {fecha} · {comensalesTexto}
          </div>
          <div style={{ marginTop: 6 }}>
            <LineaAscii texto={IGUALES} />
          </div>
        </div>

        {/* Comensales y reparto: solo en el ticket en vivo. */}
        {edicion && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: TINTA_SUAVE }}>
                {t.guestsLabel}
              </span>
              <div className="inline-flex items-center gap-2">
                <BotonPaso
                  onClick={() => edicion.onComensalesChange(comensales - 1)}
                  disabled={comensales <= COMENSALES_MIN}
                  label={t.guestsDecrease}
                >
                  <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                </BotonPaso>
                <output aria-label={comensalesTexto} className="min-w-[1.5rem] text-center text-sm font-semibold tabular-nums" style={{ color: TINTA }}>
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
              <div role="radiogroup" aria-label={t.splitLabel} className="mt-2 flex gap-2 text-xs">
                {(["igual", "cadaUno"] as const).map((opcion) => (
                  <button
                    key={opcion}
                    type="button"
                    role="radio"
                    aria-checked={modo === opcion}
                    onClick={() => edicion.onModoChange(opcion)}
                    className="flex-1 rounded border px-2 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{
                      borderColor: modo === opcion ? TINTA : BORDE,
                      background: modo === opcion ? TINTA : "transparent",
                      color: modo === opcion ? PAPEL : TINTA,
                    }}
                  >
                    {opcion === "igual" ? t.splitEqual : t.splitEach}
                  </button>
                ))}
              </div>
            )}
            {cadaUno && (
              <p className="mt-2 text-[10px]" style={{ color: TINTA_SUAVE }}>
                {t.splitEachHint}
              </p>
            )}
          </div>
        )}

        {/* Líneas */}
        <div>
          {lineas.map((linea, indice) => {
            const cfg = edicion ? configUnidad(linea.unidad) : null;
            const cantidad = edicion ? cantidadDeLinea(linea) : null;
            const personasLinea = edicion?.asignaciones[linea.clave] ?? [];
            const esUltima = indice === lineas.length - 1;
            return (
              <div
                key={linea.clave}
                style={{
                  borderBottom: esUltima ? undefined : `1px dashed ${BORDE}`,
                  paddingBottom: 10,
                  marginBottom: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontWeight: 700, textTransform: "uppercase", fontSize: 11.5, overflowWrap: "anywhere" }}>
                    {linea.nombre}
                  </span>
                  {edicion && (
                    <button
                      type="button"
                      onClick={() => edicion.onQuitarLinea(indice)}
                      aria-label={t.lineRemove.replace("{name}", linea.nombre)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>

                {linea.categoria && (
                  <div style={{ fontSize: 10, fontStyle: "italic", color: TINTA_SUAVE, marginTop: 2 }}>
                    ({linea.categoria})
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6, gap: 8 }}>
                  {edicion && cfg && cantidad !== null ? (
                    <div className="inline-flex items-center gap-1.5">
                      <BotonPaso
                        onClick={() => edicion.onCambiarCantidad(indice, -1)}
                        disabled={cantidad - cfg.paso < cfg.minimo - 1e-9}
                        label={t.lineDecrease.replace("{name}", linea.nombre)}
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                      </BotonPaso>
                      <span className="min-w-[2.5rem] text-center text-xs tabular-nums" aria-live="polite" style={{ color: TINTA }}>
                        {formatearCantidadLinea(linea, idioma)}
                      </span>
                      <BotonPaso onClick={() => edicion.onCambiarCantidad(indice, 1)} label={t.lineIncrease.replace("{name}", linea.nombre)}>
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      </BotonPaso>
                    </div>
                  ) : (
                    <span style={{ fontSize: 10.5, color: TINTA_SUAVE }}>{formatearCantidadLinea(linea, idioma)}</span>
                  )}

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10.5, color: TINTA_SUAVE }}>
                      {formatearCantidadLinea(linea, idioma)} × {eur(linea.precio_eur)}
                      {sufijoPrecio(linea.unidad)}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 12.5 }}>{eur(importeLinea(linea))}</div>
                  </div>
                </div>

                {edicion && cadaUno && (
                  <div className="mt-2">
                    {/* Botones de alternar, no un desplegable: más de una
                        persona puede compartir el mismo plato (p. ej. entre
                        2 de 3 comensales). */}
                    <div
                      role="group"
                      aria-label={t.assignAria.replace("{name}", linea.nombre)}
                      className="flex flex-wrap gap-1.5"
                    >
                      {Array.from({ length: comensales }, (_, i) => {
                        const seleccionado = personasLinea.includes(i);
                        return (
                          <button
                            key={i}
                            type="button"
                            aria-pressed={seleccionado}
                            onClick={() => edicion.onAsignar(linea.clave, i)}
                            className="rounded-full border px-2.5 py-1 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            style={{
                              borderColor: seleccionado ? TINTA : BORDE,
                              background: seleccionado ? TINTA : "transparent",
                              color: seleccionado ? PAPEL : TINTA,
                            }}
                          >
                            {nombrePersona(nombres, i, t.personDefault)}
                          </button>
                        );
                      })}
                    </div>
                    {personasLinea.length === 0 && (
                      <p className="mt-1 text-[10px] italic" style={{ color: TINTA_SUAVE }}>
                        {t.shared}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Total */}
        <div style={{ borderTop: `2px solid ${TINTA}`, paddingTop: 12, marginTop: 4 }}>
          <LineaAscii texto={IGUALES} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "6px 0" }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{t.totalLabel.toUpperCase()}:</span>
            <span style={{ fontSize: 20, fontWeight: 700 }}>{eur(total)}</span>
          </div>

          {!ocultarReparto &&
            (modo === "igual" || comensales === 1 ? (
              <div style={{ textAlign: "right", fontWeight: 600, marginBottom: 6 }}>
                {t.perPerson.replace("{amount}", eur(porPersona(total, comensales)))}
              </div>
            ) : (
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: TINTA_SUAVE, marginBottom: 4 }}>
                  {t.ticket.perPersonTitle}
                </div>
                {reparto.porPersona.map((importe, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
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
                        className="h-6 min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        style={{ color: TINTA }}
                      />
                    ) : (
                      <span style={{ overflowWrap: "anywhere" }}>{nombrePersona(nombres, i, t.personDefault)}</span>
                    )}
                    <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{eur(importe)}</span>
                  </div>
                ))}
                {reparto.compartido > 0 && (
                  <div style={{ fontSize: 10.5, color: TINTA_SUAVE }}>
                    {t.sharedLine
                      .replace("{amount}", eur(reparto.compartido))
                      .replace("{each}", eur(reparto.compartidoPorPersona))}
                  </div>
                )}
              </div>
            ))}
          <LineaAscii texto={IGUALES} />
        </div>

        {/* Aviso */}
        <div style={{ textAlign: "center", fontSize: 10.5, color: TINTA_SUAVE, marginTop: 12 }}>{t.note}</div>

        {/* Vaciar: solo en el ticket en vivo. */}
        {edicion && (
          <div style={{ marginTop: 14 }}>
            {edicion.vaciar.confirmando ? (
              <div className="text-center text-xs" style={{ color: TINTA_SUAVE }}>
                <p className="mb-2">{t.clearConfirm}</p>
                {/* Dos botones grandes y bien separados: en un dedo de por
                    medio no es sitio para acertar "cancelar" cuando el de al
                    lado vacía la mesa. */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={edicion.vaciar.onCancelar}
                    autoFocus
                    className="flex h-10 items-center justify-center rounded-md border text-sm font-medium transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ borderColor: BORDE, color: TINTA }}
                  >
                    {t.clearNo}
                  </button>
                  <button
                    type="button"
                    onClick={edicion.vaciar.onConfirmar}
                    className="flex h-10 items-center justify-center rounded-md border text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ borderColor: "#dc2626" }}
                  >
                    {t.clearYes}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={edicion.vaciar.onPedir}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-md border text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ borderColor: "#dc2626" }}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {t.clear}
              </button>
            )}
          </div>
        )}

        {/* Pie: QR + datos del restaurante */}
        <div style={{ marginTop: 14 }}>
          <LineaAscii texto={ASTERISCOS} />
          <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "10px 0" }}>
            {qr && (
              <svg
                viewBox={`-2 -2 ${qr.length + 4} ${qr.length + 4}`}
                width={72}
                height={72}
                role="img"
                aria-label={urlQr}
                shapeRendering="crispEdges"
                style={{ flexShrink: 0, background: "#ffffff", borderRadius: 4 }}
              >
                <path d={pathDeMatrizQr(qr)} fill={TINTA} />
              </svg>
            )}
            <div style={{ fontSize: 10.5, lineHeight: 1.5, color: TINTA_SUAVE }}>
              <div style={{ fontFamily: SERIF, fontSize: 12, color: TINTA }}>Casa Tomás</div>
              <div>
                {NEGOCIO.calle} · {NEGOCIO.cp} {NEGOCIO.localidad}
              </div>
              <div>{telefonoLegible(NEGOCIO.telefono)}</div>
              <div style={{ marginTop: 2 }}>{t.ticket.qr}</div>
            </div>
          </div>
          <LineaAscii texto={ASTERISCOS} />
        </div>

        <div style={{ textAlign: "center", fontFamily: SERIF, fontSize: 11.5, marginTop: 12, color: TINTA_SUAVE }}>
          {t.thanks}
        </div>
      </div>
    );
  },
);
TicketMesa.displayName = "TicketMesa";

export default TicketMesa;
