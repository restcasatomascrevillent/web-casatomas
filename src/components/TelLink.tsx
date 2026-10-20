import { useOptionalTranslations } from "@/i18n/LanguageProvider";

// Enlace telefónico único del restaurante. Se reutiliza en footer, contacto,
// política de privacidad y CTA móvil para que el número sea siempre pulsable.
export const PHONE_E164 = "+34966107887";
export const PHONE_DISPLAY = "+34 966 10 78 87";
export const PHONE_HREF = `tel:${PHONE_E164}`;

interface TelLinkProps {
  className?: string;
  children?: React.ReactNode;
}

export const TelLink = ({ className, children }: TelLinkProps) => {
  // Etiqueta accesible en el idioma de la página (español si no hay provider).
  const idioma = useOptionalTranslations();
  return (
    <a href={PHONE_HREF} className={className} aria-label={idioma?.t.mobileCta.callAria ?? "Llamar a Casa Tomás"}>
      {children ?? PHONE_DISPLAY}
    </a>
  );
};

export default TelLink;
