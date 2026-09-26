import { useCallback, useEffect, useState } from "react";
import { getUserPedido, setUserPedido } from "@/utils/sessionManager";

/**
 * Lo mínimo que necesita el ticket (`PreviewPedido`) de cada línea. Los
 * componentes de carta guardan el plato/vino/bebida entero (`...item`), así
 * que las líneas pueden traer más campos: el `id` es el que importa para no
 * duplicar la misma línea.
 */
export interface LineaPedido {
  id?: string | number | null;
  nombre: string;
  precio_eur: number;
  categoria?: string | null;
  unidad?: string | null;
  cantidad?: number;
  [campo: string]: unknown;
}

/** Cantidad con la que entra una línea nueva (y lo que suma cada "Añadir"). */
export const cantidadInicialPedido = (unidad?: string | null): number => {
  if (unidad === "100 g" || unidad === "100g") return 100;
  return 1;
};

/**
 * Misma clave que usa `CartaPlatos` (`getPedidoItemKey`): el `id` cuando lo
 * hay, y si no una combinación que identifica la línea. Así "Añadir" desde la
 * portada y desde `/carta/:categoria` suman sobre la MISMA línea del ticket.
 */
export const clavePedido = (item: Pick<LineaPedido, "id" | "nombre" | "precio_eur" | "unidad" | "categoria">) =>
  item.id
    ? `id:${item.id}`
    : `fallback:${item.nombre}|${item.precio_eur}|${item.unidad ?? ""}|${item.categoria ?? ""}`;

/** Lee el pedido sin romper si `sessionStorage` no está disponible (modo privado estricto, cookies bloqueadas). */
const leerPedido = (): LineaPedido[] => {
  try {
    return getUserPedido() as LineaPedido[];
  } catch {
    return [];
  }
};

/**
 * Pedido de la sesión (el mismo `sessionStorage` + evento `pedidoUpdated` que
 * ya usan `CartaPlatos`, `CartaVinos`, `CartaBebidas` y `PreviewPedido`).
 *
 * Seguro para el SSG: el estado arranca vacío — igual en Node y en la primera
 * pintada del navegador, así que la hidratación no discrepa — y solo se lee
 * `sessionStorage` dentro del efecto.
 */
export const usePedido = () => {
  const [pedido, setPedido] = useState<LineaPedido[]>([]);

  useEffect(() => {
    const sincronizar = () => setPedido(leerPedido());
    sincronizar();
    window.addEventListener("storage", sincronizar);
    window.addEventListener("pedidoUpdated", sincronizar);
    return () => {
      window.removeEventListener("storage", sincronizar);
      window.removeEventListener("pedidoUpdated", sincronizar);
    };
  }, []);

  /** Añade una línea o suma su cantidad inicial si ya estaba. Devuelve la cantidad resultante. */
  const anadir = useCallback((item: LineaPedido): number => {
    const suma = cantidadInicialPedido(item.unidad);
    const actual = leerPedido();
    const clave = clavePedido(item);
    const indice = actual.findIndex((linea) => clavePedido(linea) === clave);
    const siguiente = [...actual];
    let cantidad = suma;

    if (indice >= 0) {
      const previa = siguiente[indice];
      const previaCantidad =
        typeof previa.cantidad === "number" ? previa.cantidad : cantidadInicialPedido(previa.unidad);
      cantidad = previaCantidad + suma;
      siguiente[indice] = { ...previa, ...item, cantidad };
    } else {
      siguiente.push({ ...item, cantidad });
    }

    try {
      setUserPedido(siguiente);
    } catch {
      // Sin `sessionStorage` el ticket no puede persistir; al menos que la
      // tarjeta refleje el click en esta pantalla.
      setPedido(siguiente);
    }
    return cantidad;
  }, []);

  const cantidadDe = useCallback(
    (item: Pick<LineaPedido, "id" | "nombre" | "precio_eur" | "unidad" | "categoria">): number => {
      const clave = clavePedido(item);
      const linea = pedido.find((l) => clavePedido(l) === clave);
      if (!linea) return 0;
      return typeof linea.cantidad === "number" ? linea.cantidad : cantidadInicialPedido(linea.unidad);
    },
    [pedido],
  );

  return { pedido, total: pedido.length, anadir, cantidadDe };
};
