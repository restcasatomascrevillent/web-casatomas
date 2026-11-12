import { useFiltrosCarta } from "@/hooks/useFiltrosCarta";
import MenuDietario from "@/components/carta/MenuDietario";
import { Link } from "react-router-dom";
import { ArrowRight, Beer, Wine } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { IconoCategoria } from "@/components/icons/IconosCarta";
import ImagenResponsive from "@/components/ImagenResponsive";
import { useMostrarFotosPlatos } from "@/hooks/useMostrarFotosPlatos";
import { imagenOptimizada, resolverImagen } from "@/lib/carta-ssg";
import { Seo } from "@/components/Seo";
import { JsonLd } from "@/components/JsonLd";
import CartaPageLayout from "@/components/carta/CartaPageLayout";
import AvisoReservaConfirmada from "@/components/carta/AvisoReservaConfirmada";
import BuscadorCarta from "@/components/carta/BuscadorCarta";
import {
  CATEGORIAS_CARTA,
  etiquetaCategoriaIdioma,
  platosDeCategoria,
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
import { useMostrarCartaBebidas } from "@/hooks/useMostrarCartaBebidas";

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
    title: "Carta y precios | Casa Tomás, restaurante en Crevillente",
    description: (p, v, b) =>
      `Carta completa de Casa Tomás (Crevillent, Alicante): ${p} platos con precios y alérgenos, ${v} vinos y ${b} bebidas. Arroces, mariscos, pescados y carnes.`,
    keywords: ["carta Casa Tomás", "menú restaurante Crevillent", "precios restaurante Crevillent", "carta de vinos Crevillent"],
    miga: "Carta",
    titulo: "Carta de Casa Tomás: marisco, carnes y arroces",
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
    title: "Menu & Prices | Casa Tomás, restaurant in Crevillente",
    description: (p, v, b) =>
      `Full menu at Casa Tomás (Crevillent, Alicante): ${p} dishes with prices and allergens, ${v} wines and ${b} drinks. Rice dishes, seafood, fish and meat.`,
    keywords: ["Casa Tomás menu", "restaurant menu Crevillent", "restaurant prices Crevillent", "wine list Crevillent"],
    miga: "Menu",
    titulo: "Casa Tomás menu: seafood, meat and rice dishes",
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
    title: "Carte et prix | Casa Tomás, restaurant à Crevillente",
    description: (p, v, b) =>
      `Carte complète de Casa Tomás (Crevillent, Alicante) : ${p} plats avec prix et allergènes, ${v} vins et ${b} boissons. Riz, fruits de mer, poissons et viandes.`,
    keywords: ["carte Casa Tomás", "menu restaurant Crevillent", "prix restaurant Crevillent", "carte des vins Crevillent"],
    miga: "Carte",
    titulo: "La carte de Casa Tomás : fruits de mer, viandes et riz",
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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

/**
 * Foto de portada de una sección: la del primer plato de la sección que tenga
 * foto (en el orden de la carta), ya pasada por el optimizador. `null` si
 * ninguno tiene o si el panel apagó las fotos: la ficha enseña entonces el
 * icono grande sobre crema.
 */
export function fotoDeSeccion(clave: string, mostrarFotos: boolean): string | null {
  if (!mostrarFotos) return null;
  for (const plato of platosDeCategoria(clave)) {
    const url = resolverImagen(plato.imagen_url, SUPABASE_URL);
    if (url) return imagenOptimizada(url, 640) ?? url;
  }
  return null;
}

/** Disco crema con el icono dorado (sistema de diseño «Carta»). */
const DiscoIcono = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <span
    aria-hidden="true"
    className={`flex items-center justify-center rounded-full bg-[hsl(38_50%_93%)] text-accent ${className}`}
  >
    {children}
  </span>
);

/**
 * Ficha-enlace de una sección de platos: la foto de un plato de la sección
 * (todas comparten el fondo camel de estudio, así que la rejilla queda unida),
 * el icono en un disco que monta sobre la foto, el nombre y cuántos platos hay.
 * Sin foto, el icono grande sobre crema.
 */
