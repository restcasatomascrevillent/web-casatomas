import { useEffect, useMemo, useState } from "react";
import { crearSesionVistaRegalo, type SesionVistaRegalo } from "@/lib/cheques/vista-regalo";

export function VistaRegaloCompra({ importe, nombre, destinatario, mensaje, ocultarImporte, incluirDedicatoria, sesion, texto }: {
  importe: string; nombre: string; destinatario: string; mensaje: string; ocultarImporte: boolean; incluirDedicatoria: boolean;
  sesion?: SesionVistaRegalo;
  texto: { preview: string; loading: string; previewError: string; sample: string };
}) {
  const local = useMemo(crearSesionVistaRegalo, []);
  const [paginas, setPaginas] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const [cargando, setCargando] = useState(true);
  useEffect(() => {
    let activo = true;
    setError(false); setCargando(true);
    void (sesion || local).generar({ importe, nombre, destinatario, mensaje, ocultarImporte, incluirDedicatoria })
      .then(p => { if (activo) { setPaginas(p); setCargando(false); } })
      .catch(() => { if (activo) { setError(true); setCargando(false); } });
    return () => { activo = false; };
  }, [sesion, local, importe, nombre, destinatario, mensaje, ocultarImporte, incluirDedicatoria]);
  return <section className="space-y-2" aria-label={texto.preview} aria-busy={cargando}>
    <h3 className="font-medium text-sm">{texto.preview}</h3>
    {error ? <p role="status" className="text-xs text-muted-foreground">{texto.previewError}</p> : paginas.length ? <div className="max-h-[45dvh] overflow-y-auto rounded-xl border bg-muted/30 p-3 space-y-3">
      {paginas.map((src, i) => <img key={i} src={src} alt={`${texto.preview} · ${i + 1}/${paginas.length}`} className="block w-full h-auto rounded-sm shadow" />)}
    </div> : <p role="status" className="text-xs text-muted-foreground">{texto.loading}</p>}
    <p className="text-xs text-muted-foreground">{texto.sample}</p>
  </section>;
}
