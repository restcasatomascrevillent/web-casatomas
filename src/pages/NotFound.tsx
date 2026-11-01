import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useTranslations } from "@/i18n/LanguageProvider";
import { construirRutaIdioma } from "@/i18n/routing";
import { Seo } from "@/components/Seo";
import { ID_CONTENIDO } from "@/components/SaltarAlContenido";

/**
 * Página de error de las tres ramas (`/`, `/en`, `/fr`): la monta la ruta `*`
 * de cada rama y la ruta literal `404` (la que prerenderiza `404.html`).
 *
 * El idioma sale de la rama (`LanguageProvider` del `Layout`), que a su vez
 * sale del prefijo de la URL: `/en/lo-que-sea` cae en el `*` de la rama `/en`
 * y se pinta en inglés, con `lang`, título y descripción en inglés, y el
 * enlace de vuelta lleva a `/en`, no a la portada en castellano.
 *
 * Lleva cabecera y pie como el resto de páginas, para que quien llega a una
 * dirección rota (p. ej. una novedad que ya no existe) pueda seguir navegando.
 */
const NotFound = () => {
  const location = useLocation();
  const { language, t } = useTranslations();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <Seo title={t.notFound.metaTitle} description={t.notFound.metaDescription} lang={language} noindex />
      <Header />
      <main id={ID_CONTENIDO} tabIndex={-1} className="flex min-h-[70vh] items-center justify-center bg-muted px-4 pt-32 pb-16 outline-none">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold">{t.notFound.title}</h1>
          <p className="mb-4 text-xl text-muted-foreground">{t.notFound.message}</p>
          <Link to={construirRutaIdioma("/", language)} className="text-primary underline hover:text-primary/90">
            {t.notFound.back}
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default NotFound;
