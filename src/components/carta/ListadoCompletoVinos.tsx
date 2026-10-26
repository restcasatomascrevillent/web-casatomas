import type { Language } from "@/i18n/types";
import { mostrarPrecio } from "@/lib/precios";
import { origenComprobable } from "@/lib/origenes-vino";

type VinoListado = { id?: string; nombre: string; precio_eur: number; denominacion_origen?: string };
const TEXTOS = {
  es: { title: "Ver listado completo de vinos y precios", wine: "Vino", origin: "Denominación de origen", price: "Precio" },
  en: { title: "View the complete wine and price list", wine: "Wine", origin: "Appellation", price: "Price" },
  fr: { title: "Voir la liste complète des vins et des prix", wine: "Vin", origin: "Appellation", price: "Prix" },
};

/** HTML accesible sin JavaScript: el catálogo completo no depende de «Ver más». */
export default function ListadoCompletoVinos({ vinos, language }: { vinos: VinoListado[]; language: Language }) {
  const t = TEXTOS[language];
  if (!vinos.length) return null;
  return (
    <details className="rounded-xl border border-border p-4">
      <summary className="cursor-pointer font-semibold text-primary">{t.title} ({vinos.length})</summary>
      <div className="overflow-x-auto mt-4">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{t.title}</caption>
          <thead><tr><th scope="col" className="p-2">{t.wine}</th><th scope="col" className="p-2">{t.origin}</th><th scope="col" className="p-2">{t.price}</th></tr></thead>
          <tbody>{vinos.map((vino, index) => (
            <tr key={vino.id ?? `${vino.nombre}-${index}`} className="border-t border-border">
              <th scope="row" className="p-2 font-normal">{vino.nombre}</th>
              <td className="p-2">{origenComprobable(vino.denominacion_origen) || "—"}</td>
              <td className="p-2 whitespace-nowrap">{mostrarPrecio(vino.precio_eur, language)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </details>
  );
}
