import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import datos from "virtual:carta-ssg/vinos";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Seo } from "@/components/Seo";
import { JsonLd } from "@/components/JsonLd";
import CartaPageLayout from "@/components/carta/CartaPageLayout";
import ListaPrecios, { type FilaPrecio } from "@/components/carta/ListaPrecios";
import { agruparPorCategoria } from "@/lib/carta-ssg";
import { etiquetaCategoria, slugificar } from "@/lib/carta-rutas";
import { breadcrumbSchema, menuPagina, menuSchema, SITE_URL } from "@/lib/negocio";
import type { ItemTraducido } from "@/lib/carta-i18n";
import type { VinoSSG } from "@/lib/carta-ssg-types";
import { useTranslations } from "@/i18n/LanguageProvider";
import { alternatesDePagina, construirRutaIdioma } from "@/i18n/routing";
import type { Language } from "@/i18n/types";

const RUTA_ES = "/carta/vinos";

/** "D.O. Rioja · La Rioja, España" a partir de lo que haya. Sin inventar nada. */
const origenDe = (vino: VinoSSG) =>
  [
    vino.denominacion_origen ? `D.O. ${vino.denominacion_origen}` : null,
    [vino.ubicacion_region, vino.ubicacion_pais].filter(Boolean).join(", ") || null,
  ]
    .filter(Boolean)
    .join(" · ") || undefined;

// El nombre SÍ se traduce (`displayNombre`, resuelto por `agruparPorCategoria`);
// D.O./región no tienen columna `_en`/`_fr` en la base de datos — son topónimos
// y denominaciones oficiales, no prosa — así que `origenDe` se queda igual.
const aFila = (vino: ItemTraducido<VinoSSG>, indice: number): FilaPrecio => ({
  id: vino.id ?? `${vino.nombre}-${indice}`,
  nombre: vino.displayNombre,
  detalle: origenDe(vino),
  precio: vino.precio_eur,
  unidad: vino.unidad,
});

const TEXTOS: Record<
  Language,
  {
    title: string;
    description: (n: number) => string;
    keywords: string[];
    miga: string;
    titulo: string;
    subtitulo: string;
    detalle: (n: number) => string;
    alertTitle: string;
    alertBody: string;
    vacia: string;
    buscasAlgo: string;
    verBebidas: string;
  }
> = {
  es: {
    title: "Carta de vinos y precios | Casa Tomás Crevillent",
    description: (n) => `Bodega de Casa Tomás en Crevillent (Alicante): ${n} referencias con su denominación de origen y su precio. Tintos, blancos, cavas y generosos.`,
    keywords: ["carta de vinos Crevillent", "bodega restaurante Alicante", "vinos Casa Tomás", "denominación de origen"],
    miga: "Vinos",
    titulo: "Carta de vinos",
    subtitulo: "Nuestra bodega, con la denominación de origen y el precio de cada referencia.",
    detalle: (n) => `${n} referencias`,
    alertTitle: "Solo para mayores de 18 años",
    alertBody: "La venta y el suministro de bebidas alcohólicas a menores de 18 años está prohibido. Disfrútalo con moderación.",
    vacia: "La carta de vinos no está disponible ahora mismo.",
    buscasAlgo: "¿Buscas algo para acompañar?",
    verBebidas: "Ver las bebidas sin alcohol",
  },
  en: {
    title: "Wine List & Prices | Casa Tomás Crevillent",
    description: (n) => `Casa Tomás wine cellar in Crevillent (Alicante): ${n} wines with their designation of origin and price. Reds, whites, cava and fortified wines.`,
    keywords: ["wine list Crevillent", "restaurant wine cellar Alicante", "Casa Tomás wines", "designation of origin"],
    miga: "Wines",
    titulo: "Wine list",
    subtitulo: "Our cellar, with the designation of origin and price of every wine.",
    detalle: (n) => `${n} wines`,
    alertTitle: "18+ only",
    alertBody: "The sale and serving of alcoholic drinks to anyone under 18 is prohibited. Please enjoy responsibly.",
    vacia: "The wine list isn't available right now.",
    buscasAlgo: "Looking for something to go with it?",
    verBebidas: "See our soft drinks",
  },
  fr: {
    title: "Carte des vins et prix | Casa Tomás Crevillent",
    description: (n) => `Cave à vins de Casa Tomás à Crevillent (Alicante) : ${n} références avec leur appellation d'origine et leur prix. Rouges, blancs, cavas et vins doux.`,
    keywords: ["carte des vins Crevillent", "cave à vins restaurant Alicante", "vins Casa Tomás", "appellation d'origine"],
    miga: "Vins",
    titulo: "Carte des vins",
    subtitulo: "Notre cave, avec l'appellation d'origine et le prix de chaque référence.",
    detalle: (n) => `${n} références`,
    alertTitle: "Réservé aux plus de 18 ans",
    alertBody: "La vente et le service de boissons alcoolisées aux mineurs de moins de 18 ans sont interdits. À consommer avec modération.",
    vacia: "La carte des vins n'est pas disponible pour le moment.",
    buscasAlgo: "Vous cherchez de quoi l'accompagner ?",
    verBebidas: "Voir nos boissons sans alcool",
  },
};

