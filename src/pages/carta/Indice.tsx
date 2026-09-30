import { Link } from "react-router-dom";
import {
  Beef,
  Beer,
  Cake,
  Cookie,
  Fish,
  Ham,
  Salad,
  Shell,
  Snowflake,
  Soup,
  Sparkles,
  UtensilsCrossed,
  Wine,
} from "lucide-react";
import PaellaIcon from "@/components/icons/PaellaIcon";
import { Card } from "@/components/ui/card";
import { Seo } from "@/components/Seo";
import { JsonLd } from "@/components/JsonLd";
import CartaPageLayout from "@/components/carta/CartaPageLayout";
import {
  CATEGORIAS_CARTA,
  etiquetaCategoriaIdioma,
  RESUMEN_BEBIDAS,
  RESUMEN_VINOS,
  rutaCategoria,
  TOTAL_CARTA,
  TOTAL_PLATOS,
} from "@/lib/carta-rutas";
import { breadcrumbSchema, menuIndiceSchema, SITE_URL } from "@/lib/negocio";
import { useTranslations } from "@/i18n/LanguageProvider";
import { alternatesDePagina, construirRutaIdioma } from "@/i18n/routing";
import type { Language } from "@/i18n/types";

const plural = (n: number, singular: string, plural_: string) =>
  `${n} ${n === 1 ? singular : plural_}`;

const TEXTOS: Record<
  Language,
  {
    title: string;
    description: (platos: number, vinos: number, bebidas: number) => string;
    keywords: string[];
    miga: string;
    titulo: string;
    platosTitulo: string;
    platosResumen: (platos: number, categorias: number) => string;
    vaciaPlatos: string;
    bodegaTitulo: string;
    vinosTitulo: string;
    vinosDetalle: (n: number) => string;
    bebidasTitulo: string;
    bebidasDetalle: (n: number) => string;
    volverA: string;
    referencia: (n: number) => string;
    plato: (n: number) => string;
    categoria: (n: number) => string;
  }
