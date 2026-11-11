import { useEffect, useState } from "react";
import { MOSTRAR_CARTA_BEBIDAS } from "@/lib/carta-ssg";

/**
 * Interruptor «Carta de bebidas en la web» del panel (Gestor web › Carta › Bebidas, 11/11/2026,
 * petición del dueño: «Desactiva de la web la carta de Bebidas… por defecto no»).
 *
 * - Primer render (SSG e hidratación): el valor del build (`MOSTRAR_CARTA_BEBIDAS`), así el HTML y
 *   la hidratación coinciden.
 * - Después se relee la fila pública de `configuracion_web` una vez por carga de página, para que el
 *   cambio se note sin esperar a un deploy.
 * - Si no hay fila o la lectura falla, se queda el valor del build. Con la fila, solo un `true`
 *   explícito enseña la carta (sin la columna, apagada).
 *
 * Sin React Query a propósito: lo usan la portada, el índice de la carta y el buscador, que se
 * prueban sin su proveedor. `fetch` directo a PostgREST, como `useMostrarFotosPlatos`.
 */
export async function consultarMostrarCartaBebidas(): Promise<boolean> {
  const url = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "").replace(/\/+$/, "");
  const key =
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
    "";
  if (!url || !key) throw new Error("Supabase sin configurar");
  // select=* para no fallar si la columna aún no existe (entonces: apagada).
  const respuesta = await fetch(`${url}/rest/v1/configuracion_web?select=*&id=eq.true&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  if (!respuesta.ok) throw new Error(`configuracion_web: HTTP ${respuesta.status}`);
  const filas = (await respuesta.json()) as { mostrar_carta_bebidas_casa_tomas?: boolean }[];
  const fila = Array.isArray(filas) ? filas[0] : undefined;
  if (!fila) return MOSTRAR_CARTA_BEBIDAS;
  return fila.mostrar_carta_bebidas_casa_tomas === true;
}

/** Lectura compartida por toda la página (una petición aunque haya varios componentes). */
let lectura: Promise<boolean> | null = null;
let valorLeido: boolean | null = null;

/** Solo para pruebas: olvida la lectura del navegador. */
export function olvidarLecturaCartaBebidas() {
  lectura = null;
  valorLeido = null;
}

export function useMostrarCartaBebidas(): boolean {
  const [mostrar, setMostrar] = useState<boolean>(() => valorLeido ?? MOSTRAR_CARTA_BEBIDAS);
  useEffect(() => {
    let vigente = true;
    lectura ??= consultarMostrarCartaBebidas().catch(() => MOSTRAR_CARTA_BEBIDAS);
    void lectura.then((valor) => {
      valorLeido = valor;
      if (vigente) setMostrar(valor);
    });
    return () => {
      vigente = false;
    };
  }, []);
  return mostrar;
}
