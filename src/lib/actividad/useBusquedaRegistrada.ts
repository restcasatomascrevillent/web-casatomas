import { useEffect, useRef } from "react";
import { registrarActividad } from "./registro";

/**
 * Apunta una búsqueda de la carta cuando el texto (ya con su retardo) se
 * estabiliza: cuántas letras y cuántos resultados. EL TEXTO NO SE MANDA (es
 * contenido libre que escribe el visitante). Una vez por término distinto.
 */
export function useBusquedaRegistrada(textoConRetardo: string, resultados: number, carta: string): void {
  const ultimo = useRef("");
  useEffect(() => {
    const texto = textoConRetardo.trim();
    if (texto.length < 2 || texto === ultimo.current) return;
    ultimo.current = texto;
    registrarActividad("busqueda", { valor: resultados, props: { longitud: texto.length, carta } });
    // Solo al cambiar el término: los resultados que llegan después para el mismo término no repiten el evento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textoConRetardo, carta]);
}
