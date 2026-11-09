import { useFiltrosCarta } from "@/hooks/useFiltrosCarta";
import { filtrarPlatos } from "@/lib/filtros-carta";
import MenuDietario from "@/components/carta/MenuDietario";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { JsonLd } from "@/components/JsonLd";
import CartaPageLayout from "@/components/carta/CartaPageLayout";
import ProductoCard from "@/components/carta/ProductoCard";
import MasSobreSeccion from "@/components/carta/MasSobreSeccion";
import {
  CATEGORIAS_CARTA,
  anclaPlato,
  categoriaPorSlug,
  etiquetaCategoriaIdioma,
  platosDeCategoria,
  rutaCategoria,
} from "@/lib/carta-rutas";
import { agruparPorCategoria, platosParaJsonLd } from "@/lib/carta-ssg";
import { useMostrarFotosPlatos } from "@/hooks/useMostrarFotosPlatos";
import { useMontadoSobreEl404 } from "@/lib/hidratacion-404";
import NotFound from "@/pages/NotFound";
import { breadcrumbSchema, menuPagina, menuSchema, SITE_URL } from "@/lib/negocio";
import { useTranslations } from "@/i18n/LanguageProvider";
import { SEO_CATEGORIA } from "@/lib/carta-seo";
import { usePedido } from "@/hooks/usePedido";
import { useToast } from "@/hooks/use-toast";
import { alternatesDePagina, construirRutaIdioma } from "@/i18n/routing";
import type { Language } from "@/i18n/types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

/** Lo que dura el anillo del plato al que se llega con `#plato-<id>`. */
export const DURACION_RESALTADO_MS = 2500;

/**
 * Ancla del plato a resaltar (`plato-12`) mientras dure el resaltado, o `null`.
 *
 * Solo el resaltado: el desplazamiento hasta el `#` ya lo hace `Header` (y
 * `ScrollToTop` lo respeta), así que aquí no se repite. Empieza en `null`
 * también en el navegador, para que la hidratación coincida con el SSG.
 */
