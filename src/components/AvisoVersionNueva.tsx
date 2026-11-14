import { useEffect, useSyncExternalStore } from "react";
import type { Language } from "@/i18n/types";
import { leerEstadoRecarga, registrarAvisoEnLinea, suscribirEstadoRecarga, type EstadoRecarga } from "@/lib/recarga-por-version";
import { TEXTOS_VERSION_NUEVA } from "@/lib/textos-version-nueva";

/** Estado de la recarga por versión antigua (`lib/recarga-por-version`). En el SSG, siempre «normal». */
export function useEstadoRecarga(): EstadoRecarga {
  return useSyncExternalStore(suscribirEstadoRecarga, leerEstadoRecarga, () => "normal");
}

interface Props {
  /** El fallo es de versión antigua (ver `esErrorDeVersionAntigua`). */
  porVersion: boolean;
  idioma: Language;
  /** Mensaje y botón de siempre, para cuando no hay versión nueva (red, fallo real). */
  mensaje: string;
  boton: string;
}

/**
 * Lo que se enseña donde algo no cargó (una sección, una página). Si fue por
 * versión antigua: «Cargando…» mientras se comprueba, «Cargando la versión
 * nueva…» mientras se recarga y «Hay una versión nueva de la web · Toca para
 * actualizar» si no se puede recargar sola. Mientras está montado, no sale el
 * aviso flotante.
 */
export function MensajeFalloCarga({ porVersion, idioma, mensaje, boton }: Props) {
  const estado = useEstadoRecarga();
  const textos = TEXTOS_VERSION_NUEVA[idioma];
  useEffect(() => (porVersion ? registrarAvisoEnLinea() : undefined), [porVersion]);

  if (porVersion && (estado === "comprobando" || estado === "recargando")) {
    return (
      <p role="status" className="mb-3">
        {estado === "recargando" ? textos.actualizando : textos.comprobando}
      </p>
    );
  }
  const esAviso = porVersion && estado === "aviso";
  return (
    <>
      <p className="mb-3" role={esAviso ? "status" : undefined}>
        {esAviso ? textos.aviso : mensaje}
      </p>
      <button type="button" onClick={() => window.location.reload()} className="min-h-6 underline underline-offset-4 hover:text-foreground">
        {esAviso ? textos.boton : boton}
      </button>
    </>
  );
}
