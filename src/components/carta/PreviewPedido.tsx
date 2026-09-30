import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Link } from "react-router-dom";
import { Bot, Receipt, Share2, UtensilsCrossed, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { getUserPedido, setUserPedido } from "@/utils/sessionManager";
import { clavePedido, type LineaPedido } from "@/hooks/usePedido";
import { useMiMesa } from "@/hooks/useMiMesa";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslations } from "@/i18n/LanguageProvider";
import { construirRutaIdioma } from "@/i18n/routing";
import { useChatbotVisible } from "@/hooks/useChatbotVisible";
import {
  LOCALE_POR_IDIOMA,
  cantidadDeLinea,
  configUnidad,
  construirPreguntaTomy,
  repartoCadaUno,
  resumenTextoMesa,
  urlCarta,
} from "@/lib/mi-mesa";
import { generarMatrizQr } from "@/lib/qr";
import { cn } from "@/lib/utils";
import TicketMesa from "./TicketMesa";

const AIChatbot = lazy(() => import("../AIChatbot"));

type Imagen = { firma: string; dataUrl: string };

const NOMBRE_ARCHIVO_TICKET = "mi-mesa-casa-tomas.png";

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

/**
 * "Mi mesa" (antes "Mi pedido"): el visitante apunta lo que le apetece de la
 * carta y ve el total orientativo y cuánto toca a cada uno, como un ticket
 * de verdad. NO es un pedido online.
 *
 * Lo monta `FloatingActions` (perezoso) en cuanto hay alguna línea: pinta el
 * botón flotante "Mi mesa · N" y el panel (hoja inferior en móvil, panel
 * lateral en escritorio).
 *
 * El panel ES el ticket: `TicketMesa` se pinta EN VIVO ahí dentro (con
 * `edicion`, que teje los controles de cantidad/comensales/reparto en el
 * propio recibo) y, sin `edicion`, fuera de pantalla: esa copia oculta es la
 * que captura `generarImagen` para adjuntar el ticket al preguntar a Tomy.
 * Mismo componente, mismo layout — nunca hay un panel genérico por un lado y
 * el ticket de verdad por otro, que podrían acabar desincronizados entre sí.
 */
