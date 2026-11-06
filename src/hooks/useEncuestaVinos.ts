import { useEffect, useState } from "react";

/**
 * ¿Está abierta la votación «Vota tu vino favorito»? (04/11/2026). La abre y
 * la cierra el panel (Gestor Web › Carta › Vinos) en
 * configuracion_web.encuesta_vinos_activa, de lectura pública. Se consulta al
 * entrar en la carta de vinos (no va en el HTML del build: así encenderla o
 * apagarla no necesita republicar la web). Ante cualquier fallo, cerrada.
 */
export async function consultarEncuestaVinosActiva(): Promise<boolean> {
  const url = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "").replace(/\/+$/, "");
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  // select=* para no romper si la columna aún no existe en esa base de datos.
  const respuesta = await fetch(`${url}/rest/v1/configuracion_web?select=*&id=eq.true&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  if (!respuesta.ok) return false;
  const filas = await respuesta.json();
  return filas?.[0]?.encuesta_vinos_activa === true;
}

/**
 * Una consulta al montar (la carta de vinos). Sin React Query a propósito: la
 * carta también se pinta fuera de su proveedor (tests, portada) y esto no
 * necesita caché ni reintentos; cerrada hasta que llega la respuesta.
 */
export function useEncuestaVinosActiva(): boolean {
  const [activa, setActiva] = useState(false);
  useEffect(() => {
    let vigente = true;
    consultarEncuestaVinosActiva()
      .then((valor) => { if (vigente) setActiva(valor); })
      .catch(() => { if (vigente) setActiva(false); });
    return () => { vigente = false; };
  }, []);
  return activa;
}

const CLAVE_VOTADO = "ct_voto_vino_favorito";

/** Recuerda en este navegador que ya votó (para no volver a pedírselo). */
export function yaVotoEnEsteNavegador(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(CLAVE_VOTADO) === "1";
  } catch {
    return false;
  }
}

export function marcarVotoEnEsteNavegador(): void {
  try {
    window.localStorage.setItem(CLAVE_VOTADO, "1");
  } catch {
    // Navegación privada o almacenamiento bloqueado: solo se volverá a ofrecer.
  }
}
