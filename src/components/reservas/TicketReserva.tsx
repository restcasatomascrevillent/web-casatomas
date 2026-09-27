import { forwardRef, useId, type ReactNode } from "react";
import { format } from "date-fns";
import type { Locale } from "date-fns";
import { LOGO_HEIGHT, LOGO_WIDTH, logoSmall } from "@/assets/logo";
import { NEGOCIO } from "@/lib/negocio";
import { cn } from "@/lib/utils";
import type { Translations } from "@/i18n/languages/es";

/** Lo que el formulario sabe de la solicitud en el momento de enviarla. */
export type DatosTicket = {
  nombre: string;
  email: string;
  fecha: Date;
  hora: string;
  comensales: number;
  /** Reloj del navegador al pulsar "Reservar ahora". */
  solicitadaEn: Date;
};

type TicketReservaProps = {
  datos: DatosTicket;
  t: Translations["reservationForm"];
  dateLocale: Locale;
  /**
   * Título y frase de entrada del recibo. Llegan como slots (no como texto)
   * para que quien los pinte sea el `DialogTitle` / `DialogDescription` de
   * Radix: así el diálogo queda etiquetado y descrito por los elementos que
   * el visitante ve de verdad, sin duplicarlos en un `sr-only` que el lector
   * de pantalla acabaría leyendo dos veces.
   */
  titulo: ReactNode;
  lead: ReactNode;
};

/** Separador de papel: la línea de puntos del recibo. */
const Separador = () => (
  <div aria-hidden="true" className="my-3.5 border-t border-dashed border-ticket-ink-soft/40" />
);

/**
 * Fila etiqueta → valor con guía de puntos, como las líneas de un recibo.
 *
 * El `<dt>`/`<dd>` no es decoración: un lector de pantalla lee "Fecha,
 * 21 de octubre de 2026" en vez de dos textos sueltos sin relación.
 */
const Fila = ({ etiqueta, children }: { etiqueta: string; children: ReactNode }) => (
  <div className="flex items-baseline gap-1.5">
    {/* La guía de puntos va DENTRO del `<dt>`: entre un `<dt>` y su `<dd>` el
        HTML no admite otros elementos, y un `<span>` suelto ahí deja la lista
        de definición mal formada. */}
    {/* Sin `min-w-0`: con el ancho mínimo a 0 el `<dt>` se encogía por debajo
        de su contenido y la etiqueta (que es `shrink-0`) se salía encima del
        valor. Dejando que respete su min-content, lo que cede es el valor,
        que parte de línea en vez de solaparse. */}
    <dt className="flex flex-1 items-baseline gap-1.5 text-[0.8125rem] uppercase tracking-[0.09em] text-ticket-ink-soft">
      <span className="shrink-0">{etiqueta}</span>
      <span
        aria-hidden="true"
        className="min-w-3 flex-1 -translate-y-[3px] border-b border-dotted border-ticket-ink-soft/50"
      />
    </dt>
    {/* Sin tope de ancho: el `<dt>` es `flex-1 min-w-0` con la etiqueta
        `shrink-0`, así que lo único que se encoge es la guía de puntos (hasta
        su `min-w-3`) y el valor se queda entero. Con un `max-w` fijo, "29 de
        septiembre de 2026" partía en dos líneas aunque hubiera sitio. */}
    <dd className="text-right font-semibold leading-snug [overflow-wrap:anywhere] [text-wrap:balance]">{children}</dd>
  </div>
);

/** Marca de paso cumplido (palito en ángulo) o pendiente (aro hueco). */
const MarcaPaso = ({ hecho }: { hecho: boolean }) =>
  hecho ? (
    <span
      aria-hidden="true"
      className="relative z-10 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-ticket-stamp"
    >
      <span className="mt-[-2px] h-[4px] w-[7px] rotate-[-45deg] border-b-2 border-l-2 border-ticket-paper" />
    </span>
  ) : (
    <span
      aria-hidden="true"
      className="relative z-10 h-4 w-4 shrink-0 rounded-full border border-dashed border-ticket-ink-soft/70 bg-ticket-paper"
    />
  );

