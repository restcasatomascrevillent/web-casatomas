import { useCallback, useEffect, useState } from "react";
import { getMesaConfig, setMesaConfig } from "@/utils/sessionManager";
import {
  ESTADO_MESA_INICIAL,
  acotarComensales,
  normalizarEstadoMesa,
  type EstadoMesa,
  type ModoReparto,
} from "@/lib/mi-mesa";

/**
 * Ajustes de "Mi mesa" persistidos en `sessionStorage` (junto al pedido).
 *
 * Seguro para el SSG, igual que `usePedido`: arranca con el estado por
 * defecto (mismo HTML en Node y en la hidratación) y solo lee
 * `sessionStorage` en el efecto. Varias instancias se mantienen en sincronía
 * con el evento `miMesaUpdated`.
 */
export const useMiMesa = () => {
  const [estado, setEstado] = useState<EstadoMesa>(ESTADO_MESA_INICIAL);

  useEffect(() => {
    const sincronizar = () => setEstado(normalizarEstadoMesa(getMesaConfig()));
    sincronizar();
    window.addEventListener("miMesaUpdated", sincronizar);
    window.addEventListener("storage", sincronizar);
    return () => {
      window.removeEventListener("miMesaUpdated", sincronizar);
      window.removeEventListener("storage", sincronizar);
    };
  }, []);

  const actualizar = useCallback((cambio: (previo: EstadoMesa) => EstadoMesa) => {
    setEstado((previo) => {
      const siguiente = normalizarEstadoMesa(cambio(previo));
      // Fuera del render: el evento hace que las otras instancias relean.
      queueMicrotask(() => setMesaConfig(siguiente));
      return siguiente;
    });
  }, []);

  const setComensales = useCallback(
    (n: number) => actualizar((e) => ({ ...e, comensales: acotarComensales(n) })),
    [actualizar],
  );

  const setModo = useCallback((modo: ModoReparto) => actualizar((e) => ({ ...e, modo })), [actualizar]);

  const setNombre = useCallback(
    (indice: number, nombre: string) =>
      actualizar((e) => {
        const nombres = [...e.nombres];
        while (nombres.length <= indice) nombres.push("");
        nombres[indice] = nombre;
        return { ...e, nombres };
      }),
    [actualizar],
  );

  /** Añade o quita a `persona` de quienes comparten esta línea. Vacía → vuelve a "para compartir". */
  const alternarAsignacion = useCallback(
    (clave: string, persona: number) =>
      actualizar((e) => {
        const actuales = e.asignaciones[clave] ?? [];
        const siguiente = actuales.includes(persona)
          ? actuales.filter((p) => p !== persona)
          : [...actuales, persona].sort((a, b) => a - b);
        const asignaciones = { ...e.asignaciones };
        if (siguiente.length === 0) delete asignaciones[clave];
        else asignaciones[clave] = siguiente;
        return { ...e, asignaciones };
      }),
    [actualizar],
  );

  /** Borra toda la asignación de una línea (p. ej. al quitarla del pedido). */
  const limpiarAsignacion = useCallback(
    (clave: string) =>
      actualizar((e) => {
        if (!(clave in e.asignaciones)) return e;
        const asignaciones = { ...e.asignaciones };
        delete asignaciones[clave];
        return { ...e, asignaciones };
      }),
    [actualizar],
  );

  /** Al vaciar la mesa se olvidan las asignaciones (los comensales y nombres se quedan). */
  const olvidarAsignaciones = useCallback(
    () => actualizar((e) => ({ ...e, asignaciones: {} })),
    [actualizar],
  );

  return {
    ...estado,
    setComensales,
    setModo,
    setNombre,
    alternarAsignacion,
    limpiarAsignacion,
    olvidarAsignaciones,
  };
};
