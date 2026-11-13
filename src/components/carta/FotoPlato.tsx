import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Pause, Play } from "lucide-react";
import { modoFotoPlato } from "@/lib/foto-plato";

interface FotoPlatoProps {
  /** URL ya optimizada para el `<img>` (y póster del vídeo). */
  src: string;
  /** URL original de la foto: decide si es `-carta` (sticker). */
  imagenOriginal: string | null | undefined;
  /** `video_url` del plato ya validado (`videoDePlato`), o `null`. */
  video: string | null;
  alt: string;
  style?: CSSProperties;
  loading?: "eager" | "lazy";
  width: number;
  height: number;
  onError?: () => void;
  /** Nombre accesible del botón de vídeo (i18n); por defecto en español. */
  etiquetaReproducir?: string;
  etiquetaPausar?: string;
  /**
   * `tarjeta` (por defecto): en la carta. El vídeo empieza a bajarse cuando el
   * plato se acerca a la pantalla, arranca solo al verse y se pausa al salir.
   * `ampliada`: la vista en grande (diálogo). El vídeo arranca nada más
   * abrirse y la foto se ve entera (`object-contain`), sin animación.
   */
  variante?: "tarjeta" | "ampliada";
}

const MEDIA_MENOS_MOVIMIENTO = "(prefers-reduced-motion: reduce)";
/** Se pone el `src` (empieza la descarga) un poco antes de que el plato se vea. */
const MARGEN_CARGA = "300px 0px";
const CLASE_AMPLIADA = "block h-auto max-h-[75dvh] w-full bg-muted object-contain";

/** «Ahorro de datos» del navegador (Chrome/Android): entonces, solo la foto. */
function pideAhorrarDatos(): boolean {
  if (typeof navigator === "undefined") return false;
  const conexion = (navigator as Navigator & { connection?: { saveData?: boolean } })
    .connection;
  return conexion?.saveData === true;
}

/**
 * Reproduce sin sonido (lo que permiten iPhone y Chrome sin que se pulse
 * nada). Si el navegador no deja (p. ej. iPhone en modo de ahorro de batería),
 * se queda el póster y el botón ofrece «Reproducir vídeo».
 */
function reproducir(el: HTMLVideoElement) {
  el.muted = true;
  try {
    const promesa = el.play() as Promise<void> | undefined;
    promesa?.catch?.(() => undefined);
  } catch {
    // Navegador sin soporte de vídeo: queda el póster.
  }
}

/**
 * Foto de un plato en la carta: `<img>` (quieta o «sticker» animado por CSS) o,
 * si el plato tiene vídeo, `<video>` sin sonido y en bucle que arranca solo.
 * Ver `modoFotoPlato` para cuándo sale cada cosa.
 *
 * En la carta, el MP4 no se descarga hasta que el plato está cerca de la
 * pantalla (`MARGEN_CARGA`): los platos que el cliente no llega a ver no gastan
 * datos ni Storage. Se reproduce mientras se ve y se pausa al salir. Un botón
 * pequeño en la esquina lo pausa y lo reanuda (accesibilidad); si el cliente
 * lo pausa, no vuelve a arrancar solo.
 *
 * Va DENTRO de un contenedor `relative` (en la tarjeta, además,
 * `overflow-hidden`): el brillo del sticker y el botón del vídeo son
 * absolutos encima de la foto.
 */
