import { Suspense, lazy, useMemo, type ReactNode } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import CartaSection from "@/components/CartaSection";
import Footer from "@/components/Footer";
import { Seo } from "@/components/Seo";
import { JsonLd } from "@/components/JsonLd";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { useTranslations } from "@/i18n/LanguageProvider";
import { agruparPorCategoria, cartaSSG, CATEGORIAS_PLATOS, platosParaJsonLd } from "@/lib/carta-ssg";
import { menuSchema, restaurantSchema, SITE_URL } from "@/lib/negocio";
import { alternatesDePagina, construirRutaIdioma } from "@/i18n/routing";
import { idleImport } from "@/lib/lazyIdle";
import type { Language } from "@/i18n/types";
import { ID_CONTENIDO } from "@/components/SaltarAlContenido";
import { Link } from "react-router-dom";
import { rutaCategoria } from "@/lib/carta-rutas";
import MasSobreSeccion from "@/components/carta/MasSobreSeccion";
import { importarConRecarga } from "@/lib/recarga-por-version";

const SEO_HOME: Record<Language, { title: string; description: string }> = {
  es: {
    title: "Casa Tomás | Restaurante en Crevillente: marisco y carnes",
    description:
      "¿Dónde comer en Crevillente? Casa Tomás, cocina gallega desde 1998: marisco, chuletón y chuleta a la brasa, arroces melosos y menú del día. Reserva mesa.",
  },
  en: {
    title: "Casa Tomás | Restaurant & Seafood in Crevillente",
    description:
      "Galician cuisine and seafood in Crevillente, Alicante, since 1998. Shellfish, creamy rice dishes, meat and wines, with a terrace. See the menu and book.",
  },
  fr: {
    title: "Casa Tomás | Restaurant et fruits de mer à Crevillente",
    description:
      "Cuisine galicienne et fruits de mer à Crevillente, Alicante, depuis 1998. Fruits de mer, riz crémeux, viandes et vins, avec terrasse. Carte et réservation.",
  },
};

/**
 * Presentación «Sobre Casa Tomás» (plan SEO del 09/11/2026): la web antigua salía
 * en posición 1–2 por «restaurante(s) en Crevillente», «comer / dónde comer
 * en Crevillente», y la nueva no tenía ningún texto con esas frases. Solo
 * nombra lo que hay en la carta y en la web (marisco, chuletón, arroces,
 * menú del día). Los enlaces llevan a las páginas de categoría y al bloque
 * del menú del día (dentro de `#novedades`).
 *
 * 09/11/2026: el dueño no la quiere bajo el hero («queda feísimo»). Va al
 * final de la portada, dentro del mismo desplegable cerrado que el «Más
 * sobre …» de las categorías de la carta (`MasSobreSeccion`, `<details>`
 * nativo): el texto sigue en el HTML prerenderizado, sin `display:none`.
 */
type TrozoPresentacion = string | { texto: string; slug?: string; ancla?: string };

const PRESENTACION: Record<Language, { resumen: string; h2: string; parrafo: TrozoPresentacion[] }> = {
  es: {
    resumen: "Sobre Casa Tomás",
    h2: "Dónde comer en Crevillente: cocina gallega, marisco y carnes a la brasa",
    parrafo: [
      "Casa Tomás es un restaurante en Crevillente de raíces gallegas y cocina mediterránea. En nuestra carta encontrarás ",
      { texto: "marisco gallego", slug: "mariscos" },
      ", ",
      { texto: "chuleta y chuletón de vaca madurada", slug: "carnes" },
      ", ",
      { texto: "arroces melosos de bogavante y langosta", slug: "arroces" },
      " y, a mediodía, nuestro ",
      { texto: "menú del día", ancla: "#novedades" },
      ".",
    ],
  },
  en: {
    resumen: "About Casa Tomás",
    h2: "Where to eat in Crevillente: Galician cuisine, seafood and grilled meat",
    parrafo: [
      "Casa Tomás is a restaurant in Crevillente with Galician roots and Mediterranean cooking. On our menu you will find ",
      { texto: "Galician seafood", slug: "mariscos" },
      ", ",
      { texto: "aged beef chops and T-bone steak", slug: "carnes" },
      ", ",
      { texto: "creamy lobster and spiny lobster rice", slug: "arroces" },
      " and, at lunchtime, our ",
      { texto: "daily set menu", ancla: "#novedades" },
      ".",
    ],
  },
  fr: {
    resumen: "À propos de Casa Tomás",
    h2: "Où manger à Crevillente : cuisine galicienne, fruits de mer et viandes à la braise",
    parrafo: [
      "Casa Tomás est un restaurant à Crevillente aux racines galiciennes et à la cuisine méditerranéenne. Sur notre carte, vous trouverez ",
      { texto: "des fruits de mer galiciens", slug: "mariscos" },
      ", ",
      { texto: "des côtes de bœuf maturées", slug: "carnes" },
      ", ",
      { texto: "des riz crémeux au homard et à la langouste", slug: "arroces" },
      " et, le midi, notre ",
      { texto: "menu du jour", ancla: "#novedades" },
      ".",
    ],
  },
};

const CLASE_ENLACE_PRESENTACION = "text-accent underline underline-offset-4 hover:text-primary";