> = {
  es: {
    title: "Carta y precios | Casa Tomás Restaurante en Crevillent",
    description: (p, v, b) =>
      `Carta completa de Casa Tomás (Crevillent, Alicante): ${p} platos con precios y alérgenos, ${v} vinos y ${b} bebidas. Arroces, mariscos, pescados y carnes.`,
    keywords: ["carta Casa Tomás", "menú restaurante Crevillent", "precios restaurante Crevillent", "carta de vinos Crevillent"],
    miga: "Carta",
    titulo: "Nuestra carta",
    platosTitulo: "Platos",
    platosResumen: (p, c) => `${plural(p, "plato", "platos")} en ${plural(c, "categoría", "categorías")}.`,
    vaciaPlatos: "La carta de platos no está disponible en este momento.",
    bodegaTitulo: "Bodega y bebidas",
    vinosTitulo: "Carta de vinos",
    vinosDetalle: (n) => plural(n, "referencia", "referencias"),
    bebidasTitulo: "Bebidas",
    bebidasDetalle: (n) => plural(n, "referencia", "referencias"),
    volverA: "Volver a la portada",
    referencia: (n) => `${n} referencias en total`,
    plato: (n) => (n === 1 ? "plato" : "platos"),
    categoria: (n) => (n === 1 ? "categoría" : "categorías"),
  },
  en: {
    title: "Menu & Prices | Casa Tomás Restaurant in Crevillent",
    description: (p, v, b) =>
      `Full menu at Casa Tomás (Crevillent, Alicante): ${p} dishes with prices and allergens, ${v} wines and ${b} drinks. Rice dishes, seafood, fish and meat.`,
    keywords: ["Casa Tomás menu", "restaurant menu Crevillent", "restaurant prices Crevillent", "wine list Crevillent"],
    miga: "Menu",
    titulo: "Our menu",
    platosTitulo: "Dishes",
    platosResumen: (p, c) => `${p} ${p === 1 ? "dish" : "dishes"} across ${c} ${c === 1 ? "category" : "categories"}.`,
    vaciaPlatos: "The food menu isn't available right now.",
    bodegaTitulo: "Cellar & drinks",
    vinosTitulo: "Wine list",
    vinosDetalle: (n) => `${n} ${n === 1 ? "wine" : "wines"}`,
    bebidasTitulo: "Drinks",
    bebidasDetalle: (n) => `${n} ${n === 1 ? "item" : "items"}`,
    volverA: "Back to homepage",
    referencia: (n) => `${n} items in total`,
    plato: (n) => (n === 1 ? "dish" : "dishes"),
    categoria: (n) => (n === 1 ? "category" : "categories"),
  },
  fr: {
    title: "Carte et prix | Restaurant Casa Tomás à Crevillent",
    description: (p, v, b) =>
      `Carte complète de Casa Tomás (Crevillent, Alicante) : ${p} plats avec prix et allergènes, ${v} vins et ${b} boissons. Riz, fruits de mer, poissons et viandes.`,
    keywords: ["carte Casa Tomás", "menu restaurant Crevillent", "prix restaurant Crevillent", "carte des vins Crevillent"],
    miga: "Carte",
    titulo: "Notre carte",
    platosTitulo: "Plats",
    platosResumen: (p, c) => `${p} ${p === 1 ? "plat" : "plats"} dans ${c} ${c === 1 ? "catégorie" : "catégories"}.`,
    vaciaPlatos: "La carte des plats n'est pas disponible pour le moment.",
    bodegaTitulo: "Cave et boissons",
    vinosTitulo: "Carte des vins",
    vinosDetalle: (n) => `${n} référence${n === 1 ? "" : "s"}`,
    bebidasTitulo: "Boissons",
    bebidasDetalle: (n) => `${n} référence${n === 1 ? "" : "s"}`,
    volverA: "Retour à l'accueil",
    referencia: (n) => `${n} références au total`,
    plato: (n) => (n === 1 ? "plat" : "plats"),
    categoria: (n) => (n === 1 ? "catégorie" : "catégories"),
  },
};

/**
 * Un icono por categoría de platos, para que las tarjetas de "Platos" no
 * repitan todas el mismo cubierto genérico. Las claves son las de
 * `CATEGORIAS_PLATOS` (`@/lib/carta-ssg`) — una categoría nueva creada desde
 * el panel de administración, que no esté aquí, cae en ese mismo cubierto
 * genérico en vez de quedarse sin icono.
 */
const ICONO_POR_CATEGORIA: Record<string, React.ReactNode> = {
  "NOVEDADES DEL DÍA": <Sparkles className="w-6 h-6" />,
  SNACK: <Cookie className="w-6 h-6" />,
  "ENTRANTES FRÍOS": <Snowflake className="w-6 h-6" />,
  "ENTRANTES CALIENTES": <Soup className="w-6 h-6" />,
  ENSALADAS: <Salad className="w-6 h-6" />,
  SALAZONES: <Ham className="w-6 h-6" />,
  MARISCOS: <Shell className="w-6 h-6" />,
  PESCADOS: <Fish className="w-6 h-6" />,
  CARNES: <Beef className="w-6 h-6" />,
  ARROCES: <PaellaIcon className="w-6 h-6" />,
  POSTRES: <Cake className="w-6 h-6" />,
};

const iconoDeCategoria = (clave: string) =>
  ICONO_POR_CATEGORIA[clave] ?? <UtensilsCrossed className="w-6 h-6" />;

/**
 * Tarjeta-enlace de una sección de la carta.
 * Mismo `Card` y mismo `hover:-translate-y-1` que las tarjetas de plato.
 */