const FotoPlato = ({
  src,
  imagenOriginal,
  video,
  alt,
  style,
  loading = "lazy",
  width,
  height,
  onError,
  etiquetaReproducir = "Reproducir vídeo",
  etiquetaPausar = "Pausar vídeo",
  variante = "tarjeta",
}: FotoPlatoProps) => {
  const ampliada = variante === "ampliada";
  const [hidratado, setHidratado] = useState(false);
  const [reducirMovimiento, setReducirMovimiento] = useState(false);
  const [ahorrarDatos, setAhorrarDatos] = useState(false);
  const [videoFallido, setVideoFallido] = useState(false);
  // Cerca de la pantalla: se pone el `src`. En grande, desde el principio.
  const [cerca, setCerca] = useState(ampliada);
  // A la vista: se reproduce; fuera, en pausa.
  const [enPantalla, setEnPantalla] = useState(ampliada);
  // El cliente pulsó «Pausar vídeo»: no se reanuda solo al volver a verlo.
  const [pausadoPorCliente, setPausadoPorCliente] = useState(false);
  const [sonando, setSonando] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setHidratado(true);
    setAhorrarDatos(pideAhorrarDatos());
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia(MEDIA_MENOS_MOVIMIENTO);
    setReducirMovimiento(media.matches);
    const alCambiar = (e: MediaQueryListEvent) => setReducirMovimiento(e.matches);
    media.addEventListener?.("change", alCambiar);
    return () => media.removeEventListener?.("change", alCambiar);
  }, []);

  const modo = modoFotoPlato({
    imagen: imagenOriginal,
    video,
    reducirMovimiento,
    ahorrarDatos,
    hidratado,
    videoFallido,
  });
  const conVideo = modo === "video" && Boolean(video);

  // En la carta: un observador pone el `src` al acercarse el plato y otro dice
  // si se ve (reproducir) o no (pausar).
  useEffect(() => {
    const el = videoRef.current;
    if (!conVideo || ampliada || !el) return;
    if (typeof IntersectionObserver === "undefined") {
      // Navegadores muy antiguos: arranca sin más.
      setCerca(true);
      setEnPantalla(true);
      return;
    }
    const carga = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((entrada) => entrada.isIntersecting)) {
          setCerca(true);
          carga.disconnect();
        }
      },
      { rootMargin: MARGEN_CARGA },
    );
    const vista = new IntersectionObserver((entradas) => {
      const ultima = entradas[entradas.length - 1];
      if (ultima) setEnPantalla(ultima.isIntersecting);
    });
    carga.observe(el);
    vista.observe(el);
    return () => {
      carga.disconnect();
      vista.disconnect();
    };
  }, [conVideo, ampliada]);

  useEffect(() => {
    const el = videoRef.current;
    if (!conVideo || !el || !cerca) return;
    if (enPantalla && !pausadoPorCliente) reproducir(el);
    else el.pause();
  }, [conVideo, cerca, enPantalla, pausadoPorCliente]);

  const alternar = () => {
    const el = videoRef.current;
    if (!el) return;
    if (cerca && !el.paused) {
      setPausadoPorCliente(true);
      el.pause();
      return;
    }
    setPausadoPorCliente(false);
    setCerca(true);
    // Dentro del clic: si el navegador bloqueó el arranque solo, aquí sí deja.
    if (cerca) reproducir(el);
  };

  if (conVideo && video) {
    const etiqueta = sonando ? etiquetaPausar : etiquetaReproducir;
    return (
      <>
        <video
          ref={videoRef}
          src={cerca ? video : undefined}
          poster={src}
          muted
          loop
          playsInline
          autoPlay={ampliada}
          preload={cerca ? "auto" : "none"}
          aria-label={alt}
          width={width}
          height={height}
          className={ampliada ? CLASE_AMPLIADA : "w-full h-full object-cover"}
          data-modo-foto="video"
          onPlay={() => setSonando(true)}
          onPause={() => setSonando(false)}
          onError={() => cerca && setVideoFallido(true)}
        />
        <button
          type="button"
          onClick={(e) => {
            // En la tarjeta, la foto abre la vista en grande: el botón no.
            e.stopPropagation();
            alternar();
          }}
          aria-label={etiqueta}
          className={`absolute z-[2] flex items-center justify-center rounded-full bg-background/75 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            ampliada
              ? "bottom-3 right-3 h-11 w-11"
              : // 32 px a la vista y 44 px de zona de toque (el `before`).
                "bottom-1.5 right-1.5 h-8 w-8 before:absolute before:-inset-1.5 before:content-['']"
          }`}
        >
          {sonando ? (
            <Pause className={ampliada ? "h-5 w-5" : "h-4 w-4"} aria-hidden="true" />
          ) : (
            <Play className={ampliada ? "h-5 w-5" : "h-4 w-4"} aria-hidden="true" />
          )}
        </button>
      </>
    );
  }

  if (ampliada) {
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        decoding="async"
        className={CLASE_AMPLIADA}
        style={style}
        data-modo-foto="foto"
        onError={onError}
      />
    );
  }

  const sticker = modo === "sticker";
  return (
    <>
      <img
        src={src}
        alt={alt}
        className={
          sticker
            ? "foto-sticker w-full h-full object-cover"
            : "w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        }
        style={style}
        loading={loading}
        decoding="async"
        width={width}
        height={height}
        data-modo-foto={sticker ? "sticker" : "foto"}
        onError={onError}
      />
      {sticker && <span aria-hidden="true" className="foto-sticker-brillo" />}
    </>
  );
};

export default FotoPlato;
