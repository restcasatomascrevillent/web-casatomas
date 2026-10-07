import { useEffect, useState } from "react";
import { CHEQUES_REGALO_VISTA_URL, functionHeaders } from "@/lib/supabase-functions";

export function VistaRegaloCompra({ importe, nombre, destinatario, mensaje, ocultarImporte, incluirDedicatoria, texto }: {
  importe: string; nombre: string; destinatario: string; mensaje: string; ocultarImporte: boolean; incluirDedicatoria: boolean;
  texto: { preview: string; loading: string; previewError: string; sample: string };
}) {
  const [paginas, setPaginas] = useState<string[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setPaginas([]); setError(false);
    const timer = window.setTimeout(() => { void (async () => {
      try {
        const response = await fetch(CHEQUES_REGALO_VISTA_URL, {
          method: "POST", headers: functionHeaders(), signal: controller.signal,
          body: JSON.stringify({ importe_eur: Number(importe), comprador_nombre: nombre, destinatario_nombre: destinatario,
            mensaje: incluirDedicatoria ? mensaje : null, ocultar_importe: ocultarImporte, incluir_dedicatoria: incluirDedicatoria }),
        });
        const data = await response.json() as { paginas?: string[] };
        if (!response.ok || !Array.isArray(data.paginas) || !data.paginas.length || !data.paginas.every(p => typeof p === "string" && p.startsWith("<svg "))) throw new Error("Vista no disponible");
        if (!controller.signal.aborted) setPaginas(data.paginas.map(svg => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)));
      } catch { if (!controller.signal.aborted) setError(true); }
    })(); }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [importe, nombre, destinatario, mensaje, ocultarImporte, incluirDedicatoria]);
  return <section className="space-y-2" aria-label={texto.preview}>
    <h3 className="font-medium text-sm">{texto.preview}</h3>
    {error ? <p role="status" className="text-xs text-muted-foreground">{texto.previewError}</p> : paginas.length ? <div className="max-h-[45dvh] overflow-y-auto rounded-xl border bg-muted/30 p-3 space-y-3">
      {paginas.map((src, i) => <img key={i} src={src} alt={`${texto.preview} · ${i + 1}/${paginas.length}`} className="block w-full h-auto rounded-sm shadow" />)}
    </div> : <p role="status" className="text-xs text-muted-foreground">{texto.loading}</p>}
    <p className="text-xs text-muted-foreground">{texto.sample}</p>
  </section>;
}
