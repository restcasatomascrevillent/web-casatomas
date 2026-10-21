import { Link } from "react-router-dom";
import { Instagram, Facebook, Star } from "lucide-react";
import { useTranslations } from "@/i18n/LanguageProvider";
import { TelLink } from "@/components/TelLink";
import { Button } from "@/components/ui/button";
import { construirRutaIdioma } from "@/i18n/routing";
import { GOOGLE_REVIEW_URL } from "@/lib/negocio";
import { openCookiePreferences } from "@/lib/cookie-consent";
import { CONDICIONES_PATH, POLITICA_PRIVACIDAD_PATH, RESERVAS_PATH } from "@/lib/condiciones";

const Footer = () => {
  const { t, language } = useTranslations();
  return (
    <footer className="bg-dark-slate text-background py-12 px-4 md:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Casa Tomás</h3>
            <p className="text-stone text-sm leading-relaxed mb-5">
              {t.footer.description}
            </p>
            <Button
              asChild
              size="sm"
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-full shadow-md"
            >
              <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer">
                <Star className="w-4 h-4 mr-2 fill-current" />
                {t.reviews.cta}
              </a>
            </Button>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t.footer.quickLinks}</h4>
            <ul className="space-y-2 text-sm text-stone">
              <li>
                {/* Antes era `#carta`, que fuera de la portada no llevaba a
                    ninguna parte. Ahora la carta tiene página propia. */}
                <Link to={construirRutaIdioma("/carta", language)} className="hover:text-accent transition-colors">
                  {t.footer.menuLink}
                </Link>
              </li>
              <li>
                <Link to={construirRutaIdioma(RESERVAS_PATH, language)} className="hover:text-accent transition-colors">
                  {t.footer.reserveLink}
                </Link>
              </li>
              {[
                { path: "/el-restaurante", label: { es: "El restaurante", en: "The restaurant", fr: "Le restaurant" } },
                { path: "/contacto", label: { es: "Contacto y horarios", en: "Contact and hours", fr: "Contact et horaires" } },
                { path: "/regala", label: { es: "Cheques regalo", en: "Gift vouchers", fr: "Chèques cadeaux" } },
                { path: "/touza", label: { es: "Touza Cocktail Bar", en: "Touza Cocktail Bar", fr: "Touza Cocktail Bar" } },
              ].map(({ path, label }) => <li key={path}><Link to={construirRutaIdioma(path, language)} className="hover:text-accent transition-colors">{label[language]}</Link></li>)}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t.footer.contactTitle}</h4>
            <ul className="space-y-2 text-sm text-stone">
              <li>
                <TelLink className="hover:text-accent transition-colors" />
              </li>
              <li>
                <a href="mailto:casatomascrevillent@gmail.com" className="hover:text-accent transition-colors">
                  casatomascrevillent@gmail.com
                </a>
              </li>
              <li>Carrer Santa Maria de la Cabeza, 2</li>
              <li>03330 Crevillent, Alicante</li>
            </ul>
            <div className="flex gap-4 mt-4">
              <a
                href="https://www.instagram.com/casatomascrevillent/?hl=es"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-stone hover:text-accent transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://www.facebook.com/barracasatomas/?locale=es_ES"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="text-stone hover:text-accent transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-mid-gray pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-stone">
            {t.footer.rights}
          </p>

          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 items-center">
            <Link
              to={construirRutaIdioma(POLITICA_PRIVACIDAD_PATH, language)}
              className="text-xs text-stone hover:text-accent transition-colors"
            >
              {t.footer.terms}
            </Link>
            <Link
              to={construirRutaIdioma(CONDICIONES_PATH, language)}
              className="text-xs text-stone hover:text-accent transition-colors"
            >
              {t.footer.bookingTerms}
            </Link>
            <button
              type="button"
              onClick={openCookiePreferences}
              className="text-xs text-stone hover:text-accent transition-colors"
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
