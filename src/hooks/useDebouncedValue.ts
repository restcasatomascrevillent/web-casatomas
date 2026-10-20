import { useEffect, useState } from "react";

/**
 * Devuelve `value` con retraso: cada tecla en un buscador sigue actualizando
 * el input al instante (sigue ligado al estado real), pero lo que dispara el
 * filtrado —y con él el recálculo de la cuadrícula animada con Framer
 * Motion— solo se actualiza cuando el usuario deja de teclear.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
