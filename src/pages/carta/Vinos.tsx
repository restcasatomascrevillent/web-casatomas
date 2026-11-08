import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import datos from "virtual:carta-ssg/vinos";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Seo } from "@/components/Seo";
import { JsonLd } from "@/components/JsonLd";
import CartaPageLayout from "@/components/carta/CartaPageLayout";
import CartaVinos from "@/components/carta/CartaVinos";
import { agruparPorCategoria } from "@/lib/carta-ssg";
import { normalizeAlergenos } from "@/lib/alergenos";
import { breadcrumbSchema, menuPagina, menuSchema, SITE_URL } from "@/lib/negocio";
import { useTranslations } from "@/i18n/LanguageProvider";
import { alternatesDePagina, construirRutaIdioma } from "@/i18n/routing";
import type { Language } from "@/i18n/types";

const RUTA_ES = "/carta/vinos";

const TEXTOS: Record<
  Language,
  {
    title: string;
    description: (n: number) => string;
    keywords: string[];
    migaCarta: string;
    /** Nombre de la sección: miga, `h1` y nombre del `Menu` del JSON-LD. */
    miga: string;
    detalle: (n: number) => string;
    alertTitle: string;
    alertBody: string;
    vacia: string;
    buscasAlgo: string;
    verBebidas: string;
  }
> = {
  es: {
    title: "Carta de vinos | Casa Tomás Crevillente",
    description: (n) => `Bodega de Casa Tomás en Crevillent (Alicante): ${n} referencias con su denominación de origen y su precio. Tintos, blancos, cavas y generosos.`,
    keywords: ["carta de vinos Crevillent", "bodega restaurante Alicante", "vinos Casa Tomás", "denominación de origen"],
    migaCarta: "Carta",
    miga: "Vinos",
    detalle: (n) => `${n} referencias`,
    alertTitle: "Solo para mayores de 18 años",
    alertBody: "La venta y el suministro de bebidas alcohólicas a menores de 18 años está prohibido. Disfrútalo con moderación.",
    vacia: "La carta de vinos no está disponible ahora mismo.",
    buscasAlgo: "¿Buscas algo para acompañar?",
    verBebidas: "Ver las bebidas sin alcohol",
  },
  en: {
    title: "Wine List | Casa Tomás Crevillente",
    description: (n) => `Casa Tomás wine cellar in Crevillent (Alicante): ${n} wines with their designation of origin and price. Reds, whites, cava and fortified wines.`,
    keywords: ["wine list Crevillent", "restaurant wine cellar Alicante", "Casa Tomás wines", "designation of origin"],
    migaCarta: "Menu",
    miga: "Wines",
    detalle: (n) => `${n} wines`,
    alertTitle: "18+ only",
    alertBody: "The sale and serving of alcoholic drinks to anyone under 18 is prohibited. Please enjoy responsibly.",
    vacia: "The wine list isn't available right now.",
    buscasAlgo: "Looking for something to go with it?",
    verBebidas: "See our soft drinks",
  },
  fr: {
    title: "Carte des vins | Casa Tomás Crevillente",
    description: (n) => `Cave à vins de Casa Tomás à Crevillent (Alicante) : ${n} références avec leur appellation d'origine et leur prix. Rouges, blancs, cavas et vins doux.`,
    keywords: ["carte des vins Crevillent", "cave à vins restaurant Alicante", "vins Casa Tomás", "appellation d'origine"],
    migaCarta: "Carte",
    miga: "Vins",
    detalle: (n) => `${n} références`,
    alertTitle: "Réservé aux plus de 18 ans",
    alertBody: "La vente et le service de boissons alcoolisées aux mineurs de moins de 18 ans sont interdits. À consommer avec modération.",
    vacia: "La carte des vins n'est pas disponible pour le moment.",
    buscasAlgo: "Vous cherchez de quoi l'accompagner ?",
    verBebidas: "Voir nos boissons sans alcool",
  },
};

