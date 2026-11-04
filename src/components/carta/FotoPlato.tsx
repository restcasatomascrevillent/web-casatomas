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
}

const MEDIA_MENOS_MOVIMIENTO = "(prefers-reduced-motion: reduce)";

/**
 * Foto de un plato en la carta: `<img>` (quieta o «sticker» animado por CSS) o,
 * si el plato tiene vídeo, `<video>` con la foto de póster que NO se descarga
 * hasta que el cliente pulsa «Reproducir vídeo» (ahorra ~1 MB de Storage por visita). Ver `modoFotoPlato` para las reglas.
 *
 * Va DENTRO del contenedor `relative overflow-hidden` de la tarjeta: el brillo
 * del sticker es un `<span>` absoluto encima de la foto.
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
}: FotoPlatoProps) => {
  const [hidratado, setHidratado] = useState(false);
  const [reducirMovimiento, setReducirMovimiento] = useState(false);
  const [videoFallido, setVideoFallido] = useState(false);
  const [pedido, setPedido] = useState(false);
  const [sonando, setSonando] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setHidratado(true);
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
    hidratado,
    videoFallido,
  });

  // Sin `src` hasta que el cliente pulsa el botón: así el navegador no baja
  // el MP4. Una vez pedido, se pausa solo al salir de pantalla.
  useEffect(() => {
    const el = videoRef.current;
    if (modo !== "video" || !el || !pedido) return;
    el.muted = true;
    el.play().catch(() => undefined);
    if (typeof IntersectionObserver === "undefined") return;
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada && !entrada.isIntersecting) el.pause();
      },
      { threshold: 0.25 },
    );
    observador.observe(el);
    return () => {
      observador.disconnect();
      el.pause();
    };
  }, [modo, pedido]);

  const alternar = () => {
    const el = videoRef.current;
    if (!pedido) {
      setPedido(true);
    } else if (el) {
      if (el.paused) void el.play().catch(() => undefined);
      else el.pause();
    }
  };

  if (modo === "video" && video) {
    const etiqueta = pedido && sonando ? etiquetaPausar : etiquetaReproducir;
    return (
      <>
        <video
          ref={videoRef}
          src={pedido ? video : undefined}
          poster={src}
          muted
          loop
          playsInline
          preload="none"
          aria-label={alt}
          width={width}
          height={height}
          className="w-full h-full object-cover"
          data-modo-foto="video"
          onPlay={() => setSonando(true)}
          onPause={() => setSonando(false)}
          onError={() => pedido && setVideoFallido(true)}
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            alternar();
          }}
          aria-label={etiqueta}
          className={`absolute inset-0 m-auto flex h-11 w-11 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur-sm transition-opacity hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            sonando ? "opacity-0 focus-visible:opacity-100" : ""
          }`}
        >
          {sonando ? (
            <Pause className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Play className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </>
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
