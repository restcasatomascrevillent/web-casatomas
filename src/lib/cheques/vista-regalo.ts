import { calcularCaducidad, hoyMadrid } from "../../../supabase/functions/_shared/cheques-regalo/caducidad";
import { CHEQUES_REGALO_PLANTILLA_VISTA_URL, CHEQUES_REGALO_VISTA_URL, functionHeaders } from "@/lib/supabase-functions";
import { PLANTILLA_REGALO, type PlantillaRegalo, type ChequeRegalo } from "../../../supabase/functions/_shared/cheques-regalo/plantilla";

export type DatosVistaRegalo = { importe: string; nombre: string; destinatario: string; mensaje: string; ocultarImporte: boolean; incluirDedicatoria: boolean };
export type SesionVistaRegalo = ReturnType<typeof crearSesionVistaRegalo>;
const campos = ["pdf_titulo", "pdf_subtitulo", "pdf_instrucciones", "pdf_pie", "logo_data", "color_acento", "color_fondo"] as const;
const imagenes = (paginas: string[]) => paginas.map(svg => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg));

async function solicitar(url: string, body = "{}") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try { return await fetch(url, { method: "POST", headers: functionHeaders(), body, signal: controller.signal }); }
  finally { clearTimeout(timeout); }
}

/** Caché limitada a esta compra: no persiste datos personales ni plantillas obsoletas entre compras. */
export function crearSesionVistaRegalo() {
  let carga: Promise<PlantillaRegalo | null> | undefined;
  let motor: Promise<typeof import("./render-vista-regalo")> | undefined;
  const vistas = new Map<string, Promise<string[]>>();
  function preparar() {
    motor ??= import("./render-vista-regalo");
    carga ??= (async () => {
      const response = await solicitar(CHEQUES_REGALO_PLANTILLA_VISTA_URL);
      // Compatibilidad mientras se despliega la función optimizada.
      if (response.status === 404) return null;
      const data = await response.json() as { plantilla?: Record<string, unknown> };
      if (!response.ok || !data.plantilla || !campos.every(c => typeof data.plantilla[c] === "string")) throw new Error("Plantilla no disponible");
      return { ...PLANTILLA_REGALO, caducidad_meses: Number.isInteger(data.plantilla.caducidad_meses) ? Number(data.plantilla.caducidad_meses) : 12, ...Object.fromEntries(campos.map(c => [c, data.plantilla[c]])) };
    })().catch(error => { carga = undefined; throw error; });
    return Promise.all([carga, motor]);
  }
  function generar(datos: DatosVistaRegalo) {
    const opcional = (s: string, max: number) => s.trim().slice(0, max) || null;
    const cheque: ChequeRegalo = { id: "ejemplo", codigo: "CT-EJEMPLO", importe_eur: Math.round(Number(datos.importe) * 100) / 100,
      comprador_nombre: opcional(datos.nombre, 200) || "", comprador_email: "",
      destinatario_nombre: opcional(datos.destinatario, 200), mensaje: datos.incluirDedicatoria ? opcional(datos.mensaje, 500) : null,
      ocultar_importe: datos.ocultarImporte, fecha_entrega_deseada: null };
    const key = hoyMadrid() + JSON.stringify(cheque);
    const guardada = vistas.get(key); if (guardada) return guardada;
    const vista = (async () => {
      const [plantilla, render] = await preparar();
      if (plantilla) return imagenes(await render.generarPaginasRegalo({ ...cheque, caduca_el: calcularCaducidad(plantilla.caducidad_meses) }, plantilla));
      const response = await solicitar(CHEQUES_REGALO_VISTA_URL, JSON.stringify(cheque));
      const data = await response.json() as { paginas?: string[] };
      if (!response.ok || !Array.isArray(data.paginas) || !data.paginas.length || !data.paginas.every(p => typeof p === "string" && p.startsWith("<svg "))) throw new Error("Vista no disponible");
      return imagenes(data.paginas);
    })().catch(error => { if (vistas.get(key) === vista) vistas.delete(key); throw error; });
    if (vistas.size >= 8) vistas.delete(vistas.keys().next().value!);
    vistas.set(key, vista); return vista;
  }
  return { preparar, generar };
}