/**
 * `/carta/vinos` — las 185 referencias de la bodega, con buscador, filtro por
 * categoría, mapa de origen y "añadir al pedido" (mismo `CartaVinos` que
 * antes solo se abría desde la portada).
 *
 * SIN diálogo de edad. La versión de `CartaVinos` que había en la portada
 * abre un `Dialog` de Radix al montarse, y eso aquí no sirve por tres
 * motivos: el diálogo se portaliza a `<body>` y en Node no llega a
 * renderizarse (el prerenderizado saldría vacío), el contenido quedaría
 * detrás de una interacción, y un modal al cargar es un patrón que Google
 * penaliza como intersticial. Se mantiene el aviso permanente y visible de
 * siempre: la ley española restringe la VENTA y el suministro de alcohol a
 * menores, no mostrar la lista de lo que sirve un restaurante — la carta
 * física se entrega en mesa a todo el mundo.
 *
 * SEMILLA DEL BUILD. `CartaVinos` recibe `initialVinos`/`initialMapVinos`
 * (de `virtual:carta-ssg/vinos`, lo mismo que usa el JSON-LD de abajo) para
 * que los vinos y el mapa ya estén en el HTML del SSG — sin esto, la
 * cuadrícula nacería vacía a la espera de la respuesta de Supabase.
 */
const CartaVinosPagina = () => {
  const { language } = useTranslations();
  const textos = TEXTOS[language];
  const url = `${SITE_URL}${construirRutaIdioma(RUTA_ES, language)}`;
  const vinos = datos.vinos ?? [];

  const vinosSemilla = vinos.map((vino) => ({
    ...vino,
    alergenos_oficiales: normalizeAlergenos(vino.alergenos_oficiales),
    alergenos_inferidos: normalizeAlergenos(vino.alergenos_inferidos),
  }));

  // `imagen_url` se descarta antes de construir el JSON-LD: los datos
  // estructurados no deben describir una imagen que la vista previa (antes de
  // pulsar "ver foto") no enseña. Hoy ninguna de las 185 filas trae foto; esto
  // lo deja bien atado si alguien la sube desde el panel.
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
          [
            { nombre: textos.migaCarta, path: "/carta" },
            { nombre: textos.miga, path: RUTA_ES },
          ],
          language,
        )}
      />
      {secciones.length > 0 && (
        <JsonLd
          data={menuPagina(
            menuSchema(secciones, language, undefined, {
              id: `${url}#menu`,
              nombre: `${textos.miga} — Casa Tomás`,
              url,
            }),
          )}
        />
      )}

      <CartaPageLayout
        titulo={textos.miga}
        detalle={textos.detalle(vinos.length)}
        migas={[{ nombre: textos.migaCarta, path: "/carta" }, { nombre: textos.miga }]}
      >
        <Alert className="mb-10 border-accent/40 bg-accent/5">
          <AlertCircle className="h-5 w-5 text-accent" />
          <AlertTitle className="font-semibold">{textos.alertTitle}</AlertTitle>
          <AlertDescription className="text-muted-foreground">{textos.alertBody}</AlertDescription>
        </Alert>

        {vinos.length > 0 ? (
          <CartaVinos
            showCompleteList
            showAddButton
            // 24 = PAGE_SIZE en CartaVinos: el primer refresco a Supabase trae
            // esa misma cantidad y sustituye esta semilla; sin el recorte se
            // vería la carta entera encogiendo de golpe a 24 fichas.
            initialVinos={{ Todos: vinosSemilla.slice(0, 24) }}
            initialMapVinos={vinosSemilla}
          />
        ) : (
          <p className="text-muted-foreground">{textos.vacia}</p>
        )}

        <p className="mt-12 text-sm text-muted-foreground">
          {textos.buscasAlgo}{" "}
          <Link to={construirRutaIdioma("/carta/bebidas", language)} className="text-accent underline underline-offset-2 hover:decoration-2">
            {textos.verBebidas}
          </Link>
          .
        </p>
      </CartaPageLayout>
    </>
  );
};

export default CartaVinosPagina;