const PreviewPedido = () => {
  const { t, language } = useTranslations();
  const tp = t.preview;
  const isMobile = useIsMobile();
  const mesa = useMiMesa();
  const chatbotVisible = useChatbotVisible();
  const { toast } = useToast();

  const [pedido, setPedido] = useState<LineaPedido[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [ocupado, setOcupado] = useState<null | "chat">(null);
  const [compartiendo, setCompartiendo] = useState(false);
  const [vistaPrevia, setVistaPrevia] = useState<{ dataUrl: string; archivo: File | null } | null>(null);
  const [confirmarVaciar, setConfirmarVaciar] = useState(false);
  const [qr, setQr] = useState<boolean[][] | null>(null);
  const [chat, setChat] = useState<{ imagen: string | null; pregunta: string } | null>(null);

  const ticketRef = useRef<HTMLDivElement | null>(null);
  const imagenRef = useRef<Imagen | null>(null);
  const enCursoRef = useRef<{ firma: string; promesa: Promise<Imagen> } | null>(null);

  // Copia SIN reparto (ver `ocultarReparto` en `TicketMesa`), capturada aparte
  // para compartir en redes: cómo se divide la cuenta no es asunto de la foto
  // que sale de la mesa.
  const ticketCompartirRef = useRef<HTMLDivElement | null>(null);
  const imagenCompartirRef = useRef<Imagen | null>(null);
  const enCursoCompartirRef = useRef<{ firma: string; promesa: Promise<Imagen> } | null>(null);

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

  // Firma de lo que sale en la imagen: si no cambia, se reutiliza la ya
  // generada (evita regenerarla cada vez que se pregunta a Tomy con el mismo
  // ticket).
  const firma = JSON.stringify([pedido, comensales, modo, nombres, asignaciones, language]);

  // El ticket en vivo lleva el QR desde que se abre (si no, ese hueco del
  // recibo saldría vacío hasta la primera captura para Tomy). Si
  // `generarImagen` ya lo está generando a la vez, la llamada de aquí es
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

  /**
   * Captura `nodo` a PNG y cachea el resultado por `firma`, reutilizando la
   * promesa si ya hay una captura de esa misma firma en marcha. Compartida por
   * las dos copias del ticket (la de Tomy y la de compartir): mismo mecanismo,
   * caché aparte porque son nodos e imágenes distintas.
   */
  const capturarTicket = useCallback(
    (
      nodoRef: React.MutableRefObject<HTMLDivElement | null>,
      cacheRef: React.MutableRefObject<Imagen | null>,
      cursoRef: React.MutableRefObject<{ firma: string; promesa: Promise<Imagen> } | null>,
    ): Promise<Imagen> => {
      if (cacheRef.current?.firma === firma) return Promise.resolve(cacheRef.current);
      if (cursoRef.current?.firma === firma) return cursoRef.current.promesa;

      const promesa = (async () => {
        if (!qr) {
          const matriz = await generarMatrizQr(urlQr);
          flushSync(() => setQr(matriz));
        }
        const nodo = nodoRef.current;
        if (!nodo) throw new Error("Ticket no disponible para captura");
        await esperarRecursos(nodo);
        const { toPng } = await import("html-to-image");
        const dataUrl = await toPng(nodo, { pixelRatio: 2, cacheBust: true, backgroundColor: "#fbf8f3" });
        const imagen = { firma, dataUrl };
        cacheRef.current = imagen;
        return imagen;
      })();

      cursoRef.current = { firma, promesa };
      return promesa.finally(() => {
        if (cursoRef.current?.promesa === promesa) cursoRef.current = null;
      });
    },
    [firma, qr, urlQr],
  );

  const generarImagen = useCallback(
    () => capturarTicket(ticketRef, imagenRef, enCursoRef),
    [capturarTicket],
  );
  const generarImagenCompartir = useCallback(
    () => capturarTicket(ticketCompartirRef, imagenCompartirRef, enCursoCompartirRef),
    [capturarTicket],
  );

  // Pre-generar la imagen de compartir en cuanto se abre el ticket, no al
  // pulsar un icono de red: `html-to-image` puede tardar varios cientos de
  // ms, y esperar a que termine DESPUÉS del toque es lo que hacía que
  // WhatsApp/Instagram/Facebook dejaran de verlo como un gesto reciente del
  // usuario y bloquearan `navigator.share`/el portapapeles en silencio (sin
  // ningún error visible). Con la imagen ya en caché, `compartirTicket` la
  // reutiliza al instante y el share sigue pegado al toque original.
  useEffect(() => {
    if (!abierto || lineas.length === 0) return;
    void generarImagenCompartir().catch(() => {
      // Sin ruido aquí: si de verdad falla, `compartirTicket` lo reintenta
      // y ahí sí avisa al visitante.
    });
  }, [abierto, lineas.length, generarImagenCompartir]);

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

  /**
   * Comparte el ticket (sin reparto) como IMAGEN — nunca como texto ni como
   * enlace suelto. Un único botón, dos escalones:
   *
   * 1. `navigator.share` con el fichero: abre el selector del sistema con
   *    las apps que aceptan imágenes (WhatsApp, Instagram, Facebook, Mail,
   *    AirDrop… las que haya instaladas) — el propio sistema operativo
   *    decide cuáles ofrecer, aquí no se elige una app en concreto.
   * 2. Si el navegador no puede compartir FICHEROS (`canShare` con `files`
   *    da `false` — pasa en bastante iOS/Safari, aunque `navigator.share`
   *    exista para texto o enlaces), NO se cae a compartir un enlace: eso
   *    mandaría la web, no el ticket, que es justo lo que no se quiere. En
   *    su lugar se enseña la imagen en un diálogo propio para que el
   *    visitante la comparta o la guarde a su manera — mantener pulsada en
   *    móvil, clic derecho en escritorio son gestos nativos que entiende
   *    cualquier navegador, sin depender de ninguna API.
   */
  const compartirTicket = async () => {
    setCompartiendo(true);
    try {
      const { dataUrl } = await generarImagenCompartir();
      const resumen = resumenTextoMesa(lineas, comensales, language, tp.share, urlQr);

      let archivo: File | null = null;
      try {
        const respuesta = await fetch(dataUrl);
        const blob = await respuesta.blob();
        archivo = new File([blob], NOMBRE_ARCHIVO_TICKET, { type: blob.type || "image/png" });
      } catch {
        archivo = null;
      }

      if (archivo && navigator.canShare?.({ files: [archivo] })) {
        try {
          await navigator.share({ files: [archivo], title: tp.share.summaryTitle, text: resumen });
          return;
        } catch (error) {
          // El selector del sistema cancelado por el visitante no es un error.
          if (error instanceof DOMException && error.name === "AbortError") return;
          // Cualquier otro fallo: se sigue abajo a la vista previa.
        }
      }

      setVistaPrevia({ dataUrl, archivo });
    } catch (error) {
      console.error("No se pudo compartir el ticket:", error);
      toast({ variant: "destructive", title: tp.share.errorTitle, description: tp.share.error });
    } finally {
      setCompartiendo(false);
    }
  };

  const descargarVistaPrevia = () => {
    if (!vistaPrevia) return;
    const enlace = document.createElement("a");
    enlace.href = vistaPrevia.dataUrl;
    enlace.download = NOMBRE_ARCHIVO_TICKET;
    enlace.click();
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
    if (clave && clave in asignaciones) mesa.limpiarAsignacion(clave);
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
      {/* Cabecera del diálogo: distinta del papel del ticket (justo debajo),
          igual que en el diseño original — un pequeño icono, título y
          descripción, y el cierre. */}
      <div className="flex items-center justify-between gap-3 border-b border-ticket-ink-soft/20 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Receipt className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <SheetTitle className="text-sm font-semibold leading-tight text-ticket-ink">{tp.title}</SheetTitle>
            {/* Sin mostrarlo (ya no hace falta con el ticket a la vista), pero
                presente para quien navega con lector de pantalla: Radix pide
                una descripción para el diálogo. */}
            <SheetDescription className="sr-only">{tp.subtitle}</SheetDescription>
          </div>
        </div>
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

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
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
          // El ticket real, en vivo: mismo componente que se captura como
          // imagen para Tomy (ver más abajo), con `edicion` tejiendo los
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
              onAsignar: mesa.alternarAsignacion,
              onNombreChange: mesa.setNombre,
              asignaciones,
              vaciar: {
                confirmando: confirmarVaciar,
                onPedir: () => setConfirmarVaciar(true),
                onConfirmar: vaciar,
                onCancelar: () => setConfirmarVaciar(false),
              },
            }}
          />
        )}

        {!vacia && (
          <div className="mt-4 flex justify-center">
            <Button
              type="button"
              onClick={compartirTicket}
              disabled={compartiendo}
              className="gap-2 rounded-full bg-accent px-5 text-accent-foreground hover:bg-accent/90"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              {tp.share.cta}
            </Button>
          </div>
        )}
      </div>

      {/* Entrada al chatbot con el ticket adjunto: la única acción que queda
          fuera del ticket. Solo con el chatbot visible (VITE_CHATBOT_PUBLICO
          o `?tomy=1`); si no, nada — el ticket ya no lleva más botones debajo. */}
      {!vacia && chatbotVisible && (
        <div className="space-y-2 border-t border-dashed border-ticket-ink-soft/40 bg-ticket-paper px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
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
          {/* Misma copia, sin el reparto: la que capturan los botones de
              compartir en redes (ver `compartirTicket`). */}
          <TicketMesa
            ref={ticketCompartirRef}
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
            ocultarReparto
          />
        </div>
      )}

      {/* Cuando el navegador no puede compartir el FICHERO (pasa en bastante
          iOS/Safari): la imagen en un diálogo propio, nunca un enlace —
          mantener pulsada / clic derecho son gestos nativos que entiende
          cualquier navegador, sin depender de ninguna API. */}
      <Dialog open={vistaPrevia !== null} onOpenChange={(open) => !open && setVistaPrevia(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{tp.share.previewTitle}</DialogTitle>
            <DialogDescription>
              {isMobile ? tp.share.previewHintMobile : tp.share.previewHintDesktop}
            </DialogDescription>
          </DialogHeader>
          {vistaPrevia && (
            <img
              src={vistaPrevia.dataUrl}
              alt={tp.share.summaryTitle}
              className="w-full rounded-lg border border-border"
            />
          )}
          <Button type="button" variant="outline" onClick={descargarVistaPrevia}>
            {tp.share.previewDownloadCta}
          </Button>
        </DialogContent>
      </Dialog>

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

