import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Link } from "react-router-dom";
import { Bot, CalendarCheck, Download, Share2, Trash2, UtensilsCrossed, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { getUserPedido, setUserPedido } from "@/utils/sessionManager";
import { clavePedido, type LineaPedido } from "@/hooks/usePedido";
import { useMiMesa } from "@/hooks/useMiMesa";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslations } from "@/i18n/LanguageProvider";
import { construirRutaIdioma } from "@/i18n/routing";
import { useToast } from "@/hooks/use-toast";
import { useChatbotVisible } from "@/hooks/useChatbotVisible";
import {
  LOCALE_POR_IDIOMA,
  cantidadDeLinea,
  configUnidad,
  construirPreguntaTomy,
  repartoCadaUno,
  resumenTextoMesa,
  rutaReservaMesa,
  urlCarta,
} from "@/lib/mi-mesa";
import { generarMatrizQr } from "@/lib/qr";
import { cn } from "@/lib/utils";
import TicketMesa from "./TicketMesa";

const AIChatbot = lazy(() => import("../AIChatbot"));

const NOMBRE_IMAGEN = "mi-mesa-casa-tomas.png";

type Imagen = { firma: string; file: File; dataUrl: string };

/** Espera a las fuentes y a las imágenes del nodo antes de capturarlo. */
const esperarRecursos = async (nodo: HTMLElement) => {
  try {
    await document.fonts?.ready;
  } catch {
    // Sin Font Loading API: se captura con lo que haya.
  }
  const imagenes = Array.from(nodo.querySelectorAll("img"));
  await Promise.all(
    imagenes.map((img) =>
      img.complete
        ? img.decode?.().catch(() => undefined)
        : new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          }),
    ),
  );
};

/** ¿Puede este navegador compartir un PNG con `navigator.share`? (síncrono, para no perder el gesto). */
const puedeCompartirArchivos = (): boolean => {
  try {
    if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") return false;
    return navigator.canShare({ files: [new File([new Blob()], NOMBRE_IMAGEN, { type: "image/png" })] });
  } catch {
    return false;
  }
};

const esAbort = (error: unknown) => error instanceof Error && error.name === "AbortError";

/**
 * "Mi mesa" (antes "Mi pedido"): el visitante apunta lo que le apetece de la
 * carta, ve el total orientativo, cuánto toca a cada uno, y lo comparte con
 * su grupo como un ticket en imagen. NO es un pedido online.
 *
 * Lo monta `FloatingActions` (perezoso) en cuanto hay alguna línea: pinta el
 * botón flotante "Mi mesa · N" y el panel (hoja inferior en móvil, panel
 * lateral en escritorio).
 *
 * El panel ES el ticket: `TicketMesa` se pinta EN VIVO ahí dentro (con
 * `edicion`, que teje los controles de cantidad/comensales/reparto en el
 * propio recibo) y, sin `edicion`, fuera de pantalla para capturarlo como
 * imagen al compartir/descargar. Mismo componente, mismo layout — nunca hay
 * un panel genérico por un lado y el ticket de verdad por otro, que podrían
 * acabar desincronizados entre sí.
 */