const TarjetaSeccion = ({
  to,
  titulo,
  detalle,
  icono,
}: {
  to: string;
  titulo: string;
  detalle: string;
  icono: React.ReactNode;
}) => (
  <Link to={to} className="group focus-visible:outline-none">
    <Card className="font-libre-baskerville h-full p-5 flex items-center gap-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group-focus-visible:ring-2 group-focus-visible:ring-accent">
      <span className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-accent/10 text-accent">
        {icono}
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-bold text-primary group-hover:text-accent transition-colors break-words">
          {titulo}
        </span>
        <span className="block text-sm text-muted-foreground mt-0.5">{detalle}</span>
      </span>
    </Card>
  </Link>
);

/**
 * `/carta` — índice de la carta.
 *
 * No repite productos: reparte enlaces hacia las páginas que sí los tienen. Su
 * JSON-LD es un `Menu` de secciones con recuento y URL, sin `MenuItem`.
 */
const CartaIndice = () => {
  const { language } = useTranslations();
  const textos = TEXTOS[language];
  const secciones = [
    ...CATEGORIAS_CARTA.map((categoria) => ({
      nombre: etiquetaCategoriaIdioma(categoria.clave, language),
      total: categoria.total,
      url: `${SITE_URL}${rutaCategoria(categoria.slug, language)}`,
    })),
    { nombre: textos.vinosTitulo, total: RESUMEN_VINOS.total, url: `${SITE_URL}${construirRutaIdioma("/carta/vinos", language)}` },
    { nombre: textos.bebidasTitulo, total: RESUMEN_BEBIDAS.total, url: `${SITE_URL}${construirRutaIdioma("/carta/bebidas", language)}` },
  ];

  return (
    <>
      <Seo
        title={textos.title}
        description={textos.description(TOTAL_PLATOS, RESUMEN_VINOS.total, RESUMEN_BEBIDAS.total)}
        canonical={`${SITE_URL}${construirRutaIdioma("/carta", language)}`}
        lang={language}
        languageAlternates={alternatesDePagina("/carta", SITE_URL)}
        keywords={textos.keywords}
      />
      <JsonLd data={breadcrumbSchema([{ nombre: textos.miga, path: "/carta" }], language)} />
      <JsonLd data={menuIndiceSchema(secciones, language)} />

      <CartaPageLayout
        titulo={textos.titulo}
        detalle={textos.referencia(TOTAL_CARTA)}
        migas={[{ nombre: textos.miga }]}
        volverA={{ texto: textos.volverA, path: "/" }}
      >
        <section aria-labelledby="platos" className="animate-fade-up">
          <h2 id="platos" className="text-2xl md:text-3xl font-bold text-primary mb-2">
            {textos.platosTitulo}
          </h2>
          <p className="text-muted-foreground mb-6">
            {textos.platosResumen(TOTAL_PLATOS, CATEGORIAS_CARTA.length)}
          </p>

          {CATEGORIAS_CARTA.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {CATEGORIAS_CARTA.map((categoria) => (
                <TarjetaSeccion
                  key={categoria.slug}
                  to={rutaCategoria(categoria.slug, language)}
                  titulo={etiquetaCategoriaIdioma(categoria.clave, language)}
                  detalle={`${categoria.total} ${textos.plato(categoria.total)}`}
                  icono={iconoDeCategoria(categoria.clave)}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">{textos.vaciaPlatos}</p>
          )}
        </section>

        <section aria-labelledby="bodega" className="mt-14 animate-fade-up">
          <h2 id="bodega" className="text-2xl md:text-3xl font-bold text-primary mb-6">
            {textos.bodegaTitulo}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            <TarjetaSeccion
              to={construirRutaIdioma("/carta/vinos", language)}
              titulo={textos.vinosTitulo}
              detalle={textos.vinosDetalle(RESUMEN_VINOS.total)}
              icono={<Wine className="w-6 h-6" />}
            />
            <TarjetaSeccion
              to={construirRutaIdioma("/carta/bebidas", language)}
              titulo={textos.bebidasTitulo}
              detalle={textos.bebidasDetalle(RESUMEN_BEBIDAS.total)}
              icono={<Beer className="w-6 h-6" />}
            />
          </div>
        </section>
      </CartaPageLayout>
    </>
  );
};

export default CartaIndice;
