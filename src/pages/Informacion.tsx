import { Link, useLocation } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NosotrosSection from "@/components/NosotrosSection";
import EspaciosGallery from "@/components/EspaciosGallery";
import ContactoSection from "@/components/ContactoSection";
import { Seo } from "@/components/Seo";
import { JsonLd } from "@/components/JsonLd";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/LanguageProvider";
import { alternatesDePagina, construirRutaIdioma, quitarPrefijoIdioma } from "@/i18n/routing";
import { GOOGLE_MAPS_URL, restaurantSchema, SITE_URL } from "@/lib/negocio";
import { PAGINAS_INFORMACION, type PaginaInformacion } from "@/lib/paginas-informacion";
import { ID_CONTENIDO } from "@/components/SaltarAlContenido";

const TOUZA_URL = (import.meta.env.VITE_TOUZA_URL as string | undefined) || "https://touza-restaurant-website.vercel.app";

export default function Informacion() {
  const { language, t } = useTranslations();
  const ruta = quitarPrefijoIdioma(useLocation().pathname).replace(/\/+$/, "") as PaginaInformacion;
  const texto = PAGINAS_INFORMACION[ruta][language];
  return <>
    <Seo title={texto.title} description={texto.description} canonical={`${SITE_URL}${construirRutaIdioma(ruta, language)}`} lang={language} languageAlternates={alternatesDePagina(ruta, SITE_URL)} />
    <JsonLd data={restaurantSchema({ lang: language })} />
    <Header />
    <main id={ID_CONTENIDO} tabIndex={-1} className="min-h-screen pt-32 pb-16 bg-background outline-none">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h1 className="text-3xl md:text-5xl font-bold text-primary mb-6">{texto.h1}</h1>
        <p className="text-lg text-muted-foreground">{texto.description}</p>
      </div>
      {ruta === "/el-restaurante" && <><NosotrosSection /><div className="max-w-7xl mx-auto px-4"><EspaciosGallery /></div></>}
      {ruta === "/contacto" && <><ContactoSection modo="contacto" /><p className="text-center"><a href={GOOGLE_MAPS_URL} target="_blank" rel="noopener noreferrer" className="text-accent underline">{{ es: "Cómo llegar a Casa Tomás", en: "Directions to Casa Tomás", fr: "Itinéraire vers Casa Tomás" }[language]}</a></p></>}
      {ruta === "/regala" && <ContactoSection modo="regalo" />}
      {ruta === "/touza" && <div className="max-w-3xl mx-auto my-12 px-4 text-center space-y-6"><h2 className="text-2xl font-bold">{t.espacios.cards[3].title}</h2><p>{t.espacios.cards[3].description}</p><Button asChild><a href={TOUZA_URL} target="_blank" rel="noopener noreferrer">{t.espacios.visitTouza}</a></Button></div>}
      <div className="flex flex-wrap justify-center gap-4 mt-12 px-4">
        <Button asChild><Link to={construirRutaIdioma("/reservas", language)}>{t.footer.reserveLink}</Link></Button>
        <Button asChild variant="outline"><Link to={construirRutaIdioma("/carta", language)}>{t.footer.menuLink}</Link></Button>
      </div>
    </main>
    <Footer />
  </>;
}
