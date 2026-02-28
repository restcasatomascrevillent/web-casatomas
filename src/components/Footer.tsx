import { Link } from "react-router-dom";
import { useTranslations } from "@/i18n/LanguageProvider";

const Footer = () => {
  const { t } = useTranslations();
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
                <a href="#carta" className="hover:text-accent transition-colors">
                  {t.footer.menuLink}
                </a>
              </li>
              <li>
                <a href="/reservas" className="hover:text-accent transition-colors">{t.footer.reserveLink}</a>
              </li>
              <li>
                <a href="https://restaurantecasatomascrevillente.es/" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
                  {t.footer.websiteLink}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t.footer.contactTitle}</h4>
            <ul className="space-y-2 text-sm text-stone">
              <li>966 10 78 87</li>
              <li>casatomascrevillent@gmail.com</li>
              <li>Carrer Santa Maria de la Cabeza, 2</li>
              <li>03330 Crevillent, Alicante</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-mid-gray pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-stone">
            {t.footer.rights}
          </p>

          <div className="flex gap-4 items-center">
            <a
              href="https://adminpanelct.lovable.app"
              className="text-xs text-stone hover:text-accent transition-colors"
            >
              {t.footer.admin}
            </a>
            <span className="text-stone">|</span>
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
