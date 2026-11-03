import { useQuery } from "@tanstack/react-query";
import { consultarConfigTienda, consultarVinosTienda, type ConfigTienda, type VinoTienda } from "@/lib/tienda";

/**
 * ¿Ha contestado Supabase alguna vez (bien o con error)? La semilla del build
 * entra con `updatedAt` 0, así que el HTML del SSG y la hidratación dicen «no»
 * por igual. No es `isFetchedAfterMount`: al volver a la tienda con los datos
 * aún frescos en la caché no se repite la consulta, y la página se quedaría en
 * «Cargando…» para siempre.
 */
const yaPreguntado = (consulta: { dataUpdatedAt: number; errorUpdatedAt: number }) =>
  consulta.dataUpdatedAt > 0 || consulta.errorUpdatedAt > 0;

/**
 * Configuración de la tienda: la del build como semilla (así el HTML del SSG y
 * la hidratación coinciden) y la de Supabase en cuanto llega — mismo patrón que
 * `useMostrarFotosPlatos`: `initialDataUpdatedAt: 0` la da por caducada y se
 * vuelve a pedir SIEMPRE al montar.
 *
 * `pendiente`: el build no pudo leerla (semilla `null`) y el navegador todavía
 * no ha contestado. La página enseña «Cargando la tienda…» en vez de «no
 * disponible» para no anunciar un cierre que a lo mejor no existe. Si la
 * lectura en vivo falla, se queda la semilla (no disponible si era `null`).
 */
export function useConfigTienda(semilla: ConfigTienda | null) {
  const consulta = useQuery({
    queryKey: ["tienda", "config"],
    queryFn: consultarConfigTienda,
    initialData: semilla,
    initialDataUpdatedAt: 0,
    staleTime: 60 * 1000,
    retry: 1,
  });
  return { config: consulta.data ?? null, pendiente: semilla === null && !yaPreguntado(consulta) };
}

/** Vinos de la carta, con la semilla del build y el refresco en vivo (ver `consultarVinosTienda`). */
export function useVinosTienda(semilla: VinoTienda[]) {
  const consulta = useQuery({
    queryKey: ["tienda", "vinos"],
    queryFn: consultarVinosTienda,
    initialData: semilla,
    initialDataUpdatedAt: 0,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  return consulta.data ?? semilla;
}