function usePlatoResaltado(): string | null {
  const { hash, key } = useLocation();
  const [resaltado, setResaltado] = useState<string | null>(null);

  useEffect(() => {
    const ancla = hash.replace(/^#/, "");
    if (!ancla.startsWith("plato-")) return;
    setResaltado(ancla);
    const temporizador = window.setTimeout(() => setResaltado(null), DURACION_RESALTADO_MS);
    return () => window.clearTimeout(temporizador);
    // `key`: volver a pulsar el mismo enlace vuelve a resaltar.
  }, [hash, key]);

  return resaltado;
}

const TEXTOS: Record<
  Language,
  {
    tituloSufijo: string;
    plato: (n: number) => string;
    descripcion: (n: number, etiqueta: string) => string;
    migaCarta: string;
    otrasSecciones: string;
    vinos: string;
    bebidas: string;
    vacia: string;
    noEncontradaTitulo: string;
    noEncontradaTexto: string;
  }
> = {
  es: {
    tituloSufijo: "carta y precios | Casa Tomás Crevillent",
    plato: (n) => (n === 1 ? "plato" : "platos"),
    descripcion: (n, etiqueta) =>
      `${n} ${n === 1 ? "plato" : "platos"} de la sección ${etiqueta.toLowerCase()} en Casa Tomás (Crevillent, Alicante), con precio y alérgenos de cada uno.`,
    migaCarta: "Carta",
    otrasSecciones: "Otras secciones",
    vinos: "Vinos",
    bebidas: "Bebidas",
    vacia: "Esta sección de la carta está vacía ahora mismo.",
    noEncontradaTitulo: "Categoría no encontrada",
    noEncontradaTexto: "Puede que esa parte de la carta haya cambiado de nombre o ya no esté disponible.",
  },
  en: {
    tituloSufijo: "menu and prices | Casa Tomás Crevillent",
    plato: (n) => (n === 1 ? "dish" : "dishes"),
    descripcion: (n, etiqueta) =>
      `${n} ${n === 1 ? "dish" : "dishes"} in the ${etiqueta.toLowerCase()} section at Casa Tomás (Crevillent, Alicante), with price and allergens for each one.`,
    migaCarta: "Menu",
    otrasSecciones: "Other sections",
    vinos: "Wines",
    bebidas: "Drinks",
    vacia: "This section of the menu is empty right now.",
    noEncontradaTitulo: "Category not found",
    noEncontradaTexto: "This part of the menu may have been renamed or is no longer available.",
  },
  fr: {
    tituloSufijo: "carte et prix | Casa Tomás Crevillent",
    plato: (n) => (n === 1 ? "plat" : "plats"),
    descripcion: (n, etiqueta) =>
      `${n} ${n === 1 ? "plat" : "plats"} de la section ${etiqueta.toLowerCase()} chez Casa Tomás (Crevillent, Alicante), avec le prix et les allergènes de chacun.`,
    migaCarta: "Carte",
    otrasSecciones: "Autres sections",
    vinos: "Vins",
    bebidas: "Boissons",
    vacia: "Cette section de la carte est vide pour le moment.",
    noEncontradaTitulo: "Catégorie introuvable",
    noEncontradaTexto: "Cette partie de la carte a peut-être changé de nom ou n'est plus disponible.",
  },
};

/**
 * `/carta/:categoria` — una página por categoría con TODOS sus platos visibles.
 *
 * Las rutas concretas las enumera `getStaticPaths` en `App.tsx` a partir de
 * `CATEGORIAS_CARTA`, que sale de los datos del build. Un slug que no existe no
 * genera `.html`, así que Vercel responde con el `404.html` real. Al cargar
 * esa dirección, el cliente casa igualmente con esta ruta: entonces se pinta
 * `NotFound`, lo mismo que trae el HTML (si no, la hidratación no coincide).
 * El aviso propio con las demás categorías queda para cuando se llega aquí
 * navegando dentro de la web.
 */
const CartaCategoria = () => {
  const { filtros, conFiltros, totalCategoria } = useFiltrosCarta();
  const { language, t } = useTranslations();
  const textos = TEXTOS[language];
  // El pedido (y con él el botón flotante del ticket y la entrada al chatbot)
  // es global: lo monta `FloatingActions` en el `Layout`. Aquí solo se añade.
  const { anadir, cantidadDe } = usePedido();
  const { toast } = useToast();
  const { categoria: slug } = useParams<{ categoria: string }>();
  const categoria = categoriaPorSlug(slug);
  // Interruptor «Fotos de platos en Casa Tomás»: valor del build y relectura
  // en el navegador (ver el hook). Antes del `return` temprano: es un hook.
  const mostrarFotos = useMostrarFotosPlatos();
  const platoResaltado = usePlatoResaltado();
  const montadoSobreEl404 = useMontadoSobreEl404();

  if (!categoria && montadoSobreEl404) return <NotFound />;
  if (!categoria) {
    return (
      <>
        <Seo title={`${textos.noEncontradaTitulo} | Casa Tomás Restaurante`} lang={language} noindex />
        <CartaPageLayout
          titulo={textos.noEncontradaTitulo}
          subtitulo={textos.noEncontradaTexto}
          migas={[{ nombre: textos.migaCarta, path: "/carta" }, { nombre: textos.noEncontradaTitulo }]}
        >
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CATEGORIAS_CARTA.map((otra) => (
              <li key={otra.slug}>
                <Link to={conFiltros(rutaCategoria(otra.slug, language))} className="text-accent underline underline-offset-2 hover:decoration-2">
                  {etiquetaCategoriaIdioma(otra.clave, language)}
                </Link>
              </li>
            ))}
          </ul>
        </CartaPageLayout>
      </>
    );
  }

  const platos = platosDeCategoria(categoria.clave);
  const etiqueta = etiquetaCategoriaIdioma(categoria.clave, language);
  const rutaEs = rutaCategoria(categoria.slug); // sin prefijo: la pide `breadcrumbSchema`
  const url = `${SITE_URL}${rutaCategoria(categoria.slug, language)}`;

  // Misma resolución que consume `ProductoCard` (`resolveTranslatedItem` vía
  // `agruparPorCategoria`): con una sola categoría en `platos`, `secciones`
  // tiene como mucho UNA entrada, así que sus `items` ya traducidos sirven
  // también para pintar la rejilla — no hace falta resolver dos veces.
  const secciones = agruparPorCategoria(platos, language);
  const platosTraducidos = filtrarPlatos(secciones[0]?.items ?? [], filtros);
  // Metadatos (`title`, `description`), el subtítulo `h2` opcional y el
  // contenido ampliado del desplegable del pie. El título visible es SIEMPRE
  // `etiqueta`, el nombre de la sección en los datos, tenga o no SEO propio.
  const seoPropio = SEO_CATEGORIA[categoria.slug]?.[language];

  return (
    <>
      <Seo
        title={seoPropio?.title ?? `${etiqueta}: ${textos.tituloSufijo}`}
        description={seoPropio?.description ?? textos.descripcion(platos.length, etiqueta)}
        canonical={url}
        lang={language}
        languageAlternates={alternatesDePagina(rutaEs, SITE_URL)}
        keywords={[
          `${etiqueta.toLowerCase()} Crevillent`,
          `${etiqueta.toLowerCase()} restaurante Alicante`,
          "carta Casa Tomás",
        ]}
      />
      <JsonLd
        data={breadcrumbSchema(
          [
            { nombre: textos.migaCarta, path: "/carta" },
            { nombre: etiqueta, path: rutaEs },
          ],
          language,
        )}
      />
      {secciones.length > 0 && (
        <JsonLd
          data={menuPagina(
            // Sin fotos si el panel las apagó (valor del build, ver `platosParaJsonLd`).
            menuSchema(agruparPorCategoria(platosParaJsonLd(platos), language), language, SUPABASE_URL, {
              id: `${url}#menu`,
              nombre: `${etiqueta} — Casa Tomás`,
              url,
            }),
          )}
        />
      )}

      <CartaPageLayout
        titulo={etiqueta}
        detalle={`${platosTraducidos.length} ${textos.plato(platosTraducidos.length)}`}
        migas={[{ nombre: textos.migaCarta, path: "/carta" }, { nombre: etiqueta }]}
      >
        {/* Entre la cabecera y los platos solo los filtros. El subtítulo H2
            (`seoPropio.h2`) y el texto descriptivo van al pie, dentro del
            desplegable cerrado `MasSobreSeccion` (09/11/2026, el dueño no
            quiere subtítulos visibles: «es una app de restaurante»). */}
        <MenuDietario compacto />
        {platosTraducidos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-start gap-6 md:gap-8 animate-fade-up">
            {platosTraducidos.map((plato, indice) => (
              <ProductoCard
                key={plato.id ?? `${plato.nombre}-${indice}`}
                plato={plato}
                categoria={etiqueta}
                prioridad={indice < 3}
                cantidadEnPedido={cantidadDe(plato)}
                mostrarFoto={mostrarFotos}
                resaltado={platoResaltado === anclaPlato(plato.id)}
                onAnadir={() => {
                  // Mismo nombre y categoría que guarda `CartaPlatos` desde la
                  // portada: el nombre ya traducido, la categoría cruda (es la
                  // clave con la que el ticket la traduce).
                  anadir({ ...plato, nombre: plato.displayNombre || plato.nombre });
                  toast({
                    title: t.platos.toasts.addedTitle,
                    description: t.platos.toasts.addedDescription.replace("{name}", plato.displayNombre),
                  });
                }}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">{filtros.length ? ({
            es: "No hay platos con información suficiente para estos filtros en esta categoría. Puedes modificarlos arriba o consultar al personal.",
            en: "No dishes have enough information for these filters in this category. Change the filters above or ask our staff.",
            fr: "Aucun plat suffisamment renseigné ne correspond à ces filtres dans cette catégorie. Modifiez les filtres ci-dessus ou demandez au personnel.",
          }[language]) : textos.vacia}</p>
        )}

        {seoPropio && (
          <MasSobreSeccion resumen={seoPropio.masSobre}>
            {seoPropio.h2 && (
              <h2 className="font-libre-baskerville text-xl md:text-2xl font-bold text-primary text-balance">{seoPropio.h2}</h2>
            )}
            {seoPropio.intro.map((parrafo) => (
              <p key={parrafo}>{parrafo}</p>
            ))}
          </MasSobreSeccion>
        )}

        <nav aria-label={textos.otrasSecciones} className="mt-14">
          <h2 className="text-xl font-bold text-primary mb-4">{textos.otrasSecciones}</h2>
          <ul className="flex flex-wrap gap-2">
            {CATEGORIAS_CARTA.filter((otra) => otra.slug !== categoria.slug).map((otra) => (
              <li key={otra.slug}>
                <Link
                  to={conFiltros(rutaCategoria(otra.slug, language))}
                  className="inline-flex items-center rounded-full border border-border/70 bg-background/70 px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:border-accent/40 hover:text-foreground"
                >
                  {etiquetaCategoriaIdioma(otra.clave, language)}
                  <span className="ml-2 text-xs text-accent font-semibold">{totalCategoria(otra.clave)}</span>
                </Link>
              </li>
            ))}
            <li>
              <Link
                to={conFiltros(construirRutaIdioma("/carta/vinos", language))}
                className="inline-flex items-center rounded-full border border-border/70 bg-background/70 px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:border-accent/40 hover:text-foreground"
              >
                {textos.vinos}
              </Link>
            </li>
            <li>
              <Link
                to={conFiltros(construirRutaIdioma("/carta/bebidas", language))}
                className="inline-flex items-center rounded-full border border-border/70 bg-background/70 px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:border-accent/40 hover:text-foreground"
              >
                {textos.bebidas}
              </Link>
            </li>
          </ul>
        </nav>
      </CartaPageLayout>
    </>
  );
};

export default CartaCategoria;

