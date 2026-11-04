import { Link } from "react-router-dom";
import { Phone, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConTelefono from "./ConTelefono";
import { PHONE_HREF } from "@/components/TelLink";
import { construirRutaIdioma } from "@/i18n/routing";
import type { TextosTienda } from "@/i18n/tienda";
import type { Language } from "@/i18n/types";

/**
 * La tienda apagada en el panel (`activa = false`), o sin configuración en
 * ese entorno: un aviso amable con salida a la carta de vinos y al teléfono.
 * El aviso del panel (`aviso`), si lo hay, se enseña también aquí.
 */
const TiendaCerrada = ({ textos, language, aviso }: { textos: TextosTienda; language: Language; aviso: string | null }) => (
  <section aria-labelledby="tienda-cerrada" className="mx-auto max-w-2xl rounded-2xl border border-border bg-muted/30 p-6 text-center font-sans sm:p-10">
    <Store className="mx-auto h-12 w-12 text-accent" aria-hidden="true" />
    <h2 id="tienda-cerrada" className="mt-4 font-libre-baskerville text-2xl font-bold text-primary">
      {textos.cerrada.titulo}
    </h2>
    <p className="mt-3 leading-relaxed text-muted-foreground">
      <ConTelefono texto={textos.cerrada.texto} />
    </p>
    {aviso && <p className="mt-4 whitespace-pre-line rounded-lg bg-background px-4 py-3 text-sm leading-relaxed text-foreground">{aviso}</p>}
    <div className="mt-6 flex flex-wrap justify-center gap-3">
      <Button asChild className="h-auto min-h-11 whitespace-normal rounded-full bg-accent text-accent-foreground hover:bg-accent-hover">
        <Link to={construirRutaIdioma("/carta/vinos", language)}>{textos.cerrada.verCarta}</Link>
      </Button>
      <Button asChild variant="outline" className="h-auto min-h-11 whitespace-normal rounded-full">
        <a href={PHONE_HREF}>
          <Phone className="h-4 w-4" aria-hidden="true" />
          {textos.cerrada.llamar}
        </a>
      </Button>
    </div>
  </section>
);

export default TiendaCerrada;
