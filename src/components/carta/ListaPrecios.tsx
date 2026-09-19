import { Card } from "@/components/ui/card";

export interface FilaPrecio {
  id: string;
  nombre: string;
  /** Línea secundaria: D.O., región, tamaño… Se omite si no hay dato. */
  detalle?: string;
  precio: number;
  unidad?: string;
}

interface ListaPreciosProps {
  filas: FilaPrecio[];
}

/**
 * Lista de precios para vinos y bebidas.
 *
 * Por qué no la rejilla de tarjetas de los platos: 185 vinos y 75 bebidas no
 * tienen foto ni descripción, solo nombre, origen y precio. Con tarjetas serían
 * 260 cajas casi vacías y un documento enorme; con filas se lee como la carta
 * de vinos de papel y todo cabe en una sola URL rastreable.
 *
 * El lenguaje visual es el mismo: `Card` del repo, precio en `text-accent`,
 * tipografía `font-libre-baskerville` y los mismos separadores de `border`.
 */
const ListaPrecios = ({ filas }: ListaPreciosProps) => (
  <Card className="font-libre-baskerville overflow-hidden">
    <ul className="divide-y divide-border">
      {filas.map((fila) => (
        <li
          key={fila.id}
          className="flex items-baseline justify-between gap-4 px-4 py-3 md:px-6 transition-colors hover:bg-muted/40"
        >
          <div className="min-w-0">
            <p className="text-sm md:text-base text-foreground break-words">{fila.nombre}</p>
            {fila.detalle && (
              <p className="text-xs text-muted-foreground mt-0.5 break-words">{fila.detalle}</p>
            )}
          </div>
          <span className="font-bold text-accent whitespace-nowrap text-base md:text-lg">
            {fila.precio}€
            {fila.unidad && (
              <span className="text-xs font-normal text-muted-foreground"> / {fila.unidad}</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  </Card>
);

export default ListaPrecios;
