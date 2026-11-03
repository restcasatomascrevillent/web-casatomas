import { AlertCircle, Clock, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PHONE_HREF, TelLink } from "@/components/TelLink";
import { GOOGLE_MAPS_URL } from "@/lib/negocio";
import { AREA_TOQUE_ENLACE } from "@/lib/area-toque";
import { useTranslations } from "@/i18n/LanguageProvider";
import type { TextosTienda } from "@/i18n/tienda";

interface ComoComprarTiendaProps {
  textos: TextosTienda;
  /** Texto del panel (`configuracion_tienda.recogida`), si lo hay. */
  recogida: string | null;
}

/**
 * «Cómo comprar»: la tienda es un escaparate y las botellas se compran en el
 * restaurante (o se reservan por teléfono). Aquí va todo lo necesario para
 * hacerlo: el texto del panel (`recogida`), la dirección con «Cómo llegar», el
 * horario y el teléfono pulsable — los mismos datos que ya enseña la web en
 * Contacto (`t.contacto`), no una copia —, y el aviso de mayoría de edad.
 * Ningún formulario: ni se pide ni se guarda nada del visitante.
 */
const ComoComprarTienda = ({ textos, recogida }: ComoComprarTiendaProps) => {
  const { t } = useTranslations();
  const c = textos.comprar;
  return (
    <section
      id="como-comprar"
      aria-labelledby="como-comprar-titulo"
      className="scroll-mt-24 rounded-2xl border border-accent/30 bg-accent/5 p-4 font-sans sm:p-6 lg:p-8"
    >
      {/* `grid-cols-1` (minmax(0, 1fr)) y no la pista automática: con 320 px y
          letra al 200 % la pista crecía hasta el contenido y se salía. */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
        <div className="min-w-0 space-y-4">
          <h2 id="como-comprar-titulo" className="font-libre-baskerville text-2xl font-bold text-primary">
            {c.titulo}
          </h2>
          <p className="leading-relaxed text-foreground">{c.intro}</p>
          {recogida && (
            <p className="whitespace-pre-line rounded-lg border border-border bg-background px-4 py-3 text-sm leading-relaxed text-foreground">
              {recogida}
            </p>
          )}
          <p className="text-sm text-muted-foreground">{c.pago}</p>
          <Button
            asChild
            size="lg"
            className="h-auto min-h-12 w-full whitespace-normal rounded-full bg-accent px-5 py-3 text-base font-semibold text-accent-foreground hover:bg-accent-hover sm:w-auto sm:px-8"
          >
            <a href={PHONE_HREF}>
              <Phone className="h-5 w-5 shrink-0" aria-hidden="true" />
              {c.llamar}
            </a>
          </Button>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="min-w-0 space-y-5 text-sm">
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 font-semibold text-foreground">
                <MapPin className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                {c.donde}
              </h3>
              <address className="not-italic leading-relaxed text-muted-foreground">
                {t.contacto.addressLines.map((linea) => (
                  <span key={linea} className="block">
                    {linea}
                  </span>
                ))}
              </address>
              <a
                href={GOOGLE_MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${AREA_TOQUE_ENLACE} font-medium text-accent underline underline-offset-2 hover:decoration-2`}
              >
                {c.comoLlegar}
              </a>
            </div>
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 font-semibold text-foreground">
                <Phone className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                {c.telefono}
              </h3>
              <p>
                <TelLink className="font-medium text-foreground underline underline-offset-2 hover:decoration-2" />
              </p>
            </div>
          </div>

          <div className="min-w-0 space-y-2 text-sm">
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              <Clock className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              {c.horario}
            </h3>
            <dl className="space-y-1 text-muted-foreground">
              {t.contacto.schedule.map((fila) => (
                <div key={fila.day} className="flex flex-wrap justify-between gap-x-3">
                  <dt>{fila.day}</dt>
                  <dd className="tabular-nums">{fila.hours}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-start gap-3 border-t border-accent/20 pt-5 text-sm leading-relaxed">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
        <p className="min-w-0">
          <span className="font-semibold text-foreground">{textos.edad.titulo}.</span>{" "}
          <span className="text-muted-foreground">{textos.edad.texto}</span>
        </p>
      </div>
    </section>
  );
};

export default ComoComprarTienda;