const PreviewPedido = () => {
  const { t, language } = useTranslations();
  const tp = t.preview;
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const mesa = useMiMesa();
  const chatbotVisible = useChatbotVisible();

  const [pedido, setPedido] = useState<LineaPedido[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [ocupado, setOcupado] = useState<null | "compartir" | "descargar" | "chat">(null);
  const [confirmarVaciar, setConfirmarVaciar] = useState(false);
  const [qr, setQr] = useState<boolean[][] | null>(null);
  const [chat, setChat] = useState<{ imagen: string | null; pregunta: string } | null>(null);

  const ticketRef = useRef<HTMLDivElement | null>(null);
  const imagenRef = useRef<Imagen | null>(null);
  const enCursoRef = useRef<{ firma: string; promesa: Promise<Imagen> } | null>(null);

  useEffect(() => {
    const cargar = () => {
      try {
        setPedido(getUserPedido() as LineaPedido[]);
      } catch {
        setPedido([]);
      }
    };
    cargar();
    window.addEventListener("storage", cargar);
    window.addEventListener("pedidoUpdated", cargar);
    return () => {
      window.removeEventListener("storage", cargar);
      window.removeEventListener("pedidoUpdated", cargar);
    };
  }, []);

  const guardarPedido = (siguiente: LineaPedido[]) => {
    setPedido(siguiente);
    try {
      setUserPedido(siguiente);
    } catch {
      // Sin sessionStorage: vale para esta pantalla.
    }
  };

  const lineas = useMemo(() => pedido.map((linea) => ({ ...linea, clave: clavePedido(linea) })), [pedido]);
  const { comensales, modo, nombres, asignaciones } = mesa;
  const reparto = useMemo(
    () => repartoCadaUno(lineas, (l) => l.clave, asignaciones, comensales),
    [lineas, asignaciones, comensales],
  );
  const cadaUno = modo === "cadaUno" && comensales > 1;

  const rutaCarta = construirRutaIdioma("/carta", language);
  const origen = typeof window !== "undefined" ? window.location.origin : null;
  const urlQr = urlCarta(origen, rutaCarta);
  const resumen = () => resumenTextoMesa(lineas, comensales, language, tp.share, urlQr);

  // Firma de lo que sale en la imagen: si no cambia, se reutiliza la ya generada
  // (y así `navigator.share` se llama sin esperas, dentro del gesto del usuario).
  const firma = JSON.stringify([pedido, comensales, modo, nombres, asignaciones, language]);

  // El ticket en vivo lleva el QR desde que se abre (antes solo se generaba
  // al pulsar compartir/descargar, así que ese hueco del recibo salía vacío
  // mientras tanto). Si `generarImagen` ya lo está generando a la vez
  // (p. ej. se precalentó la imagen antes de abrir), la llamada de aquí es
  // redundante pero inofensiva: `generarMatrizQr` es determinista y ambas
  // acaban fijando el mismo resultado.
  useEffect(() => {
    if (!abierto || qr) return;
    let cancelado = false;
    void generarMatrizQr(urlQr).then((matriz) => {
      if (!cancelado) setQr(matriz);
    });
    return () => {
      cancelado = true;
    };
  }, [abierto, qr, urlQr]);

  const generarImagen = useCallback(async (): Promise<Imagen> => {
    if (imagenRef.current?.firma === firma) return imagenRef.current;
    if (enCursoRef.current?.firma === firma) return enCursoRef.current.promesa;

    const promesa = (async () => {
      if (!qr) {
        const matriz = await generarMatrizQr(urlQr);
        flushSync(() => setQr(matriz));
      }
      const nodo = ticketRef.current;
      if (!nodo) throw new Error("Ticket no disponible para captura");
      await esperarRecursos(nodo);
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(nodo, { pixelRatio: 2, cacheBust: true, backgroundColor: "#fbf8f3" });
      const blob = await (await fetch(dataUrl)).blob();
      const imagen = { firma, dataUrl, file: new File([blob], NOMBRE_IMAGEN, { type: "image/png" }) };
      imagenRef.current = imagen;
      return imagen;
    })();

    enCursoRef.current = { firma, promesa };
    try {
      return await promesa;
    } finally {
      if (enCursoRef.current?.promesa === promesa) enCursoRef.current = null;
    }
  }, [firma, qr, urlQr]);

  /** Genera la imagen de antemano (al pasar por encima / enfocar "Compartir"). */
  const precalentar = () => {
    if (lineas.length > 0 && puedeCompartirArchivos()) void generarImagen().catch(() => undefined);
  };

  const avisarError = () =>
    toast({ title: tp.share.errorTitle, description: tp.share.error, variant: "destructive" });

  const compartir = async () => {
    const texto = resumen();
    if (!puedeCompartirArchivos()) {
      // Escritorio y navegadores sin Web Share de archivos: el resumen va por
      // WhatsApp (abierto dentro del mismo click para que no lo bloquee el
      // navegador) y se ofrece la imagen con "Descargar imagen".
      window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
      toast({ title: tp.share.fallbackTitle, description: tp.share.fallbackDescription });
      return;
    }
    setOcupado("compartir");
    try {
      const { file } = await generarImagen();
      await navigator.share({ files: [file], text: texto, title: tp.title });
    } catch (error) {
      if (esAbort(error)) return; // El usuario cerró la hoja de compartir.
      console.error(error);
      avisarError();
    } finally {
      setOcupado(null);
    }
  };

  const descargar = async () => {
    setOcupado("descargar");
    try {
      const { dataUrl } = await generarImagen();
      const enlace = document.createElement("a");
      enlace.href = dataUrl;
      enlace.download = NOMBRE_IMAGEN;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
    } catch (error) {
      console.error(error);
      avisarError();
    } finally {
      setOcupado(null);
    }
  };

  const preguntarATomy = async () => {
    setOcupado("chat");
    let imagen: string | null = null;
    try {
      imagen = (await generarImagen()).dataUrl;
    } catch (error) {
      console.error("No se pudo generar la imagen del ticket para Tomy:", error);
    }
    setChat({ imagen, pregunta: construirPreguntaTomy(lineas, comensales, language, tp) });
    setOcupado(null);
    // El chat va encima de todo: se cierra el panel y se vuelve a abrir al cerrar el chat.
    setAbierto(false);
  };

  const cambiarCantidad = (indice: number, direccion: 1 | -1) => {
    const linea = pedido[indice];
    const cfg = configUnidad(linea.unidad);
    const actual = cantidadDeLinea(linea);
    const siguiente = Number((actual + direccion * cfg.paso).toFixed(cfg.decimales));
    if (siguiente < cfg.minimo) return;
    guardarPedido(pedido.map((l, i) => (i === indice ? { ...l, cantidad: siguiente } : l)));
  };

  const quitarLinea = (indice: number) => {
    const clave = lineas[indice]?.clave;
    guardarPedido(pedido.filter((_, i) => i !== indice));
    if (clave && clave in asignaciones) mesa.asignar(clave, null);
  };

  const vaciar = () => {
    guardarPedido([]);
    mesa.olvidarAsignaciones();
    setConfirmarVaciar(false);
  };

  useEffect(() => {
    if (!abierto) setConfirmarVaciar(false);
  }, [abierto]);

  const fecha = abierto
    ? new Date().toLocaleDateString(LOCALE_POR_IDIOMA[language], { day: "numeric", month: "long", year: "numeric" })
    : "";
  const vacia = lineas.length === 0;

  const panel = (
    <div className="flex h-full min-h-0 flex-col bg-ticket-paper">
      {/* El propio ticket (`TicketMesa`, justo debajo) ya trae el logo y el
          título — un segundo título visible aquí sería redundante. Radix
          exige `SheetTitle`/`SheetDescription` para la accesibilidad del
          `Sheet`; se mantienen, solo que ocultos a la vista. */}
      <SheetTitle className="sr-only">{tp.title}</SheetTitle>
      <SheetDescription className="sr-only">{tp.subtitle}</SheetDescription>
      <div className="flex justify-end px-3 pt-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setAbierto(false)}
          aria-label={tp.close}
          className="h-9 w-9 shrink-0 rounded-full text-ticket-ink hover:bg-ticket-ink/10"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
        {vacia ? (
          <div className="flex flex-col items-center py-12 text-center">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
              <UtensilsCrossed className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="font-libre-baskerville text-lg text-ticket-ink text-balance">{tp.emptyTitle}</p>
            <p className="mt-2 max-w-xs text-sm text-ticket-ink-soft text-pretty">{tp.emptySubtitle}</p>
            <Button asChild className="mt-6 rounded-full bg-accent px-6 text-accent-foreground hover:bg-accent/90">
              <Link to={rutaCarta} onClick={() => setAbierto(false)}>
                {tp.emptyCta}
              </Link>
            </Button>
          </div>
        ) : (
          // El ticket real, en vivo: mismo componente que genera la imagen de
          // compartir/descargar (ver más abajo), con `edicion` tejiendo los
          // controles de cantidad/comensales/reparto en el propio recibo.
          <TicketMesa
            lineas={lineas}
            comensales={comensales}
            modo={cadaUno ? "cadaUno" : "igual"}
            reparto={reparto}
            nombres={nombres}
            idioma={language}
            t={tp}
            qr={qr}
            urlQr={urlQr}
            fecha={fecha}
            edicion={{
              onCambiarCantidad: cambiarCantidad,
              onQuitarLinea: quitarLinea,
              onComensalesChange: mesa.setComensales,
              onModoChange: mesa.setModo,
              onAsignar: mesa.asignar,
              onNombreChange: mesa.setNombre,
              asignaciones,
            }}
          />
        )}
      </div>

      {/* Acciones */}
      {!vacia && (
        <div className="space-y-2 border-t border-dashed border-ticket-ink-soft/40 bg-ticket-paper px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
          <Button
            type="button"
            onClick={compartir}
            onPointerEnter={precalentar}
            onFocus={precalentar}
            disabled={ocupado !== null}
            className="h-12 w-full rounded-full bg-accent text-base text-accent-foreground shadow-md hover:bg-accent/90"
          >
            <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
            {ocupado === "compartir" ? tp.share.generating : tp.share.cta}
          </Button>
          <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
            <Button type="button" variant="outline" onClick={descargar} disabled={ocupado !== null} className="h-11 rounded-full">
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              {ocupado === "descargar" ? tp.share.generating : tp.share.download}
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-full">
              <Link to={rutaReservaMesa(comensales)} onClick={() => setAbierto(false)}>
                <CalendarCheck className="mr-2 h-4 w-4" aria-hidden="true" />
                {tp.bookCta.replace("{n}", String(comensales))}
              </Link>
            </Button>
          </div>

          {/* Entrada al chatbot con el ticket adjunto. Solo con el chatbot
              visible (VITE_CHATBOT_PUBLICO o `?tomy=1`); si no, nada. */}
          {chatbotVisible && (
            <Button
              type="button"
              variant="ghost"
              onClick={preguntarATomy}
              disabled={ocupado !== null}
              className="h-auto min-h-11 w-full whitespace-normal rounded-full py-2 text-sm text-ticket-ink"
            >
              <Bot className="mr-2 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              {tp.aiPrompt.replace("{n}", String(comensales))}
            </Button>
          )}

          <div className="flex min-h-9 items-center justify-center gap-3 pt-1 text-sm">
            {confirmarVaciar ? (
              <>
                <span className="text-ticket-ink-soft">{tp.clearConfirm}</span>
                <button
                  type="button"
                  onClick={vaciar}
                  className="rounded-full px-3 py-1.5 font-medium text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {tp.clearYes}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmarVaciar(false)}
                  autoFocus
                  className="rounded-full px-3 py-1.5 text-ticket-ink hover:bg-ticket-ink/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {tp.clearNo}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmarVaciar(true)}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-ticket-ink-soft hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                {tp.clear}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {lineas.length > 0 && (
        <BotonMiMesa onOpen={() => setAbierto(true)} count={lineas.length} label={tp.floatingLabel} aria={tp.openTicketAria} />
      )}

      <Sheet open={abierto} onOpenChange={setAbierto}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={cn(
            "flex flex-col gap-0 overflow-hidden bg-ticket-paper p-0 [&>button.absolute]:hidden",
            isMobile ? "max-h-[92dvh] rounded-t-3xl" : "w-full sm:max-w-md",
          )}
        >
          {isMobile && <div aria-hidden="true" className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-ticket-ink-soft/30" />}
          {panel}
        </SheetContent>
      </Sheet>

      {/* Ticket para la imagen: fuera de pantalla y oculto a lectores de pantalla. */}
      {abierto && !vacia && (
        <div aria-hidden="true" style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }}>
          <TicketMesa
            ref={ticketRef}
            lineas={lineas}
            comensales={comensales}
            modo={cadaUno ? "cadaUno" : "igual"}
            reparto={reparto}
            nombres={nombres}
            idioma={language}
            t={tp}
            qr={qr}
            urlQr={urlQr}
            fecha={fecha}
          />
        </div>
      )}

      {chatbotVisible && chat && (
        <Suspense fallback={null}>
          <AIChatbot
            isOpen
            onClose={() => {
              setChat(null);
              setAbierto(true);
            }}
            initialTicketImage={chat.imagen}
            initialInput={chat.pregunta}
          />
        </Suspense>
      )}
    </>
  );
};

export default PreviewPedido;

type BotonMiMesaProps = {
  onOpen: () => void;
  count: number;
  label: string;
  aria: string;
};

/**
 * "Mi mesa · N". Sin `fixed` propio: lo coloca la pila de botones flotantes
 * (`FloatingActions`), que lo apila con "Pregunta a Tomy" y lo sube por
 * encima de la barra móvil de llamar/reservar (`--mobile-cta-offset`).
 */
const BotonMiMesa = ({ onOpen, count, label, aria }: BotonMiMesaProps) => (
  <Button
    type="button"
    onClick={onOpen}
    aria-haspopup="dialog"
    aria-label={aria.replace("{count}", String(count))}
    className="h-12 gap-2.5 rounded-full border border-border/70 bg-background/95 pl-2 pr-4 text-foreground shadow-lg backdrop-blur hover:bg-background hover:shadow-xl"
  >
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-accent">
      <UtensilsCrossed className="h-4 w-4" aria-hidden="true" />
    </span>
    <span className="font-libre-baskerville text-sm">{label}</span>
    <span aria-hidden="true" className="text-muted-foreground">·</span>
    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-2 text-xs font-bold tabular-nums text-accent-foreground">
      {count}
    </span>
  </Button>
);