const FichaSeccion = ({
  to,
  titulo,
  detalle,
  icono,
  foto,
  prioridad,
}: {
  to: string;
  titulo: string;
  detalle: string;
  icono: ReactNode;
  foto: string | null;
  prioridad: boolean;
}) => (
  <Link to={to} className="group focus-visible:outline-none">
    <Card className="font-libre-baskerville h-full overflow-hidden rounded-2xl border-border/70 transition-all duration-300 motion-reduce:transition-none hover:shadow-xl hover:-translate-y-1 group-focus-visible:ring-2 group-focus-visible:ring-accent group-focus-visible:ring-offset-2">
      <div className="relative aspect-[4/3] overflow-hidden bg-[hsl(38_50%_93%)]">
        {foto ? (
          <img
            src={foto}
            alt=""
            width={640}
            height={480}
            loading={prioridad ? "eager" : "lazy"}
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 motion-reduce:transition-none group-hover:scale-105"
          />
        ) : (
          <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-accent [&>svg]:h-14 [&>svg]:w-14 md:[&>svg]:h-16 md:[&>svg]:w-16">
            {icono}
          </span>
        )}
      </div>
      <div className={`relative px-3 pb-4 md:px-4 ${foto ? "pt-7 md:pt-8" : "pt-3 md:pt-4"}`}>
        {foto && (
          <DiscoIcono className="absolute -top-6 left-3 md:left-4 h-12 w-12 ring-4 ring-card [&>svg]:h-6 [&>svg]:w-6">
            {icono}
          </DiscoIcono>
        )}
        <span className="block text-base md:text-lg font-bold leading-snug text-primary group-hover:text-accent transition-colors break-words">
          {titulo}
        </span>
        <span className="block text-sm text-muted-foreground mt-0.5">{detalle}</span>
      </div>
    </Card>
  </Link>
);

/** Ficha oscura de la bodega (vinos y bebidas), con foto del comedor. */
const FichaBodega = ({
  to,
  titulo,
  detalle,
  icono,
  imagen,
}: {
  to: string;
  titulo: string;
  detalle: string;
  icono: ReactNode;
  imagen: "comedor-2" | "champan";
}) => (
  <Link to={to} className="group focus-visible:outline-none">
    <Card className="font-libre-baskerville h-full overflow-hidden rounded-2xl border-0 bg-dark-slate text-white transition-all duration-300 motion-reduce:transition-none hover:shadow-xl hover:-translate-y-1 group-focus-visible:ring-2 group-focus-visible:ring-accent group-focus-visible:ring-offset-2">
      <div className="relative aspect-[4/3] overflow-hidden bg-dark-slate">
        <ImagenResponsive
          nombre={imagen}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
          className="h-full w-full object-cover opacity-90 transition-transform duration-500 motion-reduce:transition-none group-hover:scale-105"
        />
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-4 md:px-4">
        <span className="min-w-0">
          <span className="flex items-center gap-2 text-base md:text-lg font-bold leading-snug break-words">
            <span aria-hidden="true" className="text-gold-light [&>svg]:h-5 [&>svg]:w-5">{icono}</span>
            {titulo}
          </span>
          <span className="block text-sm text-stone-light mt-0.5">{detalle}</span>
        </span>
        <ArrowRight className="h-5 w-5 shrink-0 text-gold-light transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </div>
    </Card>
  </Link>
);

/**
 * `/carta` — índice de la carta.
 *
 * No repite productos: reparte enlaces hacia las páginas que sí los tienen. Su
 * JSON-LD es un `Menu` de secciones con recuento y URL, sin `MenuItem`.
 *
 * Arriba lleva el buscador de toda la carta (`BuscadorCarta`): platos, vinos y
 * bebidas. Mientras se busca, los resultados sustituyen al índice.
 */