const Presentacion = ({ language }: { language: Language }) => {
  const { resumen, h2, parrafo } = PRESENTACION[language];
  return (
    <div className="px-4 md:px-8 pb-12 bg-background">
      <div className="max-w-3xl mx-auto">
        <MasSobreSeccion resumen={resumen}>
          <h2 className="font-libre-baskerville text-xl md:text-2xl font-bold text-primary text-balance">{h2}</h2>
          <p>
            {parrafo.map((trozo, i) =>
              typeof trozo === "string" ? (
                trozo
              ) : trozo.slug ? (
                <Link key={i} to={rutaCategoria(trozo.slug, language)} className={CLASE_ENLACE_PRESENTACION}>
                  {trozo.texto}
                </Link>
              ) : (
                <a key={i} href={trozo.ancla} className={CLASE_ENLACE_PRESENTACION}>
                  {trozo.texto}
                </a>
              ),
            )}
          </p>
        </MasSobreSeccion>
      </div>
    </div>
  );
};

// `idleImport`: mismo `lazy()` de siempre, pero en el navegador el `import()`
// de cada sección espera a que el hilo principal esté libre en vez de
// competir con la cabecera y el hero por la conexión/CPU nada más entrar
// (ver el comentario de `idleImport`). El contenido de estas secciones ya
// está en el HTML del SSG; lo único que se retrasa es cuándo se vuelven
// interactivas.
const NovedadesSection = lazy(importarConRecarga(idleImport(() => import("@/components/NovedadesSection"))));
const EspaciosSection = lazy(importarConRecarga(idleImport(() => import("@/components/EspaciosSection"))));
const NosotrosSection = lazy(importarConRecarga(idleImport(() => import("@/components/NosotrosSection"))));
const ContactoSection = lazy(importarConRecarga(idleImport(() => import("@/components/ContactoSection"))));

const SectionPlaceholder = ({ id }: { id: string }) => (
  <section id={id} className="py-16 px-4 md:px-8 lg:px-16 bg-background">
    <div className="max-w-7xl mx-auto space-y-3">
      <div className="h-8 w-44 rounded-full bg-muted/50 animate-pulse" />
      <div className="h-4 w-full max-w-2xl rounded bg-muted/40 animate-pulse" />
      <div className="h-4 w-full max-w-xl rounded bg-muted/40 animate-pulse" />
    </div>
  </section>
);

const SectionBoundary = ({ id, children }: { id: string; children: ReactNode }) => (
  <SectionErrorBoundary id={id}>
    <Suspense fallback={<SectionPlaceholder id={id} />}>{children}</Suspense>
  </SectionErrorBoundary>
);

const Index = () => {
  const { language } = useTranslations();

  // El `Menu` sale ahora de los datos reales que el build descargó de Supabase
  // (`virtual:carta-ssg`), no del scrape congelado de casatomas.buenacarta.com
  // de noviembre de 2025 que se estaba publicando a Google con 129 precios.
  const schema = useMemo(() => {
    const secciones = agruparPorCategoria(platosParaJsonLd(cartaSSG.platos), language, CATEGORIAS_PLATOS);
    return restaurantSchema({
      lang: language,
      // `url` es obligatorio aquí: sin ella, Google no tiene un enlace real
      // para el "Ver carta" de la ficha y cae al `@id` (`SITE_URL/#carta`),
      // que NO es una URL para navegar sino solo un identificador interno
      // del nodo. Si Google la usa igualmente, un visitante que llega por
      // primera vez desde la búsqueda/Maps aterriza directo en `/#carta`:
      // el ancla salta el Hero antes de que nadie lo vea (Header.tsx hace
      // scroll a cualquier hash de la URL nada más cargar). Se enlaza a
      // `/carta`, la página dedicada de la carta, no a este ancla.
      menu: secciones.length
        ? menuSchema(secciones, language, import.meta.env.VITE_SUPABASE_URL as string | undefined, {
            url: `${SITE_URL}${construirRutaIdioma("/carta", language)}`,
          })
        : undefined,
    });
  }, [language]);

  return (
    <>
      <Seo
        title={SEO_HOME[language].title}
        description={SEO_HOME[language].description}
        canonical={`${SITE_URL}${construirRutaIdioma("/", language)}`}
        lang={language}
        languageAlternates={alternatesDePagina("/", SITE_URL)}
      />
      <JsonLd data={schema} />
      <Header />
      <div className="min-h-screen bg-background">
        <main id={ID_CONTENIDO} tabIndex={-1} className="outline-none">
        <Hero />
        <SectionErrorBoundary id="carta"><CartaSection /></SectionErrorBoundary>
        <SectionBoundary id="novedades"><NovedadesSection /></SectionBoundary>
        <SectionBoundary id="espacios"><EspaciosSection /></SectionBoundary>
        <SectionBoundary id="nosotros"><NosotrosSection /></SectionBoundary>
        <SectionBoundary id="contacto"><ContactoSection /></SectionBoundary>
        <Presentacion language={language} />
        </main>
        <SectionErrorBoundary id="footer"><Footer /></SectionErrorBoundary>
      </div>
    </>
  );
};

export default Index;

