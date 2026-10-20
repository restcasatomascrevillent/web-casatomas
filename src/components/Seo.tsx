import { Head } from "vite-react-ssg";
import type { Language } from "@/i18n/types";
import type { AlternateIdioma } from "@/i18n/routing";

interface SeoProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  keywords?: readonly string[];
  noindex?: boolean;
  /** Idioma de ESTA página. Fija el `lang` real de `<html>` (ver `index.html`). */
  lang?: Language;
  /**
   * Las cuatro `<link rel="alternate" hreflang="...">` de la página (es, en,
   * fr y x-default), normalmente construidas con `alternatesDePagina`. Se
   * omiten cuando la página no tiene versión en otro idioma (reservas, la
   * política de privacidad).
   */
  languageAlternates?: AlternateIdioma[];
}

const DEFAULT_TITLE = "Casa Tomás Restaurante - Tradición y Calidad en Crevillent";
const DEFAULT_DESC = "Casa Tomás Restaurante en Crevillent, Alicante. Más de 30 años de tradición culinaria. Cocina de calidad con productos frescos y ambiente familiar. Reserva tu mesa.";
const DEFAULT_IMAGE = "https://restaurantecasatomascrevillente.es/og-image.jpg";

const OG_LOCALES: Record<Language, string> = { es: "es_ES", en: "en_US", fr: "fr_FR" };

// `canonical` NO tiene valor por defecto a propósito: si lo tuviera (la portada),
// cualquier página que no lo pase — 404 incluido — se declararía canónica a la
// home. Cada página declara el suyo; las que no deben indexarse no declaran ninguno.
export function Seo({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESC,
  canonical,
  ogImage = DEFAULT_IMAGE,
  keywords = ["restaurante Crevillent", "Casa Tomás", "cocina tradicional", "restaurante Alicante"],
  noindex = false,
  lang = "es",
  languageAlternates,
}: SeoProps) {
  return (
    <Head>
      {/* react-helmet-async reconoce este hijo especial y fusiona `lang` en el
          `<html>` real (ver `extractHelmet`/`htmlAttributes` de vite-react-ssg).
          `index.html` no lleva `lang` fijo a propósito: si lo llevara, la
          fusión dejaría DOS atributos `lang` y el navegador se queda con el
          primero — el español "ganaría" también en `/en` y `/fr`. */}
      <html lang={lang} />
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(", ")} />
      {canonical && <link rel="canonical" href={canonical} />}
      {languageAlternates?.map((alt) => (
        <link key={alt.hrefLang} rel="alternate" hrefLang={alt.hrefLang} href={alt.href} />
      ))}
      {noindex && <meta name="robots" content="noindex,follow" />}

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      {canonical && <meta property="og:url" content={canonical} />}
      <meta property="og:type" content="website" />
      <meta property="og:locale" content={OG_LOCALES[lang]} />
      {languageAlternates
        ?.filter((alt) => alt.hrefLang !== lang && alt.hrefLang !== "x-default")
        .map((alt) => (
          <meta key={alt.hrefLang} property="og:locale:alternate" content={OG_LOCALES[alt.hrefLang as Language]} />
        ))}
      <meta property="og:site_name" content="Casa Tomás Restaurante" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@CasaTomas" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Los datos estructurados NO van aquí: helmet los inyecta por delante del
          <meta charset> y además los pasa por String.replace(), que interpreta
          `$$`, `$&` y `` $` `` como patrones. Cada página renderiza su JSON-LD
          con <JsonLd /> (ver src/components/JsonLd.tsx). */}
    </Head>
  );
}
