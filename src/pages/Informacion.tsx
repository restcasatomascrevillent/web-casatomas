import { AREA_TOQUE_ENLACE } from "@/lib/area-toque";
import { Link, useLocation } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NosotrosSection from "@/components/NosotrosSection";
import EspaciosGallery from "@/components/EspaciosGallery";
import ContactoSection from "@/components/ContactoSection";
import TouzaPagina from "@/components/TouzaPagina";
import { Seo } from "@/components/Seo";
import { JsonLd } from "@/components/JsonLd";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/LanguageProvider";
import { alternatesDePagina, construirRutaIdioma, quitarPrefijoIdioma } from "@/i18n/routing";
import { GOOGLE_MAPS_URL, restaurantSchema, SITE_URL } from "@/lib/negocio";
import { PAGINAS_INFORMACION, type PaginaInformacion } from "@/lib/paginas-informacion";
import { ID_CONTENIDO } from "@/components/SaltarAlContenido";

export default function Informacion() {
  const { language, t } = useTranslations();
  const ruta = quitarPrefijoIdioma(useLocation().pathname).replace(/\/+$/, "") as PaginaInformacion;
  const texto = PAGINAS_INFORMACION[ruta][language];
  return <>
    <Seo title={texto.title} description={texto.description} canonical={`${SITE_URL}${construirRutaIdioma(ruta, language)}`} lang={language} languageAlternates={alternatesDePagina(ruta, SITE_URL)} />
    <JsonLd data={restaurantSchema({ lang: language })} />
    <Header />
    <main id={ID_CONTENIDO} tabIndex={-1} className={`min-h-screen ${ruta === "/touza" ? "" : "pt-32"} pb-16 bg-background outline-none`}>
      {ruta === "/touza" ? <TouzaPagina /> : <div className="max-w-4xl mx-auto px-4 text-center">
        <h1 className="text-3xl md:text-5xl font-bold text-primary mb-6">{texto.h1}</h1>
        <p className="text-lg text-muted-foreground">{texto.description}</p>
      </div>}
      {ruta === "/el-restaurante" && <><NosotrosSection /><div className="max-w-7xl mx-auto px-4"><EspaciosGallery /></div></>}
      {ruta === "/contacto" && <><ContactoSection modo="contacto" /><p className="text-center"><a href={GOOGLE_MAPS_URL} target="_blank" rel="noopener noreferrer" className={`${AREA_TOQUE_ENLACE} text-accent underline`}>{{ es: "Cómo llegar a Casa Tomás", en: "Directions to Casa Tomás", fr: "Itinéraire vers Casa Tomás" }[language]}</a></p></>}
      {ruta === "/regala" && <ContactoSection modo="regalo" />}
      <div className="flex flex-wrap justify-center gap-4 mt-12 px-4">
        <Button asChild><Link to={construirRutaIdioma("/reservas", language)}>{t.footer.reserveLink}</Link></Button>
        <Button asChild variant="outline"><Link to={construirRutaIdioma("/carta", language)}>{t.footer.menuLink}</Link></Button>
      </div>
    </main>
    <Footer />
  </>;
}
