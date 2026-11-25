import { VARIANTES_FONDO, type VarianteFondo } from "@/lib/fondo-prueba";

interface SelectorFondoPruebaProps {
  variante: VarianteFondo;
  onCambiar: (nueva: VarianteFondo | null) => void;
}

/**
 * Píldora fija abajo a la izquierda para pasar de una propuesta de fondo a
 * otra (solo demo, ver `fondo-prueba.ts`). Solo se monta con una variante activa.
 */
const SelectorFondoPrueba = ({ variante, onCambiar }: SelectorFondoPruebaProps) => (
  <div
    role="group"
    aria-label="Fondo de las fotos de platos (prueba)"
    className="fixed bottom-3 left-3 z-40 flex items-center gap-1 rounded-full border border-border bg-background/95 p-1 text-xs shadow-lg backdrop-blur"
  >
    <span className="px-2 text-muted-foreground">Fondo de prueba</span>
    {(Object.keys(VARIANTES_FONDO) as VarianteFondo[]).map((clave) => (
      <button
        key={clave}
        type="button"
        aria-pressed={clave === variante}
        title={VARIANTES_FONDO[clave]}
        onClick={() => onCambiar(clave)}
        className={`min-h-8 rounded-full px-3 font-semibold uppercase ${
          clave === variante ? "bg-primary text-primary-foreground" : "hover:bg-muted"
        }`}
      >
        {clave}
      </button>
    ))}
    <button type="button" onClick={() => onCambiar(null)} className="min-h-8 rounded-full px-3 hover:bg-muted">
      Quitar
    </button>
  </div>
);

export default SelectorFondoPrueba;