/**
 * Resguardo de la solicitud de reserva: el recibo que ve el cliente en cuanto
 * el formulario entra (HTTP 201).
 *
 * Hereda la gramática del ticket de "Mi mesa" (papel cálido, filete de oro,
 * separadores de puntos, cifras tabulares) para que siga perteneciendo a esta
 * web, pero aquí es DOM vivo y accesible, no una imagen.
 *
 * Lo que este componente NO hace, a propósito:
 *   - No inventa un número de reserva. La función `reservas-web/crear` sí
 *     devuelve `reserva_id`, pero es un UUID y el panel solo busca por nombre,
 *     email y teléfono (`GestorReservasKanban`): un "nº de reserva" que nadie
 *     del restaurante puede localizar es peor que no darlo.
 *   - No usa el verde de "hecho" en ningún sitio. La reserva nace en estado
 *     `pendiente` y el sello es la pieza que lo dice.
 */
const TicketReserva = forwardRef<HTMLDivElement, TicketReservaProps>(({ datos, t, dateLocale, titulo, lead }, ref) => {
  const ticket = t.successTicket;
  const fechaLarga = format(datos.fecha, "PPP", { locale: dateLocale });
  const registrada = format(datos.solicitadaEn, "dd.MM.yyyy · HH:mm");
  const idPasos = useId();

  // Pasos 1 y 2 hechos (consultó disponibilidad y acaba de enviar la
  // solicitud); 3 y 4 los hace el restaurante. Es el mismo circuito de cuatro
  // pasos que anuncia la propia página en el aviso de arriba.
  const pasosHechos = 2;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      className={cn(
        "ticket-paper ticket-grain animate-ticket-print",
        // `overflow-hidden` además de la máscara: las medias lunas del troquel
        // se cortan igual en navegadores sin soporte de `mask` (si no, salen
        // como dos círculos enteros flotando fuera del papel).
        "relative overflow-hidden bg-ticket-paper px-5 py-6 text-ticket-ink outline-none sm:px-6",
        "text-[0.9375rem] leading-relaxed [font-variant-numeric:tabular-nums]",
      )}
    >
      {/* ---------------- Cabecera ---------------- */}
      <header className="text-center">
        <img
          src={logoSmall.src}
          srcSet={logoSmall.srcSet}
          sizes="96px"
          width={LOGO_WIDTH}
          height={LOGO_HEIGHT}
          alt={NEGOCIO.nombre}
          className="mx-auto h-12 w-auto"
        />
        <p className="mt-3 text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-ticket-ink-soft">
          {ticket.documentType}
        </p>
        <div aria-hidden="true" className="mx-auto mt-3 flex items-center justify-center gap-2">
          <span className="h-px w-8 bg-ticket-rule/70" />
          <span className="h-[5px] w-[5px] rotate-45 bg-ticket-rule" />
          <span className="h-px w-8 bg-ticket-rule/70" />
        </div>
        {titulo}
        {lead}
      </header>

      {/* ---------------- Sello de estado ----------------
          El sello es texto real, no una imagen ni un `aria-hidden`: es el dato
          que impide que alguien se presente creyendo que tiene mesa. */}
      <p
        className={cn(
          // `w-fit` + tope de ancho: sin el tope, cuando el texto no cabe en una
          // línea la caja se estiraba de canto a canto del papel y los filetes
          // del sello morían cortados contra el troquel.
          "animate-ticket-stamp mx-auto mt-4 w-fit max-w-[calc(100%-3rem)] rotate-[-2.2deg]",
          "border-y-2 border-dashed border-ticket-stamp/55 px-4 py-2",
          // `text-balance` para que en francés ("EN ATTENTE DE CONFIRMATION")
          // las dos líneas del sello queden parejas y no una larga y una corta.
          "text-center text-[0.8125rem] font-bold uppercase leading-tight tracking-[0.12em] text-ticket-stamp [text-wrap:balance]",
        )}
      >
        {ticket.stamp}
      </p>

      <Separador />

      {/* ---------------- Datos de la solicitud ---------------- */}
      <dl className="space-y-2">
        <Fila etiqueta={ticket.nameLabel}>{datos.nombre}</Fila>
        <Fila etiqueta={ticket.dateLabel}>{fechaLarga}</Fila>
        <Fila etiqueta={ticket.timeLabel}>{datos.hora}</Fila>
        <Fila etiqueta={ticket.guestsLabel}>{datos.comensales}</Fila>
      </dl>

      {/* ---------------- Perforación ----------------
          Las dos medias lunas del color de la bandeja son el troquel del
          resguardo. Se salen del papel a propósito: la máscara del canto las
          recorta justo a la mitad. */}
      <div className="relative my-4" aria-hidden="true">
        <span className="absolute -left-[calc(1.25rem+7px)] top-1/2 h-[14px] w-[14px] -translate-y-1/2 rounded-full bg-ticket-tray sm:-left-[calc(1.5rem+7px)]" />
        <span className="absolute -right-[calc(1.25rem+7px)] top-1/2 h-[14px] w-[14px] -translate-y-1/2 rounded-full bg-ticket-tray sm:-right-[calc(1.5rem+7px)]" />
        <div className="border-t-2 border-dashed border-ticket-ink-soft/35" />
      </div>

      {/* ---------------- Dónde llega la confirmación ---------------- */}
      <div>
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-ticket-ink-soft">
          {ticket.emailLabel}
        </p>
        <p className="mt-1 font-semibold [overflow-wrap:anywhere]">{datos.email}</p>
        <p className="mt-1.5 text-[0.8125rem] text-ticket-ink-soft">{ticket.emailHint}</p>
      </div>

      {/* ---------------- Los cuatro pasos ---------------- */}
      <div className="mt-5">
        <p
          id={idPasos}
          className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-ticket-ink-soft"
        >
          {ticket.stepCaption.replace("{done}", String(pasosHechos)).replace("{total}", String(ticket.steps.length))}
        </p>
        {/* El "Paso 2 de 4" da nombre accesible a la lista: un lector de
            pantalla anuncia "Paso 2 de 4, lista, 4 elementos". */}
        <ol aria-labelledby={idPasos} className="relative mt-2.5 space-y-2">
          {/* Hilo que cose los pasos. Va detrás de las marcas (z-10 en ellas). */}
          <span
            aria-hidden="true"
            className="absolute bottom-3 left-[7.5px] top-3 w-px border-l border-dashed border-ticket-ink-soft/40"
          />
          {ticket.steps.map((paso, indice) => {
            const hecho = indice < pasosHechos;
            return (
              <li key={paso} className="flex items-start gap-3">
                <span className="mt-[3px]">
                  <MarcaPaso hecho={hecho} />
                </span>
                <span
                  className={cn(
                    "text-[0.875rem]",
                    hecho ? "font-semibold text-ticket-ink" : "text-ticket-ink-soft",
                  )}
                >
                  {paso}
                  <span className="sr-only">{` — ${hecho ? ticket.stepDone : ticket.stepPending}`}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <Separador />

      {/* ---------------- Pie ---------------- */}
      <footer className="text-center">
        <p className="text-[0.875rem] text-ticket-ink-soft [text-wrap:pretty]">{t.successLine3}</p>
        <p className="mt-3 text-[0.9375rem] italic text-ticket-ink">{ticket.thanks}</p>
        <p className="mt-4 text-[0.75rem] tracking-[0.08em] text-ticket-ink-soft [font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace]">
          <span className="sr-only">{`${ticket.issuedLabel}: `}</span>
          {registrada}
        </p>
      </footer>
    </div>
  );
});
TicketReserva.displayName = "TicketReserva";

export default TicketReserva;
