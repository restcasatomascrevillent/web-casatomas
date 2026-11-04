import { useQuery } from "@tanstack/react-query";
import { cartaSSG } from "@/lib/carta-ssg";
import { leerHorario, type HorarioWeb } from "@/lib/horario-web";

export interface VisibilidadMenuTapas {
  menu: boolean;
  tapas: boolean;
  /**
   * Días y horas de cada botón (04/11/2026). Opcionales: sin ellos (tests,
   * snapshot viejo) vale lo de siempre (`HORARIO_POR_DEFECTO`).
   */
  horarioMenu?: HorarioWeb;
  horarioTapas?: HorarioWeb;
}

export async function consultarVisibilidadMenuTapas(): Promise<VisibilidadMenuTapas> {
  const url = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "").replace(/\/+$/, "");
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase sin configurar");
  // select=* conserva la compatibilidad si las nuevas columnas aún no existen.
  const respuesta = await fetch(`${url}/rest/v1/configuracion_web?select=*&id=eq.true&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  if (!respuesta.ok) throw new Error("No se pudo cargar la visibilidad del menú y las tapas");
  const filas = await respuesta.json();
  const fila = filas?.[0];
  return {
    menu: fila?.mostrar_menu_dia_casa_tomas !== false,
    tapas: fila?.mostrar_tapas_casa_tomas !== false,
    horarioMenu: leerHorario(fila?.horario_menu_dia_casa_tomas, "menu"),
    horarioTapas: leerHorario(fila?.horario_tapas_casa_tomas, "tapas"),
  };
}

export function useVisibilidadMenuTapas(): VisibilidadMenuTapas {
  const { data } = useQuery({
    queryKey: ["configuracion-web", "menu-tapas-casa-tomas"],
    queryFn: consultarVisibilidadMenuTapas,
    initialData: {
      menu: cartaSSG.config?.mostrarMenuDelDia !== false,
      tapas: cartaSSG.config?.mostrarTapas !== false,
      horarioMenu: leerHorario(cartaSSG.config?.horarioMenuDelDia, "menu"),
      horarioTapas: leerHorario(cartaSSG.config?.horarioTapas, "tapas"),
    },
    initialDataUpdatedAt: 0,
    staleTime: 0,
    refetchInterval: 60_000,
    retry: 1,
  });
  return data;
}
