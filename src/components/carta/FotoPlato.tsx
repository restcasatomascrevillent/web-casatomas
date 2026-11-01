import { useEffect, useRef, useState, type CSSProperties } from "react";
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
}

const MEDIA_MENOS_MOVIMIENTO = "(prefers-reduced-motion: reduce)";

/**
 * Foto de un plato en la carta: `<img>` (quieta o «sticker» animado por CSS) o,
 * si el plato tiene vídeo, `<video>` en bucle que solo carga y se reproduce
 * mientras está en pantalla. Ver `modoFotoPlato` para las reglas.
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
}: FotoPlatoProps) => {
  const [hidratado, setHidratado] = useState(false);
  const [reducirMovimiento, setReducirMovimiento] = useState(false);
  const [videoFallido, setVideoFallido] = useState(false);
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

  // Carga y reproducción solo en pantalla. `preload="none"` + `play()` desde
  // aquí (en vez de `autoPlay`, que obliga a descargar el vídeo nada más
  // montarse aunque esté fuera de pantalla).
  useEffect(() => {
    const el = videoRef.current;
    if (modo !== "video" || !el) return;
    if (typeof IntersectionObserver === "undefined") return;
    el.muted = true;
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada?.isIntersecting) {
          el.play().catch(() => undefined);
        } else {
          el.pause();
        }
      },
      { threshold: 0.25 },
    );
    observador.observe(el);
    return () => {
      observador.disconnect();
      el.pause();
    };
  }, [modo]);

  if (modo === "video" && video) {
    return (
      <video
        ref={videoRef}
        src={video}
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
        onError={() => setVideoFallido(true)}
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