const CartaIndice = () => {
  const { conFiltros, totalCategoria } = useFiltrosCarta();
  const { language } = useTranslations();
  const textos = TEXTOS[language];
  const mostrarCartaBebidas = useMostrarCartaBebidas();
  // Interruptor «Fotos de platos en Casa Tomás»: apagado, las fichas llevan el icono.
  const mostrarFotos = useMostrarFotosPlatos();
  const secciones = [
    ...CATEGORIAS_CARTA.map((categoria) => ({
      nombre: etiquetaCategoriaIdioma(categoria.clave, language),
      total: categoria.total,
      url: `${SITE_URL}${rutaCategoria(categoria.slug, language)}`,
    })),
    { nombre: textos.vinosTitulo, total: RESUMEN_VINOS.total, url: `${SITE_URL}${construirRutaIdioma("/carta/vinos", language)}` },
    // La carta de Bebidas solo si está encendida en el panel (11/11/2026: apagada por defecto).
    ...(mostrarCartaBebidas
      ? [{ nombre: textos.bebidasTitulo, total: RESUMEN_BEBIDAS.total, url: `${SITE_URL}${construirRutaIdioma("/carta/bebidas", language)}` }]
      : []),
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
        {/* Sin búsqueda, el buscador pinta sus `children` tal cual: el índice
            de siempre (y el mismo HTML prerenderizado, con el campo encima).
            Al buscar, los resultados ocupan su lugar. */}
        <BuscadorCarta titulos={{ platos: textos.platosTitulo, bodega: textos.bodegaTitulo }}>
        <section aria-labelledby="platos" className="animate-fade-up">
          <h2 id="platos" className="text-2xl md:text-3xl font-bold text-primary mb-2">
            {textos.platosTitulo}
          </h2>
          <p className="text-muted-foreground mb-6">
            {textos.platosResumen(TOTAL_PLATOS, CATEGORIAS_CARTA.length)}
          </p>

          <MenuDietario>
          {CATEGORIAS_CARTA.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
              {CATEGORIAS_CARTA.map((categoria, indice) => (
                <FichaSeccion
                  key={categoria.slug}
                  to={conFiltros(rutaCategoria(categoria.slug, language))}
                  titulo={etiquetaCategoriaIdioma(categoria.clave, language)}
                  detalle={`${totalCategoria(categoria.clave)} ${textos.plato(totalCategoria(categoria.clave))}`}
                  icono={<IconoCategoria clave={categoria.clave} />}
                  foto={fotoDeSeccion(categoria.clave, mostrarFotos)}
                  prioridad={indice < 4}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">{textos.vaciaPlatos}</p>
          )}
          </MenuDietario>
        </section>

        <section aria-labelledby="bodega" className="mt-14 animate-fade-up">
          <h2 id="bodega" className="text-2xl md:text-3xl font-bold text-primary mb-6">
            {textos.bodegaTitulo}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
            <FichaBodega
              to={conFiltros(construirRutaIdioma("/carta/vinos", language))}
              titulo={textos.vinosTitulo}
              detalle={textos.vinosDetalle(RESUMEN_VINOS.total)}
              icono={<Wine strokeWidth={1.6} />}
              imagen="comedor-2"
            />
            {mostrarCartaBebidas && (
              <FichaBodega
                to={conFiltros(construirRutaIdioma("/carta/bebidas", language))}
                titulo={textos.bebidasTitulo}
                detalle={textos.bebidasDetalle(RESUMEN_BEBIDAS.total)}
                icono={<Beer strokeWidth={1.6} />}
                imagen="champan"
              />
            )}
          </div>
        </section>
        </BuscadorCarta>
      </CartaPageLayout>

      {/* Pop-up tras confirmar la reserva desde el correo (solo con `state`,
          en el navegador). Al final a propósito: un hijo nuevo delante del
          layout cambiaría los ids de `useId` del HTML prerenderizado. */}
      <AvisoReservaConfirmada />
    </>
  );
};

export default CartaIndice;

