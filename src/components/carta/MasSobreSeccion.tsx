import { ChevronDown } from "lucide-react";

interface MasSobreSeccionProps {
  /** Rótulo del desplegable, p. ej. «Más sobre nuestras carnes». */
  resumen: string;
  parrafos: string[];
}

/**
 * Contenido ampliado de una sección de la carta, al pie del listado y
 * CERRADO al cargar: quien viene a mirar platos no tiene que pasar por
 * encima de varios párrafos antes de llegar a ellos.
 *
 * `<details>` nativo, el mismo patrón que los filtros (`MenuDietario`):
 *  - El texto está en el HTML prerenderizado; abrirlo no carga nada.
 *  - Se abre con Enter o Espacio sobre el `<summary>`, que el navegador ya
 *    anuncia como botón desplegable con su estado (abierto/cerrado).
 *  - Funciona igual en móvil y sin JavaScript, y la búsqueda del navegador
 *    (Ctrl+F) lo abre sola si encuentra el texto dentro.
 *  - Sin `open` controlado por React: el estado lo lleva el navegador, así que
 *    el HTML del SSG y la hidratación coinciden siempre.
 */
const MasSobreSeccion = ({ resumen, parrafos }: MasSobreSeccionProps) => (
  <details className="group mt-12 max-w-3xl border-t border-border/70 pt-3">
    <summary className="flex min-h-11 w-fit max-w-full cursor-pointer list-none items-center gap-2 rounded-sm text-sm md:text-base font-semibold text-primary transition-colors hover:text-accent [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
      <span>{resumen}</span>
      <ChevronDown className="h-4 w-4 shrink-0 group-open:rotate-180" aria-hidden="true" />
    </summary>
    <div className="mt-2 space-y-4 pb-2 text-base text-muted-foreground leading-relaxed">
      {parrafos.map((parrafo) => (
        <p key={parrafo}>{parrafo}</p>
      ))}
    </div>
  </details>
);

export default MasSobreSeccion;
