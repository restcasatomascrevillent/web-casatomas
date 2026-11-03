import { useOptionalTranslations } from "@/i18n/LanguageProvider";
import { cn } from "@/lib/utils";
import { AREA_TOQUE_APILADO } from "@/lib/area-toque";

// Enlace telefónico único del restaurante. Se reutiliza en footer, contacto,
// política de privacidad y CTA móvil para que el número sea siempre pulsable.
export const PHONE_E164 = "+34966107887";
/** El mismo número sin prefijo internacional, para textos cortos (botón «Llamar» de las novedades). */
export const PHONE_NACIONAL = "966 10 78 87";
export const PHONE_DISPLAY = `+34 ${PHONE_NACIONAL}`;
export const PHONE_HREF = `tel:${PHONE_E164}`;

interface TelLinkProps {
  className?: string;
  children?: React.ReactNode;
}

export const TelLink = ({ className, children }: TelLinkProps) => {
  // Etiqueta accesible en el idioma de la página (español si no hay provider).
  // Empieza por el texto visible (WCAG 2.5.3): quien dicta «+34 966…» la encuentra.
  const idioma = useOptionalTranslations();
  const accion = idioma?.t.mobileCta.callAria ?? "Llamar a Casa Tomás";
  return (
    <a href={PHONE_HREF} className={cn(AREA_TOQUE_APILADO, className)} aria-label={children ? undefined : `${PHONE_DISPLAY}, ${accion}`}>
      {children ?? PHONE_DISPLAY}
    </a>
  );
};

export default TelLink;
