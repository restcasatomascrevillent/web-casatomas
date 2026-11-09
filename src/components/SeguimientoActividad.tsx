import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { idleImport } from "@/lib/lazyIdle";
import type { Seguimiento } from "@/lib/actividad/instalar";
import { capturarErroresTempranos } from "@/lib/actividad/registro";

// Desde que carga el bundle: los errores de la hidratación también cuentan.
capturarErroresTempranos();

/**
 * Actividad de la web para Super Admin › Logs. Renderiza `null` (no cambia el
 * HTML del SSG) y descarga el rastreador en un momento ocioso tras hidratar,
 * para no competir con la carga. Cada cambio de ruta de react-router es una
 * página vista. Lo que se manda y cuándo lo decide `src/lib/actividad`
 * (consentimiento «Estadísticas», errores sin identificadores).
 */
export default function SeguimientoActividad() {
  const { pathname } = useLocation();
  const seguimiento = useRef<Seguimiento | null>(null);
  const rutaRef = useRef(pathname);
  rutaRef.current = pathname;

  useEffect(() => {
    let vivo = true;
    // Como el resto de secciones no críticas: cuando el navegador está ocioso (máx. 3 s).
    idleImport(() => import("@/lib/actividad/instalar"), 3000)()
      .then(({ instalarSeguimiento }) => {
        if (!vivo) return;
        seguimiento.current = instalarSeguimiento();
        seguimiento.current?.cambioDeRuta(rutaRef.current);
      })
      .catch(() => {
        // Sin rastreador la web funciona igual.
      });
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    seguimiento.current?.cambioDeRuta(pathname);
  }, [pathname]);

  return null;
}
