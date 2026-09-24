import { Link } from "react-router-dom";
import { Instagram, Facebook } from "lucide-react";
import { useTranslations } from "@/i18n/LanguageProvider";
import { TelLink } from "@/components/TelLink";
import { construirRutaIdioma } from "@/i18n/routing";
import { GOOGLE_REVIEW_URL } from "@/lib/negocio";

const Footer = () => {
  const { t, language } = useTranslations();
  return (
    <footer className="bg-dark-slate text-background py-12 px-4 md:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Casa Tomás</h3>
            <p className="text-stone text-sm leading-relaxed">
              {t.footer.description}
            </p>
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
                {/* Reservas se queda solo en español por ahora (ver el informe
                    del cambio de i18n): el formulario no tiene versión propia
                    en /en ni /fr todavía. */}
                <a href="/reservas" className="hover:text-accent transition-colors">{t.footer.reserveLink}</a>
              </li>
              <li>
                <a href="https://restaurantecasatomascrevillente.es/" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
                  {t.footer.websiteLink}
                </a>
              </li>
              <li>
                <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
                  {t.reviews.cta}
                </a>
              </li>
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
                href="#" /* TODO: añadir URL real */
                aria-label="Instagram"
                className="text-stone hover:text-accent transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#" /* TODO: añadir URL real */
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

          <div className="flex gap-4 items-center">
            <Link
              to="/politica-privacidad"
              className="text-xs text-stone hover:text-accent transition-colors"
            >
              {t.footer.terms}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
