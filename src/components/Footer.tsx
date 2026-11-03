import { Link } from "react-router-dom";
import { Instagram, Facebook, Star } from "lucide-react";
import { useTranslations } from "@/i18n/LanguageProvider";
import { TelLink } from "@/components/TelLink";
import { Button } from "@/components/ui/button";
import { construirRutaIdioma } from "@/i18n/routing";
import { GOOGLE_REVIEW_URL } from "@/lib/negocio";
import { openCookiePreferences } from "@/lib/cookie-consent";
import { AVISO_LEGAL_PATH, CONDICIONES_PATH, POLITICA_PRIVACIDAD_PATH, RESERVAS_PATH, TIENDA_PATH } from "@/lib/condiciones";

// Zonas de toque de al menos 24×24 px (WCAG 2.2, 2.5.8): con `text-sm` la
// línea mide 20 px, así que cada enlace crece hasta 24 px de alto sin cambiar
// el aspecto (el `space-y` baja de 8 a 4 px); los iconos sociales, de 20 px,
// llevan 2 px de relleno por lado.
const ENLACE = "inline-flex min-h-6 items-center hover:text-gold-light transition-colors";
const ICONO = "inline-flex min-h-11 min-w-11 items-center justify-center text-stone-light hover:text-gold-light transition-colors";

const Footer = () => {
  const { t, language } = useTranslations();
  return (
    <footer className="bg-dark-slate text-background py-12 px-4 md:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h2 className="text-xl font-bold mb-4">Casa Tomás</h2>
            <p className="text-stone-light text-sm leading-relaxed mb-5">
              {t.footer.description}
            </p>
            <Button
              asChild
              size="sm"
              className="h-auto min-h-9 whitespace-normal py-2 text-center bg-accent hover:bg-accent-hover text-accent-foreground font-semibold rounded-full shadow-md"
            >
              <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer">
                <Star className="w-4 h-4 mr-2 fill-current" />
                {t.reviews.cta}
              </a>
            </Button>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t.footer.quickLinks}</h3>
            <ul className="space-y-1 text-sm text-stone-light">
              <li>
                {/* Antes era `#carta`, que fuera de la portada no llevaba a
                    ninguna parte. Ahora la carta tiene página propia. */}
                <Link to={construirRutaIdioma("/carta", language)} className={ENLACE}>
                  {t.footer.menuLink}
                </Link>
              </li>
              <li>
                <Link to={construirRutaIdioma(RESERVAS_PATH, language)} className={ENLACE}>
                  {t.footer.reserveLink}
                </Link>
              </li>
              <li>
                <Link to={construirRutaIdioma(TIENDA_PATH, language)} className={ENLACE}>
                  {t.footer.shopLink}
                </Link>
              </li>
              {[
                { path: "/el-restaurante", label: { es: "El restaurante", en: "The restaurant", fr: "Le restaurant" } },
                { path: "/contacto", label: { es: "Contacto y horarios", en: "Contact and hours", fr: "Contact et horaires" } },
                { path: "/regala", label: { es: "Cheques regalo", en: "Gift vouchers", fr: "Chèques cadeaux" } },
                { path: "/touza", label: { es: "Touza Cocktail Bar", en: "Touza Cocktail Bar", fr: "Touza Cocktail Bar" } },
              ].map(({ path, label }) => <li key={path}><Link to={construirRutaIdioma(path, language)} className={ENLACE}>{label[language]}</Link></li>)}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t.footer.contactTitle}</h3>
            <ul className="space-y-1 text-sm text-stone-light">
              <li>
                <TelLink className={ENLACE} />
              </li>
              <li>
                <a href="mailto:casatomascrevillent@gmail.com" className={`${ENLACE} [overflow-wrap:anywhere]`}>
                  casatomascrevillent@gmail.com
                </a>
              </li>
              <li className="flex min-h-6 items-center">Carrer Santa Maria de la Cabeza, 2</li>
              <li className="flex min-h-6 items-center">03330 Crevillent, Alicante</li>
            </ul>
            <div className="flex gap-2 mt-2">
              <a
                href="https://www.instagram.com/casatomascrevillent/?hl=es"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className={ICONO}
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://www.facebook.com/barracasatomas/?locale=es_ES"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className={ICONO}
              >
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-mid-gray pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-stone-light">
            {t.footer.rights}
          </p>

          {/* La regla de 24 px va en la fila y no solo en cada enlace, para que
              cualquier enlace legal que se añada aquí la cumpla también. */}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 items-center [&>*]:inline-flex [&>*]:min-h-6 [&>*]:items-center">
            <Link
              to={construirRutaIdioma(POLITICA_PRIVACIDAD_PATH, language)}
              className="text-xs text-stone-light hover:text-gold-light transition-colors"
            >
              {t.footer.terms}
            </Link>
            <Link
              to={construirRutaIdioma(CONDICIONES_PATH, language)}
              className="text-xs text-stone-light hover:text-gold-light transition-colors"
            >
              {t.footer.bookingTerms}
            </Link>
            {/* Lleva al apartado de cookies de la política de privacidad; el
                salto al ancla lo hace la propia página (ver `PoliticaPrivacidad`). */}
            <Link
              to={`${construirRutaIdioma(POLITICA_PRIVACIDAD_PATH, language)}#cookies`}
              className="text-xs text-stone-light hover:text-gold-light transition-colors"
            >
              {t.footer.cookiePolicy}
            </Link>
            {/* Solo existe en español (ver `AVISO_LEGAL_PATH`): sin prefijo de idioma. */}
            <Link
              to={AVISO_LEGAL_PATH}
              className="text-xs text-stone-light hover:text-gold-light transition-colors"
            >
              {t.footer.legalNotice}
            </Link>
            <button
              type="button"
              onClick={openCookiePreferences}
              className="text-xs text-stone-light hover:text-gold-light transition-colors"
            >
              {t.footer.cookieSettings}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
