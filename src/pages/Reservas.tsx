import Header from "@/components/Header";
import ReservasSection from "@/components/ReservasSection";
import { Seo } from "@/components/Seo";
import { JsonLd } from "@/components/JsonLd";
import { useTranslations } from "@/i18n/LanguageProvider";
import { alternatesDePagina, construirRutaIdioma } from "@/i18n/routing";
import { RESERVAS_PATH } from "@/lib/condiciones";
import { breadcrumbSchema, SITE_URL } from "@/lib/negocio";

/**
 * Formulario de reserva. Existe en las tres ramas (`/reservas`,
 * `/en/reservas`, `/fr/reservas`): mismo formulario, textos del idioma de la
 * rama, y — como la carta — indexable con `hreflang` entre las tres.
 */
const Reservas = () => {
  const { t, language } = useTranslations();
  const p = t.reservasPage;
  return (
    <div className="min-h-screen">
      <Seo
        title={p.seoTitle}
        description={p.seoDescription}
        canonical={`${SITE_URL}${construirRutaIdioma(RESERVAS_PATH, language)}`}
        lang={language}
        languageAlternates={alternatesDePagina(RESERVAS_PATH, SITE_URL)}
        keywords={p.keywords}
      />
      <JsonLd data={breadcrumbSchema([{ nombre: p.breadcrumb, path: RESERVAS_PATH }], language)} />
      <Header />
      <ReservasSection headingLevel="h1" forceShowForm showBackButton />
    </div>
  );
};

export default Reservas;
