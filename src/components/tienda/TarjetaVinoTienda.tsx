import { memo, useState } from "react";
import { MapPin, Wine } from "lucide-react";
import { esFotoCarta, imagenOptimizada, resolverImagen } from "@/lib/carta-ssg";
import { origenComprobable } from "@/lib/origenes-vino";
import { formatearPrecio } from "@/lib/precios";
import { categoriaCorta, etiquetaTipoVino, tipoVino } from "@/lib/tipos-vino";
import { nombreVinoVisible } from "@/lib/filtro-vinos";
import { NEGOCIO } from "@/lib/negocio";
import { aCentimos, centimosTienda, formatearPorcentaje, insigniaDescuento, type VinoTienda } from "@/lib/tienda";
import type { TextosTienda } from "@/i18n/tienda";
import type { Language } from "@/i18n/types";
import { cn } from "@/lib/utils";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

interface TarjetaVinoTiendaProps {
  vino: VinoTienda;
  language: Language;
  textos: TextosTienda;
  descuentoPct: number;
}

/**
 * Ficha de un vino de la tienda: misma familia visual que la de la carta
 * (`CartaVinos`: título en Libre Baskerville, «Tintos · Ribera del Duero», foto
 * de carta en el lateral sobre su cartulina), con el precio de carta tachado, el
 * de tienda destacado y la insignia del descuento. Sin botones: la tienda es un
 * escaparate y los vinos se compran en el restaurante.
 *
 * La foto pasa por el optimizador de Vercel (`imagenOptimizada`, 640 px, el
 * ancho más pequeño que permite `vercel.json`), perezosa y con `width`/`height`
 * para que no mueva nada al cargar. Sin foto (o si falla), una silueta de copa.
 */
const TarjetaVinoTienda = ({ vino, language, textos, descuentoPct }: TarjetaVinoTiendaProps) => {
  const nombre = nombreVinoVisible(vino, language);
  const denominacion = categoriaCorta(vino.categoria ?? "", language);
  const origen = [origenComprobable(vino.ubicacion_region), origenComprobable(vino.ubicacion_pais)].filter(Boolean).join(" · ");
  const foto = resolverImagen(vino.imagen_url, SUPABASE_URL);
  const [fotoRota, setFotoRota] = useState(false);
  const conFoto = !!foto && !fotoRota;
  const fotoCarta = conFoto && esFotoCarta(foto);
  const hayDescuento = descuentoPct > 0;
  const idTitulo = `vino-tienda-${vino.id}`;

  return (
    <article
      aria-labelledby={idTitulo}
      className="flex h-full min-w-0 overflow-hidden rounded-lg border border-border/80 bg-background shadow-sm"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="space-y-1 px-4 pb-3 pt-3">
          {/* `hyphens-auto`: con letra grande en 320 px la columna es estrecha y una
              palabra larga se parte con guion (según el `lang` de la página), no a pedazos. */}
          <h3 id={idTitulo} className="font-libre-baskerville text-base leading-snug break-words hyphens-auto">
            {nombre}
          </h3>
          <p className="font-sans text-xs leading-relaxed text-muted-foreground">
            {etiquetaTipoVino(tipoVino(vino.categoria), language)} · {denominacion}
          </p>
          {origen && (
            <p className="flex items-start gap-1 font-sans text-xs leading-relaxed text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
              <span className="min-w-0 break-words hyphens-auto">{origen}</span>
            </p>
          )}
        </div>

        <div className="mt-auto border-t border-border/60 bg-muted/10 px-4 py-3 font-sans">
          {hayDescuento && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-tight text-muted-foreground">
              <span>
                <span className="sr-only">{textos.tarjeta.precioCarta}: </span>
                <s>{formatearPrecio(aCentimos(vino.precio_eur) / 100)}</s>
              </span>
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                <span aria-hidden="true">{insigniaDescuento(descuentoPct, language)}</span>
                <span className="sr-only">{textos.tarjeta.descuento(formatearPorcentaje(descuentoPct, language))}</span>
              </span>
            </p>
          )}
          <p className="mt-1 font-libre-baskerville text-lg font-bold leading-tight text-accent">
            <span className="sr-only">{textos.tarjeta.precioTienda}: </span>
            {formatearPrecio(centimosTienda(vino.precio_eur, descuentoPct) / 100)}
          </p>
        </div>
      </div>

      {/* Columna lateral (va después del texto en el DOM: se lee antes el
          nombre) con los mismos marcos que la foto lateral de la carta. */}
      {conFoto ? (
        <div
          className={cn(
            "order-first shrink-0 overflow-hidden border-r border-border/60",
            fotoCarta ? "aspect-[3/5] w-[27%] max-w-[6.5rem] bg-[#cdae77]" : "aspect-[3/4] w-[30%] max-w-[7rem] bg-[#1a1612]",
          )}
        >
          <img
            src={imagenOptimizada(foto, 640) ?? undefined}
            alt={`${nombre} — ${denominacion}, ${NEGOCIO.nombre}`}
            width={900}
            height={1200}
            loading="lazy"
            decoding="async"
            className={cn("h-full w-full", fotoCarta ? "object-cover" : "object-contain")}
            onError={() => setFotoRota(true)}
          />
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="order-first flex w-[22%] max-w-[5rem] shrink-0 items-center justify-center border-r border-border/60 bg-muted/40 text-muted-foreground/60"
        >
          <Wine className="h-7 w-7" />
        </div>
      )}
    </article>
  );
};

export default memo(TarjetaVinoTienda);
