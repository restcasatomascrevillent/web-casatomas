import { useQuery } from "@tanstack/react-query";
import { MOSTRAR_FOTOS_PLATOS } from "@/lib/carta-ssg";

/**
 * Interruptor «Fotos de platos en Casa Tomás» del panel (Gestor Web → Carta),
 * leído EN EL NAVEGADOR al cargar la página.
 *
 * Por qué no basta con el valor del build (`MOSTRAR_FOTOS_PLATOS`): el panel
 * pide republicar la web al tocar el interruptor, pero `rebuild-webs` hoy no
 * llega a lanzar el deploy (falta el deploy hook de Vercel). Sin esta lectura
 * el cambio no se vería hasta el siguiente despliegue manual.
 *
 * - Primer render (SSG e hidratación): el valor del build, así el HTML y la
 *   hidratación coinciden.
 * - `initialDataUpdatedAt: 0`: la semilla se da por caducada desde el principio,
 *   así que React Query la vuelve a pedir al montar SIEMPRE, por reciente que
 *   sea el deploy.
 * - Si la lectura falla (red, tabla aún sin crear…) se queda el valor del
 *   build, que a su vez cae a «fotos visibles» si tampoco pudo leerse al
 *   construir. Solo un `false` explícito oculta las fotos.
 *
 * `fetch` directo a PostgREST y no `@supabase/supabase-js`: esta página no
 * carga el SDK (~40 KB gzip) para nada más, y es una sola fila pública.
 */
export async function consultarMostrarFotosPlatos(): Promise<boolean> {
  const SUPABASE_URL = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "").replace(/\/+$/, "");
  const SUPABASE_KEY =
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
    "";
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase sin configurar");
  const respuesta = await fetch(
    `${SUPABASE_URL}/rest/v1/configuracion_web?select=mostrar_fotos_platos_casa_tomas&id=eq.true&limit=1`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Accept: "application/json" } },
  );
  if (!respuesta.ok) throw new Error(`configuracion_web: HTTP ${respuesta.status}`);
  const filas = (await respuesta.json()) as { mostrar_fotos_platos_casa_tomas?: boolean }[];
  return !(Array.isArray(filas) && filas[0]?.mostrar_fotos_platos_casa_tomas === false);
}

export const useMostrarFotosPlatos = (): boolean => {
  const { data } = useQuery({
    queryKey: ["configuracion-web", "fotos-platos-casa-tomas"],
    queryFn: consultarMostrarFotosPlatos,
    initialData: MOSTRAR_FOTOS_PLATOS,
    initialDataUpdatedAt: 0,
    staleTime: 60 * 1000,
    retry: 1,
  });
  return data !== false;
};