/**
 * `/carta/vinos` — las 185 referencias de la bodega, todas visibles.
 *
 * VERIFICACIÓN DE EDAD. La sección de vinos de la portada abre un `Dialog` de
 * Radix al montarse, y eso aquí no sirve por tres motivos: el diálogo se
 * portaliza a `<body>` y en Node no llega a renderizarse (el prerenderizado
 * saldría vacío), el contenido quedaría detrás de una interacción (justo lo que
 * se acaba de retirar de esta web) y un modal al cargar es un patrón que Google
 * penaliza como intersticial. Se sustituye por un aviso permanente y visible:
 * la ley española restringe la VENTA y el suministro de alcohol a menores, no
 * mostrar la lista de lo que sirve un restaurante — la carta física se entrega
 * en mesa a todo el mundo. La portada conserva su diálogo sin cambios.
 */
const CartaVinosPagina = () => {
  const { language } = useTranslations();
  const textos = TEXTOS[language];
  const url = `${SITE_URL}${construirRutaIdioma(RUTA_ES, language)}`;
  const vinos = datos.vinos ?? [];
  // `imagen_url` se descarta antes de construir el JSON-LD: `ListaPrecios` no
  // pinta fotos, y declarar en los datos estructurados una imagen que la página
  // no enseña es describir algo que el visitante no ve. Hoy ninguna de las 185
  // filas trae foto; esto lo deja bien atado si alguien la sube desde el panel.
  const secciones = agruparPorCategoria(
    vinos.map(({ imagen_url: _imagen, ...resto }) => resto),
    language,
  );

  return (
    <>
      <Seo
        title={textos.title}
        description={textos.description(vinos.length)}
        canonical={url}
        lang={language}
        languageAlternates={alternatesDePagina(RUTA_ES, SITE_URL)}
        keywords={textos.keywords}
      />
      <JsonLd
        data={breadcrumbSchema(
          [{ nombre: textos.miga, path: RUTA_ES }],
          language,
        )}
      />
      {secciones.length > 0 && (
        <JsonLd
          data={menuPagina(
            menuSchema(secciones, language, undefined, {
              id: `${url}#menu`,
              nombre: `${textos.titulo} — Casa Tomás`,
              url,
            }),
          )}
        />
      )}

      <CartaPageLayout
        titulo={textos.titulo}
        subtitulo={textos.subtitulo}
        detalle={textos.detalle(vinos.length)}
        migas={[{ nombre: textos.miga }]}
      >
        <Alert className="mb-10 border-accent/40 bg-accent/5">
          <AlertCircle className="h-5 w-5 text-accent" />
          <AlertTitle className="font-semibold">{textos.alertTitle}</AlertTitle>
          <AlertDescription className="text-muted-foreground">{textos.alertBody}</AlertDescription>
        </Alert>

        {secciones.length > 0 ? (
          <div className="space-y-12">
            {secciones.map((seccion) => (
              <section
                key={seccion.clave}
                id={slugificar(seccion.clave) || undefined}
                aria-labelledby={`vinos-${slugificar(seccion.clave)}`}
                className="animate-fade-up"
              >
                <div className="flex items-baseline justify-between gap-4 mb-4">
                  <h2
                    id={`vinos-${slugificar(seccion.clave)}`}
                    className="text-2xl md:text-3xl font-bold text-primary"
                  >
                    {etiquetaCategoria(seccion.nombre)}
                  </h2>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {seccion.items.length}
                  </span>
                </div>
                <ListaPrecios filas={seccion.items.map(aFila)} />
              </section>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">{textos.vacia}</p>
        )}

        <p className="mt-12 text-sm text-muted-foreground">
          {textos.buscasAlgo}{" "}
          <Link to={construirRutaIdioma("/carta/bebidas", language)} className="text-accent hover:underline">
            {textos.verBebidas}
          </Link>
          .
        </p>
      </CartaPageLayout>
    </>
  );
};

export default CartaVinosPagina;
