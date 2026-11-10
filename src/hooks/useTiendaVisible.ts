import { useSyncExternalStore } from "react";
import semilla from "virtual:carta-ssg/tienda-visible";
import { consultarConfigTienda } from "@/lib/tienda";

/**
 * ¿Está encendida la tienda en el panel? `false` solo si el panel la apagó
 * (`activa: false`); `null` si no se sabe (tabla sin crear en ese entorno o
 * sin su fila). Un fallo de red lanza.
 */
export async function consultarTiendaVisible(): Promise<boolean | null> {
  const config = await consultarConfigTienda();
  return config ? config.activa : null;
}

/** Como el `staleTime` de `useConfigTienda`: al montar, se vuelve a leer si han pasado más de 60 s. */
const FRESCO_MS = 60 * 1000;

// Estado compartido por la cabecera, el pie y la tarjeta de cheques regalo: una
// sola lectura para los tres. Empieza en la semilla del build.
let valor: boolean | null = semilla.visible;
let intentadoEn = 0;
let enCurso = false;
const oyentes = new Set<() => void>();

function refrescar() {
  if (enCurso || Date.now() - intentadoEn < FRESCO_MS) return;
  enCurso = true;
  void (async () => {
    // Un reintento, como el `retry: 1` de las demás lecturas en vivo. Si los dos
    // fallan, se queda lo que había (la semilla, o la última lectura buena).
    for (let intento = 0; intento < 2; intento++) {
      try {
        const nuevo = await consultarTiendaVisible();
        if (nuevo !== valor) {
          valor = nuevo;
          oyentes.forEach((avisar) => avisar());
        }
        break;
      } catch {
        // siguiente intento
      }
    }
    intentadoEn = Date.now();
    enCurso = false;
  })();
}

function suscribir(avisar: () => void) {
  oyentes.add(avisar);
  refrescar();
  return () => {
    oyentes.delete(avisar);
  };
}

/**
 * Enlaces a la tienda (menú, pie y tarjeta de cheques regalo): se quitan
 * cuando el panel apaga la tienda (interruptor «Visible en la web» de Panel ›
 * Tienda, petición del dueño del 10/11/2026). La propia `/tienda` sigue existiendo
 * para quien llegue con un enlace guardado y explica que no está disponible.
 *
 * Mismo criterio que `useMostrarFotosPlatos`: la semilla del build
 * (`virtual:carta-ssg/tienda-visible`, un booleano: la cabecera de todas las
 * páginas no puede cargar con los platos de `virtual:carta-ssg`) es lo que
 * sale en el HTML del SSG y en la hidratación (`getServerSnapshot`), y al
 * montar se vuelve a leer en vivo: el cambio del panel se nota sin esperar a
 * un deploy. No usa React Query a propósito: la cabecera y el pie no dependen
 * de ningún proveedor (se montan solos en muchos tests y en cualquier página).
 *
 * Solo un «apagada» explícito los quita: sin dato (el build no pudo leerla, la
 * lectura en vivo falla o no hay fila) se enseñan como siempre, y la página de
 * la tienda ya se encarga de no anunciar precios que no puede confirmar.
 */
export function useTiendaVisible(): boolean {
  const visible = useSyncExternalStore(
    suscribir,
    () => valor,
    () => semilla.visible,
  );
  return visible !== false;
}
